/* ============================================================
   Peakbook: app logic
   State lives in localStorage under "peakbook.climbs".
   climbs = { [mountainId]: [{ date: "YYYY-MM-DD", note: "" }] }
   ============================================================ */

const STORAGE_KEY = "peakbook.climbs";
const LEGACY_STORAGE_KEY = "summit.climbs"; // the app's former name

const state = {
  climbs: loadClimbs(),
  view: "dashboard",
  search: "",
  status: "all", // all | climbed | unclimbed
  filter: "all", // all | <continent> — independent of status, so they combine
  map: null,
  markers: [],
};

const byId = Object.fromEntries(MOUNTAINS.map((m) => [m.id, m]));

/* ---------- persistence ---------- */

function loadClimbs() {
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

// Called after any change the user makes. Writes locally and, when the
// auth module is connected and signed in, pushes to the cloud.
function saveClimbs() {
  writeLocal();
  if (window.peakbookSync && typeof window.peakbookSync.push === "function") {
    window.peakbookSync.push(state.climbs);
  }
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

function metres(n) {
  return `${fmt.format(n)}<span class="unit">m</span>`;
}

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
  return fold(`${m.name} ${m.country} ${m.range} ${m.continent}`);
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
    `${peaks.length} peak${peaks.length === 1 ? "" : "s"} logged, ${fmt.format(totalElev)} metres of summits.`;

  // Stats
  let html = `
    <div class="stat-hero">
      <div class="stat-card stat-featured">
        <div class="stat-kicker">Peaks climbed</div>
        <div class="stat-value">${peaks.length}</div>
        <div class="stat-label">${everests}× the height of Everest, stacked end to end</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${metres(highest.elevation)}</div>
        <div class="stat-label">Highest summit · ${esc(highest.name)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${metres(totalElev)}</div>
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

  // Two columns: recent climbs + charts
  html += `<div class="dash-columns">`;

  html += `
    <div class="dash-section">
      <div class="dash-section-title">Recent climbs</div>
      <div class="chart-card" style="padding: 8px 16px;">
        <div class="timeline">
          ${ascents.slice(0, 8).map((a) => `
            <div class="timeline-item" onclick="openPeak('${a.mountain.id}')">
              <div class="timeline-flag">${a.mountain.flag}</div>
              <div class="timeline-body">
                <div class="timeline-name">${esc(a.mountain.name)}</div>
                <div class="timeline-meta">${formatDate(a.date)}${a.note ? " · " + esc(a.note) : ""}</div>
              </div>
              <div class="timeline-elev">${fmt.format(a.mountain.elevation)} m</div>
            </div>`).join("")}
        </div>
      </div>
    </div>`;

  html += `<div>`;
  html += climbsPerYearChart(ascents);
  html += altitudeBands(peaks);
  html += `</div></div>`;

  el.innerHTML = html;
}

function ringCard(list, p) {
  const r = 34, c = 2 * Math.PI * r;
  const offset = c * (1 - p.pct);
  const complete = p.done === p.total;
  return `
    <div class="ring-card ${complete ? "complete" : ""}" onclick="openList('${list.id}')">
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

function altitudeBands(peaks) {
  const bands = [
    { label: "8,000 m+", min: 8000, color: "#A08CF0" },
    { label: "6–8,000 m", min: 6000, color: "#7FA9E8" },
    { label: "4–6,000 m", min: 4000, color: "#53BFC0" },
    { label: "2–4,000 m", min: 2000, color: "#E3B25F" },
    { label: "< 2,000 m", min: 0, color: "#FF7E5C" },
  ];
  const counts = bands.map((b, i) => {
    const maxE = i === 0 ? Infinity : bands[i - 1].min;
    return peaks.filter((p) => p.elevation >= b.min && p.elevation < maxE).length;
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
          <div class="peak-elev">${fmt.format(m.elevation)}<span class="unit"> m</span></div>
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
      <div class="popup-meta">${fmt.format(m.elevation)} m · ${esc(m.range)}</div>
      <button class="popup-btn" onclick="openPeak('${m.id}')">${climbed ? "View ascents →" : "Log a climb →"}</button>
    `);
    state.markers.push(mk);
  }

  const peaks = climbedPeaks();
  const totalElev = peaks.reduce((s, m) => s + m.elevation, 0);
  const continents = new Set(peaks.map((m) => m.continent));
  document.getElementById("map-stats").innerHTML = `
    <div><div class="map-stat-value">${peaks.length}</div><div class="map-stat-label">PEAKS</div></div>
    <div><div class="map-stat-value">${fmt.format(totalElev)}</div><div class="map-stat-label">METRES</div></div>
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
}

backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !backdrop.hidden) closeModal();
  // "/" jumps to Explore search from anywhere (unless already typing somewhere).
  if (e.key === "/" && backdrop.hidden) {
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
        <div class="fact"><div class="fact-value">${fmt.format(m.elevation)} m</div><div class="fact-label">Elevation</div></div>
        <div class="fact"><div class="fact-value">${fmt.format(Math.round(m.elevation * 3.28084))} ft</div><div class="fact-label">Elevation</div></div>
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
        ${ascents.map((a) => `
          <div class="ascent-row">
            <div>
              <div class="ascent-date">${formatDate(a.date)}</div>
              ${a.note ? `<div class="ascent-note">${esc(a.note)}</div>` : ""}
            </div>
            <button class="ascent-delete" onclick="deleteAscent('${id}', ${a.idx})">Remove</button>
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

function deleteAscent(id, index) {
  const list = state.climbs[id] || [];
  list.splice(index, 1);
  if (!list.length) delete state.climbs[id];
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
            <div class="list-peak-elev">${fmt.format(m.elevation)} m</div>
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
              <span class="picker-elev">${fmt.format(m.elevation)} m</span>
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

function seedDemo() {
  state.climbs = {
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
  saveClimbs();
  render();
  toast("Demo logbook loaded — 15 climbs");
}

document.getElementById("btn-export").addEventListener("click", () => {
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
      const climbs = data.climbs || data;
      if (typeof climbs !== "object" || Array.isArray(climbs) || climbs === null) throw new Error("bad format");
      // Keep only entries that look like real ascents of known mountains.
      const clean = {};
      for (const [id, list] of Object.entries(climbs)) {
        if (!byId[id] || !Array.isArray(list)) continue;
        const ascents = list
          .filter((a) => a && typeof a.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.date))
          .map((a) => ({ date: a.date, note: typeof a.note === "string" ? a.note : "" }));
        if (ascents.length) clean[id] = ascents;
      }
      if (!Object.keys(clean).length) throw new Error("no valid climbs");
      const existing = Object.keys(state.climbs).length;
      if (existing && !confirm(`Replace your current logbook (${existing} peak${existing === 1 ? "" : "s"}) with this file (${Object.keys(clean).length} peaks)?`)) return;
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
    return state.climbs;
  },
  // Replace the logbook with data arriving from the cloud, then re-render.
  // Does not call saveClimbs(), so it never echoes back to the cloud.
  applyRemote(climbs) {
    state.climbs = climbs && typeof climbs === "object" ? climbs : {};
    writeLocal();
    render();
    if (state.openPeakId && !backdrop.hidden) openPeak(state.openPeakId, state.fromListId);
  },
};

// Let other modules trigger a toast (e.g. sign-in prompts).
window.toast = toast;

/* ============================================================
   Boot
   ============================================================ */

render();
