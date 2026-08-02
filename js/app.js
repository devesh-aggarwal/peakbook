/* ============================================================
   Peakbook: app logic
   State lives in localStorage under "peakbook.climbs".
   climbs = { [mountainId]: [{ date: "YYYY-MM-DD", note: "" }] }
   ============================================================ */

const STORAGE_KEY = "peakbook.climbs";
const LEGACY_STORAGE_KEY = "summit.climbs"; // the app's former name
const UNITS_KEY = "peakbook.units";         // "m" | "ft"

// When the URL is a shared-profile link (?u=<uid>), the app boots into a
// read-only "climbing resume" view of that person's public profile instead
// of the normal logbook.
const SHARE_UID = new URLSearchParams(location.search).get("u");

const state = {
  climbs: loadClimbs(),
  demo: false, // browsing the sample logbook: nothing persists or syncs
  view: "dashboard",
  search: "",
  status: "all", // all | climbed | unclimbed
  filter: "all", // all | <continent> — independent of status, so they combine
  units: loadUnits(),
  map: null,
  markers: [],
  editingAscentIdx: null, // stored-array index of the ascent being edited in the peak modal
};

const byId = Object.fromEntries(MOUNTAINS.map((m) => [m.id, m]));

/* ---------- persistence ---------- */

function loadClimbs() {
  if (SHARE_UID) return {}; // resume view shows someone else's climbs, never ours
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) || {};
    // One-time carry-over from the pre-rename key, so nobody loses a logbook.
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const climbs = JSON.parse(legacy) || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(climbs));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return climbs;
    }
    return {};
  } catch {
    return {};
  }
}

function writeLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.climbs));
}

// Elevations are stored in metres; this is purely a display preference.
function loadUnits() {
  try {
    return localStorage.getItem(UNITS_KEY) === "ft" ? "ft" : "m";
  } catch {
    return "m";
  }
}

// Called after any change the user makes. Writes locally and, when the
// auth module is connected and signed in, pushes to the cloud.
function saveClimbs() {
  if (state.demo) return; // demo data is a throwaway preview
  writeLocal();
  if (window.peakbookSync && typeof window.peakbookSync.push === "function") {
    window.peakbookSync.push(state.climbs);
  }
}

// Keep only entries that look like real ascents of known mountains.
// Guards both imported files and shared-profile data fetched from the cloud.
function sanitizeClimbs(climbs) {
  const clean = {};
  if (!climbs || typeof climbs !== "object" || Array.isArray(climbs)) return clean;
  for (const [id, list] of Object.entries(climbs)) {
    if (!byId[id] || !Array.isArray(list)) continue;
    const ascents = list
      .filter((a) => a && typeof a.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.date))
      .map((a) => ({ date: a.date, note: typeof a.note === "string" ? a.note : "" }));
    if (ascents.length) clean[id] = ascents;
  }
  return clean;
}

/* ---------- derived data ---------- */

function isClimbed(id) {
  return (state.climbs[id] || []).length > 0;
}

function climbedPeaks() {
  return MOUNTAINS.filter((m) => isClimbed(m.id));
}

