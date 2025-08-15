set -euo pipefail

# Detect app root
if [ -d app ]; then ROOT=app; elif [ -d src/app ]; then ROOT=src/app; else echo "❌ Could not find app/ or src/app/"; exit 1; fi

HEADER="$ROOT/components/SiteHeader.tsx"
LAYOUT="$ROOT/layout.tsx"
INBOX="$ROOT/inbox/page.tsx"

[ -f "$HEADER" ] || { echo "❌ Missing $HEADER"; exit 1; }
[ -f "$LAYOUT" ] || { echo "❌ Missing $LAYOUT"; exit 1; }

# 1) Mount header in global layout exactly once
node - <<'NODE' "$LAYOUT"
const fs=require('fs'); const file=process.argv[1];
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

# 2) Remove any local header usage from Bills page (to avoid duplicates)
if [ -f "$INBOX" ]; then
  node - <<'NODE' "$INBOX"
  const fs=require('fs'); const file=process.argv[1];
  let s=fs.readFileSync(file,'utf8');
  s = s.replace(/\n?import\s+SiteHeader[^\n]*\n/g,'');
  s = s.replace(/\s*<SiteHeader\s*\/>\s*/g,'');
  fs.writeFileSync(file,s);
  console.log('✅ Deduped header in Bills page:', file);
NODE
else
  echo "ℹ️ Bills page not found at $INBOX (skipped dedupe)";
fi

echo "🎉 Done. Hard refresh your browser (Cmd+Shift+R)."
