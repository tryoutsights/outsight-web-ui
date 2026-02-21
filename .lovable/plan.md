

# Outsight MVP — Earth Observation Interface

## Overview
A single-page, cinematic dark-mode application for retrieving and displaying satellite Earth Observation imagery. Top-bottom layout with responsive design.

---

## 1. Global Styling & Theme
- Switch to dark mode by default with a deep slate/black palette
- Add **Inter** font from Google Fonts
- Define accent colors: neon cyan (`#00E5FF`) / electric blue for interactive elements
- Set up glassmorphism utility styles (backdrop-blur, semi-transparent backgrounds, subtle borders)

## 2. Control Panel (Top Bar)
- A sleek, glassmorphic horizontal bar pinned to the top of the page
- Contains:
  - **Latitude** input field (numeric, with placeholder like `40.7128`)
  - **Longitude** input field (numeric, with placeholder like `-74.0060`)
  - **Date picker** using the existing Shadcn calendar/popover component
  - **"Retrieve EO Data"** primary action button with a neon cyan accent, smooth hover glow effect, and disabled state while loading
- On mobile: inputs stack vertically, button spans full width

## 3. Visualization Canvas (Main Area)
Fills the remaining viewport below the control panel. Three distinct states with smooth transitions:

### Empty State (Default)
- Subtle animated dot-grid or crosshatch pattern background
- Centered text: *"Awaiting coordinates..."* in muted style with a soft pulse
- Sets the tone — feels like a system standing by

### Loading State
- A scanning-line animation sweeps vertically across the canvas (like a radar scan)
- Pulsing text: *"Retrieving imagery..."*
- The Retrieve button shows a spinner and is disabled

### Loaded State
- The satellite image fades in smoothly, displayed prominently and responsively scaled
- **Status badge** overlaid in the top-right corner of the image:
  - Glassmorphic pill showing **Satellite Name** (e.g., "Sentinel-2") and **Cloud Cover %** with a small cloud icon
- Image contained within a styled frame with a subtle neon border glow

### Error State
- A toast notification (using Sonner) with a clean error message
- The canvas reverts to the empty state or shows an inline "No imagery found" message

## 4. Data Fetching Logic
- On button click, call `http://localhost:8000/api/imagery?lat={lat}&lon={lon}&date={date}`
- Expect JSON response: `{ image_url, satellite_name, cloud_cover, date }`
- Basic input validation (lat: -90 to 90, lon: -180 to 180, date required)
- Use React Query for the fetch with manual trigger (enabled: false, refetch on click)

## 5. Responsive Behavior
- **Desktop (1280px+):** Spacious top bar, large canvas
- **Tablet:** Controls may wrap to two rows
- **Mobile:** Controls stack vertically, canvas adapts to available height, status badge scales down

## 6. Polish & Transitions
- All state changes use CSS transitions (opacity, transform) for a premium feel
- Button hover: subtle glow + slight scale
- Image appearance: fade-in + slight scale-up animation
- Consistent use of the neon cyan accent for focus rings, active states, and highlights