function allAscents() {
  const out = [];
  for (const [id, list] of Object.entries(state.climbs)) {
    const m = byId[id];
    if (!m) continue;
    for (const a of list) out.push({ mountain: m, ...a });
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

function listProgress(list) {
  const done = list.peaks.filter(isClimbed).length;
  return { done, total: list.peaks.length, pct: done / list.peaks.length };
}

/* ---------- formatting ---------- */

const fmt = new Intl.NumberFormat("en-US");

const M_TO_FT = 3.28084;

function unitLabel() {
  return state.units === "ft" ? "ft" : "m";
}

// US summits are surveyed in feet and their metric figure is the derived one,
// so where the dataset carries a canonical `ft` we show that rather than
// re-deriving it — otherwise rounding to whole metres turns Mount Elbert's
// 14,440 ft into 14,439.
function peakUnit(m) {
  if (state.units !== "ft") return Math.round(m.elevation);
  return Math.round(m.ft != null ? m.ft : m.elevation * M_TO_FT);
}

function peakElev(m) {
  return `${fmt.format(peakUnit(m))} ${unitLabel()}`;
}

function peakElevHTML(m, lead = "") {
  return `${fmt.format(peakUnit(m))}<span class="unit">${lead}${unitLabel()}</span>`;
}

// The same elevation in the *other* system, for the peak detail page where
// showing both is genuinely useful.
// The fact label is uppercased by CSS, so the unit rides in a span that opts
// out — "4,401 m", never "4,401 M".
function peakElevAlt(m) {
  const [n, u] = state.units === "ft"
    ? [Math.round(m.elevation), "m"]
    : [Math.round(m.ft != null ? m.ft : m.elevation * M_TO_FT), "ft"];
  return `${fmt.format(n)}<span class="unit-literal">${u}</span>`;
}

// Totals are summed in whatever unit is on display, so the arithmetic matches
// the per-peak numbers the reader can see.
function totalUnit(peaks) {
  return peaks.reduce((s, m) => s + peakUnit(m), 0);
}

function setUnits(u) {
  const next = u === "ft" ? "ft" : "m";
  if (next === state.units) return;
  state.units = next;
  try {
    localStorage.setItem(UNITS_KEY, next);
  } catch {
    /* private mode — the toggle still works for this session */
  }
  renderUnitToggle();
  render();
  // Keep an open peak/list modal in sync rather than making the user reopen it.
  if (state.openPeakId && !backdrop.hidden) openPeak(state.openPeakId, state.fromListId);
}

function renderUnitToggle() {
  const html = ["m", "ft"]
    .map((u) => {
      const on = state.units === u;
      return `<button type="button" class="${on ? "active" : ""}" data-unit="${u}" aria-pressed="${on}">${u}</button>`;
    })
    .join("");
  document.querySelectorAll(".unit-toggle").forEach((el) => (el.innerHTML = html));
}

// Delegated, so toggles inside re-rendered markup keep working.
document.addEventListener("click", (e) => {
  const btn = e.target.closest && e.target.closest(".unit-toggle button");
  if (btn) setUnits(btn.dataset.unit);
});

// Today's date in the user's own timezone (toISOString would give UTC,
// which is off by a day for part of the world every day).
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Lowercase and strip accents, so "monch" finds Mönch and "iztaccihuatl" finds Iztaccíhuatl.
function fold(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function peakHaystack(m) {
  return fold(`${m.name} ${m.aka || ""} ${m.country} ${m.range} ${m.continent}`);
}

/* ============================================================
   Navigation
   ============================================================ */

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  document.querySelectorAll(".nav-item, .tab-item").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "map") {
    initMap();
    requestAnimationFrame(() => state.map && state.map.invalidateSize());
  }
  render();
}

document.querySelectorAll(".nav-item, .tab-item").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

/* ============================================================
   Rendering
   ============================================================ */

function render() {
  document.getElementById("demo-banner").hidden = !state.demo;
  if (state.view === "dashboard") renderDashboard();
  if (state.view === "explore") renderExplore();
  if (state.view === "map") renderMapMarkers();
  if (state.view === "lists") renderLists();
}

/* ---------- Dashboard ---------- */

function renderDashboard() {
  const el = document.getElementById("dashboard-content");
  const peaks = climbedPeaks();
  const ascents = allAscents();

  if (peaks.length === 0) {
    document.getElementById("dash-subtitle").textContent = "Track the peaks you've climbed.";
    el.innerHTML = `
      <div class="empty-state">
        <svg class="empty-art" viewBox="0 0 260 120" fill="none" aria-hidden="true">
          <path d="M0 104 L42 64 L66 84 L100 46 L148 104 Z" fill="rgba(143,195,232,0.10)"/>
          <path d="M0 104 L42 64 L66 84 L100 46 L148 104" stroke="rgba(143,195,232,0.35)" stroke-width="1.2"/>
          <path d="M92 104 L156 26 L182 60 L200 44 L252 104 Z" fill="rgba(255,126,92,0.14)"/>
          <path d="M92 104 L156 26 L182 60 L200 44 L252 104" stroke="rgba(255,126,92,0.7)" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M156 26 L166 38 L159 34 L150 40 Z" fill="rgba(237,239,244,0.75)"/>
          <path d="M156 25 V13" stroke="#FF7E5C" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M156 13 L167 16.5 L156 20 Z" fill="#FF7E5C"/>
          <line x1="0" y1="104.5" x2="260" y2="104.5" stroke="rgba(213,221,235,0.16)"/>
        </svg>
        <h3>No climbs logged yet</h3>
        <p>Search for a mountain you've summited and add it to your logbook. Your stats, map, and list progress build from there.</p>
        <div class="empty-actions">
          <button class="primary-btn" onclick="switchView('explore')">Find a mountain</button>
          <button class="secondary-btn" onclick="seedDemo()">Try demo data</button>
        </div>
      </div>`;
    return;
  }

  const totalElev = peaks.reduce((s, m) => s + m.elevation, 0);
  const highest = peaks.reduce((a, b) => (a.elevation > b.elevation ? a : b));
  const countries = new Set(peaks.map((m) => m.country.split(" / ")[0]));
  const continents = new Set(peaks.map((m) => m.continent));
  const everest = 8849;
  const everests = (totalElev / everest).toFixed(1);

  document.getElementById("dash-subtitle").textContent =
    `${peaks.length} peak${peaks.length === 1 ? "" : "s"} logged, ${fmt.format(totalUnit(peaks))} ${unitLabel()} of summits.`;

  // Stats
  let html = `
    <div class="stat-hero">
      <div class="stat-card stat-featured">
        <div class="stat-kicker">Peaks climbed</div>
        <div class="stat-value">${peaks.length}</div>
        <div class="stat-label">${everests}× the height of Everest, stacked end to end</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${peakElevHTML(highest)}</div>
        <div class="stat-label">Highest summit · ${esc(highest.name)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${fmt.format(totalUnit(peaks))}<span class="unit">${unitLabel()}</span></div>
        <div class="stat-label">Combined elevation</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${countries.size}</div>
        <div class="stat-label">Countr${countries.size === 1 ? "y" : "ies"}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${continents.size}<span class="unit">/7</span></div>
        <div class="stat-label">Continents</div>
      </div>
    </div>`;

  // List progress rings
  const started = PEAK_LISTS.map((l) => ({ l, p: listProgress(l) })).filter((x) => x.p.done > 0);
  const ringSource = started.length ? started : PEAK_LISTS.slice(0, 4).map((l) => ({ l, p: listProgress(l) }));
  html += `
    <div class="dash-section">
      <div class="dash-section-title">List progress <button class="see-all" onclick="switchView('lists')">See all →</button></div>
      <div class="rings-row">${ringSource.map(({ l, p }) => ringCard(l, p)).join("")}</div>
    </div>`;

  // Two columns: all climbs by year + charts
  html += `<div class="dash-columns">`;

  html += `
    <div class="dash-section">
      <div class="dash-section-title">All climbs</div>
      ${ascentsByYearHTML(ascents, true)}
    </div>`;

  html += `<div>`;
  html += climbsPerYearChart(ascents);
  html += altitudeBands(peaks);
  html += `</div></div>`;

  el.innerHTML = html;
}

function ringCard(list, p, interactive = true) {
  const r = 34, c = 2 * Math.PI * r;
  const offset = c * (1 - p.pct);
  const complete = p.done === p.total;
  return `
    <div class="ring-card ${complete ? "complete" : ""} ${interactive ? "" : "static"}" ${interactive ? `onclick="openList('${list.id}')"` : ""}>
      <div class="ring-wrap">
        <svg viewBox="0 0 84 84">
          <circle class="ring-bg" cx="42" cy="42" r="${r}"></circle>
          <circle class="ring-fg" cx="42" cy="42" r="${r}" stroke="${list.color}"
            stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="ring-center">${p.done}/${p.total}</div>
      </div>
      <div class="ring-name">${esc(list.name)}</div>
    </div>`;
}

// Every ascent grouped by year, newest year first — the shared "logbook by
// year" layout used on both the dashboard and the shared-profile resume.
// `interactive` makes each row open the peak's detail modal (dashboard only;
// the resume is read-only).
function ascentsByYearHTML(ascents, interactive = false) {
  const byYear = new Map(); // insertion order = date-desc, since allAscents() sorts
  for (const a of ascents) {
    const y = a.date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(a);
  }
  return [...byYear.entries()].map(([year, list]) => `
    <div class="resume-year">
      <div class="resume-year-label">${year}</div>
      <div class="chart-card resume-year-card">
        ${list.map((a) => `
          <div class="resume-ascent${interactive ? " clickable" : ""}"${interactive ? ` onclick="openPeak('${a.mountain.id}')"` : ""}>
            <div class="timeline-flag">${a.mountain.flag}</div>
            <div class="timeline-body">
              <div class="timeline-name">${esc(a.mountain.name)}</div>
              <div class="timeline-meta">${esc(a.mountain.range)} · ${esc(a.mountain.country)}${a.note ? ` — <em>${esc(a.note)}</em>` : ""}</div>
            </div>
            <div class="resume-ascent-right">
              <div class="timeline-elev">${peakElev(a.mountain)}</div>
              <div class="resume-ascent-date">${formatDate(a.date)}</div>
            </div>
          </div>`).join("")}
      </div>
    </div>`).join("");
}

function climbsPerYearChart(ascents) {
  if (!ascents.length) return "";
  const byYear = {};
  for (const a of ascents) {
    const y = a.date.slice(0, 4);
    byYear[y] = (byYear[y] || 0) + 1;
  }
  const years = Object.keys(byYear).sort();
  const shown = years.slice(-7);
  const max = Math.max(...shown.map((y) => byYear[y]));
  return `
    <div class="dash-section">
      <div class="dash-section-title">Climbs per year</div>
      <div class="chart-card">
        <div class="chart-bars">
          ${shown.map((y) => `
            <div class="chart-col">
              <div class="chart-bar" style="height:${Math.max(6, (byYear[y] / max) * 100)}%">
                <span class="bar-val">${byYear[y]}</span>
              </div>
              <div class="chart-label">${y}</div>
            </div>`).join("")}
        </div>
      </div>
    </div>`;
}

// Band edges are round numbers in whichever unit is on display, rather than
// converted metric ones — so the feet view breaks at 14,000 ft.
const BAND_COLORS = ["#A08CF0", "#7FA9E8", "#53BFC0", "#E3B25F", "#FF7E5C"];
const BANDS_M = [
  { label: "8,000 m+", min: 8000 },
  { label: "6–8,000 m", min: 6000 },
  { label: "4–6,000 m", min: 4000 },
  { label: "2–4,000 m", min: 2000 },
  { label: "< 2,000 m", min: 0 },
];
const BANDS_FT = [
  { label: "25,000 ft+", min: 25000 },
  { label: "20–25,000 ft", min: 20000 },
  { label: "14–20,000 ft", min: 14000 },
  { label: "8–14,000 ft", min: 8000 },
  { label: "< 8,000 ft", min: 0 },
];

function altitudeBands(peaks) {
  const bands = (state.units === "ft" ? BANDS_FT : BANDS_M)
    .map((b, i) => ({ ...b, color: BAND_COLORS[i] }));
  const counts = bands.map((b, i) => {
    const maxE = i === 0 ? Infinity : bands[i - 1].min;
    return peaks.filter((p) => peakUnit(p) >= b.min && peakUnit(p) < maxE).length;
  });
  const max = Math.max(...counts, 1);
  return `
    <div class="dash-section">
      <div class="dash-section-title">Altitude bands</div>
      <div class="chart-card">
        <div class="bands">
          ${bands.map((b, i) => `
            <div class="band-row">
              <div class="band-label">${b.label}</div>
              <div class="band-track"><div class="band-fill" style="width:${(counts[i] / max) * 100}%; background:${b.color}"></div></div>
              <div class="band-count">${counts[i]}</div>
            </div>`).join("")}
        </div>
      </div>
    </div>`;
}

/* ---------- Explore ---------- */

function renderExplore() {
  document.getElementById("explore-count").textContent = MOUNTAINS.length;
  renderFilterChips();
  renderPeakGrid();
}

function renderFilterChips() {
  const row = document.getElementById("filter-row");
  const statusChips = [
    { id: "all", label: "All" },
    { id: "climbed", label: "✓ Climbed" },
    { id: "unclimbed", label: "Not yet" },
  ];
  row.innerHTML =
    statusChips
      .map((c) => `<button class="chip ${state.status === c.id ? "active" : ""}" data-status="${esc(c.id)}">${esc(c.label)}</button>`)
      .join("") +
    `<span class="chip-divider" aria-hidden="true"></span>` +
    CONTINENTS
      .map((c) => `<button class="chip ${state.filter === c ? "active" : ""}" data-filter="${esc(c)}">${esc(c)}</button>`)
      .join("");
  row.querySelectorAll(".chip[data-status]").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.status = chip.dataset.status;
      renderExplore();
    });
  });
  row.querySelectorAll(".chip[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      // Click the active continent again to clear it.
      state.filter = state.filter === chip.dataset.filter ? "all" : chip.dataset.filter;
      renderExplore();
    });
  });
}

