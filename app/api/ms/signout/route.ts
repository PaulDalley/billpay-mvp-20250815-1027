import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("ms_refresh_token", "", { httpOnly: true, sameSite: "lax", secure: false, path: "/", expires: new Date(0) });
  res.cookies.set("ms_user_label", "", { httpOnly: false, sameSite: "lax", secure: false, path: "/", expires: new Date(0) });
  return res;
}
