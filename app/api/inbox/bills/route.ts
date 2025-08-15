import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { findVendorByDomain } from "@/lib/vendorMap";
import { extractAmount, extractDueDate, likelyHasAddress, extractAddress, toAddressKey } from "@/lib/extract";

export const runtime = "nodejs";

function pickDomain(addr?: string) {
  if (!addr) return "";
  const at = addr.indexOf("@");
  return at >= 0 ? addr.slice(at + 1).toLowerCase() : "";
}

export async function GET(req: Request) {
  const userId = requireUserId();
  const url = new URL(req.url);
  const top = Math.min(Number(url.searchParams.get("top") || "100"), 200);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || "365"), 1), 365);
  const sinceISO = new Date(Date.now() - days * 864e5).toISOString();

  // 1) MS account
  const account = await prisma.account.findFirst({ where: { userId, provider: "MICROSOFT" } });
  if (!account?.refreshToken) {
    const existing = await prisma.bill.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }], take: top });
    return NextResponse.json({ ok: true, items: existing, note: "ms_not_connected", diag: { pulledFromDb: existing.length } });
  }

  // 2) Token
  const tenant = process.env.MS_AUTH_TENANT || "common";
  const client_id = process.env.MS_CLIENT_ID!;
  const client_secret = process.env.MS_CLIENT_SECRET!;
  const redirect_uri = process.env.MS_REDIRECT_URI || "http://localhost:3000/api/ms/callback";

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id, client_secret, grant_type: "refresh_token",
      refresh_token: account.refreshToken!, redirect_uri, scope: "offline_access Mail.Read User.Read",
    }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  const access_token = tokenJson?.access_token as string | undefined;
  if (!access_token) {
    return NextResponse.json({ ok: true, items: [], note: "token_refresh_failed", detail: tokenJson?.error || "unknown", diag: tokenJson });
  }
  if (tokenJson.refresh_token && tokenJson.refresh_token !== account.refreshToken) {
    await prisma.account.update({ where: { id: account.id }, data: { refreshToken: tokenJson.refresh_token as string } });
  }

  // 3) List recent emails (with since filter)
  const graphUrl =
    `https://graph.microsoft.com/v1.0/me/messages` +
    `?$top=${top}` +
    `&$filter=receivedDateTime ge ${sinceISO}` +
    `&$orderby=receivedDateTime desc` +
    `&$select=id,subject,receivedDateTime,from,bodyPreview`;
  const listRes = await fetch(graphUrl, { headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json", Prefer: 'outlook.body-content-type="text"' } });
  if (!listRes.ok) {
    const err = await listRes.text();
    return NextResponse.json({ ok: false, error: "graph_list_failed", detail: err, diag: { graphUrl } }, { status: 200 });
  }
  const listJson = await listRes.json();
  const msgs: any[] = Array.isArray(listJson?.value) ? listJson.value : [];

  // 4) Bill-like filter (broad)
  const KW = /(bill|invoice|statement|receipt|payment|due|overdue|notice of assessment|rates|council|strata|levy|water|electric|energy|gas|policy|premium|renewal|linkt|toll|ato|tax|utility)/i;
  const candidates = msgs.filter(m => KW.test(m.subject || "") || KW.test(m.bodyPreview || ""));

  // 5) Upsert
  let upserts = 0;
  for (const m of candidates) {
    const fromAddr = m?.from?.emailAddress?.address as string | undefined;
    const fromName = m?.from?.emailAddress?.name as string | undefined;
    const domain = pickDomain(fromAddr);
    const subject = m.subject || "";
    const preview = m.bodyPreview || "";

    // Property guess
    let propertyId: string | undefined;
    const maybeAddress = extractAddress(subject) || extractAddress(preview);
    if (maybeAddress && likelyHasAddress(maybeAddress)) {
      const existingProp = await prisma.property.findFirst({ where: { userId, label: { equals: maybeAddress, mode: "insensitive" } } });
      propertyId = existingProp?.id || (await prisma.property.create({ data: { userId, label: maybeAddress, address: maybeAddress } })).id;
    }

    const vendor = findVendorByDomain(domain, subject);
    const issuer = vendor?.name || fromName || domain || "Unknown";
    const amt = extractAmount(subject) || extractAmount(preview) || 0;
    const due = extractDueDate(subject) || extractDueDate(preview) || null;

    await prisma.bill.upsert({
      where: { sourceId: m.id as string },
      create: { userId, propertyId, issuer, amountCents: typeof amt === "number" ? Math.round(amt) : 0, dueDate: due ? new Date(due) : null, status: "PENDING", source: "email", sourceId: m.id as string },
      update: { issuer, propertyId: propertyId ?? undefined, amountCents: typeof amt === "number" ? Math.round(amt) : 0, dueDate: due ? new Date(due) : null },
    });
    upserts++;
  }

  // 6) Return
  const bills = await prisma.bill.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }], take: top });
  return NextResponse.json({
    ok: true,
    items: bills,
    diag: {
      sinceISO, days, pulledMessages: msgs.length, candidateMessages: candidates.length, upserts,
      sampleSubjects: msgs.slice(0, 10).map(m => m.subject || "").filter(Boolean),
    },
  });
}
