// TasteCanvas frontend — no build step, plain JS. English UI for US judges.
// Backend may return Chinese display strings; we map known ids to English.

const $ = (id) => document.getElementById(id);

const EN_PERSONAS = {
  "jazz-lover": { name: "Jazz Lover", tagline: "Vinyl, late-night radio, craft espresso" },
  "streetwear-fan": { name: "Streetwear Fan", tagline: "Sneakers, skateboarding, city nightlife" },
  minimalist: { name: "Minimalist", tagline: "Negative space, functionalism, Japandi calm" },
};

const EN_PRODUCTS = {
  "cloudrunner-sneaker": { name: "CloudRunner Sneaker", blurb: "Featherlight everyday runner" },
};

const enPersona = (p) => ({
  ...p,
  name: (EN_PERSONAS[p.id] || {}).name || p.name,
  tagline: (EN_PERSONAS[p.id] || {}).tagline || p.tagline,
});

const enProduct = (p) => ({
  ...p,
  name: (EN_PRODUCTS[p.id] || {}).name || p.name,
  blurb: (EN_PRODUCTS[p.id] || {}).blurb || p.blurb,
});

let PERSONAS = [];
let generating = false;

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${body.slice(0, 120)}`);
  }
  return res.json();
}

function setBusy(on) {
  generating = on;
  $("btnAll").disabled = on;
  document.querySelectorAll(".persona-card").forEach((c) => c.classList.toggle("busy", on));
}

/* ---------------- persona strip ---------------- */

function renderPersonaStrip(personas) {
  const wrap = $("personaStrip");
  wrap.innerHTML = "";
  personas.forEach((raw) => {
    const p = enPersona(raw);
    const c = document.createElement("div");
    c.className = "persona-card";
    c.style.setProperty("--accent", p.accentColor);
    c.setAttribute("role", "button");
    c.setAttribute("tabindex", "0");
    c.title = `Regenerate ad for ${p.name}`;
    c.innerHTML = `
      <div class="row">
        <div class="emoji">${p.emoji}</div>
        <div><h3>${esc(p.name)}</h3></div>
      </div>
      <p class="tag">${esc(p.tagline)}</p>
      <div class="regen">↻ Click to regenerate this persona's ad</div>`;
    c.onclick = () => generateOne(p.id);
    c.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); generateOne(p.id); } };
    wrap.appendChild(c);
  });
}

/* ---------------- ad cards ---------------- */

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function brandRows(brands, delayBase) {
  return (brands || []).slice(0, 3).map((b, i) => {
    const pct = Math.round((b.affinity || 0) * 100);
    return `
      <div class="brand-row">
        <div class="meta"><span>${esc(b.name)}</span><span class="score">${pct}%</span></div>
        <div class="bar"><i data-w="${pct}" style="transition-delay:${delayBase + i * 120}ms"></i></div>
      </div>`;
  }).join("");
}

function adCard(item, index) {
  const p = enPersona({ id: item.persona.id, name: item.persona.name, emoji: personaEmoji(item.persona.id), accentColor: item.ad.accentColor });
  const el = document.createElement("article");
  el.className = "ad-card";
  el.dataset.persona = item.persona.id;
  el.style.setProperty("--accent", item.ad.accentColor || "#7c6cf0");
  el.style.animationDelay = `${index * 110}ms`;
  el.innerHTML = `
    <div class="ad-persona">
      <div class="emoji">${p.emoji}</div>
      <div class="who"><b>${esc(p.name)}</b><span>${esc((item.interests || []).slice(0, 3).join(" · "))}</span></div>
      <span class="ai-tag">AI personalized</span>
    </div>
    <div class="ad-img-wrap">
      <img src="${item.ad.imageSrc}" alt="Generated ad for ${esc(p.name)}" loading="lazy" />
      ${item.ad.imageMocked ? `<span class="mock-ribbon">MOCK VISUAL</span>` : ""}
    </div>
    <div class="ad-body">
      <h3>${esc(item.ad.headline)}</h3>
      <p class="subline">${esc(item.ad.subline)}</p>
      <span class="angle-pill">✦ ${esc(item.ad.angle)}</span>
      <div class="brands">
        <div class="brands-title">Qloo brand affinity</div>
        ${brandRows(item.topBrands, 350 + index * 110)}
      </div>
      ${item.ad.rationale ? `<details><summary>Why this angle?</summary><p>${esc(item.ad.rationale)}</p></details>` : ""}
      <div class="ad-foot">
        <button class="btn ghost regen-btn" style="--accent:${item.ad.accentColor}">↻ Regenerate</button>
      </div>
    </div>`;
  el.querySelector(".regen-btn").onclick = () => generateOne(item.persona.id);
  // animate brand bars after paint
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.querySelectorAll(".bar i").forEach((bar) => { bar.style.width = bar.dataset.w + "%"; });
  }));
  return el;
}

