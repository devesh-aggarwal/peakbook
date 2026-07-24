/* ============================================================
   Summit: Google sign-in + cloud sync (Firebase)

   This module is optional. The app works fully without it using
   localStorage. When js/firebase-config.js holds a real config,
   signing in with Google stores each person's logbook in Firestore
   and keeps it in sync across every device they sign in on.

   It talks to the main app (js/app.js) through window.summitApp:
     - summitApp.getClimbs()        read the current logbook
     - summitApp.applyRemote(data)  push cloud data into the app
   and exposes:
     - window.summitAuth  { signIn, signOut }  for the buttons
     - window.summitSync  { push(climbs) }      used after local edits
   ============================================================ */

const accountAreas = () => document.querySelectorAll(".account-area");

/* Placeholder handlers so the buttons never throw before init finishes. */
window.summitAuth = {
  signIn() {
    if (window.toast) window.toast("Add your Firebase config in js/firebase-config.js to enable sign-in. See SETUP.md.");
  },
  signOut() {},
};

/* ---------- small helpers ---------- */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "🧗";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

const GOOGLE_G = `<svg class="g-logo" viewBox="0 0 18 18" aria-hidden="true">
  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
  <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
</svg>`;

/* ---------- account UI ---------- */

function renderSignedOut() {
  accountAreas().forEach((el) => {
    el.innerHTML = `<button class="google-btn" onclick="summitAuth.signIn()">${GOOGLE_G}<span>Sign in with Google</span></button>`;
  });
}

function renderSignedIn(user) {
  const name = user.displayName || user.email || "Climber";
  const avatar = user.photoURL
    ? `<img class="account-avatar" src="${escapeHtml(user.photoURL)}" alt="" referrerpolicy="no-referrer" />`
    : `<div class="account-avatar fallback">${escapeHtml(initials(name))}</div>`;
  accountAreas().forEach((el) => {
    el.innerHTML = `
      <div class="account-chip">
        ${avatar}
        <div class="account-info">
          <div class="account-name">${escapeHtml(name)}</div>
          <div class="account-sync"><span class="sync-dot"></span>Synced to cloud</div>
        </div>
        <button class="account-signout" onclick="summitAuth.signOut()" title="Sign out">Sign out</button>
      </div>`;
  });
}

/* ---------- merge local + cloud without losing anything ---------- */

function mergeClimbs(a, b) {
  const out = {};
  const ids = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const id of ids) {
    const seen = new Set();
    const merged = [];
    for (const asc of [...((a && a[id]) || []), ...((b && b[id]) || [])]) {
      if (!asc || !asc.date) continue;
      const key = asc.date + "|" + (asc.note || "");
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ date: asc.date, note: asc.note || "" });
    }
    if (merged.length) out[id] = merged;
  }
  return out;
}

/* ---------- init ---------- */

renderSignedOut();

const cfg = window.SUMMIT_FIREBASE_CONFIG;
const configured = cfg && !JSON.stringify(cfg).includes("REPLACE_ME");

if (configured) {
  init().catch((err) => {
    console.error("Summit: cloud sync failed to start", err);
    if (window.toast) window.toast("⚠️ Cloud sync could not start — check your Firebase config");
  });
}

async function init() {
  const V = "10.12.2";
  const base = `https://www.gstatic.com/firebasejs/${V}`;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);

  const { initializeApp } = appMod;
  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = authMod;
  const { getFirestore, doc, getDoc, setDoc, onSnapshot } = fsMod;

  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  let userDocRef = null;
  let unsubscribe = null;
  let pushTimer = null;
  let applyingRemote = false;

  window.summitAuth.signIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e && e.code === "auth/popup-closed-by-user") return;
      console.error("Summit: sign-in failed", e);
      if (window.toast) window.toast("Sign-in didn't complete");
    }
  };

  window.summitAuth.signOut = async () => {
    try {
      await signOut(auth);
      if (window.toast) window.toast("Signed out");
    } catch (e) {
      console.error("Summit: sign-out failed", e);
    }
  };

  // Debounced push, called by app.js after every local edit.
  window.summitSync = {
    push(climbs) {
      if (!userDocRef || applyingRemote) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        setDoc(userDocRef, { climbs, updatedAt: Date.now() }, { merge: true }).catch((e) =>
          console.error("Summit: cloud save failed", e)
        );
      }, 600);
    },
  };

  onAuthStateChanged(auth, async (user) => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    if (!user) {
      userDocRef = null;
      renderSignedOut();
      return;
    }

    renderSignedIn(user);
    userDocRef = doc(db, "users", user.uid);

    // First sign-in on a device: fold any local climbs into the cloud copy
    // so nothing logged while signed out is lost.
    const local = window.summitApp ? window.summitApp.getClimbs() : {};
    let remote = {};
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) remote = snap.data().climbs || {};
    } catch (e) {
      console.error("Summit: could not read cloud logbook", e);
    }

    const merged = mergeClimbs(local, remote);
    if (JSON.stringify(merged) !== JSON.stringify(remote)) {
      try {
        await setDoc(userDocRef, { climbs: merged, updatedAt: Date.now() }, { merge: true });
      } catch (e) {
        console.error("Summit: could not seed cloud logbook", e);
      }
    }

    // Live updates: any change on any device flows back here.
    unsubscribe = onSnapshot(userDocRef, (snap) => {
      const climbs = snap.exists() ? snap.data().climbs || {} : {};
      applyingRemote = true;
      if (window.summitApp) window.summitApp.applyRemote(climbs);
      applyingRemote = false;
    });
  });
}