function filteredPeaks() {
  const q = fold(state.search.trim());
  return MOUNTAINS.filter((m) => {
    if (state.status === "climbed" && !isClimbed(m.id)) return false;
    if (state.status === "unclimbed" && isClimbed(m.id)) return false;
    if (state.filter !== "all" && m.continent !== state.filter) return false;
    if (q && !peakHaystack(m).includes(q)) return false;
    return true;
  }).sort((a, b) => b.elevation - a.elevation);
}

// A small ridge-line silhouette for the bottom of each peak card.
// Peak height scales with real elevation; the shape varies per mountain.
function ridgeSVG(m) {
  const climbed = isClimbed(m.id);
  const W = 260, H = 58;
  const hash = [...m.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rel = Math.pow(Math.min(1, m.elevation / 8849), 0.65);
  const apexX = 70 + (hash % 130);
  const apexY = Math.round(H - 8 - rel * (H - 18));
  const leftY = H - 10 - (hash % 8);
  const midX = Math.round(apexX * 0.45);
  const midY = Math.round((leftY + apexY) / 2 + 7);
  const shX = Math.min(W - 30, apexX + 30 + (hash % 26));
  const shY = Math.round(apexY + (H - apexY) * 0.5);
  const rightY = H - 8 - ((hash >> 3) % 8);
  const line = `0,${leftY} ${midX},${midY} ${apexX},${apexY} ${shX},${shY} ${W},${rightY}`;
  const rgb = climbed ? "82, 199, 154" : "148, 158, 176";
  return `
    <svg class="peak-ridge" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="${line} ${W},${H} 0,${H}" fill="rgba(${rgb}, ${climbed ? 0.08 : 0.045})"></polygon>
      <polyline points="${line}" fill="none" stroke="rgba(${rgb}, ${climbed ? 0.45 : 0.24})" stroke-width="1.2" vector-effect="non-scaling-stroke"></polyline>
    </svg>`;
}

function listGlyph(l) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${l.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`;
}

function peakListDots(m) {
  const lists = PEAK_LISTS.filter((l) => l.peaks.includes(m.id));
  if (!lists.length) return "";
  return `<div class="peak-lists">${lists.map((l) => `<span class="list-dot" style="background:${l.color}" title="${esc(l.name)}"></span>`).join("")}</div>`;
}

function renderPeakGrid() {
  const grid = document.getElementById("peak-grid");
  const peaks = filteredPeaks();
  if (!peaks.length) {
    const msg = state.status === "climbed" && !climbedPeaks().length
      ? "Nothing climbed yet — log your first ascent and it'll show up here."
      : "No mountains match. Try a different search.";
    grid.innerHTML = `<div class="no-results">${msg}</div>`;
    return;
  }
  grid.innerHTML = peaks
    .map((m) => {
      const n = (state.climbs[m.id] || []).length;
      const climbed = n > 0;
      return `
      <div class="peak-card ${climbed ? "climbed" : ""}" onclick="openPeak('${m.id}')">
        ${ridgeSVG(m)}
        <div class="peak-card-top">
          <span class="peak-flag">${m.flag}</span>
          ${climbed ? `<span class="climbed-badge">✓ Climbed${n > 1 ? ` ×${n}` : ""}</span>` : ""}
        </div>
        <div class="peak-name">${esc(m.name)}</div>
        <div class="peak-meta">${esc(m.range)} · ${esc(m.country)}</div>
        <div class="peak-card-bottom">
          <div class="peak-elev">${peakElevHTML(m, " ")}</div>
          ${peakListDots(m)}
        </div>
      </div>`;
    })
    .join("");
}

document.getElementById("search-input").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderPeakGrid();
});

/* ---------- Map ---------- */

function initMap() {
  if (state.map) return;
  const map = L.map("map-canvas", {
    center: [25, 15],
    zoom: 2,
    minZoom: 2,
    worldCopyJump: true,
    zoomControl: false,
  });
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);
  state.map = map;

  document.getElementById("map-show-all").addEventListener("change", renderMapMarkers);
}

function renderMapMarkers() {
  if (!state.map) return;
  const showAll = document.getElementById("map-show-all").checked;

  state.markers.forEach((mk) => mk.remove());
  state.markers = [];

  for (const m of MOUNTAINS) {
    const climbed = isClimbed(m.id);
    if (!climbed && !showAll) continue;
    const icon = L.divIcon({
      className: `peak-marker ${climbed ? "is-climbed" : ""}`,
      html: `<div class="marker-dot"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
    const mk = L.marker([m.lat, m.lng], { icon, riseOnHover: true }).addTo(state.map);
    mk.bindPopup(`
      <div class="popup-name">${m.flag} ${esc(m.name)}</div>
      <div class="popup-meta">${peakElev(m)} · ${esc(m.range)}</div>
      <button class="popup-btn" onclick="openPeak('${m.id}')">${climbed ? "View ascents →" : "Log a climb →"}</button>
    `);
    state.markers.push(mk);
  }

  const peaks = climbedPeaks();
  const totalElev = peaks.reduce((s, m) => s + m.elevation, 0);
  const continents = new Set(peaks.map((m) => m.continent));
  document.getElementById("map-stats").innerHTML = `
    <div><div class="map-stat-value">${peaks.length}</div><div class="map-stat-label">PEAKS</div></div>
    <div><div class="map-stat-value">${fmt.format(totalUnit(peaks))}</div><div class="map-stat-label">${unitLabel() === "ft" ? "FEET" : "METRES"}</div></div>
    <div><div class="map-stat-value">${continents.size}/7</div><div class="map-stat-label">CONTINENTS</div></div>`;
}

