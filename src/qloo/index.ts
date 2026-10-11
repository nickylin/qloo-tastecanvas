// THE ONE-LINE SWITCH.
// Everything downstream depends on the QlooClient interface, never on a
// concrete class. Flip QLOO_MODE in .env from "mock" to "live" once the
// hackathon key arrives — no other code changes needed.

import { AppConfig } from "../config";
import { LiveQlooClient } from "./client";
import { MockQlooClient } from "./mock";
import { QlooClient } from "./types";

export function createQlooClient(config: AppConfig): QlooClient {
  if (config.qlooMode === "live") {
    console.log("[qloo] LIVE mode — hitting hackathon.api.qloo.com");
    return new LiveQlooClient(config.qlooApiKey, config.qlooBaseUrl);
  }
  console.log("[qloo] MOCK mode — set QLOO_MODE=live + QLOO_API_KEY to go live");
  return new MockQlooClient();
}
