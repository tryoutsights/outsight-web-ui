# Outsights MVP - Earth Observation Interface 🛰️

Outsights is a high-performance web interface designed to dynamically fetch, filter, and render historical satellite imagery across the globe. Built precisely on top of modern frontend primitives, it interfaces seamlessly with a custom FastAPI + STAC (SpatioTemporal Asset Catalog) raster backend to visualize `Sentinel-2/L2A` Open Data.

## 🚀 Key Features

* **Time-Series Playback**: Enter a broad date range (e.g., 2023-01-01 to 2024-01-01) and use the native Shadcn scrub-slider or navigation arrows to instantly traverse historical aerial frames of the same coordinate over time.
* **Interactive Map Coordinate Selection**: Click on a live map (powered by Mapbox) to instantly set your target coordinates, eliminating the need for manual latitude/longitude entry.
* **Dynamic Sector Sizing**: Explores geographic bounds ranging from 1x1 km deep-dive crops out to massive 10x10 km regional views.
* **Cloud Cover Filtering**: Instantly filters the timeline dataset by defining a maximum cloud cover percentage (0% - 100%), ensuring clear visibility.
* **Intelligent Raster Rendering**: Features a state-aware `<VisualizationCanvas />` orchestrating blob retrievals via the `/api/render` POST endpoint. Employs a local memory cache referencing generated `Object URLs` for instantaneous replay when traversing back to earlier timeline dates.
* **AI Image Analysis**: Use the built-in "Analyze Image" tool to prompt an AI model for insights about the currently rendered satellite image via the `/api/analyze` endpoint.
* **Graceful Error Handling**: Automatically intercepts JSON-wrapped FastAPI exceptions directly into sleek `sonner` toaster notifications if no imagery is found or bounds are invalid.

## 🛠️ Stack Architecture

* **Framework**: React 18 + Vite
* **Styling**: Tailwind CSS + custom glassmorphism & minimal cyber-aesthetics.
* **Component Library**: [shadcn/ui](https://ui.shadcn.com/) (specifically `Slider`, `Popover`, `Calendar`, `Select`, `Input`, `Label`, `Button`)
* **State Management**: `@tanstack/react-query` for high-performance API caching.
* **Date Parsing**: `date-fns`

## ⚙️ Local Development Setup

The repository requires Node.js (v20+ recommended).

1. **Clone the repository**:
   ```sh
   git clone <YOUR_GIT_URL>
   cd outsight-web-ui
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file to configure your local backend endpoint and Mapbox token.
   ```sh
   cp .env.example .env
   ```
   *Make sure to add your `VITE_MAPBOX_TOKEN` alongside `VITE_API_BASE_URL` in the `.env` file to enable the interactive map feature.*

4. **Start the Frontend development server**:
   ```sh
   npm run dev
   ```
   *The UI will normally launch on `http://localhost:8080`. Note that it expects the Outsights FastAPI backend to be running concurrently on port `8000` for the `api/imagery` and `api/render` endpoints.*

## 📦 Production Build

To produce an optimized production bundle:

```sh
npm run build
```

The compiled assets are emitted to `dist/` and can be previewed locally with `npm run preview`.

## 🚀 Deployment

The application is deployed to Vercel from the `main` branch using the configuration in `vercel.json`. Pushes to `main` trigger a fresh build and rollout automatically.

## 📸 Interface Preview

The control panel features isolated Date Inputs with native calendar popovers, coordinate management, and the `Sector Size` and `Max Cloud` filters feeding into the primary Canvas.

When retrieving imagery, the `<VisualizationCanvas />` orchestrates the fetching and metadata display natively.

---
*Built with precision.*
