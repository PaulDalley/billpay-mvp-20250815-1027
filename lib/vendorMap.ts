// lib/vendorMap.ts
// Minimal AU-centric vendor lookup for bill-like emails.

export type Vendor = {
  name: string;
  category?:
    | "Council"
    | "Water"
    | "Strata"
    | "Energy"
    | "Internet"
    | "Insurance"
    | "Toll"
    | "Parking"
    | "Tax"
    | "Personal"
    | "Other";
  domains?: string[];
  keywords?: string[];
};

const VENDORS: Vendor[] = [
  // Water
  { name: "Sydney Water", category: "Water", domains: ["sydneywater.com.au"], keywords: ["water bill", "sydney water"] },
  { name: "Yarra Valley Water", category: "Water", domains: ["yw.com.au","yvw.com.au","yarravalleywater.com.au"], keywords: ["water bill"] },
  // Energy
  { name: "AGL", category: "Energy", domains: ["agl.com.au"], keywords: ["agl", "energy bill", "gas bill", "electricity bill"] },
  { name: "Origin Energy", category: "Energy", domains: ["originenergy.com.au"], keywords: ["origin", "energy bill"] },
  { name: "EnergyAustralia", category: "Energy", domains: ["energyaustralia.com.au"], keywords: ["energy australia", "electricity"] },
  // Internet
  { name: "Telstra", category: "Internet", domains: ["telstra.com"], keywords: ["telstra", "internet bill", "mobile bill"] },
  { name: "Optus", category: "Internet", domains: ["optus.com.au"], keywords: ["optus", "internet", "mobile"] },
  { name: "TPG", category: "Internet", domains: ["tpg.com.au"], keywords: ["tpg", "invoice"] },
  // Insurance
  { name: "NRMA Insurance", category: "Insurance", domains: ["nrma.com.au","iag.com.au"], keywords: ["nrma", "insurance renewal"] },
  { name: "Allianz", category: "Insurance", domains: ["allianz.com.au"], keywords: ["allianz", "renewal", "policy"] },
  // Council (generic)
  { name: "NSW Council", category: "Council", domains: ["nsw.gov.au"], keywords: ["rates notice", "council rates", "rate notice"] },
  { name: "VIC Council", category: "Council", domains: ["vic.gov.au"], keywords: ["rates notice", "council rates"] },
  // Strata (generic)
  { name: "Strata Manager", category: "Strata", keywords: ["levy notice", "strata levy", "owners corporation"] },
  // Tolls / Parking
  { name: "Linkt (Transurban)", category: "Toll", domains: ["linkt.com.au","transurban.com"], keywords: ["toll invoice", "linkt"] },
  { name: "NSW Parking", category: "Parking", domains: ["nsw.gov.au"], keywords: ["parking infringement", "penalty notice"] },
  // Tax / ATO
  { name: "ATO", category: "Tax", domains: ["ato.gov.au"], keywords: ["notice of assessment", "payment plan", "tax"] },
];

function normalize(s?: string) {
  return (s || "").trim().toLowerCase();
}

/**
 * Given a sender domain (e.g., "agl.com.au") and/or subject,
 * try to map to a known vendor + category for tab routing.
 */
export function findVendorByDomain(domain?: string, subject?: string): Vendor | null {
  const d = normalize(domain);
  const subj = normalize(subject);

  // 1) Exact or suffix domain match
  if (d) {
    for (const v of VENDORS) {
      if (!v.domains) continue;
      for (const vd of v.domains) {
        if (d === vd || d.endsWith("." + vd)) {
          return v;
        }
      }
    }
  }

  // 2) Keyword match on subject as fallback
  if (subj) {
    let best: Vendor | null = null;
    let bestScore = 0;
    for (const v of VENDORS) {
      const kws = v.keywords || [];
      let score = 0;
      for (const kw of kws) {
        if (subj.includes(kw)) score++;
      }
      if (score > bestScore) {
        best = v;
        bestScore = score;
      }
    }
    if (best) return best;
  }

  // 3) Nothing matched -> unknown biller
  return null;
}