/* ---------- Lists ---------- */

function renderLists() {
  const el = document.getElementById("lists-content");
  el.innerHTML = `
    <div class="list-cards">
      ${PEAK_LISTS.map((l) => {
        const p = listProgress(l);
        const complete = p.done === p.total;
        return `
        <div class="list-card ${complete ? "complete" : ""}" onclick="openList('${l.id}')">
          <div class="list-card-head">
            <div class="list-icon" style="background:${l.color}1c">${listGlyph(l)}</div>
            <div>
              <div class="list-title">${esc(l.name)} ${complete ? '<span class="complete-tag">Complete</span>' : ""}</div>
              <div class="list-tagline">${esc(l.tagline)}</div>
            </div>
            <div class="list-progress-num"><strong>${p.done}</strong>/${p.total}</div>
          </div>
          <div class="list-track"><div class="list-fill" style="width:${p.pct * 100}%; background:${l.color}"></div></div>
        </div>`;
      }).join("")}
    </div>`;
}

/* ============================================================
   Modals
   ============================================================ */

const backdrop = document.getElementById("modal-backdrop");
const modalEl = document.getElementById("modal");

function openModal(html) {
  modalEl.innerHTML = html;
  backdrop.hidden = false;
}

function closeModal() {
  backdrop.hidden = true;
  modalEl.innerHTML = "";
  state.openPeakId = null;
  state.fromListId = null;
  state.editingAscentIdx = null;
}

backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !backdrop.hidden) closeModal();
  // "/" jumps to Explore search from anywhere (unless already typing somewhere).
  if (e.key === "/" && backdrop.hidden && !SHARE_UID) {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
    e.preventDefault();
    switchView("explore");
    document.getElementById("search-input").focus();
  }
});

/* ---------- Peak detail ---------- */

