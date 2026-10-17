// Real Qloo client — talks to the hackathon API.
// Inactive until QLOO_MODE=live AND QLOO_API_KEY is set.
//
// Wire protocol (per Qloo Agentic Hackathon Developer Guide):
//   GET https://hackathon.api.qloo.com/v2/insights?filter.type=urn:entity:brand&...
//   Header: X-Api-Key: <key>
// Notes:
// - It is a GET with query-string params, NOT a POST with a JSON body.
// - filter.type is REQUIRED.
// - Hackathon keys ONLY work against hackathon.api.qloo.com (staging/prod 401).

import { BrandAffinity, InsightsResult, QlooClient, TasteSignal } from "./types";

/**
 * Pre-resolved tag URNs for the demo personas' fixed interest vocabularies
 * (resolved once via /v2/tags on 2026-10-17). This keeps /generate-all to
 * 3 API calls (one /v2/insights per persona) instead of ~18, staying well
 * under the hackathon key's rate limit. Custom free-text interests still
 * resolve live via /v2/tags and populate the runtime cache above.
 */
const PRESET_TAG_URNS: Array<[string, string]> = [
  ["jazz", "urn:tag:genre:music:jazz"],
  ["vinyl", "urn:tag:category:place:vinyl_sign_shop"],
  ["espresso", "urn:tag:menu_highlight:qloo:espresso"],
  ["live-music", "urn:tag:good_for:qloo:live_music"],
  ["photography", "urn:tag:genre:media:photography"],
  ["streetwear", "urn:tag:ambience:qloo:streetwear_culture_influence"],
  ["sneakers", "urn:tag:genre:brand:fashion:footwear:sneakers"],
  ["hip-hop", "urn:tag:genre:media:hip_hop"],
  ["skate", "urn:tag:genre:music:skate"],
  ["urban", "urn:tag:setting:qloo:urban"],
  ["minimalism", "urn:tag:genre:music:minimalism"],
  ["japandi", "urn:tag:decor:qloo:japandi"],
  ["functional", "urn:tag:decor:qloo:functional"],
  ["design", "urn:tag:genre:media:design"],
  ["tea", "urn:tag:genre:media:tea"],
];

// Best-effort mapping from the live wire format to our internal BrandAffinity.
// Re-validate field names against the live API once the key arrives; the mock
// already returns this internal shape, so only this mapper may need tweaks.
function mapEntity(raw: any): BrandAffinity {
  return {
    entityId: String(raw.entity_id ?? raw.id ?? raw.name),
    name: String(raw.name ?? "Unknown"),
    affinity: Number(raw.affinity ?? raw.query?.affinity ?? 0),
    popularity: Number(raw.popularity ?? raw.metrics?.popularity ?? 0),
    tags: Array.isArray(raw.tags) ? raw.tags.map((t: any) => String(t?.name ?? t)) : [],
  };
}

export class LiveQlooClient implements QlooClient {
  constructor(private apiKey: string, private baseUrl: string) {}

  /** Tag URN cache: word -> URN. Interest vocabularies are small and stable. */
  private tagCache = new Map<string, string>(PRESET_TAG_URNS);

  private async get(url: string, retries = 3): Promise<any> {
    let lastErr: any = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url, { headers: { "X-Api-Key": this.apiKey } });
      if (res.ok) return res.json();
      const body = await res.text().catch(() => "");
      lastErr = new Error(`Qloo API error ${res.status}: ${body.slice(0, 300)}`);
      // Retry on 429 with exponential backoff; fail fast on everything else.
      if (res.status !== 429 || attempt === retries) break;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    }
    throw lastErr;
  }

  /** Resolve free-form interest words to Qloo tag URNs via /v2/tags. */
  private async resolveTagUrns(interests: string[]): Promise<string[]> {
    const urns: string[] = [];
    for (const word of interests.slice(0, 5)) {
      const cached = this.tagCache.get(word);
      if (cached) {
        urns.push(cached);
        continue;
      }
      try {
        const params = new URLSearchParams({ "filter.query": word, take: "1" });
        const json = await this.get(`${this.baseUrl}/v2/tags?${params.toString()}`);
        const tag = json?.results?.tags?.[0];
        if (tag?.id) {
          const urn = String(tag.id);
          this.tagCache.set(word, urn);
          urns.push(urn);
        }
      } catch {
        // Skip unresolvable words; insights still works with fewer tags.
      }
    }
    return urns;
  }

  async getBrandAffinities(signal: TasteSignal, limit = 6): Promise<InsightsResult> {
    if (!this.apiKey) {
      throw new Error("QLOO_API_KEY is not set — cannot use live mode.");
    }
    // Resolve persona interests (or custom tags) to real Qloo tag URNs so the
    // insights call carries an actual taste signal instead of an empty query.
    const tagUrns = await this.resolveTagUrns(signal.interests);
    const params = new URLSearchParams({
      "filter.type": "urn:entity:brand",
      take: String(limit),
    });
    // Qloo expects a single comma-separated signal.interests.tags param.
    if (tagUrns.length) params.set("signal.interests.tags", tagUrns.join(","));
    const url = `${this.baseUrl}/v2/insights?${params.toString()}`;
    const json: any = await this.get(url);
    const rawEntities: any[] = json?.results?.entities ?? json?.entities ?? [];
    const entities = rawEntities.slice(0, limit).map(mapEntity);
    return { signal, filterType: "urn:entity:brand", entities, mocked: false };
  }
}
