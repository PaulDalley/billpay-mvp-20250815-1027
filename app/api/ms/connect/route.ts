import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  const clientId = process.env.MS_CLIENT_ID;
  const tenant = process.env.MS_AUTH_TENANT || "common";
  const redirectUri = encodeURIComponent(process.env.MS_REDIRECT_URI || "");
  const scopes = encodeURIComponent(process.env.MS_SCOPES || "");
  const state = encodeURIComponent(JSON.stringify({ user_id: "demo-user" }));
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Missing MS_CLIENT_ID or MS_REDIRECT_URI in .env.local" }, { status: 500 });
  }
  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scopes}&state=${state}`;
  return NextResponse.redirect(url);
}
