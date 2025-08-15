import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

async function getAccessToken() {
  const refresh = (await await cookies()).get("ms_refresh_token")?.value;
  if (!refresh) return null;
  const tenant = process.env.MS_AUTH_TENANT || "common";
  const client_id = process.env.MS_CLIENT_ID!;
  const client_secret = process.env.MS_CLIENT_SECRET!;
  const body = new URLSearchParams();
  body.set("client_id", client_id);
  body.set("client_secret", client_secret);
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refresh);
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store"
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.refresh_token) {
    // rotate cookie
    (await await cookies()).set("ms_refresh_token", data.refresh_token, { httpOnly: true, sameSite: "lax", secure: false, path: "/" });
  }
  return data.access_token as string;
}

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ connected: false }, { status: 401 });
  const r = await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${token}` } });
  const profile = await r.json();
  return NextResponse.json({ connected: true, profile }, { status: 200 });
}
