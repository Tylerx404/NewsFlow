# NewsFlow Public Pages + Island Header Design

## Context
- Product: NewsFlow - personalized news/RSS summaries for individuals.
- Goal: Add public pages for Features and About, and introduce a shared “island” header across public pages for consistent navigation and CTA.
- Scope: `/` (landing), `/features`, `/about`, `/pricing`.
- Constraints:
  - All UI copy must go through i18n.
  - Use existing design tokens from `apps/web/app/assets/css/main.css` (OKLCH vars).
  - Keep layout light and fast; reuse shadcn-nuxt components.

## Goals
- Provide clear navigation across public pages.
- Introduce cohesive “island header” that feels lightweight and premium.
- Add Features and About pages with editorial-calm tone and clear structure.

## Non-goals
- No backend changes.
- No enterprise/team positioning.
- No heavy animations or interactive demos.

## Approach
- Create a new `public` layout used by `/`, `/features`, `/about`, `/pricing`.
- Implement a reusable Island Header component inside this layout.
- Build new pages with simple, consistent sections and spacing.

## Island Header Design
**Structure**
- Left: Logo text (`NewsFlow`).
- Center: Nav links (desktop), collapses to a menu on mobile.
- Right: Language switcher dropdown + Primary CTA button.

**Navigation**
- `Trang chủ` → `/`
- `Tính năng` → `/features`
- `Price` → `/pricing`
- `About` → `/about`

**CTA**
- Label: “Bắt đầu miễn phí” → `/signup`.

**Behavior**
- Header is a floating “island” with `bg-card`, light border, rounded corners, subtle shadow.
- Sticky at top with optional backdrop blur for separation while scrolling.

**i18n keys**
- `public.nav.home`
- `public.nav.features`
- `public.nav.pricing`
- `public.nav.about`
- `public.nav.cta`

## Features Page Structure
1. Hero (headline + subtitle + CTA)
2. Feature grid (3–6 cards)
3. How it works (3 steps)
4. Demo preview card (reuse landing-style copy)
5. Final CTA

## About Page Structure
1. Mission statement
2. Short story / origin
3. Values (3–4 cards)
4. Privacy & trust block
5. Final CTA

## Visual Direction
- Serif headlines for editorial calm.
- Sans body text for clarity.
- Use existing spacing scale (`p-4/p-6`, `gap-4/gap-6`).
- Light neutral base with `bg-card` sections and light borders.

## Risks
- Header duplication across pages if not centralized in layout.
- Missing i18n keys if nav/CTA labels are hard-coded.

## Success Criteria
- Public pages share consistent header and navigation.
- Features/About pages read clearly on mobile and desktop.
- All text routed through i18n with no missing keys.
