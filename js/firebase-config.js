/* ============================================================
   Summit: Firebase configuration

   Paste your own Firebase web-app config below to turn on
   "Sign in with Google" and cross-device cloud sync.

   Where to find these values:
   Firebase console > Project settings (gear icon) > General >
   "Your apps" > Web app > SDK setup and configuration > Config.

   These values are NOT secrets. They are public identifiers that
   ship in the browser, so it is safe to commit this file. Access
   is controlled by Firestore security rules, not by hiding these.

   Until you replace the REPLACE_ME values, the app runs in
   local-only mode: everything works, but data stays on the device
   and the sign-in button explains what to fill in.

   Step-by-step setup lives in SETUP.md.
   ============================================================ */

window.SUMMIT_FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  appId: "REPLACE_ME",
};
