// Central config. All secrets come from environment variables — nothing is
// hardcoded here or anywhere else in the codebase.
export interface AppConfig {
  port: number;
  qlooMode: "mock" | "live";
  qlooApiKey: string;
  qlooBaseUrl: string;
  imageMode: "mock" | "live";
  imageProvider: "minimax" | "gemini";
  geminiApiKey: string;
  minimaxApiKey: string;
}

function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export function loadConfig(): AppConfig {
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