function personaEmoji(id) {
  const found = PERSONAS.find((p) => p.id === id);
  return found ? found.emoji : "✨";
}

function renderGallery(results) {
  const g = $("gallery");
  g.innerHTML = "";
  results.forEach((it, i) => g.appendChild(adCard(it, i)));
  const product = results[0]?.ad?.product;
  if (product) {
    $("galleryHint").innerHTML = `The same <strong>${esc(productNameEn(product))}</strong>, seen through three different tastes.`;
  }
}

function productNameEn(name) {
  for (const [id, en] of Object.entries(EN_PRODUCTS)) {
    if (name && name.includes(id.split("-")[0])) return en.name;
  }
  return name;
}

function skeletonCards(n) {
  const g = $("gallery");
  g.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "skeleton";
    s.style.animationDelay = `${i * 90}ms`;
    s.innerHTML = `
      <div class="sk-img shimmer"></div>
      <div class="sk-line shimmer"></div>
      <div class="sk-line short shimmer"></div>
      <div class="sk-line shimmer"></div>`;
    g.appendChild(s);
  }
}

/* ---------------- trace ---------------- */

function renderTrace(trace, single) {
  const box = $("traceBox");
  if (!trace || !trace.steps) {
    box.innerHTML = single
      ? `<span class="dim">Single-generation mode: the agent ran perceive → reason → generate → self-check.</span>`
      : `<span class="dim">Batch mode: each ad ran its own perceive → reason → generate → self-check pipeline.</span>`;
    return;
  }
  box.innerHTML = trace.steps.map((s) => `
    <div class="step"><b>${esc(s.name)}</b> <span class="dim">(attempt ${esc(s.attempt ?? 1)})</span><br/>${esc(s.detail)}</div>
  `).join("") + `
    <div class="step"><span class="${trace.passed ? "ok" : "warn"}">self-check ${trace.passed ? "passed" : "needed fixes"}</span>
    <span class="dim"> · retries=${trace.retries ?? 0}</span></div>`;
}

/* ---------------- actions ---------------- */

async function generateAll() {
  if (generating) return;
  setBusy(true);
  skeletonCards(3);
  try {
    const data = await api("/api/generate-all", { method: "POST" });
    renderGallery(data.results);
    renderTrace(null, false);
  } catch (e) {
    $("gallery").innerHTML = `<div class="empty-state"><p>Generation failed: ${esc(e.message)}<br />Is the backend running?</p></div>`;
  } finally {
    setBusy(false);
  }
}

async function generateOne(personaId) {
  if (generating) return;
  setBusy(true);
  // replace that persona's card (if present) with a skeleton
  const existing = document.querySelector(`.ad-card[data-persona="${personaId}"]`);
  let placeholder = null;
  if (existing) {
    placeholder = document.createElement("div");
    placeholder.className = "skeleton";
    placeholder.innerHTML = `<div class="sk-img shimmer"></div><div class="sk-line shimmer"></div><div class="sk-line short shimmer"></div>`;
    existing.replaceWith(placeholder);
  } else {
    skeletonCards(1);
  }
  try {
    const data = await api("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId }),
    });
    const card = adCard(data, 0);
    if (placeholder) placeholder.replaceWith(card);
    else { $("gallery").innerHTML = ""; $("gallery").appendChild(card); }
    renderTrace(data.trace, true);
  } catch (e) {
    if (placeholder) placeholder.outerHTML = `<div class="empty-state"><p>Generation failed: ${esc(e.message)}</p></div>`;
    else $("gallery").innerHTML = `<div class="empty-state"><p>Generation failed: ${esc(e.message)}</p></div>`;
  } finally {
    setBusy(false);
  }
}

/* ---------------- init ---------------- */

async function init() {
  try {
    const h = await api("/api/health");
    const live = h.qlooMode === "live";
    $("modeText").textContent = live ? "Qloo LIVE" : "Qloo MOCK · waiting for API key";
    $("modeBadge").classList.add(live ? "live" : "mock");
    $("footMode").textContent = `qloo=${h.qlooMode} · image=${h.imageMode}`;
  } catch {
    $("modeText").textContent = "Backend not connected";
  }

  try {
    const { personas, products } = await api("/api/personas");
    PERSONAS = personas || [];
    renderPersonaStrip(PERSONAS);
    const prod = enProduct((products || [])[0] || {});
    if (prod.name) {
      $("productChip").innerHTML = `Demo product: <strong>${esc(prod.name)}</strong> · ${esc(prod.blurb)}`;
    }
  } catch (e) {
    $("personaStrip").innerHTML = `<div class="empty-state"><p>Could not load personas: ${esc(e.message)}</p></div>`;
  }

  $("btnAll").onclick = generateAll;
}

init();
