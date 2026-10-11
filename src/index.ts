import express from "express";
import path from "path";
import { loadConfig } from "./config";
import { createQlooClient } from "./qloo";
import { buildApiRouter } from "./routes/api";

const config = loadConfig();
const qloo = createQlooClient(config);

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api", buildApiRouter(config, qloo));

app.listen(config.port, () => {
  console.log(`TasteCanvas listening on http://localhost:${config.port}`);
  console.log(`  qloo : ${config.qlooMode}${config.qlooMode === "live" && !config.qlooApiKey ? " (WARNING: no key!)" : ""}`);
  console.log(`  image: ${config.imageMode}`);
});
