// app/api/inbox/bills/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { findVendorByDomain } from "@/lib/vendorMap";
import { extractAmount, extractDueDate, extractAccount, likelyHasAddress, extractAddress, toAddressKey } from "@/lib/extract";

export const runtime = "nodejs";

function pickDomain(addr?: string) {
  if (!addr) return "";
  const at = addr.indexOf("@");
  return at >= 0 ? addr.slice(at + 1).toLowerCase() : "";
}

export async function GET(req: Request) {
  const userId = requireUserId();
  const url = new URL(req.url);
  const topParam = Math.min(Number(url.searchParams.get("top") || "100"), 200); // cap to 200
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || "180"), 1), 365);
  const sinceISO = new Date(Date.now() - days * 864e5).toISOString();

  // 1) Look up MS account + refresh token
  const account = await prisma.account.findFirst({
    where: { userId, provider: "MICROSOFT" },
  });

  if (!account?.refreshToken) {
    const existing = await prisma.bill.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      take: topParam,
    });
    return NextResponse.json({
      ok: true,
      items: existing,
      note: "ms_not_connected",
      diag: { haveRefreshToken: false, pulledFromDb: existing.length },
    });
  }

  // 2) Exchange refresh token for access token
  const tenant = process.env.MS_AUTH_TENANT || "common";
  const client_id = process.env.MS_CLIENT_ID!;
  const client_secret = process.env.MS_CLIENT_SECRET!;
  const redirect_uri = process.env.MS_REDIRECT_URI || "http://localhost:3000/api/ms/callback";

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "refresh_token",
      refresh_token: account.refreshToken!,
      redirect_uri,
      scope: "offline_access Mail.Read User.Read",
    }),
  });

  const tokenJson = await tokenRes.json().catch(() => ({}));
  const access_token = tokenJson?.access_token as string | undefined;

  if (!access_token) {
    return NextResponse.json({
      ok: true,
      items: [],
      note: "token_refresh_failed",
      detail: tokenJson?.error || "unknown",
      diag: tokenJson,
    });
  }

  if (tokenJson.refresh_token && tokenJson.refresh_token !== account.refreshToken) {
    await prisma.account.update({
      where: { id: account.id },
      data: { refreshToken: tokenJson.refresh_token as string },
    });
  }

  // 3) Pull recent messages (since filter + select fields)
  // NOTE: Graph caps pages; we grab one page first. Can add paging later if needed.
  const graphUrl =
    `https://graph.microsoft.com/v1.0/me/messages` +
    `?$top=${topParam}` +
    `&$filter=receivedDateTime ge ${sinceISO}` +
    `&$orderby=receivedDateTime desc` +
    `&$select=id,subject,receivedDateTime,from,bodyPreview,internetMessageId`;

  const listRes = await fetch(graphUrl, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/json",
      Prefer: 'outlook.body-content-type="text"',
    },
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    return NextResponse.json({
      ok: false,
      error: "graph_list_failed",
      detail: errText,
      diag: { graphUrl },
    }, { status: 200 });
  }

  const listJson = await listRes.json();
  const msgs: any[] = Array.isArray(listJson?.value) ? listJson.value : [];

  // 4) “Bill-like” filter (widened a bit)
  const KW =
    /(bill|invoice|statement|receipt|payment|due|overdue|notice of assessment|rates|council|strata|levy|water|electric|energy|gas|policy|premium|renewal|linkt|toll|ato|tax|utility)/i;

  const candidates = msgs.filter(m => KW.test(m.subject || "") || KW.test(m.bodyPreview || ""));

  // 5) Upsert properties/bills from candidates
  let upserts = 0;
  for (const m of candidates) {
    const fromAddr = m?.from?.emailAddress?.address as string | undefined;
    const fromName = m?.from?.emailAddress?.name as string | undefined;
    const domain = pickDomain(fromAddr);
    const subject = m.subject || "";
    const preview = m.bodyPreview || "";

    // Try to detect/attach a property
    let propertyId: string | undefined;
    let label: string | undefined;

    const maybeAddress = extractAddress(subject) || extractAddress(preview);
    if (maybeAddress && likelyHasAddress(maybeAddress)) {
      const key = toAddressKey(maybeAddress);
      if (key) {
        const existingProp = await prisma.property.findFirst({
          where: { userId, label: { equals: maybeAddress, mode: "insensitive" } },
        });
        if (existingProp) {
          propertyId = existingProp.id;
        } else {
          const created = await prisma.property.create({
            data: { userId, label: maybeAddress, address: maybeAddress },
          });
          propertyId = created.id;
        }
        label = maybeAddress;
      }
    }

    // Vendor mapping → issuer
    const vendor = findVendorByDomain(domain, subject);
    const issuer = vendor?.name || fromName || domain || "Unknown";

    // Amount / due date
    const amt = extractAmount(subject) || extractAmount(preview) || 0;
    const due = extractDueDate(subject) || extractDueDate(preview) || null;

    // Upsert by message id
    const sourceId = m.id as string;
    await prisma.bill.upsert({
      where: { sourceId },
      create: {
        userId,
        propertyId,
        issuer,
        amountCents: typeof amt === "number" ? Math.round(amt) : 0,
        dueDate: due ? new Date(due) : null,
        status: "PENDING",
        source: "email",
        sourceId,
      },
      update: {
        amountCents: typeof amt === "number" ? Math.round(amt) : 0,
        dueDate: due ? new Date(due) : null,
        issuer,
        propertyId: propertyId ?? undefined,
      },
    });
    upserts++;
  }

  // 6) Return the latest bills + diagnostics
  const bills = await prisma.bill.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    take: topParam,
  });

  return NextResponse.json({
    ok: true,
    items: bills,
    diag: {
      pulledMessages: msgs.length,
      candidateMessages: candidates.length,
      upserts,
      sampleSubjects: msgs.slice(0, 10).map(m => m.subject || "").filter(Boolean),
      sinceISO,
      days,
    },
  });
}
