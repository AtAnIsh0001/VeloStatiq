# VeloStatiq

VeloStatiq is a cinematic football and Formula One analytics workspace built with Next.js, React and TypeScript.

## Features

- Separate football and Formula One workspaces
- Live schedules, results, standings, player and driver profiles
- Major football leagues and UEFA Champions League coverage
- Explainable football predictions using each team’s five latest completed matches
- Formula One predictions for lap time, pit strategy, tyre strategy and fastest-lap probability
- Direct F1 prediction comparison against the selected driver’s previous race at the upcoming circuit
- Interactive charts, infographics and a Three.js circuit replay
- Clear data provenance and unavailable-data states

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify

```bash
npm run lint
npm run build
```

## Data layout

The Git repository contains the normalized `DataBase/index.json`, active Formula One model CSVs, source metadata and deployment assets.

The approximately 15 GB raw football archive is intentionally excluded from Git. It is reproducible source material and is not needed at runtime because the application uses the normalized index and live football providers. Generated caches and duplicate Formula One source archives are also excluded.

Never commit ESPN private cookies or other secrets. Copy `.env.example` to `.env.local` only when private ESPN Fantasy Football access is needed.

## Production deployment

This is a dynamic application with server API routes. GitHub Pages cannot run it, but the prediction engine is plain Node.js/TypeScript with no native dependencies, so it deploys cleanly to Vercel (zero-config: import the repo and deploy) as well as any GitHub-connected Docker host such as Render, Railway, Fly.io or Cloud Run.

For Vercel:

1. Push this repository to GitHub.
2. Import the repository in Vercel and deploy — no extra configuration is required.

For Render:

1. Push this repository to GitHub.
2. In Render, create a Blueprint and select this repository.
3. Render reads `render.yaml`, builds the Docker image and checks `/` for health.
4. Add private environment variables in the Render dashboard if ESPN Fantasy access is enabled.

The app primarily uses free public data providers, so no environment variables are required for the standard football and Formula One dashboards.

## Prediction system

- Engine: `src/lib/f1PredictionEngine.ts` (native TypeScript, runs in any Node.js serverless or server runtime)
- Reference implementation: `DataBase/PredictionSystem/f1_predictor.py` (the original standalone Python script the engine was ported from; not used at runtime)
- Formula One comparison service: `src/lib/f1DriverHistory.ts`
- Formula One report: `output/pdf/VeloStatiq_F1_Prediction_System_Report.pdf`

Predictions are estimates, not betting advice. Recorded results and forecasts are always labeled separately.
