const API_BASE = "https://script.google.com/macros/s/AKfycbylFT6t8aZ1v4KRWLI-LyCW1Dq8JgPPha92p4SBgGdl8BLxFSmYXBlO_w7JTN-ki23t5A/exec";

async function apiGet(params) {
  const url = new URL(API_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: "no-store" });
  return res.json();
}

async function apiPost(action, body, key = "") {
  const url = new URL(API_BASE);
  url.searchParams.set("action", action);
  if (key) url.searchParams.set("key", key);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body || {}),
  });
  return res.json();
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function e(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tagsToArray(tags) {
  return String(tags || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function safeJsonArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function postLink(p) {
  return `post.html?type=${encodeURIComponent(p.type)}&slug=${encodeURIComponent(p.slug)}`;
}

function cardHTML(p) {
  const tags = tagsToArray(p.tags).slice(0, 4).map(t => `<span class="tag">${e(t)}</span>`).join("");
  const cover = p.coverUrl ? `<div class="cover" style="background-image:url('${e(p.coverUrl)}')"></div>` : "";
  const pills = [
    p.type ? `<span class="pill">${e(p.type)}</span>` : "",
    p.minutes ? `<span class="pill">${e(p.minutes)} min</span>` : "",
    p.difficulty ? `<span class="pill">${e(p.difficulty)}</span>` : "",
    p.publishedAt ? `<span class="pill">${e(fmtDate(p.publishedAt))}</span>` : ""
  ].filter(Boolean).join("");

  return `
    <a class="card" href="${postLink(p)}">
      ${cover}
      <h3>${e(p.title)}</h3>
      <p class="muted">${e(p.summary || "")}</p>
      <div class="row">
        <div class="pills">${pills}</div>
      </div>
      <div class="tags">${tags}</div>
    </a>
  `;
}
