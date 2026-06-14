# Signature Finder

React app for checking an MTG decklist against convention guest artists. The first convention data set is SCG CON Las Vegas 2026, sourced from the public SCG CON event page. Card printing and artist data comes from the Scryfall API.

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run lint
npm run build
```

## Deploy To Vercel

Import this repository in Vercel and use the default Vite settings:

- Build command: `npm run build`
- Output directory: `dist`

## Data Notes

Convention artists live in `src/data/conventions.ts`. The app currently supports MTG decklists and is structured so additional convention records or future game-specific lookup clients can be added without changing the UI flow.
