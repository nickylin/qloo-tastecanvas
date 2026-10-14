// Creative Director agent pipeline implementation.
// Rule-based deciders today (zero keys needed); each decide*() is a drop-in
// point for an LLM call using STEP_PROMPTS when a key is available.

import { QlooClient, TasteSignal } from "../qloo/types";
import { PERSONAS, Product, PRODUCTS } from "../data/personas";
import { CreativeAngle, DirectorOutput, TasteProfile } from "./types";

// --- Step 1: PERCEIVE -------------------------------------------------------
function perceive(signal: TasteSignal): TasteProfile {
  const persona = signal.personaId ? PERSONAS[signal.personaId] : undefined;
  const interests = [
    ...(persona?.interests ?? []),
    ...signal.interests.map((t) => t.trim().toLowerCase()).filter(Boolean),
  ];
  const deduped = [...new Set(interests)].slice(0, 8);
  return {
    personaId: signal.personaId,
    personaName: persona?.name ?? "Custom taste",
    interests: deduped.length ? deduped : ["design", "music", "coffee"],
    summary: deduped.slice(0, 4).join(", ") || "eclectic taste",
  };
}

// --- Step 2: REASON ---------------------------------------------------------
const ANGLE_LIBRARY: Record<string, { angle: string; mood: string; accentColor: string }[]> = {
  "jazz-lover": [
    { angle: "late-night vinyl ritual", mood: "moody jazz club, warm tungsten light, vinyl textures", accentColor: "#8b5a2b" },
    { angle: "craft heritage story", mood: "atelier close-ups, brass and leather, shallow depth of field", accentColor: "#5c4a3a" },
  ],
  "streetwear-fan": [
    { angle: "city energy drop", mood: "bold urban night, neon accents, dynamic low angle", accentColor: "#d63c5e" },
    { angle: "skate-park authenticity", mood: "raw concrete textures, motion blur, golden hour", accentColor: "#e08a2e" },
  ],
  minimalist: [
    { angle: "quiet functional beauty", mood: "pure white studio, soft shadow, single object centered", accentColor: "#9aa5b1" },
    { angle: "less but better", mood: "japandi interior, natural light, negative space", accentColor: "#7d8a7a" },
  ],
};

const FALLBACK_ANGLES = [
  { angle: "everyday ritual upgrade", mood: "warm morning light, honest materials, lived-in scene", accentColor: "#6b8cae" },
  { angle: "designed for real life", mood: "clean lifestyle setting, natural textures", accentColor: "#8a9a7b" },
];

function pickProduct(): Product {
  // Demo product is fixed so the side-by-side comparison ("same product, three
  // tastes, three ads") holds. Catalog rotation is a one-line change.
  return PRODUCTS[0];
}

function reason(
  profile: TasteProfile,
  topBrand: { name: string; affinity: number; tags: string[] },
  constraintNote: string | null,
  attempt: number
): Omit<CreativeAngle, "visualPrompt" | "copyHeadline" | "copySubline"> {
  const product = pickProduct();
  const library = (profile.personaId && ANGLE_LIBRARY[profile.personaId]) || FALLBACK_ANGLES;
  // On retry, rotate to a different angle (obeys the constraint note).
  const pick = library[(attempt - 1) % library.length];
  const interest = profile.interests[0] ?? "good design";
  return {
    product: product.name,
    productBlurb: product.blurb,
    angle: pick.angle,
    rationale:
      `Qloo affinity ${topBrand.affinity.toFixed(2)} for ${topBrand.name} ` +
      `(${topBrand.tags.slice(0, 3).join(", ")}) places this taste world in ` +
      `"${pick.angle}" territory; anchoring on "${interest}".` +
      (constraintNote ? ` Retry note: ${constraintNote}` : ""),
    topBrand: {
      entityId: "",
      name: topBrand.name,
      affinity: topBrand.affinity,
      popularity: 0,
      tags: topBrand.tags,
    },
    accentColor: pick.accentColor,
  };
}

