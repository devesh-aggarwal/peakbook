# Setting up Google sign-in (Firebase)

The site works without any of this: climbs save on the device via the
browser. Do the steps below to turn on "Sign in with Google" so each
person gets an account and their logbook syncs across their devices.

It's about 10 minutes, all free. You'll create a Firebase project, paste
four values into `js/firebase-config.js`, flip on Google sign-in, and add
a database with one small security rule.

---

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com and sign in with your Google account.
2. Click **Add project**, name it (e.g. `summit`), and finish. You can skip Google Analytics.

## 2. Register a web app and copy the config

1. On the project home, click the **web icon** `</>` ("Add app").
2. Give it a nickname (e.g. `summit-web`) and click **Register app**. You don't need Firebase Hosting.
3. You'll see a `firebaseConfig` object. Copy the values.
4. Open `js/firebase-config.js` in this project and paste them in, replacing the `REPLACE_ME` placeholders:

   ```js
   window.SUMMIT_FIREBASE_CONFIG = {
     apiKey: "AIza...your value...",
     authDomain: "summit-xxxx.firebaseapp.com",
     projectId: "summit-xxxx",
     appId: "1:1234567890:web:abcdef...",
   };
   ```

   These values are **not secrets**. They're public identifiers that ship in
   the browser, so it's fine that they're in the file. Real protection comes
   from the security rule in step 5.

## 3. Turn on Google sign-in

1. In the Firebase console, go to **Build > Authentication > Get started**.
2. Open the **Sign-in method** tab.
3. Click **Google**, toggle **Enable**, pick a support email, and **Save**.

## 4. Create the database

1. Go to **Build > Firestore Database > Create database**.
2. Choose **Start in production mode** (the rule in the next step opens exactly what's needed).
3. Pick a location close to your users and finish.

## 5. Add the security rule

In **Firestore Database > Rules**, replace what's there with this, then **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

This says: a signed-in person can read and write only their own logbook, and no one else's.

## 6. Authorize your website's domain

So the Google popup is allowed to run on your live site:

1. Go to **Authentication > Settings > Authorized domains**.
2. Click **Add domain** and add each domain the site runs on, for example:
   - `peakbook.co`
   - your Vercel domain, e.g. `summit-xxxx.vercel.app`

   `localhost` is already there for local testing.

---

## Done

Reload the site. The sidebar button becomes a working **Sign in with Google**.
The first time someone signs in, any climbs they logged before signing in are
merged into their account so nothing is lost. After that, every change syncs to
their account and shows up on any device they sign in on.

### How the data is stored

- One document per person at `users/{their-uid}` in Firestore.
- The document holds `{ climbs: { mountainId: [{ date, note }] }, updatedAt }`.
- The same shape is kept in the browser's localStorage as an offline cache, so
  the app still works with no connection and syncs when it's back.
