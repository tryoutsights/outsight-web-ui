

# Outsights Landing Page

## Overview
Create a B2B SaaS landing page at `/` and move the existing EO tool to `/platform`. Maintain the same dark theme with neon cyan accents and glassmorphic design language.

## File Changes

### 1. New Page: `src/pages/Landing.tsx`
The main landing page with all 6 sections:

- **Navbar**: Sticky, glassmorphic (`backdrop-blur-xl`), logo "Outsights" with a satellite icon, nav links ("Solutions", "Platform Demo" linking to `/platform`), and a solid cyan "Join Waitlist" button.
- **Hero**: Two-column layout. Left: pill badge, bold headline, subtext, two CTA buttons. Right: Unsplash aerial construction image with a floating "Site Status: Active Development" card overlay.
- **Industry Solutions**: 3-column card grid. Each card has an Unsplash image top half, floating icon overlapping the boundary, title + description bottom half. Hover lifts with shadow.
- **Platform Demo**: Dark contrast section. Large satellite Unsplash image centered with 2-3 frosted-glass overlay cards ("Building Footprint", "Land Use Classification").
- **Bottom CTA**: Centered section with headline, subtext, and inline email capture form (input + "Request Access" button, stacked on mobile).
- **Footer**: Logo + tagline left, "Contact Us" right, copyright bottom.

### 2. Move existing tool: `src/pages/Platform.tsx`
Extract current `Index.tsx` content into a new Platform page component (same logic, just renamed).

### 3. Update `src/App.tsx`
- Route `/` → `Landing`
- Route `/platform` → `Platform` (the existing EO tool)

### 4. New component: `src/components/LandingNavbar.tsx`
Sticky nav with frosted background, shared across the landing page. Links to `/platform` for "Platform Demo".

### 5. Minor CSS additions in `src/index.css`
Add any needed utility classes (e.g., radial gradient background for hero texture).

## Responsive Behavior
- Hero: side-by-side on desktop, stacked on mobile
- Solutions grid: 3 columns desktop, 1 column mobile
- CTA form: inline on desktop, stacked on mobile
- Navbar: simplified on mobile with links condensed

## Design Consistency
Reuse existing CSS variables (dark background, cyan accents), `.glass` utility, Inter font, and glow effects already defined in the project.

