"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const qloo_1 = require("./qloo");
const api_1 = require("./routes/api");
const config = (0, config_1.loadConfig)();
const qloo = (0, qloo_1.createQlooClient)(config);
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "256kb" }));
app.use(express_1.default.static(path_1.default.join(__dirname, "..", "public")));
app.use("/api", (0, api_1.buildApiRouter)(config, qloo));
app.listen(config.port, () => {
    console.log(`TasteCanvas listening on http://localhost:${config.port}`);
    console.log(`  qloo : ${config.qlooMode}${config.qlooMode === "live" && !config.qlooApiKey ? " (WARNING: no key!)" : ""}`);
    console.log(`  image: ${config.imageMode}`);
});
