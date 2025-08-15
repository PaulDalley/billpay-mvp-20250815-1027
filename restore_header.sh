set -euo pipefail

# Detect app root
if [ -d app ]; then ROOT=app; elif [ -d src/app ]; then ROOT=src/app; else echo "❌ Could not find app/ or src/app/"; exit 1; fi

COMP_DIR="$ROOT/components"
HEADER="$COMP_DIR/SiteHeader.tsx"
LAYOUT="$ROOT/layout.tsx"
INBOX="$ROOT/inbox/page.tsx"

# Ensure components dir
mkdir -p "$COMP_DIR"

# (Re)create SiteHeader.tsx if missing
if [ ! -f "$HEADER" ]; then
  cat > "$HEADER" <<'TSX'
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
TSX
  echo "🧩 Recreated $HEADER"
else
  echo "✅ Found $HEADER"
fi

# Ensure layout exists
[ -f "$LAYOUT" ] || { echo "❌ Missing $LAYOUT"; exit 1; }

# Mount header globally in layout (once)
node - "$LAYOUT" <<'NODE'
const fs=require('fs');
const file=process.argv[2];
let s=fs.readFileSync(file,'utf8');
const importLine='import SiteHeader from "./components/SiteHeader";';
if(!/import\s+SiteHeader\s+from\s+["']\.\/components\/SiteHeader["']/.test(s)){
  s = importLine + '\n' + s;
}
if(!/<SiteHeader\s*\/>/.test(s)){
  s = s.replace('{children}', '<SiteHeader />\n        {children}');
}
fs.writeFileSync(file,s);
console.log('✅ Header mounted in layout:', file);
NODE

# Remove any local header usage from Bills page to avoid duplicates
if [ -f "$INBOX" ]; then
  node - "$INBOX" <<'NODE'
  const fs=require('fs'); const file=process.argv[2];
  let s=fs.readFileSync(file,'utf8');
  s = s.replace(/\n?import\s+SiteHeader[^\n]*\n/g,'');
  s = s.replace(/\s*<SiteHeader\s*\/>\s*/g,'');
  fs.writeFileSync(file,s);
  console.log('✅ Deduped header in Bills page:', file);
NODE
else
  echo "ℹ️ Bills page not found at $INBOX (skipped dedupe)";
fi

echo "🎉 Done. Hard refresh (Cmd+Shift+R)."