function openPeak(id, fromListId) {
  const m = byId[id];
  if (!m) return;
  if (state.openPeakId !== id) state.editingAscentIdx = null;
  state.openPeakId = id;
  state.fromListId = fromListId || null;
  // Keep each ascent's index in the stored array so "Remove" deletes the right one
  // even though we display them date-sorted.
  const ascents = (state.climbs[id] || [])
    .map((a, idx) => ({ ...a, idx }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const fromList = fromListId ? PEAK_LISTS.find((l) => l.id === fromListId) : null;
  const lists = PEAK_LISTS.filter((l) => l.peaks.includes(id));
  const today = todayISO();

  openModal(`
    <div class="modal-hero">
      <button class="modal-close" onclick="closeModal()">✕</button>
      ${fromList ? `<button class="modal-back" onclick="openList('${fromList.id}')">← ${esc(fromList.name)}</button>` : ""}
      <div class="modal-flag">${m.flag}</div>
      <div class="modal-title">${esc(m.name)}</div>
      <div class="modal-sub">${esc(m.range)} · ${esc(m.country)} · ${esc(m.continent)}</div>
      <div class="modal-facts">
        <div class="fact"><div class="fact-value">${peakElev(m)}</div><div class="fact-label">Elevation · ${peakElevAlt(m)}</div></div>
        ${m.firstAscent ? `<div class="fact"><div class="fact-value">${m.firstAscent}</div><div class="fact-label">First ascent</div></div>` : ""}
        ${ascents.length ? `<div class="fact"><div class="fact-value" style="color:var(--green)">${ascents.length}×</div><div class="fact-label">Your ascents</div></div>` : ""}
      </div>
    </div>
    <div class="modal-body">
      ${lists.length ? `
        <div class="modal-section-title">On these lists</div>
        <div class="modal-list-badges">
          ${lists.map((l) => `<span class="list-badge" style="background:${l.color}1c; color:${l.color}">${listGlyph(l)} ${esc(l.name)}</span>`).join("")}
        </div>` : ""}

      ${ascents.length ? `
        <div class="modal-section-title">Your ascents</div>
        ${ascents.map((a) => a.idx === state.editingAscentIdx ? `
          <form class="ascent-row ascent-edit" onsubmit="updateAscent(event, '${id}', ${a.idx})">
            <div class="ascent-edit-fields">
              <input type="date" id="edit-date" value="${a.date}" max="${today}" required aria-label="Summit date" />
              <input type="text" id="edit-note" value="${esc(a.note || "")}" placeholder="Route, partners, conditions…" maxlength="120" aria-label="Note" />
            </div>
            <div class="ascent-edit-actions">
              <button type="submit" class="ascent-save">Save</button>
              <button type="button" class="ascent-cancel" onclick="cancelEditAscent()">Cancel</button>
            </div>
          </form>` : `
          <div class="ascent-row">
            <div>
              <div class="ascent-date">${formatDate(a.date)}</div>
              ${a.note ? `<div class="ascent-note">${esc(a.note)}</div>` : ""}
            </div>
            <div class="ascent-actions">
              <button class="ascent-edit-btn" onclick="editAscent('${id}', ${a.idx})">Edit</button>
              <button class="ascent-delete" onclick="deleteAscent('${id}', ${a.idx})">Remove</button>
            </div>
          </div>`).join("")}` : ""}

      <div class="modal-section-title">${ascents.length ? "Log another ascent" : "Log an ascent"}</div>
      <form class="log-form" onsubmit="submitClimb(event, '${id}')">
        <div>
          <label for="climb-date">Summit date</label>
          <input type="date" id="climb-date" value="${today}" max="${today}" required />
        </div>
        <div>
          <label for="climb-note">Note <span style="font-weight:400">(optional)</span></label>
          <input type="text" id="climb-note" placeholder="Route, partners, conditions…" maxlength="120" />
        </div>
        <button type="submit" class="primary-btn">${ascents.length ? "Add ascent" : "✓ I climbed this"}</button>
      </form>
    </div>
  `);
}

function submitClimb(e, id) {
  e.preventDefault();
  const date = document.getElementById("climb-date").value;
  const note = document.getElementById("climb-note").value.trim();
  if (!date) return;
  if (!state.climbs[id]) state.climbs[id] = [];
  state.climbs[id].push({ date, note });
  saveClimbs();
  closeModal();
  render();
  celebrate(id);
}

function editAscent(id, index) {
  state.editingAscentIdx = index;
  openPeak(id, state.fromListId); // re-render the modal with this row as a form
  const dateEl = document.getElementById("edit-date");
  if (dateEl) dateEl.focus();
}

function cancelEditAscent() {
  state.editingAscentIdx = null;
  openPeak(state.openPeakId, state.fromListId);
}

function updateAscent(e, id, index) {
  e.preventDefault();
  const date = document.getElementById("edit-date").value;
  const note = document.getElementById("edit-note").value.trim();
  const list = state.climbs[id] || [];
  if (!date || !list[index]) return;
  list[index] = { date, note };
  state.editingAscentIdx = null;
  saveClimbs();
  render();
  openPeak(id, state.fromListId);
  toast("Ascent updated");
}

function deleteAscent(id, index) {
  const list = state.climbs[id] || [];
  list.splice(index, 1);
  if (!list.length) delete state.climbs[id];
  state.editingAscentIdx = null; // indices shifted; a stale edit form would hit the wrong entry
  saveClimbs();
  render();
  openPeak(id, state.fromListId); // refresh the modal in place
}

function celebrate(id) {
  const m = byId[id];
  const completed = PEAK_LISTS.filter((l) => {
    const p = listProgress(l);
    return l.peaks.includes(id) && p.done === p.total;
  });
  if (completed.length) {
    toast(`${completed[0].name} complete — ${m.name} logged 🎉`);
  } else {
    toast(`${m.name} added to your logbook`);
  }
}

/* ---------- List detail ---------- */

function openList(id) {
  const l = PEAK_LISTS.find((x) => x.id === id);
  if (!l) return;
  state.openPeakId = null;
  state.fromListId = null;
  const p = listProgress(l);
  const peaks = l.peaks.map((pid) => byId[pid]).sort((a, b) => b.elevation - a.elevation);

  openModal(`
    <div class="modal-hero" style="background: linear-gradient(160deg, ${l.color}26, transparent 60%)">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-flag"><div class="list-icon" style="background:${l.color}1f">${listGlyph(l)}</div></div>
      <div class="modal-title">${esc(l.name)}</div>
      <div class="modal-sub">${esc(l.tagline)}${l.note ? `. ${esc(l.note)}` : ""}</div>
      <div class="modal-facts">
        <div class="fact"><div class="fact-value" style="color:${l.color}">${p.done} of ${p.total}</div><div class="fact-label">Climbed</div></div>
        <div class="fact"><div class="fact-value">${Math.round(p.pct * 100)}%</div><div class="fact-label">Progress</div></div>
      </div>
      <div class="list-track" style="margin-top:16px"><div class="list-fill" style="width:${p.pct * 100}%; background:${l.color}"></div></div>
    </div>
    <div class="modal-body">
      <div class="list-peaks">
        ${peaks.map((m) => `
          <div class="list-peak-row ${isClimbed(m.id) ? "done" : ""}" onclick="openPeak('${m.id}', '${l.id}')">
            <div class="check-circle">✓</div>
            <div class="list-peak-name">${m.flag} ${esc(m.name)}</div>
            <div class="list-peak-elev">${peakElev(m)}</div>
          </div>`).join("")}
      </div>
    </div>
  `);
}

/* ---------- Quick log (peak picker) ---------- */

function openPicker() {
  state.openPeakId = null;
  openModal(`
    <div class="modal-hero">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-title">Log a climb</div>
      <div class="modal-sub">Which mountain did you summit?</div>
    </div>
    <div class="modal-body">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>
        <input type="search" id="picker-input" placeholder="Search mountains…" autocomplete="off" />
      </div>
      <div class="picker-results" id="picker-results"></div>
    </div>
  `);
  const input = document.getElementById("picker-input");
  const results = document.getElementById("picker-results");

  let topMatch = null;
  function renderResults() {
    const q = fold(input.value.trim());
    const matches = MOUNTAINS.filter((m) => !q || peakHaystack(m).includes(q))
      .sort((a, b) => b.elevation - a.elevation)
      .slice(0, 12);
    topMatch = matches[0] || null;
    results.innerHTML = matches.length
      ? matches
          .map((m) => `
            <div class="picker-row" onclick="openPeak('${m.id}')">
              <span class="picker-flag">${m.flag}</span>
              <span class="picker-name">${esc(m.name)}${isClimbed(m.id) ? ' <span style="color:var(--green)">✓</span>' : ""}</span>
              <span class="picker-elev">${peakElev(m)}</span>
            </div>`)
          .join("")
      : `<div class="no-results" style="padding:30px 0">No mountains match.</div>`;
  }
  input.addEventListener("input", renderResults);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && topMatch) openPeak(topMatch.id);
  });
  renderResults();
  input.focus();
}

