import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

async function refreshWithCookie() {
  const jar = await await cookies();
  const refresh = jar.get("ms_refresh_token")?.value;
  if (!refresh) return { ok: false, status: 401, error: "not_connected" };

  const tenant = process.env.MS_AUTH_TENANT || "common";
  const client_id = process.env.MS_CLIENT_ID!;
  const client_secret = process.env.MS_CLIENT_SECRET!;
  const body = new URLSearchParams();
  body.set("client_id", client_id);
  body.set("client_secret", client_secret);
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refresh);
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body, cache: "no-store"
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, status: res.status, error: data };
  // Update refresh token if rotated
  if (data.refresh_token) {
    jar.set("ms_refresh_token", data.refresh_token, { httpOnly: true, sameSite: "lax", secure: false, path: "/" });
  }
  return { ok: true, status: 200, token: data.access_token };
}

export async function GET() {
  const out = await refreshWithCookie();
  if (!out.ok) return NextResponse.json(out, { status: out.status });
  return NextResponse.json({ ok: true });
}

export async function POST() {
  const out = await refreshWithCookie();
  if (!out.ok) return NextResponse.json(out, { status: out.status });
  return NextResponse.json({ ok: true, access_token: out.token });
}
