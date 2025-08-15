import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const tenant = process.env.MS_AUTH_TENANT || "common";
  const client_id = process.env.MS_CLIENT_ID!;
  const redirect_uri = process.env.MS_REDIRECT_URI || "http://localhost:3000/api/ms/callback";
  const scope = encodeURIComponent("offline_access Mail.Read User.Read");
  const state = encodeURIComponent(JSON.stringify({}));

  const authUrl =
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize` +
    `?client_id=${encodeURIComponent(client_id)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${scope}` +
    `&response_mode=query` +
    `&state=${state}`;

  return NextResponse.redirect(authUrl);
}
