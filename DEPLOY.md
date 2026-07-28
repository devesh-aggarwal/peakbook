# Putting Peakbook online

The site is plain static files (HTML/CSS/JS), so hosting is quick and free.
Pick one of the two paths below. Both read the files straight from this
folder, so what goes live is exactly what's on your machine.

Do this from the project folder:

```
cd /Users/devesh/code/peakbook
```

---

## Option A: Netlify Drop (easiest, instant public URL)

1. Open https://app.netlify.com/drop
2. Drag the whole `peakbook` folder onto the page.
3. You immediately get a public URL like `https://random-name.netlify.app`.

That's it, no account needed to test. To use a custom domain later, make a
free Netlify account and add the domain under Site settings > Domain.

## Option B: Vercel (keeps hosting + the peakbook.co domain in one place)

1. Deploy:

   ```
   npx vercel --prod
   ```

   The first run opens a browser to log in, then asks a couple of questions
   (accept the defaults; when it asks to link to an existing project you can
   pick `peakbook` or create a new one). It uploads this folder and prints your
   live URL.

2. Make it public. By default Vercel may put a login wall on the site
   (you'll see a Vercel login page instead of Peakbook). Turn it off:
   Vercel dashboard > your project > Settings > Deployment Protection >
   set **Vercel Authentication** to Off > Save.

3. Attach your domain (after you own it, see below):
   Settings > Domains > add `peakbook.co` and follow the prompts. Vercel
   handles the SSL certificate automatically.

---

## Buying the domain (peakbook.co)

As of the last check it's available for **$4.99/year**.

- Buy it inside the Vercel dashboard: **Domains > search `peakbook.co` > Buy**.
  Registration asks for your name, address, phone, and email (required by
  every domain registrar for the public WHOIS record).
- Or I can register it for you through the tools here, but I'd need those same
  contact details and your go-ahead on the (non-refundable) charge first.

---

## After it's live

- Add your live domain(s) to Firebase (Authentication > Settings > Authorized
  domains) so Google sign-in works there. See [SETUP.md](SETUP.md).
- To update the site later, change files here and run the same deploy command
  (or drag the folder to Netlify Drop again).
