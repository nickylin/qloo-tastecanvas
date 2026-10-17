"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
function env(name, fallback = "") {
    return process.env[name] ?? fallback;
}
function loadConfig() {
    const qlooMode = env("QLOO_MODE", "mock").toLowerCase();
    const imageMode = env("IMAGE_MODE", "mock").toLowerCase();
    const imageProvider = env("IMAGE_PROVIDER", "minimax").toLowerCase();
    return {
        port: parseInt(env("PORT", "3000"), 10),
        qlooMode: qlooMode === "live" ? "live" : "mock",
        qlooApiKey: env("QLOO_API_KEY"),
        // Hackathon keys ONLY work against the hackathon base URL (per Qloo docs).
        qlooBaseUrl: env("QLOO_BASE_URL", "https://hackathon.api.qloo.com"),
        imageMode: imageMode === "live" ? "live" : "mock",
        imageProvider: imageProvider === "gemini" ? "gemini" : "minimax",
        geminiApiKey: env("GEMINI_API_KEY"),
        minimaxApiKey: env("MINIMAX_API_KEY"),
    };
}
