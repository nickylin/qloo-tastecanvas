"use strict";
// Ad image generation.
// Interface mirrors Nic's Nano Banana pattern from
// nickylin/awesome-nano-banana-examples (google-genai SDK):
//   model = "gemini-2.5-flash-image-preview"
//   response_modalities = ["IMAGE", "TEXT"], stream chunks, inline_data -> file
//
// Mock mode renders a deterministic SVG placeholder so the whole pipeline runs
// end-to-end with zero keys. Flip IMAGE_MODE=live to use a real model.
// IMAGE_PROVIDER picks the backend: "minimax" (default, MiniMax image-01 via
// MINIMAX_API_KEY) or "gemini" (legacy Nano Banana path via GEMINI_API_KEY;
// free tier is dead as of 2026-10-17, needs billing).
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAdImage = generateAdImage;
function svgPlaceholder(brief) {
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const words = esc(brief.visualPrompt).split(/\s+/).slice(0, 26).join(" ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">` +
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
async function generateAdImage(brief, mode, apiKey, opts) {
    if (mode === "live") {
        const provider = opts?.provider ?? "minimax";
        return provider === "gemini"
            ? generateLiveImage(brief, apiKey)
            : generateMiniMaxImage(brief, apiKey);
    }
    // Mock: small artificial delay so the UI progress state is exercised.
    await new Promise((r) => setTimeout(r, 400));
    return { src: svgPlaceholder(brief), mocked: true, brief };
}
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
// MiniMax image-01 (China platform). Synchronous; returns base64 JPEGs.
// Docs: https://platform.minimax.io/docs/guides/image-generation
// Verified live 2026-10-17: status_code 0, data.image_base64[0].
const MINIMAX_IMAGE_URL = "https://api.minimaxi.com/v1/image_generation";
const MINIMAX_IMAGE_MODEL = "image-01";
async function generateMiniMaxImage(brief, apiKey) {
    if (!apiKey) {
        throw new Error("IMAGE_MODE=live with IMAGE_PROVIDER=minimax requires MINIMAX_API_KEY to be set.");
    }
    const prompt = `Generate a single advertising creative image (portrait 3:4) for this brief. ` +
        `Photorealistic or high-end illustration style, no text overlays, no watermark. ` +
        `Brief: ${brief.visualPrompt}`;
    const resp = await fetch(MINIMAX_IMAGE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MINIMAX_IMAGE_MODEL,
            prompt: prompt.slice(0, 1500),
            aspect_ratio: "3:4",
            response_format: "base64",
            n: 1,
        }),
    });
    if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(`MiniMax image API ${resp.status}: ${errText.slice(0, 200)}`);
    }
    const data = (await resp.json());
    const baseResp = data?.base_resp ?? {};
    if (baseResp.status_code !== 0) {
        throw new Error(`MiniMax image API error ${baseResp.status_code}: ${(baseResp.status_msg ?? "").toString().slice(0, 200)}`);
    }
    const b64 = data?.data?.image_base64?.[0];
    if (!b64) {
        throw new Error("MiniMax returned no image data.");
    }
    // Persist under public/ads so the frontend can <img src="/ads/..."> it.
    const fs = await Promise.resolve().then(() => __importStar(require("fs")));
    const path = await Promise.resolve().then(() => __importStar(require("path")));
    const dir = path.join(__dirname, "..", "..", "public", "ads");
    fs.mkdirSync(dir, { recursive: true });
    const fname = `ad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    fs.writeFileSync(path.join(dir, fname), Buffer.from(b64, "base64"));
    return { src: `/ads/${fname}`, mocked: false, brief };
}
async function generateLiveImage(brief, apiKey) {
    if (!apiKey) {
        throw new Error("IMAGE_MODE=live requires GEMINI_API_KEY to be set.");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent` +
        `?key=${encodeURIComponent(apiKey)}`;
    const prompt = `Generate a single advertising creative image (portrait 3:4) for this brief. ` +
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
    const data = (await resp.json());
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p?.inlineData?.data);
    if (!imgPart) {
        throw new Error("Gemini returned no image data (safety block or empty response).");
    }
    const mime = imgPart.inlineData.mimeType || "image/png";
    const b64 = imgPart.inlineData.data;
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    // Persist under public/ads so the frontend can <img src="/ads/..."> it.
    const fs = await Promise.resolve().then(() => __importStar(require("fs")));
    const path = await Promise.resolve().then(() => __importStar(require("path")));
    const dir = path.join(__dirname, "..", "..", "public", "ads");
    fs.mkdirSync(dir, { recursive: true });
    const fname = `ad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    fs.writeFileSync(path.join(dir, fname), Buffer.from(b64, "base64"));
    return { src: `/ads/${fname}`, mocked: false, brief };
}
