"use strict";
// Types mirroring the real Qloo /v2/insights API shape (hackathon edition).
//
// Real request (per https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide):
//   GET {base}/v2/insights?filter.type=urn:entity:brand&signal.interests.tags=<tag_ids>
//   Header: X-Api-Key: <key>      (NOT Bearer, NOT query param)
//   filter.type is REQUIRED. Supported: urn:entity:brand | artist | movie |
//   tv_show | podcast | book | place | destination | person | video_game
//
// Real response concept (docs): ranked entities with affinity 0..1 and popularity.
// Exact wire field names should be re-validated against the live API once the key
// arrives; the internal `BrandAffinity` shape below is what the rest of the app
// consumes, and the live client maps the wire format onto it.
Object.defineProperty(exports, "__esModule", { value: true });
