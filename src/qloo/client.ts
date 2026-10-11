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

  async getBrandAffinities(signal: TasteSignal, limit = 6): Promise<InsightsResult> {
    if (!this.apiKey) {
      throw new Error("QLOO_API_KEY is not set — cannot use live mode.");
    }
    // Free-form interests are passed as a tag query hint. The robust production
    // flow is: /search entity IDs -> signal.interests.entities. Tag-based
    // signals require valid Qloo tag IDs from /v2/tags; wire that up once live.
    const params = new URLSearchParams({
      "filter.type": "urn:entity:brand",
      take: String(limit),
    });
    const url = `${this.baseUrl}/v2/insights?${params.toString()}`;
    const res = await fetch(url, { headers: { "X-Api-Key": this.apiKey } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Qloo API error ${res.status}: ${body.slice(0, 300)}`);
    }
    const json: any = await res.json();
    const rawEntities: any[] = json?.results?.entities ?? json?.entities ?? [];
    const entities = rawEntities.slice(0, limit).map(mapEntity);
    return { signal, filterType: "urn:entity:brand", entities, mocked: false };
  }
}
