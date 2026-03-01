# HomeScore — Frontend

React + Vite + Tailwind + Mapbox GL JS

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Project Structure

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Root layout + header
├── index.css             # Tailwind + global styles (slider thumbs, Mapbox popup)
├── constants.js          # Token, mock data, shared helpers (scoreColor, computeLocalRank)
├── api.js                # fetchHomes() + fetchRankedHomes() — falls back to local scoring if backend is down
├── hooks/
│   └── useScoring.js     # All state: homes, rankedHomes, weights, activeId. Debounces re-ranking at 120ms.
└── components/
    ├── SliderPanel.jsx   # Left panel — 4 weight sliders + top result preview
    ├── MapView.jsx       # Center — Mapbox map, markers, popups, fly-to
    └── HomeList.jsx      # Right panel — ranked home cards with mini score bars
```

## Connecting to the Backend

The API base URL is in `src/constants.js`:

```js
export const API_BASE = 'http://localhost:8000'
```

- `GET /homes` → returns array of home objects
- `POST /score` with body `{ w_quiet, w_green, w_activity, w_light }` → returns sorted array with `fit_score`

If either endpoint is unreachable, the app automatically falls back to mock data and local scoring so the UI stays functional during development.

## Changing the Mapbox Token

Also in `src/constants.js`:

```js
export const MAPBOX_TOKEN = 'pk.eyJ1...'
```
