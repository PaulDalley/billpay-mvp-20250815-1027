import { NextResponse } from "next/server";
export const runtime = "nodejs";

function safeJson(text: string) { try { return JSON.parse(text); } catch { return text; } }

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, step: "env", missing: { SUPABASE_URL: !url, SUPABASE_ANON_KEY: !key } },
      { status: 500 }
    );
  }
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const bodyText = await res.text();
    return NextResponse.json(
      { ok: res.ok, status: res.status, body: safeJson(bodyText) },
      { status: res.ok ? 200 : res.status }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, step: "fetch", error: String(err?.message || err) }, { status: 500 });
  }
}
