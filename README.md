# Peakbook 🏔

A simple website for tracking the mountains you've climbed, inspired by flight-tracking apps like Flighty.

## Features

- **Explore & search:** browse 363 notable peaks worldwide; search by name, range, or country and filter by continent or climbed status.
- **Log climbs:** record ascents with a date and an optional note (route, partners, conditions). Multiple ascents per peak are supported.
- **Add your own peaks:** anything missing from the dataset can be added by hand — name, elevation, country, and coordinates — and it then behaves like any other peak (search, map, stats, export). Custom peaks are private to that logbook: they sync to the owner's own account and travel with their shared profile, but never join the global list.
- **World map:** a dark world map with glowing markers for every summit you've logged (Leaflet + CARTO dark tiles).
- **Statistics:** peaks climbed, highest summit, combined elevation, countries, continents, climbs per year, and altitude-band breakdown.
- **Peak lists:** track your progress on the Seven Summits, the 8,000ers, the Volcanic Seven Summits, Alpine Classics, Cascade Volcanoes, the Colorado 14ers, Andes & Patagonia, and the Country High Points, with progress rings and completion states.
- **Accounts (optional):** Sign in with Google to get an account whose logbook syncs across devices, powered by Firebase. Setup is in [SETUP.md](SETUP.md). Without it, the app runs in local-only mode.
- **Share your profile:** publish a public "climbing resume" at a shareable link (`?u=<uid>`) — your stats, a map of your summits, list progress, and every ascent by year. It stays in sync as you log climbs, and you can unpublish at any time. Requires the Firebase setup above.
- **Export / import:** your logbook is stored locally (localStorage) and can be exported to or restored from a JSON file.
- **Feedback:** a pinned button (bottom-left) opens a short form for bugs, feature ideas, and improvements — it pre-fills a GitHub issue on this repo, so filing is one click from there.

## Running it

It's a fully static site with no build step. Serve the folder with any static server:

```bash
python3 -m http.server 8420
```

Then open http://localhost:8420.

## Structure

- `index.html`: page structure, navigation, modal & toast containers
- `css/style.css`: the design system (alpine-night dark theme, alpenglow accent, Fraunces + Inter type)
- `js/data.js`: mountain dataset and curated peak lists
- `js/app.js`: state, rendering, map, and logbook logic
- `js/feedback.js`: the feedback form, and the GitHub-issue pre-fill it submits to

## Notes

- Data model: `{ [mountainId]: [{ date, note }] }` under the `peakbook.climbs` localStorage key, kept deliberately simple so it can move to a backend or native app later.
- User-added peaks live under `peakbook.custom` as `{ [peakId]: peak }`, keyed by a `custom-`-prefixed id that can never collide with a dataset id. Everything arriving from storage, an import file, or the cloud goes through `sanitizeCustomPeaks()` first — a published resume renders its owner's peaks on a stranger's screen, so flags are whitelisted against the dataset and every text field is escaped at render.
- The only external dependencies are Leaflet (CDN) and CARTO map tiles; everything else is vanilla HTML/CSS/JS.
