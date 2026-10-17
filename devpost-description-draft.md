# TasteCanvas — Devpost Submission Description (draft)

## Inspiration
Third-party cookies are dying, and demographic ad targeting is going with them. But "personalization" today still means guessing from age brackets and zip codes. We asked: what if an ad creative started from *taste* instead — the music you love, the films you rewatch, the subcultures you belong to? Qloo's Taste Graph makes that possible without touching any personal identity data.

## What it does
TasteCanvas is a taste-driven AI ad workshop. You pick a persona (Jazz Lover, Streetwear Fan, Minimalist — or describe your own tastes in free text), and a creative-director agent generates a complete, bespoke ad creative for the same product: a different product angle, different visual, different copy — per taste, side by side.

The demo moment: one sneaker, three tastes, three completely different ads. The jazz lover gets a late-night vinyl ritual. The streetwear fan gets a city energy drop. The minimalist gets quiet functional beauty.

## How we built it (Qloo-powered)
- **Taste understanding (Qloo):** Free-form taste signals are resolved to Qloo tag URNs and sent to the Qloo Insights API (`hackathon.api.qloo.com/v2/insights`). We pull cross-category brand affinities — no PII, no cookies, fully anonymous.
- **Creative-director agent:** A four-step pipeline (perceive → reason → generate → self-check) turns affinity data into creative decisions: which product to push, which angle, which visual brief, which headline. Every step leaves a visible decision trace in the UI.
- **Live generation:** Each ad visual is generated on the spot by an image model; copy is composed from the agent's brief. Nothing is pre-baked.
- **Stack:** TypeScript, Cloudflare Workers (API + static frontend in one deployment).

## What's Qloo-powered about it
Qloo isn't a garnish here — it's the steering wheel. The brand affinity ranking *is* the creative brief: it decides the product, the angle, and the mood. Swap the taste signal and you get a measurably different campaign, because the underlying taste graph says these audiences genuinely like different things. The agent's decision trace shows exactly which Qloo entities drove each choice.

## Try it
Live demo: https://tastecanvas-api.nickylin1023.workers.dev/
Hit "Generate all three ads" and watch the agent work.
