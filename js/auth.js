/* ============================================================
   Peakbook: Google sign-in + cloud sync (Firebase)

   This module is optional. The app works fully without it using
   localStorage. When js/firebase-config.js holds a real config,
   signing in with Google stores each person's logbook in Firestore
   and keeps it in sync across every device they sign in on.

   It talks to the main app (js/app.js) through window.peakbookApp:
     - peakbookApp.getClimbs()        read the current logbook
     - peakbookApp.applyRemote(data)  push cloud data into the app
   and exposes:
     - window.peakbookAuth  { signIn, signOut }  for the buttons
     - window.peakbookSync  { push(climbs) }      used after local edits
   ============================================================ */

const accountAreas = () => document.querySelectorAll(".account-area");

// Same param app.js reads: when present we're viewing someone's shared resume.
const VIEWED_SHARE_UID = new URLSearchParams(location.search).get("u");

/* Placeholder handlers so the buttons never throw before init finishes. */
window.peakbookAuth = {
  async signIn() {
    if (window.toast) window.toast("Add your Firebase config in js/firebase-config.js to enable sign-in. See SETUP.md.");
  },
  signOut() {},
};

/* ---------- profile sharing state ----------
   The real implementations are installed by init() once Firebase is up.
   share.ready resolves as soon as we know whether the visitor is signed in
   and whether their profile is currently published, so the Share modal
   never shows a stale answer. */
const share = {
  configured: false,
  ready: null,
  signedIn: false,
  shared: false,
  uid: null,
  enableImpl: null,
  disableImpl: null,
};

window.peakbookShare = {
  async getState() {
    if (share.ready) await share.ready;
    return { configured: share.configured, signedIn: share.signedIn, shared: share.shared, uid: share.uid };
  },
  async enable() {
    if (!share.enableImpl) throw new Error("sharing unavailable");
    return share.enableImpl();
  },
  async disable() {
    if (!share.disableImpl) throw new Error("sharing unavailable");
    return share.disableImpl();
  },
  url(uid) {
    return `${location.origin}${location.pathname}?u=${encodeURIComponent(uid || share.uid || "")}`;
  },
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
    el.innerHTML = `<button class="google-btn" onclick="peakbookAuth.signIn()">${GOOGLE_G}<span>Sign in with Google</span></button>`;
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
        <button class="account-signout" onclick="peakbookAuth.signOut()" title="Sign out">Sign out</button>
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

const cfg = window.PEAKBOOK_FIREBASE_CONFIG;
const configured = cfg && !JSON.stringify(cfg).includes("REPLACE_ME");
share.configured = !!configured;

if (configured) {
  init().catch((err) => {
    console.error("Peakbook: cloud sync failed to start", err);
    if (share._readyResolve) share._readyResolve();
    if (window.toast) window.toast("⚠️ Cloud sync could not start — check your Firebase config");
    if (VIEWED_SHARE_UID && window.peakbookApp) window.peakbookApp.sharedProfileError("error");
  });
} else if (VIEWED_SHARE_UID && window.peakbookApp) {
  // A shared link was opened on a copy of the app with no cloud config.
  window.peakbookApp.sharedProfileError("unconfigured");
}

async function init() {
  share.ready = new Promise((resolve) => (share._readyResolve = resolve));

  const V = "10.12.2";
  const base = `https://www.gstatic.com/firebasejs/${V}`;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);

  const { initializeApp } = appMod;
  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = authMod;
  const { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot } = fsMod;

  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  // Viewing someone's shared resume: just fetch their public profile and
  // hand it to the app. No sign-in, no sync — the page is read-only.
  if (VIEWED_SHARE_UID) {
    share._readyResolve();
    try {
      const snap = await getDoc(doc(db, "profiles", VIEWED_SHARE_UID));
      if (snap.exists()) window.peakbookApp.showSharedProfile(snap.data());
      else window.peakbookApp.sharedProfileError("notfound");
    } catch (e) {
      console.error("Peakbook: could not load shared profile", e);
      window.peakbookApp.sharedProfileError("error");
    }
    return;
  }

  let userDocRef = null;
  let profileDocRef = null;
  let unsubscribe = null;
  let pushTimer = null;
  let applyingRemote = false;

  window.peakbookAuth.signIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e && e.code === "auth/popup-closed-by-user") return;
      console.error("Peakbook: sign-in failed", e);
      if (window.toast) window.toast("Sign-in didn't complete");
    }
  };

  window.peakbookAuth.signOut = async () => {
    try {
      await signOut(auth);
      if (window.toast) window.toast("Signed out");
    } catch (e) {
      console.error("Peakbook: sign-out failed", e);
    }
  };

  // Debounced push, called by app.js after every local edit. While the
  // profile is published, the public copy is kept in step with the logbook.
  window.peakbookSync = {
    push(climbs) {
      if (!userDocRef || applyingRemote) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        setDoc(userDocRef, { climbs, updatedAt: Date.now() }, { merge: true }).catch((e) =>
          console.error("Peakbook: cloud save failed", e)
        );
        if (share.shared && profileDocRef) {
          setDoc(profileDocRef, { climbs, updatedAt: Date.now() }, { merge: true }).catch((e) =>
            console.error("Peakbook: public profile save failed", e)
          );
        }
      }, 600);
    },
  };

  share.enableImpl = async () => {
    const user = auth.currentUser;
    if (!user || !profileDocRef) throw new Error("not signed in");
    const climbs = window.peakbookApp ? window.peakbookApp.getClimbs() : {};
    await setDoc(profileDocRef, {
      name: user.displayName || "",
      photoURL: user.photoURL || "",
      climbs,
      updatedAt: Date.now(),
    });
    await setDoc(userDocRef, { shared: true }, { merge: true });
    share.shared = true;
  };

  share.disableImpl = async () => {
    if (!profileDocRef) throw new Error("not signed in");
    await deleteDoc(profileDocRef);
    await setDoc(userDocRef, { shared: false }, { merge: true });
    share.shared = false;
  };

  onAuthStateChanged(auth, async (user) => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    if (!user) {
      userDocRef = null;
      profileDocRef = null;
      share.signedIn = false;
      share.shared = false;
      share.uid = null;
      share._readyResolve();
      renderSignedOut();
      return;
    }

    renderSignedIn(user);
    userDocRef = doc(db, "users", user.uid);
    profileDocRef = doc(db, "profiles", user.uid);
    share.signedIn = true;
    share.uid = user.uid;

    // First sign-in on a device: fold any local climbs into the cloud copy
    // so nothing logged while signed out is lost.
    const local = window.peakbookApp ? window.peakbookApp.getClimbs() : {};
    let remote = {};
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        remote = snap.data().climbs || {};
        share.shared = snap.data().shared === true;
      }
    } catch (e) {
      console.error("Peakbook: could not read cloud logbook", e);
    }
    share._readyResolve();

    const merged = mergeClimbs(local, remote);
    if (JSON.stringify(merged) !== JSON.stringify(remote)) {
      try {
        await setDoc(userDocRef, { climbs: merged, updatedAt: Date.now() }, { merge: true });
      } catch (e) {
        console.error("Peakbook: could not seed cloud logbook", e);
      }
    }

    // Live updates: any change on any device flows back here.
    unsubscribe = onSnapshot(userDocRef, (snap) => {
      const climbs = snap.exists() ? snap.data().climbs || {} : {};
      applyingRemote = true;
      if (window.peakbookApp) window.peakbookApp.applyRemote(climbs);
      applyingRemote = false;
    });
  });
}