document.getElementById("btn-log-climb").addEventListener("click", openPicker);

/* ---------- Share profile (climbing resume) ---------- */

async function openShare() {
  const share = window.peakbookShare;
  if (!share) {
    // auth.js hasn't finished loading yet — one more click will get there.
    toast("Still starting up — try again in a second");
    return;
  }
  openModal(shareModalShell(`<div class="share-status">Checking your profile…</div>`));
  const s = await share.getState();
  if (backdrop.hidden) return; // user closed the modal while we were checking

  let body;
  if (!s.configured) {
    body = `
      <p class="share-blurb">Sharing publishes a read-only <strong>climbing resume</strong> — your peaks,
      stats, and map — at a link anyone can open.</p>
      <p class="share-blurb">It needs cloud sync, which isn't set up on this copy of Peakbook.
      Add a Firebase config (see <strong>SETUP.md</strong>) to enable it.</p>`;
  } else if (!s.signedIn) {
    body = `
      <p class="share-blurb">Sharing publishes a read-only <strong>climbing resume</strong> — your peaks,
      stats, and map — at a link anyone can open. Sign in first so your resume has a home.</p>
      <button class="primary-btn" onclick="closeModal(); peakbookAuth.signIn().then(() => openShare())">Sign in with Google</button>`;
  } else if (!s.shared) {
    body = `
      <p class="share-blurb">Publish a read-only <strong>climbing resume</strong> — your peaks, stats, and
      map — at a public link. It stays up to date as you log climbs, and you can unpublish any time.</p>
      <button class="primary-btn" id="share-enable">Publish my profile</button>`;
  } else {
    const url = share.url();
    body = `
      <p class="share-blurb">Your climbing resume is <strong style="color:var(--green)">live</strong>.
      Anyone with this link can see your peaks, stats, and map — it updates as you log climbs.</p>
      <div class="share-link-row">
        <input class="share-link" id="share-link" type="text" readonly value="${esc(url)}" onclick="this.select()" />
        <button class="secondary-btn" id="share-copy">Copy</button>
      </div>
      <div class="share-actions">
        <a class="secondary-btn" href="${esc(url)}" target="_blank" rel="noopener">Preview ↗</a>
        <button class="share-stop" id="share-disable">Stop sharing</button>
      </div>`;
  }
  openModal(shareModalShell(body));

  const enableBtn = document.getElementById("share-enable");
  if (enableBtn) enableBtn.addEventListener("click", async () => {
    enableBtn.disabled = true;
    enableBtn.textContent = "Publishing…";
    try {
      await share.enable();
      openShare(); // re-render in the "live" state
      toast("Your climbing resume is live");
    } catch (e) {
      console.error("Peakbook: publish failed", e);
      toast("⚠️ Couldn't publish — check your connection and Firestore rules");
      openShare();
    }
  });

  const copyBtn = document.getElementById("share-copy");
  if (copyBtn) copyBtn.addEventListener("click", async () => {
    const input = document.getElementById("share-link");
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      document.execCommand("copy");
    }
    toast("Link copied");
  });

  const disableBtn = document.getElementById("share-disable");
  if (disableBtn) disableBtn.addEventListener("click", async () => {
    disableBtn.disabled = true;
    try {
      await share.disable();
      toast("Profile unpublished");
      openShare();
    } catch (e) {
      console.error("Peakbook: unpublish failed", e);
      toast("⚠️ Couldn't unpublish — try again");
      openShare();
    }
  });
}

function shareModalShell(body) {
  return `
    <div class="modal-hero">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-title">Share your profile</div>
      <div class="modal-sub">A public climbing resume, straight from your logbook</div>
    </div>
    <div class="modal-body">${body}</div>`;
}

for (const id of ["btn-share", "btn-share-dash"]) {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener("click", openShare);
}

