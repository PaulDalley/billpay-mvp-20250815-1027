const moneyRe = /(?:\$\s?)?(\d{2,4}(?:[.,]\d{2})?)/;
const dueRe = /\b(?:due|pay by|due by|payment due)[:\s]*([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4}|[0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i;
const acctRe = /\b(?:account|customer number|bpay ref(?:erence)?)[:\s#]*([A-Za-z0-9\-\s]{4,})/i;
const addressHints = /(service address|property|premises|lot|unit|address)/i;
const streetWord = "(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Bvd|Dr|Drive|Ct|Court|Pl|Place|Pde|Parade|Way|Lane|Ln|Terrace|Ter|Close|Cl|Highway|Hwy)";
const auAddressRe = new RegExp(String.raw`\b(\d{1,4}[A-Za-z]?(?:\/\d{1,3}[A-Za-z]?)?\s+[A-Za-z][A-Za-z\s.'-]+?\s${streetWord}\b(?:\s+[A-Za-z][A-Za-z\s'-]+)*\s+(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\s+(\d{4}))\b`,"i");
export function extractAmount(t?: string){if(!t)return;const m=t.match(moneyRe);if(!m)return;const n=Number(m[1].replace(",","."));return isFinite(n)?n:undefined;}
export function extractDueDate(t?: string){if(!t)return;const m=t.match(dueRe);if(!m)return;const s=m[1];if(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(s)){const [d,mn,y]=s.split(/[\/\-]/).map(x=>parseInt(x,10));const Y=y<100?2000+y:y;const M=mn-1;const dt=new Date(Y,M,d);if(!isNaN(dt.getTime()))return dt;}const m2=s.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);if(m2){const d=parseInt(m2[1],10);const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];const M=months.findIndex(mm=>mm.toLowerCase()===m2[2].slice(0,3).toLowerCase());const Y=parseInt(m2[3],10);const dt=new Date(Y,M,d);if(!isNaN(dt.getTime()))return dt;}}
export function extractAccount(t?: string){if(!t)return;const m=t.match(acctRe);if(!m)return;return m[1].replace(/\s+/g," ").trim().slice(0,64);}
export function likelyHasAddress(t?: string){if(!t)return false; if(addressHints.test(t))return true; return auAddressRe.test(t);}
export function extractAddress(t?: string){if(!t)return; const ms=[...t.matchAll(auAddressRe)]; if(!ms.length)return; ms.sort((a,b)=>(b[1]?.length||0)-(a[1]?.length||0)); const a=(ms[0][1]||"").replace(/\s+/g," ").trim(); return a||undefined;}
export function toAddressKey(a?: string){if(!a)return; return a.toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
