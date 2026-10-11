// TasteCanvas frontend — no build step, plain JS.
const $ = (id) => document.getElementById(id);

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function setLoading(on, text) {
  $("loadingPanel").classList.toggle("hidden", !on);
  if (text) $("loadingText").textContent = text;
  document.querySelectorAll(".btn").forEach((b) => (b.disabled = on));
}

function renderAdCard(item) {
  const brands = (item.topBrands || [])
    .map(
      (b) => `
      <div>${b.name} <span style="float:right">${(b.affinity * 100).toFixed(0)}%</span></div>
      <div class="bar"><i style="width:${(b.affinity * 100).toFixed(0)}%"></i></div>`
    )
    .join("");
  const el = document.createElement("div");
  el.className = "ad-card";
  el.innerHTML = `
    <img src="${item.ad.imageSrc}" alt="ad creative" />
    <div class="ad-body">
      <div class="persona">${item.persona.name} · ${item.interests.join(" / ")}</div>
      <h3>${item.ad.headline}</h3>
      <span class="angle" style="border:1px solid ${item.ad.accentColor}">创意角度：${item.ad.angle}</span>
      <p class="copy sub">${item.ad.subline}</p>
      <div class="brands"><strong>Qloo 品牌亲和度</strong>${brands}</div>
    </div>`;
  return el;
}

function showGallery(items, productName, traceHtml) {
  $("productName").textContent = productName;
  const g = $("gallery");
  g.innerHTML = "";
  items.forEach((it) => g.appendChild(renderAdCard(it)));
  $("galleryPanel").classList.remove("hidden");
  if (traceHtml) $("traceBox").innerHTML = traceHtml;
  $("galleryPanel").scrollIntoView({ behavior: "smooth" });
}

function traceHtml(trace) {
  if (!trace) return "";
  return trace.steps
    .map((s) => `<div class="step"><strong>${s.name}</strong> <span class="dim">(attempt ${s.attempt})</span><br/>${s.detail}</div>`)
    .join("") + `<div class="step">retries=${trace.retries} · passed=${trace.passed}</div>`;
}

async function init() {
  // service status
  try {
    const h = await api("/api/health");
    const live = h.qlooMode === "live";
    $("modeBadge").textContent = live ? "● Qloo LIVE" : "● Qloo MOCK（等 Key 接入）";
    $("modeBadge").classList.toggle("live", live);
    $("footMode").textContent = `qloo=${h.qlooMode} image=${h.imageMode}`;
  } catch {
    $("modeBadge").textContent = "● 后端未连接";
  }

  // personas
  try {
    const { personas } = await api("/api/personas");
    const wrap = $("personaCards");
    personas.forEach((p) => {
      const c = document.createElement("div");
      c.className = "persona-card";
      c.style.borderTop = `3px solid ${p.accentColor}`;
      c.innerHTML = `<div class="emoji">${p.emoji}</div><h3>${p.name}</h3><p>${p.tagline}</p>`;
      c.onclick = () => generateOne(p.id, null);
      wrap.appendChild(c);
    });
  } catch (e) {
    console.error(e);
  }

  $("btnAll").onclick = generateAll;
  $("btnCustom").onclick = () => {
    const tags = $("customTags").value.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    if (!tags.length) return alert("先输入几个兴趣标签");
    generateOne(null, tags);
  };
}

async function generateOne(personaId, interests) {
  setLoading(true, "创意总监思考中：品味分析 → 创意决策 → 广告生成…");
  try {
    const data = await api("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId, interests }),
    });
    showGallery([data], data.ad.product, traceHtml(data.trace));
  } catch (e) {
    alert("生成失败：" + e.message);
  } finally {
    setLoading(false);
  }
}

async function generateAll() {
  setLoading(true, "三位创意总监同时开工…");
  try {
    const data = await api("/api/generate-all", { method: "POST" });
    const product = data.results[0]?.ad.product ?? "";
    showGallery(data.results, product, null);
    $("traceBox").innerHTML = `<span class="dim">批量生成模式：每支广告独立走完 感知→推理→生成→自检 四步。</span>`;
  } catch (e) {
    alert("生成失败：" + e.message);
  } finally {
    setLoading(false);
  }
}

init();
