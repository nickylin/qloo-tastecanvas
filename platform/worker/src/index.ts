// TasteCanvas Cloudflare Worker entry.
// Serves the /api/* routes; static frontend comes from Workers Static Assets.
// Secrets (QLOO_API_KEY, MINIMAX_API_KEY) are Worker secrets set in the dashboard.

import { LiveQlooClient } from "../../../src/qloo/client";
import { MockQlooClient } from "../../../src/qloo/mock";
import { QlooClient } from "../../../src/qloo/types";
import { runCreativeDirector } from "../../../src/agent/creativeDirector";
import { PERSONAS, PRODUCTS } from "../../../src/data/personas";
import { generateAdImageDataUri } from "../../../src/image/generator";

interface Env {
  QLOO_API_KEY?: string;
  MINIMAX_API_KEY?: string;
  QLOO_MODE?: string;
  IMAGE_MODE?: string;
  ASSETS: Fetcher;
}

function qlooClient(env: Env): { client: QlooClient; live: boolean } {
  const live = (env.QLOO_MODE ?? "live").toLowerCase() === "live" && !!env.QLOO_API_KEY;
  const client: QlooClient = live
    ? new LiveQlooClient(env.QLOO_API_KEY as string, "https://hackathon.api.qloo.com")
    : new MockQlooClient();
  return { client, live };
}

function imageLive(env: Env): boolean {
  return (env.IMAGE_MODE ?? "live").toLowerCase() === "live" && !!env.MINIMAX_API_KEY;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!path.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      // GET /api/health
      if (path === "/api/health" && request.method === "GET") {
        const { live } = qlooClient(env);
        return json({
          ok: true,
          qlooMode: live ? "live" : "mock",
          imageMode: imageLive(env) ? "live" : "mock",
          qlooKeyPresent: !!env.QLOO_API_KEY,
        });
      }

      // GET /api/personas
      if (path === "/api/personas" && request.method === "GET") {
        return json({ personas: Object.values(PERSONAS), products: PRODUCTS });
      }

      // POST /api/generate
      if (path === "/api/generate" && request.method === "POST") {
        const body = (await request.json().catch(() => ({}))) as any;
        const signal = {
          personaId: typeof body.personaId === "string" ? body.personaId : undefined,
          interests: Array.isArray(body.interests)
            ? body.interests.filter((t: unknown) => typeof t === "string")
            : [],
          product:
            body.product && typeof body.product.name === "string" && body.product.name.trim()
              ? {
                  name: body.product.name,
                  blurb:
                    typeof body.product.blurb === "string" ? body.product.blurb : undefined,
                }
              : undefined,
        };
        if (!signal.personaId && signal.interests.length === 0) {
          return json({ error: "provide personaId or interests[]" }, 400);
        }
        const { client, live } = qlooClient(env);
        const out = await runCreativeDirector(client, signal);
        const image = imageLive(env)
          ? await generateAdImageDataUri(
              {
                visualPrompt: out.angle.visualPrompt,
                label: out.angle.product,
                accentColor: out.angle.accentColor,
              },
              env.MINIMAX_API_KEY
            )
          : {
              src: "",
              mocked: true,
              brief: {
                visualPrompt: out.angle.visualPrompt,
                label: out.angle.product,
                accentColor: out.angle.accentColor,
              },
            };
        return json({
          persona: { id: out.profile.personaId, name: out.profile.personaName },
          interests: out.profile.interests,
          topBrands: out.insights.entities.map((e) => ({
            name: e.name,
            affinity: e.affinity,
            popularity: e.popularity,
            tags: e.tags,
          })),
          qlooMocked: !live || out.insights.mocked,
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

      // POST /api/generate-all
      if (path === "/api/generate-all" && request.method === "POST") {
        const body = (await request.json().catch(() => ({}))) as any;
        const productOverride =
          body.product && typeof body.product.name === "string" && body.product.name.trim()
            ? {
                name: body.product.name,
                blurb: typeof body.product.blurb === "string" ? body.product.blurb : undefined,
              }
            : undefined;
        const { client, live } = qlooClient(env);
        const imgLive = imageLive(env);
        const results = [];
        let anyMocked = !live;
        for (const personaId of Object.keys(PERSONAS)) {
          const out = await runCreativeDirector(client, {
            personaId,
            interests: [],
            product: productOverride,
          });
          if (out.insights.mocked) anyMocked = true;
          const image = imgLive
            ? await generateAdImageDataUri(
                {
                  visualPrompt: out.angle.visualPrompt,
                  label: out.angle.product,
                  accentColor: out.angle.accentColor,
                },
                env.MINIMAX_API_KEY
              )
            : {
                src: "",
                mocked: true,
                brief: {
                  visualPrompt: out.angle.visualPrompt,
                  label: out.angle.product,
                  accentColor: out.angle.accentColor,
                },
              };
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
        return json({ results, qlooMocked: anyMocked });
      }

      return json({ error: "not found" }, 404);
    } catch (err: any) {
      return json({ error: err?.message ?? "generation failed" }, 500);
    }
  },
};
