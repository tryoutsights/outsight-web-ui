

# Landing Page Fixes — 5 Items

## Changes

### 1. Navbar — Add missing section links (`src/components/LandingNavbar.tsx`)
- Add "Vision" nav link (scrolls to `#vision` id) between Solutions and About

### 2. Solutions chip (`src/pages/Landing.tsx`, ~line 145)
- Add a pill-shaped chip (like Vision/About sections have) above the "Built for Real Estate & Construction" heading, reading "Solutions" with a relevant icon

### 3. Vision quote size (`src/pages/Landing.tsx`, line 133)
- Reduce from `text-2xl md:text-3xl` to `text-xl md:text-2xl` to make the blockquote more reasonable in size

### 4. Remove "The Team Behind OutSights" heading (`src/pages/Landing.tsx`, lines 188-190)
- Delete the `<h2>` element entirely

### 5. Larger avatar placeholders (`src/pages/Landing.tsx`, line 203)
- Increase from `w-12 h-12` to `w-16 h-16` (64px) so real photos will look good later
- Bump initials text size from `text-sm` to `text-base`

