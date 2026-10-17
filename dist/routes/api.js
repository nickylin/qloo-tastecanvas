"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApiRouter = buildApiRouter;
const express_1 = require("express");
const creativeDirector_1 = require("../agent/creativeDirector");
const generator_1 = require("../image/generator");
const personas_1 = require("../data/personas");
function buildApiRouter(config, qloo) {
    const r = (0, express_1.Router)();
    r.get("/health", (_req, res) => {
        res.json({
            ok: true,
            qlooMode: config.qlooMode,
            imageMode: config.imageMode,
            qlooKeyPresent: config.qlooApiKey.length > 0,
        });
    });
    r.get("/personas", (_req, res) => {
        res.json({ personas: Object.values(personas_1.PERSONAS), products: personas_1.PRODUCTS });
    });
    // Generate one personalized ad for a taste signal.
    r.post("/generate", async (req, res) => {
        try {
            const { personaId, interests } = req.body ?? {};
            const signal = {
                personaId: typeof personaId === "string" ? personaId : undefined,
                interests: Array.isArray(interests) ? interests.filter((t) => typeof t === "string") : [],
            };
            if (!signal.personaId && signal.interests.length === 0) {
                res.status(400).json({ error: "provide personaId or interests[]" });
                return;
            }
            const out = await (0, creativeDirector_1.runCreativeDirector)(qloo, signal);
            const image = await (0, generator_1.generateAdImage)({
                visualPrompt: out.angle.visualPrompt,
                label: out.angle.product,
                accentColor: out.angle.accentColor,
            }, config.imageMode, config.imageProvider === "gemini" ? config.geminiApiKey : config.minimaxApiKey, { provider: config.imageProvider });
            res.json({
                persona: { id: out.profile.personaId, name: out.profile.personaName },
                interests: out.profile.interests,
                topBrands: out.insights.entities.map((e) => ({
                    name: e.name,
                    affinity: e.affinity,
                    popularity: e.popularity,
                    tags: e.tags,
                })),
                qlooMocked: out.insights.mocked,
                ad: {
                    product: out.angle.product,
                    angle: out.angle.angle,
                    rationale: out.angle.rationale,
                    headline: out.angle.copyHeadline,
                    subline: out.angle.copySubline,
                    imageSrc: image.src,
                    imageMocked: image.mocked,
                    accentColor: out.angle.accentColor,
                },
                trace: out.trace,
            });
        }
        catch (err) {
            console.error("[/api/generate]", err?.message ?? err);
            res.status(500).json({ error: err?.message ?? "generation failed" });
        }
    });
    // Convenience: generate for all three preset personas at once (the demo's
    // side-by-side comparison).
    r.post("/generate-all", async (_req, res) => {
        try {
            const results = [];
            let anyMocked = false;
            for (const personaId of Object.keys(personas_1.PERSONAS)) {
                const out = await (0, creativeDirector_1.runCreativeDirector)(qloo, { personaId, interests: [] });
                if (out.insights.mocked)
                    anyMocked = true;
                const image = await (0, generator_1.generateAdImage)({
                    visualPrompt: out.angle.visualPrompt,
                    label: out.angle.product,
                    accentColor: out.angle.accentColor,
                }, config.imageMode, config.imageProvider === "gemini" ? config.geminiApiKey : config.minimaxApiKey, { provider: config.imageProvider });
                results.push({
                    persona: { id: personaId, name: out.profile.personaName },
                    interests: out.profile.interests,
                    topBrands: out.insights.entities.slice(0, 3).map((e) => ({
                        name: e.name,
                        affinity: e.affinity,
                    })),
                    ad: {
                        product: out.angle.product,
                        angle: out.angle.angle,
                        rationale: out.angle.rationale,
                        headline: out.angle.copyHeadline,
                        subline: out.angle.copySubline,
                        imageSrc: image.src,
                        imageMocked: image.mocked,
                        accentColor: out.angle.accentColor,
                    },
                });
            }
            res.json({ results, qlooMocked: anyMocked });
        }
        catch (err) {
            console.error("[/api/generate-all]", err?.message ?? err);
            res.status(500).json({ error: err?.message ?? "generation failed" });
        }
    });
    return r;
}
