/* ============================================================
   Peakbook: in-app feedback

   A pinned button (bottom-left) opens a small form for bug
   reports, feature ideas, and improvements. Submitting it opens
   GitHub's "new issue" page with the title, label, and body
   pre-filled, so filing is one click from there.

   No backend and no tokens: the reporter files the issue from
   their own (free) GitHub account, and the pre-filled page shows
   them exactly what gets sent before they submit.

   Relies on globals from js/app.js: openModal, closeModal,
   toast, state.
   ============================================================ */

const FEEDBACK_REPO = "https://github.com/devesh-aggarwal/peakbook";

/* Labels only stick when the reporter has triage rights on the
   repo (i.e. the maintainer); GitHub drops them for everyone
   else, which is why the type is also in the title and body. */
const FEEDBACK_TYPES = {
  bug: { chip: "🐛 Bug", name: "Bug report", prefix: "[Bug]", label: "bug" },
  feature: { chip: "💡 Feature", name: "Feature request", prefix: "[Feature]", label: "enhancement" },
  improvement: { chip: "✨ Improvement", name: "Improvement", prefix: "[Improvement]", label: "enhancement" },
};

let feedbackType = "bug";

function openFeedback() {
  openModal(`
    <div class="modal-hero">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-title">Feedback</div>
    </div>
    <div class="modal-body">
      <form class="log-form" onsubmit="submitFeedback(event)">
        <div>
          <label>What kind of feedback?</label>
          <div class="fb-type-row" role="group" aria-label="Feedback type">
            ${Object.entries(FEEDBACK_TYPES).map(([key, t]) => `
              <button type="button" class="fb-type${key === feedbackType ? " active" : ""}" data-type="${key}" onclick="setFeedbackType('${key}')">${t.chip}</button>
            `).join("")}
          </div>
        </div>
        <div>
          <label for="fb-message">What's up?</label>
          <textarea id="fb-message" rows="5" maxlength="2000" required
            placeholder="The more detail the better. What happened, or what would you love to see?"></textarea>
        </div>
        <button type="submit" class="primary-btn">Continue on GitHub →</button>
        <p class="fb-hint">This opens GitHub with your report pre-filled, where you press "Submit new issue" to file it (needs a free GitHub account).</p>
      </form>
    </div>
  `);
  document.getElementById("fb-message").focus();
}

function setFeedbackType(type) {
  feedbackType = type;
  document.querySelectorAll(".fb-type").forEach((b) => {
    b.classList.toggle("active", b.dataset.type === type);
  });
}

/* The raw userAgent reads as noise ("Mozilla/5.0 … Safari" on
   Chrome, with the macOS version frozen at 10_15_7), so reports
   carry a plain-English summary instead. Match order matters:
   Chromium browsers all contain "Chrome", and everything
   contains "Safari", so the more specific tokens go first. */
function describeBrowser() {
  const ua = navigator.userAgent;
  const os =
    /iPhone|iPod/.test(ua) ? "iOS" :
    /iPad/.test(ua) ? "iPadOS" :
    /Android/.test(ua) ? "Android" :
    /Windows/.test(ua) ? "Windows" :
    /Macintosh/.test(ua) ? "macOS" :
    /CrOS/.test(ua) ? "ChromeOS" :
    /Linux/.test(ua) ? "Linux" : "an unknown OS";
  const browsers = [
    ["Edge", /Edg(?:e|iOS|A)?\/(\d+)/],
    ["Opera", /OPR\/(\d+)/],
    ["Samsung Internet", /SamsungBrowser\/(\d+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/(\d+)/],
    ["Chrome", /(?:Chrome|CriOS)\/(\d+)/],
    ["Safari", /Version\/(\d+)[.\d]* .*Safari/],
  ];
  for (const [name, re] of browsers) {
    const m = ua.match(re);
    if (m) return `${name} ${m[1]} on ${os}`;
  }
  return `an unrecognized browser on ${os}`;
}

function submitFeedback(e) {
  e.preventDefault();
  const message = document.getElementById("fb-message").value.trim();
  if (!message) return;
  const t = FEEDBACK_TYPES[feedbackType];

  const firstLine = message.split("\n")[0];
  const title = `${t.prefix} ${firstLine.length > 64 ? firstLine.slice(0, 64).trimEnd() + "…" : firstLine}`;

  const body = [
    message,
    "",
    "---",
    "_Filed from the in-app feedback form_",
    `- **Type:** ${t.name}`,
    `- **View:** ${state.view}`,
    `- **Peaks logged:** ${Object.keys(state.climbs).length}`,
    /* "at 2x", not "@2x": GitHub renders @2x as a user mention. */
    `- **Screen:** ${window.innerWidth}×${window.innerHeight} at ${window.devicePixelRatio || 1}x`,
    `- **Browser:** ${describeBrowser()}`,
  ].join("\n");

  const url = `${FEEDBACK_REPO}/issues/new` +
    `?title=${encodeURIComponent(title)}` +
    `&labels=${encodeURIComponent(t.label)}` +
    `&body=${encodeURIComponent(body)}`;

  /* A synthetic link click, not window.open: passing a feature
     string like "noopener" makes browsers treat the open as a
     popup, which blockers silently swallow. A clicked anchor is
     plain link navigation and always opens the tab. */
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();

  closeModal();
  toast("Now press “Submit new issue” on GitHub");
}
