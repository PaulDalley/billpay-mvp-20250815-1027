import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateStr = url.searchParams.get("state") || "{}";
    const { tenant: stateTenant } = JSON.parse(stateStr || "{}");

    if (!code) {
      return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
    }

    const tenant = stateTenant || process.env.MS_AUTH_TENANT || "common";
    const client_id = process.env.MS_CLIENT_ID!;
    const client_secret = process.env.MS_CLIENT_SECRET!;
    const redirect_uri = process.env.MS_REDIRECT_URI || "http://localhost:3000/api/ms/callback";

    // 1) Exchange code -> tokens
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: "authorization_code",
        code,
        redirect_uri,
        scope: "offline_access Mail.Read User.Read",
      }),
    });

    const token = await tokenRes.json().catch(() => ({} as any));
    if (!token?.access_token) {
      return NextResponse.json({ ok: false, error: "no_access_token", detail: token }, { status: 200 });
    }
    if (!token?.refresh_token) {
      // Some tenants/apps won’t issue refresh unless offline_access was truly granted
      return NextResponse.json({ ok: false, error: "no_refresh_token", detail: token }, { status: 200 });
    }

    const access_token = token.access_token as string;

    // 2) Fetch Microsoft profile to identify the user
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const me = await meRes.json().catch(() => ({} as any));
    const msId: string = me?.id || "";
    const email: string =
      me?.mail ||
      me?.userPrincipalName ||
      (msId ? `${msId}@placeholder.local` : "unknown@placeholder.local");
    const name: string = me?.displayName || email;

    // 3) Ensure a local User exists (upsert by email)
    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
      select: { id: true },
    });

    // 4) Save/rotate the MICROSOFT account refresh token for this user
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, provider: "MICROSOFT" },
      select: { id: true },
    });

    if (existing) {
      await prisma.account.update({
        where: { id: existing.id },
        data: { refreshToken: token.refresh_token as string },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: user.id,
          provider: "MICROSOFT",
          refreshToken: token.refresh_token as string,
          // Optionally keep a reference to the Microsoft account id if your schema has this column:
          // providerAccountId: msId,
        },
      });
    }

    // 5) Done → go to /inbox
    return NextResponse.redirect(new URL("/inbox", url).toString());
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "callback_exception", message: e?.message || "unknown" }, { status: 200 });
  }
}
