# Outsights Web UI

Outsights is a web app for Earth observation and spatial analytics. It combines historical Sentinel-2 imagery, urban expansion layers, and an AI copilot in one map-first interface.

## Features

- **Imagery mode**: time-series playback, spectral bands (`NDBI`, `NDVI`, `NDWI`, `True Color`), cloud filter, and area sizing.
- **Expansion mode**: H3-based urban growth analysis with dataset selection, drawn bounding boxes, and year timeline controls.
- **AI copilot**: natural-language map controls and analysis triggers via `/api/copilot/chat`.
- **AI analysis**: image analysis through `/api/analyze`.

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- MapLibre GL + Deck.gl
- Vercel AI SDK (`@ai-sdk/react`, `ai`)
- TanStack Query
- Supabase client auth

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Set required variables in `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_MAPBOX_TOKEN=your_mapbox_public_token
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

4. Start dev server:

```bash
npm run dev
```

Frontend runs on `http://localhost:8080` (expects backend on `http://localhost:8000`).

## Build

```bash
npm run build
npm run preview
```

## Deployment

Deployed on Vercel from `main` using `vercel.json`.
