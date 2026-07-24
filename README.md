# Summit 🏔

A simple website for tracking the mountains you've climbed, inspired by flight-tracking apps like Flighty.

## Features

- **Explore & search:** browse 108 notable peaks worldwide; search by name, range, or country and filter by continent or climbed status.
- **Log climbs:** record ascents with a date and an optional note (route, partners, conditions). Multiple ascents per peak are supported.
- **World map:** a dark world map with glowing markers for every summit you've logged (Leaflet + CARTO dark tiles).
- **Statistics:** peaks climbed, highest summit, combined elevation, countries, continents, climbs per year, and altitude-band breakdown.
- **Peak lists:** track your progress on the Seven Summits, the 8,000ers, the Volcanic Seven Summits, Alpine Classics, Cascade Volcanoes, and Andes & Patagonia, with progress rings and completion states.
- **Accounts (optional):** Sign in with Google to get an account whose logbook syncs across devices, powered by Firebase. Setup is in [SETUP.md](SETUP.md). Without it, the app runs in local-only mode.
- **Export / import:** your logbook is stored locally (localStorage) and can be exported to or restored from a JSON file.

## Running it

It's a fully static site with no build step. Serve the folder with any static server:

```bash
python3 -m http.server 8420
```

Then open http://localhost:8420.

## Structure

- `index.html`: page structure, navigation, modal & toast containers
- `css/style.css`: the design system (dark, card-based, Flighty-inspired)
- `js/data.js`: mountain dataset and curated peak lists
- `js/app.js`: state, rendering, map, and logbook logic

## Notes

- Data model: `{ [mountainId]: [{ date, note }] }` under the `summit.climbs` localStorage key, kept deliberately simple so it can move to a backend or native app later.
- The only external dependencies are Leaflet (CDN) and CARTO map tiles; everything else is vanilla HTML/CSS/JS.
