

# Remove Platform Demo Section & Reorder Landing Page

## Changes

### `src/pages/Landing.tsx`
- Remove the entire "Platform Demo" section (the satellite image with frosted-glass overlay cards)
- Reorder sections to: Hero → Vision → Industry Solutions → About Us → CTA → Footer

### `src/components/LandingNavbar.tsx`
- Add "About" nav link scrolling to `#about`
- Keep existing "Solutions" and "Platform Demo" (route link to `/platform`) nav items

## Final Section Order
1. Navbar
2. Hero — hook
3. Vision — the "why"
4. Industry Solutions — the "what"
5. About Us / Team — trust
6. Bottom CTA — convert
7. Footer