// --- Step 3: GENERATE -------------------------------------------------------
function generate(
  partial: Omit<CreativeAngle, "visualPrompt" | "copyHeadline" | "copySubline">,
  profile: TasteProfile
): CreativeAngle {
  const interest = profile.interests[0] ?? "design";
  const visualPrompt =
    `Advertising photograph for "${partial.product}". Creative angle: ${partial.angle}. ` +
    `Scene: ${moodFor(partial)}. Taste cues from the viewer's world: ${profile.interests.slice(0, 3).join(", ")}. ` +
    `Product hero, premium commercial photography, no visible text except tiny signage.`;
  return {
    ...partial,
    visualPrompt,
    copyHeadline: headlineFor(partial.angle, partial.product),
    copySubline: `${partial.productBlurb} — made for ${interest} people.`,
  };
}

function moodFor(a: { angle: string }): string {
  const all = [...Object.values(ANGLE_LIBRARY).flat(), ...FALLBACK_ANGLES];
  return all.find((x) => x.angle === a.angle)?.mood ?? "clean commercial photography";
}

function headlineFor(angle: string, product: string): string {
  const map: Record<string, string> = {
    "late-night vinyl ritual": "For nights that spin slow",
    "craft heritage story": "Built like they used to",
    "city energy drop": "Own the city",
    "skate-park authenticity": "No pose. Just ride",
    "quiet functional beauty": "Less, but better",
    "less but better": "Less, but better",
    "everyday ritual upgrade": "Upgrade the everyday",
    "designed for real life": "Designed for real life",
  };
  return `${map[angle] ?? "Made for you"} — ${product}`.slice(0, 60);
}

// --- Step 4: SELF-CHECK -----------------------------------------------------
function selfCheck(angle: CreativeAngle, profile: TasteProfile): string[] {
  const issues: string[] = [];
  if (!angle.visualPrompt.toLowerCase().includes(angle.product.toLowerCase().split(" ")[0])) {
    issues.push("visualPrompt does not name the product");
  }
  const mentionsInterest = profile.interests.some((i) =>
    angle.visualPrompt.toLowerCase().includes(i)
  );
  if (!mentionsInterest) issues.push("visualPrompt references no specific profile interest");
  if (angle.copyHeadline.split(/\s+/).length > 10) issues.push("headline too long");
  if (angle.copySubline.split(/\s+/).length > 20) issues.push("subline too long");
  return issues;
}

// --- Pipeline ---------------------------------------------------------------
const MAX_ATTEMPTS = 3;

export async function runCreativeDirector(
  qloo: QlooClient,
  signal: TasteSignal
): Promise<DirectorOutput> {
  const trace: DirectorOutput["trace"] = { steps: [], retries: 0, passed: false };

  const profile = perceive(signal);
  trace.steps.push({ name: "perceive", detail: `profile="${profile.summary}"`, attempt: 1 });

  // Pass the enriched interests (persona + custom) to Qloo, not the raw signal
  // which may carry an empty interests array when only personaId was given.
  const enrichedSignal: TasteSignal = { ...signal, interests: profile.interests };
  const insights = await qloo.getBrandAffinities(enrichedSignal, 6);
  const top = insights.entities[0] ?? { name: "Uniqlo", affinity: 0.7, tags: [] };
  trace.steps.push({
    name: "qloo",
    detail: `top brand=${top.name} affinity=${top.affinity.toFixed(2)} mocked=${insights.mocked}`,
    attempt: 1,
  });

  let angle: CreativeAngle | null = null;
  let constraintNote: string | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const partial = reason(profile, top, constraintNote, attempt);
    const candidate = generate(partial, profile);
    const issues = selfCheck(candidate, profile);
    trace.steps.push({
      name: attempt === 1 ? "reason+generate" : `reason+generate (retry ${attempt - 1})`,
      detail: `angle="${candidate.angle}" issues=[${issues.join("; ") || "none"}]`,
      attempt,
    });
    if (issues.length === 0) {
      angle = candidate;
      trace.passed = true;
      break;
    }
    constraintNote = issues.join("; ");
    trace.retries++;
    trace.steps.push({ name: "selfCheck", detail: `failed: ${constraintNote}`, attempt });
  }

  if (!angle) {
    // Last resort: accept the final candidate even if imperfect, flagged.
    const partial = reason(profile, top, "accept best effort", MAX_ATTEMPTS);
    angle = generate(partial, profile);
    trace.steps.push({ name: "selfCheck", detail: "max retries — accepting best effort", attempt: MAX_ATTEMPTS });
  }

  return { profile, insights, angle, trace };
}