/* ============================================================
   Toast, demo data, import/export
   ============================================================ */

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
}

const DEMO_CLIMBS = {
  kilimanjaro: [{ date: "2019-08-14", note: "Machame route, 6 days" }],
  "mont-blanc": [{ date: "2021-07-02", note: "Goûter route" }],
  elbrus: [{ date: "2021-08-19", note: "South side" }],
  fuji: [{ date: "2022-08-27", note: "Yoshida trail, sunrise summit" }],
  toubkal: [{ date: "2022-10-08", note: "" }],
  rainier: [{ date: "2023-07-15", note: "Disappointment Cleaver" }],
  hood: [{ date: "2023-05-21", note: "South side, early start" }],
  "st-helens": [{ date: "2023-06-10", note: "Monitor Ridge" }],
  orizaba: [{ date: "2023-12-16", note: "Jamapa Glacier" }],
  cotopaxi: [{ date: "2024-01-20", note: "" }],
  aconcagua: [{ date: "2024-02-06", note: "Normal route, 14 days" }],
  triglav: [{ date: "2024-09-01", note: "Via ferrata" }],
  whitney: [{ date: "2025-06-28", note: "Mountaineer's route" }],
  "island-peak": [{ date: "2025-11-03", note: "Post-EBC trek" }],
  matterhorn: [{ date: "2026-07-12", note: "Hörnli ridge with guide" }],
};

// Demo mode fills the logbook with a sample so the app can be explored, but
// it stays in memory only: saveClimbs() is a no-op while it's on, so nothing
// touches localStorage or the cloud, and signing in never inherits it.
function seedDemo() {
  state.demo = true;
  state.climbs = JSON.parse(JSON.stringify(DEMO_CLIMBS)); // edits in demo must not mutate the pristine sample
  render();
  toast("Viewing a demo logbook — nothing is saved");
}

function exitDemo() {
  state.demo = false;
  state.climbs = loadClimbs();
  render();
  toast("Demo data cleared");
}

/* ---------- one-time cleanup of demo data that leaked into real logbooks ----------
   An earlier version of "Try demo data" wrote the sample straight into
   localStorage, and signing in then merged it into the account's cloud logbook.
   An ascent is recognized as leaked sample data only when mountain, date, and
   note all match a demo entry exactly, so genuine climbs are never touched. */

const DEMO_CLEANUP_KEY = "peakbook.demoCleanup"; // set once the user has been asked

const DEMO_FINGERPRINTS = new Set(
  Object.entries(DEMO_CLIMBS).flatMap(([id, list]) => list.map((a) => `${id}|${a.date}|${a.note}`))
);

function stripDemoClimbs(climbs) {
  const cleaned = {};
  let removed = 0;
  for (const [id, list] of Object.entries(climbs || {})) {
    const keep = (list || []).filter((a) => {
      const isDemo = a && DEMO_FINGERPRINTS.has(`${id}|${a.date}|${a.note || ""}`);
      if (isDemo) removed++;
      return !isDemo;
    });
    if (keep.length) cleaned[id] = keep;
  }
  return { cleaned, removed };
}

// Runs at boot (catches a contaminated localStorage) and whenever cloud data
// arrives (catches a contaminated account). Asks at most once per device;
// if nothing suspicious is present it stays silent and keeps watching.
function offerDemoCleanup() {
  if (SHARE_UID || state.demo) return;
  if (localStorage.getItem(DEMO_CLEANUP_KEY)) return;
  const { cleaned, removed } = stripDemoClimbs(state.climbs);
  if (!removed) return;
  const ok = confirm(
    `Peakbook found ${removed} sample climb${removed === 1 ? "" : "s"} in your logbook, left over from the old "Try demo data" button. Remove ${removed === 1 ? "it" : "them"}? Your own climbs are kept either way.`
  );
  localStorage.setItem(DEMO_CLEANUP_KEY, "done"); // asked and answered — don't nag again on this device
  if (!ok) return;
  state.climbs = cleaned;
  saveClimbs();
  render();
  toast(`Removed ${removed} sample climb${removed === 1 ? "" : "s"}`);
}

