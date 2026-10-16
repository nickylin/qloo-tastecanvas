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

export async function generateAdImage(
  brief: ImageBrief,
  mode: "mock" | "live",
  apiKey?: string
): Promise<GeneratedImage> {
  if (mode === "live") {
    return generateLiveImage(brief, apiKey);
  }
  // Mock: small artificial delay so the UI progress state is exercised.
  await new Promise((r) => setTimeout(r, 400));
  return { src: svgPlaceholder(brief), mocked: true, brief };
}

const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

async function generateLiveImage(brief: ImageBrief, apiKey?: string): Promise<GeneratedImage> {
  if (!apiKey) {
    throw new Error("IMAGE_MODE=live requires GEMINI_API_KEY to be set.");
  }
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const prompt =
    `Generate a single advertising creative image (portrait 3:4) for this brief. ` +
    `Photorealistic or high-end illustration style, no text overlays, no watermark. ` +
    `Brief: ${brief.visualPrompt}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Gemini image API ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await resp.json()) as any;
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p?.inlineData?.data);
  if (!imgPart) {
    throw new Error("Gemini returned no image data (safety block or empty response).");
  }
  const mime: string = imgPart.inlineData.mimeType || "image/png";
  const b64: string = imgPart.inlineData.data;
  const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";

  // Persist under public/ads so the frontend can <img src="/ads/..."> it.
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.join(__dirname, "..", "..", "public", "ads");
  fs.mkdirSync(dir, { recursive: true });
  const fname = `ad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(dir, fname), Buffer.from(b64, "base64"));
  return { src: `/ads/${fname}`, mocked: false, brief };
}
