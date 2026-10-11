import { Router } from "express";
import { AppConfig } from "../config";
import { runCreativeDirector } from "../agent/creativeDirector";
import { generateAdImage } from "../image/generator";
import { PERSONAS, PRODUCTS } from "../data/personas";
import { QlooClient, TasteSignal } from "../qloo/types";

export function buildApiRouter(config: AppConfig, qloo: QlooClient): Router {
  const r = Router();

  r.get("/health", (_req, res) => {
    res.json({
      ok: true,
      qlooMode: config.qlooMode,
      imageMode: config.imageMode,
      qlooKeyPresent: config.qlooApiKey.length > 0,
    });
  });

  r.get("/personas", (_req, res) => {
    res.json({ personas: Object.values(PERSONAS), products: PRODUCTS });
  });

  // Generate one personalized ad for a taste signal.
  r.post("/generate", async (req, res) => {
    try {
      const { personaId, interests } = req.body ?? {};
      const signal: TasteSignal = {
        personaId: typeof personaId === "string" ? personaId : undefined,
        interests: Array.isArray(interests) ? interests.filter((t) => typeof t === "string") : [],
      };
      if (!signal.personaId && signal.interests.length === 0) {
        res.status(400).json({ error: "provide personaId or interests[]" });
        return;
      }

      const out = await runCreativeDirector(qloo, signal);
      const image = await generateAdImage(
        {
          visualPrompt: out.angle.visualPrompt,
          label: out.angle.product,
          accentColor: out.angle.accentColor,
        },
        config.imageMode
      );

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
    } catch (err: any) {
      console.error("[/api/generate]", err?.message ?? err);
      res.status(500).json({ error: err?.message ?? "generation failed" });
    }
  });

  // Convenience: generate for all three preset personas at once (the demo's
  // side-by-side comparison).
  r.post("/generate-all", async (_req, res) => {
    try {
      const results = [];
      for (const personaId of Object.keys(PERSONAS)) {
        const out = await runCreativeDirector(qloo, { personaId, interests: [] });
        const image = await generateAdImage(
          {
            visualPrompt: out.angle.visualPrompt,
            label: out.angle.product,
            accentColor: out.angle.accentColor,
          },
          config.imageMode
        );
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
      res.json({ results, qlooMocked: true });
    } catch (err: any) {
      console.error("[/api/generate-all]", err?.message ?? err);
      res.status(500).json({ error: err?.message ?? "generation failed" });
    }
  });

  return r;
}
