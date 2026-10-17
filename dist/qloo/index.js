"use strict";
// THE ONE-LINE SWITCH.
// Everything downstream depends on the QlooClient interface, never on a
// concrete class. Flip QLOO_MODE in .env from "mock" to "live" once the
// hackathon key arrives — no other code changes needed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQlooClient = createQlooClient;
const client_1 = require("./client");
const mock_1 = require("./mock");
function createQlooClient(config) {
    if (config.qlooMode === "live") {
        console.log("[qloo] LIVE mode — hitting hackathon.api.qloo.com");
        return new client_1.LiveQlooClient(config.qlooApiKey, config.qlooBaseUrl);
    }
    console.log("[qloo] MOCK mode — set QLOO_MODE=live + QLOO_API_KEY to go live");
    return new mock_1.MockQlooClient();
}
