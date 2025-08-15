"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Doctor = { account?: { hasRefreshToken?: boolean } };

export default function SiteHeader() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/doctor", { cache: "no-store" });
        const j: Doctor = await r.json();
        setConnected(!!j?.account?.hasRefreshToken);
      } catch { setConnected(false); }
    })();
  }, []);

  const badge =
    connected === null ? (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs border">Checking…</span>
    ) : connected ? (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">Connected</span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">Not connected</span>
    );

  const linkCls = (href: string) =>
    `px-3 py-2 rounded-lg text-sm ${pathname === href ? "bg-slate-100 font-medium" : "hover:bg-slate-50"}`;

  return (
    <header className="px-6 py-6 border-b bg-white">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl" style={{ background: "linear-gradient(135deg,#0ea5e9 0%,#0f766e 100%)" }} />
          <div>
            <Link href="/" className="block"><h1 className="text-2xl font-semibold tracking-tight">Bill Concierge</h1></Link>
            <p className="text-sm text-slate-500">Your bills, found and organised—automatically.</p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/" className={linkCls("/")}>Home</Link>
          <Link href="/inbox" className={linkCls("/inbox")}>Bills</Link>
          <Link href="/settings" className={linkCls("/settings")}>Settings</Link>
        </nav>
        <div className="flex items-center gap-3">
          {badge}
          <button onClick={() => (window.location.href = "/api/ms")} className="px-3 py-2 rounded-xl border shadow-sm text-sm">
            {connected ? "Reconnect Microsoft" : "Connect Microsoft"}
          </button>
        </div>
      </div>
    </header>
  );
}
