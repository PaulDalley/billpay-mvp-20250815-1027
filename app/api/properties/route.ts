import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toAddressKey } from "@/lib/extract";
export const runtime = "nodejs";
export async function GET(){ try{ const userId=requireUserId(); const props=await prisma.property.findMany({ where:{ userId }, orderBy:{ createdAt:"desc" } }); return NextResponse.json({ ok:true, items:props }); }catch{ return NextResponse.json({ ok:false, error:"unauthenticated" }, { status:401 }); } }
export async function POST(req:Request){ try{ const userId=requireUserId(); const body=await req.json().catch(()=>({})); const label=(body?.label||"").toString().slice(0,120)||"Property"; const address=(body?.address||"").toString().slice(0,240)||null; const addressKey=address?toAddressKey(address)!:null; if(addressKey){ const ex=await prisma.property.findFirst({ where:{ userId, addressKey } }); if(ex) return NextResponse.json({ ok:true, item:ex }); } const created=await prisma.property.create({ data:{ userId, label, address, addressKey } }); return NextResponse.json({ ok:true, item:created }); }catch(e:any){ return NextResponse.json({ ok:false, error:String(e?.message||"bad_request") }, { status:400 }); } }
