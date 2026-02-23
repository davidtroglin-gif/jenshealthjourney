const API_BASE = "https://script.google.com/macros/s/AKfycbylFT6t8aZ1v4KRWLI-LyCW1Dq8JgPPha92p4SBgGdl8BLxFSmYXBlO_w7JTN-ki23t5A/exec"; // <-- paste Web App URL

async function apiGet(params) {
  const url = new URL(API_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: "no-store" });
  return res.json();
}

async function apiPost(action, body, key="") {
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
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function tagsToArray(tags) {
  return String(tags || "").split(",").map(x => x.trim()).filter(Boolean);
}

const DATA = {
  recipes: "data_recipes.json",
  living: "data_living.json",
};

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function loadCollection(type) {
  const res = await fetch(DATA[type], { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${type}`);
  const items = await res.json();
  // newest first
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function cardHTML(item, type) {
  const href = `post.html?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(item.slug)}`;
  const pills = [
    item.minutes ? `<span class="pill">${item.minutes} min</span>` : "",
    item.difficulty ? `<span class="pill">${item.difficulty}</span>` : "",
    `<span class="pill">${fmtDate(item.date)}</span>`,
  ].filter(Boolean).join("");

  const tags = (item.tags || []).slice(0, 4)
    .map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("");

  return `
    <a class="card" href="${href}">
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.summary || "")}</p>
      <div class="row">
        <div>${pills}</div>
        <span class="pill">${type === "recipes" ? "Recipe" : "Healthy Living"}</span>
      </div>
      <div class="tags">${tags}</div>
    </a>
  `;
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fillTagSelect(items) {
  const sel = document.getElementById("tagSelect");
  if (!sel) return;

  const tags = new Set();
  items.forEach(i => (i.tags || []).forEach(t => tags.add(t)));
  [...tags].sort((a, b) => a.localeCompare(b)).forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

function applyFilters(items, search, tag) {
  const s = (search || "").trim().toLowerCase();
  return items.filter(i => {
    const matchesTag = !tag || (i.tags || []).includes(tag);
    const hay = [
      i.title, i.summary, ...(i.tags || []),
      ...(i.ingredients || []),
      ...(i.steps || []),
      ...(i.content || [])
    ].join(" ").toLowerCase();
    const matchesSearch = !s || hay.includes(s);
    return matchesTag && matchesSearch;
  });
}

/* ---------- Home ---------- */
async function initHome() {
  const [recipes, living] = await Promise.all([
    loadCollection("recipes"),
    loadCollection("living"),
  ]);

  // Featured: first 3 from each collection with featured=true
  const featured = [
    ...recipes.filter(x => x.featured).slice(0, 3).map(x => ({...x, _type:"recipes"})),
    ...living.filter(x => x.featured).slice(0, 3).map(x => ({...x, _type:"living"})),
  ].slice(0, 6);

  const latest = [
    ...recipes.slice(0, 4).map(x => ({...x, _type:"recipes"})),
    ...living.slice(0, 4).map(x => ({...x, _type:"living"})),
  ].sort((a,b) => new Date(b.date) - new Date(a.date))
   .slice(0, 9);

  const featuredGrid = document.getElementById("featuredGrid");
  const latestGrid = document.getElementById("latestGrid");

  if (featuredGrid) featuredGrid.innerHTML = featured.map(x => cardHTML(x, x._type)).join("");
  if (latestGrid) latestGrid.innerHTML = latest.map(x => cardHTML(x, x._type)).join("");
}

/* ---------- List pages ---------- */
async function initListPage(type) {
  const items = await loadCollection(type);
  fillTagSelect(items);

  const grid = document.getElementById("listGrid");
  const searchInput = document.getElementById("searchInput");
  const tagSelect = document.getElementById("tagSelect");

  function render() {
    const filtered = applyFilters(items, searchInput?.value, tagSelect?.value);
    grid.innerHTML = filtered.map(i => cardHTML(i, type)).join("");
  }

  searchInput?.addEventListener("input", render);
  tagSelect?.addEventListener("change", render);
  render();
}

/* ---------- Post page ---------- */
async function initPostPage() {
  const type = qs("type");
  const slug = qs("slug");
  if (!type || !slug) {
    document.getElementById("title").textContent = "Missing post info";
    return;
  }

  const items = await loadCollection(type);
  const item = items.find(i => i.slug === slug);
  if (!item) {
    document.getElementById("title").textContent = "Post not found";
    return;
  }

  document.title = `${item.title} • Healthy Kitchen`;
  const backlink = document.getElementById("backlink");
  backlink.href = type === "recipes" ? "recipes.html" : "living.html";
  backlink.textContent = `← Back to ${type === "recipes" ? "Recipes" : "Healthy Living"}`;

  document.getElementById("title").textContent = item.title;
  document.getElementById("date").textContent = fmtDate(item.date);

  const timeEl = document.getElementById("time");
  const diffEl = document.getElementById("difficulty");

  // show recipe pills only if recipe fields exist
  if (item.minutes) timeEl.textContent = `${item.minutes} min`;
  else timeEl.style.display = "none";

  if (item.difficulty) diffEl.textContent = item.difficulty;
  else diffEl.style.display = "none";

  // tags
  const tagsWrap = document.getElementById("tags");
  tagsWrap.innerHTML = (item.tags || []).map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("");

  // summary
  const summaryEl = document.getElementById("summary");
  summaryEl.textContent = item.summary || "";

  // recipe blocks
  const blocks = document.getElementById("recipeBlocks");
  if (type === "recipes") {
    blocks.innerHTML = `
      <div class="block">
        <h3>Ingredients</h3>
        <ul>${(item.ingredients || []).map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>
      </div>
      <div class="block">
        <h3>Steps</h3>
        <ol>${(item.steps || []).map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ol>
      </div>
    `;
  } else {
    blocks.style.display = "none";
  }

  // content (supports simple markdown-ish lines)
  const contentEl = document.getElementById("content");
  contentEl.innerHTML = renderContent(item.content || []);
}

function renderContent(lines) {
  // Very small renderer: "# " => h2, blank lines ignored, others => <p>
  return (lines || []).map(line => {
    const t = String(line ?? "").trim();
    if (!t) return "";
    if (t.startsWith("## ")) return `<h2>${escapeHTML(t.slice(3))}</h2>`;
    return `<p>${escapeHTML(t)}</p>`;
  }).join("");

}
