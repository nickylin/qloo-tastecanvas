// Ad image generation.
// Interface mirrors Nic's Nano Banana pattern from
// nickylin/awesome-nano-banana-examples (google-genai SDK):
//   model = "gemini-2.5-flash-image-preview"
//   response_modalities = ["IMAGE", "TEXT"], stream chunks, inline_data -> file
//
// Mock mode renders a deterministic SVG placeholder so the whole pipeline runs
// end-to-end with zero keys. Flip IMAGE_MODE=live + GEMINI_API_KEY to use the
// real model (JS SDK: @google/genai — same call shape as the Python example).

export interface ImageBrief {
  /** Full prompt describing the ad visual, e.g. "moody jazz club, vinyl..." */
  visualPrompt: string;
  /** Short label shown on the mock placeholder */
  label: string;
  /** Accent color for the mock placeholder, e.g. "#1a1a2e" */
  accentColor: string;
}

export interface GeneratedImage {
  /** Data URI (mock) or URL/path (live) the frontend can <img> directly */
  src: string;
  /** true when this is a placeholder, not model output */
  mocked: boolean;
  brief: ImageBrief;
}

function svgPlaceholder(brief: ImageBrief): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const words = esc(brief.visualPrompt).split(/\s+/).slice(0, 26).join(" ");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${brief.accentColor}"/>` +
    `<stop offset="1" stop-color="#0d0d0f"/></linearGradient></defs>` +
    `<rect width="768" height="1024" fill="url(#g)"/>` +
    `<rect x="48" y="880" width="180" height="36" rx="18" fill="none" stroke="#ffffff" stroke-opacity="0.5"/>` +
    `<text x="138" y="904" font-family="sans-serif" font-size="20" fill="#ffffff" fill-opacity="0.7" text-anchor="middle">MOCK AD</text>` +
    `<text x="384" y="120" font-family="sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">${esc(brief.label)}</text>` +
    `<foreignObject x="84" y="420" width="600" height="320">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="color:#fff;opacity:.85;font-family:sans-serif;font-size:30px;line-height:1.5;text-align:center;">${words}…</div>` +
    `</foreignObject></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function generateAdImage(brief: ImageBrief, mode: "mock" | "live"): Promise<GeneratedImage> {
  if (mode === "live") {
    // TODO(key): implement with @google/genai, mirroring Nic's Python pattern:
    //   import { GoogleGenAI } from "@google/genai";
    //   const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    //   const resp = await ai.models.generateContent({
    //     model: "gemini-2.5-flash-image-preview",
    //     contents: brief.visualPrompt,
    //     config: { responseModalities: ["IMAGE", "TEXT"] },
    //   });
    //   // extract inlineData -> save under public/ads/ -> return { src: "/ads/....png" }
    throw new Error("IMAGE_MODE=live not wired yet — add GEMINI_API_KEY and implement per TODO above.");
  }
  // Mock: small artificial delay so the UI progress state is exercised.
  await new Promise((r) => setTimeout(r, 400));
  return { src: svgPlaceholder(brief), mocked: true, brief };
}
