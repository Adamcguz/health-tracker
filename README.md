# Health Tracker

A single-user, phone-first PWA for logging food, water and workouts and tracking progress toward a goal weight. See [`Health Tracker App — PRD.md`](./Health%20Tracker%20App%20%E2%80%94%20PRD.md) for the full spec and build phases.

## Development

```bash
npm install
npm run dev
```

## Build & deploy

Pushing to `main` builds the app and deploys it to GitHub Pages via `.github/workflows/deploy.yml`. Enable Pages in the repo settings with source "GitHub Actions" after the first push.

To install on an iPhone: open the Pages URL in Safari, tap Share, then "Add to Home Screen."
