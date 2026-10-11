// Mock Qloo layer — returns data in the SAME shape as the real /v2/insights
// API so the rest of the app never knows the difference.
//
// Swap rule: set QLOO_MODE=live in .env once the hackathon key arrives.
// That is the only change needed; see src/qloo/index.ts.

import { BrandAffinity, InsightsResult, QlooClient, TasteSignal } from "./types";

// Deterministic pseudo-affinities per persona, shaped like real Qloo output.
// Values are hand-tuned to be plausible (0..1) and to DIFFER across personas —
// that contrast is what the demo's side-by-side comparison needs.
const PERSONA_BRANDS: Record<string, BrandAffinity[]> = {
  "jazz-lover": [
    { entityId: "qloo:brand:blue-note-records", name: "Blue Note Records", affinity: 0.94, popularity: 0.71, tags: ["jazz", "vinyl", "live-music"] },
    { entityId: "qloo:brand:aesop", name: "Aesop", affinity: 0.88, popularity: 0.83, tags: ["minimal-luxury", "craft", "design"] },
    { entityId: "qloo:brand:leica", name: "Leica", affinity: 0.85, popularity: 0.66, tags: ["photography", "craft", "heritage"] },
    { entityId: "qloo:brand:molton-brown", name: "Molton Brown", affinity: 0.81, popularity: 0.58, tags: ["grooming", "luxury"] },
    { entityId: "qloo:brand:nespresso", name: "Nespresso", affinity: 0.78, popularity: 0.9, tags: ["espresso", "ritual"] },
    { entityId: "qloo:brand:rimowa", name: "Rimowa", affinity: 0.74, popularity: 0.77, tags: ["travel", "design", "heritage"] },
  ],
  "streetwear-fan": [
    { entityId: "qloo:brand:supreme", name: "Supreme", affinity: 0.95, popularity: 0.88, tags: ["streetwear", "hype", "skate"] },
    { entityId: "qloo:brand:nike", name: "Nike", affinity: 0.91, popularity: 0.97, tags: ["sneakers", "sport", "street"] },
    { entityId: "qloo:brand:stussy", name: "Stüssy", affinity: 0.89, popularity: 0.74, tags: ["surf", "streetwear"] },
    { entityId: "qloo:brand:g-shock", name: "G-Shock", affinity: 0.84, popularity: 0.81, tags: ["watches", "urban", "durable"] },
    { entityId: "qloo:brand:new-era", name: "New Era", affinity: 0.82, popularity: 0.79, tags: ["caps", "hip-hop", "sport"] },
    { entityId: "qloo:brand:carhartt-wip", name: "Carhartt WIP", affinity: 0.79, popularity: 0.68, tags: ["workwear", "street"] },
  ],
  minimalist: [
    { entityId: "qloo:brand:muji", name: "MUJI", affinity: 0.96, popularity: 0.85, tags: ["minimalism", "functional", "japan"] },
    { entityId: "qloo:brand:apple", name: "Apple", affinity: 0.9, popularity: 0.98, tags: ["tech", "design", "minimal"] },
    { entityId: "qloo:brand:cos", name: "COS", affinity: 0.87, popularity: 0.72, tags: ["fashion", "minimal", "wardrobe"] },
    { entityId: "qloo:brand:aesop", name: "Aesop", affinity: 0.83, popularity: 0.83, tags: ["minimal-luxury", "craft"] },
    { entityId: "qloo:brand:vitra", name: "Vitra", affinity: 0.8, popularity: 0.6, tags: ["furniture", "design"] },
    { entityId: "qloo:brand:kindle", name: "Kindle", affinity: 0.76, popularity: 0.89, tags: ["reading", "simple"] },
  ],
};

const FALLBACK_BRANDS: BrandAffinity[] = [
  { entityId: "qloo:brand:uniqlo", name: "Uniqlo", affinity: 0.82, popularity: 0.93, tags: ["basics", "functional"] },
  { entityId: "qloo:brand:ikea", name: "IKEA", affinity: 0.78, popularity: 0.95, tags: ["home", "design", "affordable"] },
  { entityId: "qloo:brand:spotify", name: "Spotify", affinity: 0.75, popularity: 0.97, tags: ["music", "streaming"] },
  { entityId: "qloo:brand:patagonia", name: "Patagonia", affinity: 0.72, popularity: 0.8, tags: ["outdoor", "sustainable"] },
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export class MockQlooClient implements QlooClient {
  async getBrandAffinities(signal: TasteSignal, limit = 6): Promise<InsightsResult> {
    // Simulate network latency so the frontend loading state is exercised.
    await new Promise((r) => setTimeout(r, 350));

    let pool: BrandAffinity[];
    if (signal.personaId && PERSONA_BRANDS[signal.personaId]) {
      pool = PERSONA_BRANDS[signal.personaId];
    } else {
      // Custom tags: deterministic shuffle of the fallback pool seeded by tags,
      // with slight affinity jitter so different inputs give different rankings.
      const seed = hashStr(signal.interests.join("|").toLowerCase() || "default");
      pool = [...FALLBACK_BRANDS]
        .sort((a, b) => hashStr(a.entityId + seed) - hashStr(b.entityId + seed))
        .map((b, i) => ({
          ...b,
          affinity: Math.min(0.97, Math.max(0.55, b.affinity + ((seed >> (i * 3)) % 11 - 5) / 100)),
        }));
    }

    const entities = [...pool]
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, limit);

    return {
      signal,
      filterType: "urn:entity:brand",
      entities,
      mocked: true,
    };
  }
}