document.getElementById("btn-export").addEventListener("click", () => {
  if (state.demo) {
    toast("You're viewing demo data — exit the demo to export your own logbook");
    return;
  }
  const blob = new Blob([JSON.stringify({ app: "peakbook", version: 1, climbs: state.climbs }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `peakbook-logbook-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Logbook exported");
});

document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const clean = sanitizeClimbs(data.climbs || data);
      if (!Object.keys(clean).length) throw new Error("no valid climbs");
      // Confirm against the real logbook — demo climbs aren't the visitor's.
      const existing = state.demo ? Object.keys(loadClimbs()).length : Object.keys(state.climbs).length;
      if (existing && !confirm(`Replace your current logbook (${existing} peak${existing === 1 ? "" : "s"}) with this file (${Object.keys(clean).length} peaks)?`)) return;
      state.demo = false; // an imported file is a real logbook
      state.climbs = clean;
      saveClimbs();
      render();
      toast(`Logbook imported — ${Object.keys(clean).length} peak${Object.keys(clean).length === 1 ? "" : "s"}`);
    } catch {
      toast("⚠️ Couldn't read that file");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

/* ============================================================
   Bridge for the auth / cloud-sync module (js/auth.js)
   ============================================================ */

window.peakbookApp = {
  // Read the current logbook (used to merge local climbs into the cloud
  // the first time someone signs in).
  getClimbs() {
    // In demo mode the on-screen climbs are the sample, not the visitor's:
    // hand back the real (stored) logbook so demo data never reaches the cloud.
    return state.demo ? loadClimbs() : state.climbs;
  },
  // Replace the logbook with data arriving from the cloud, then re-render.
  // Does not call saveClimbs(), so it never echoes back to the cloud.
  applyRemote(climbs) {
    state.demo = false; // the signed-in logbook always wins over a demo preview
    state.climbs = climbs && typeof climbs === "object" ? climbs : {};
    writeLocal();
    render();
    if (state.openPeakId && !backdrop.hidden) openPeak(state.openPeakId, state.fromListId);
    offerDemoCleanup(); // the account may have absorbed demo data under the old behavior
  },
  // Shared-profile (resume) mode: auth.js fetched profiles/<uid> for us.
  showSharedProfile(profile) {
    if (!SHARE_UID) return;
    state.climbs = sanitizeClimbs(profile && profile.climbs);
    renderResume(profile || {});
  },
  sharedProfileError(kind) {
    if (!SHARE_UID) return;
    renderResumeError(kind);
  },
};

// Let other modules trigger a toast (e.g. sign-in prompts).
window.toast = toast;

/* ============================================================
   Shared-profile "climbing resume" view (read-only, at ?u=<uid>)
   ============================================================ */

function resumeShell(inner) {
  return `
    <div class="resume">
      <div class="resume-topbar">
        <a class="resume-brand" href="${location.pathname}">
          <span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg></span>
          Peakbook
        </a>
        <a class="secondary-btn" href="${location.pathname}">Start your own logbook</a>
      </div>
      ${inner}
    </div>`;
}

function renderResumeLoading() {
  document.getElementById("resume-content").innerHTML = resumeShell(`
    <div class="resume-message"><h3>Loading climbing resume…</h3></div>`);
}

function renderResumeError(kind) {
  const msg = kind === "unconfigured"
    ? "This copy of Peakbook doesn't have cloud sync set up, so shared profiles can't be loaded here."
    : "This profile doesn't exist or is no longer shared.";
  document.getElementById("resume-content").innerHTML = resumeShell(`
    <div class="resume-message">
      <h3>No resume here</h3>
      <p>${msg}</p>
      <a class="primary-btn" href="${location.pathname}" style="display:inline-block; text-decoration:none">Go to Peakbook</a>
    </div>`);
}

function renderResume(profile) {
  const name = (profile.name || "").trim() || "A climber";
  const peaks = climbedPeaks();
  const ascents = allAscents();
  document.title = `${name} — Climbing resume · Peakbook`;

  const avatar = profile.photoURL
    ? `<img class="resume-avatar" src="${esc(profile.photoURL)}" alt="" referrerpolicy="no-referrer" />`
    : `<div class="resume-avatar fallback">${esc(resumeInitials(name))}</div>`;

  if (!ascents.length) {
    document.getElementById("resume-content").innerHTML = resumeShell(`
      <header class="resume-hero">
        ${avatar}
        <div>
          <h1>${esc(name)}</h1>
          <p class="subtitle">Climbing resume</p>
        </div>
      </header>
      <div class="resume-message"><h3>No climbs logged yet</h3><p>This logbook is still waiting for its first summit.</p></div>`);
    return;
  }

  const totalElev = peaks.reduce((s, m) => s + m.elevation, 0);
  const highest = peaks.reduce((a, b) => (a.elevation > b.elevation ? a : b));
  const countries = new Set(peaks.map((m) => m.country.split(" / ")[0]));
  const continents = new Set(peaks.map((m) => m.continent));
  const firstYear = ascents[ascents.length - 1].date.slice(0, 4);

  const started = PEAK_LISTS.map((l) => ({ l, p: listProgress(l) })).filter((x) => x.p.done > 0);

  document.getElementById("resume-content").innerHTML = resumeShell(`
    <header class="resume-hero">
      ${avatar}
      <div>
        <h1>${esc(name)}</h1>
        <p class="subtitle">Climbing resume · ${peaks.length} peak${peaks.length === 1 ? "" : "s"} since ${firstYear}</p>
      </div>
    </header>

    <div class="stat-hero resume-stats">
      <div class="stat-card stat-featured">
        <div class="stat-kicker">Peaks climbed</div>
        <div class="stat-value">${peaks.length}</div>
        <div class="stat-label">${ascents.length} ascent${ascents.length === 1 ? "" : "s"} logged</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${peakElevHTML(highest)}</div>
        <div class="stat-label">Highest summit · ${esc(highest.name)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${fmt.format(totalUnit(peaks))}<span class="unit">${unitLabel()}</span></div>
        <div class="stat-label">Combined elevation</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${countries.size}</div>
        <div class="stat-label">Countr${countries.size === 1 ? "y" : "ies"}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${continents.size}<span class="unit">/7</span></div>
        <div class="stat-label">Continents</div>
      </div>
    </div>

    <div class="dash-section">
      <div class="dash-section-title">Summits on the map</div>
      <div id="resume-map" class="resume-map"></div>
    </div>

    ${started.length ? `
      <div class="dash-section">
        <div class="dash-section-title">List progress</div>
        <div class="rings-row">${started.map(({ l, p }) => ringCard(l, p, false)).join("")}</div>
      </div>` : ""}

    <div class="dash-section">
      <div class="dash-section-title">All ascents</div>
      ${ascentsByYearHTML(ascents)}
    </div>

    <footer class="resume-footer">
      <p>Logbook kept on <a href="${location.pathname}">Peakbook</a> — a free climbing logbook &amp; peak tracker.</p>
    </footer>`);

  initResumeMap(peaks);
}

function resumeInitials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "🧗";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function initResumeMap(peaks) {
  const map = L.map("resume-map", {
    zoomControl: true,
    scrollWheelZoom: false,
    worldCopyJump: true,
    minZoom: 1,
  });
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);
  for (const m of peaks) {
    const icon = L.divIcon({
      className: "peak-marker is-climbed",
      html: `<div class="marker-dot"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
    L.marker([m.lat, m.lng], { icon, riseOnHover: true })
      .addTo(map)
      .bindPopup(`
        <div class="popup-name">${m.flag} ${esc(m.name)}</div>
        <div class="popup-meta">${peakElev(m)} · ${esc(m.range)}</div>`);
  }
  // Fit after a frame: the container was injected via innerHTML this tick,
  // so Leaflet may have measured it before layout settled.
  requestAnimationFrame(() => {
    map.invalidateSize();
    if (peaks.length === 1) {
      map.setView([peaks[0].lat, peaks[0].lng], 5);
    } else {
      map.fitBounds(L.latLngBounds(peaks.map((m) => [m.lat, m.lng])), { padding: [40, 40], maxZoom: 6 });
    }
  });
}

/* ============================================================
   Boot
   ============================================================ */

renderUnitToggle();

if (SHARE_UID) {
  document.body.classList.add("share-mode");
  state.view = "resume";
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-resume"));
  renderResumeLoading();
} else {
  render();
  offerDemoCleanup(); // localStorage may hold demo data written by the old behavior
}
