# Outsight MVP - Earth Observation Interface 🛰️

Outsight is a high-performance web interface designed to dynamically fetch, filter, and render historical satellite imagery across the globe. Built precisely on top of modern frontend primitives, it interfaces seamlessly with a custom FastAPI + STAC (SpatioTemporal Asset Catalog) raster backend to visualize `Sentinel-2/L2A` Open Data.

## 🚀 Key Features

* **Time-Series Playback**: Enter a broad date range (e.g., 2023-01-01 to 2024-01-01) and use the native Shadcn scrub-slider or navigation arrows to instantly traverse historical aerial frames of the same coordinate over time.
* **Dynamic Sector Sizing**: Explores geographic bounds ranging from 1x1 km deep-dive crops out to massive 10x10 km regional views.
* **Cloud Cover Filtering**: Instantly filters the timeline dataset by defining a maximum cloud cover percentage (0% - 100%), ensuring clear visibility.
* **Intelligent Raster Rendering**: Features a state-aware `<RenderedImage />` component that gracefully streams heavy Cloud Optimized GeoTIFFs (COGs) via the `/api/render` backend, displaying a beautiful `Loader2` "Processing Satellite Data..." overlay while streaming to prevent UI freezes.
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
   Copy the example environment file to configure your local backend endpoint.
   ```sh
   cp .env.example .env
   ```

4. **Start the Frontend development server**:
   ```sh
   npm run dev
   ```
   *The UI will normally launch on `http://localhost:8080`. Note that it expects the Outsight FastAPI backend to be running concurrently on port `8000` for the `api/imagery` and `api/render` endpoints.*

## 📸 Interface Preview

The control panel features isolated Date Inputs with native calendar popovers, coordinate management, and the `Sector Size` and `Max Cloud` filters feeding into the primary Canvas.

When retrieving imagery, the `<VisualizationCanvas />` orchestrates the fetching and metadata display natively.

---
*Built with precision.*
