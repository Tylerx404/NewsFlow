# Home Hero Focused Redesign

Date: 2026-03-10
Owner: Codex + user
Status: Approved design

## Summary
Redesign the public home page to focus entirely on the Hero section. Remove all other sections (benefits, how-it-works, demo section, use-cases, FAQ, final CTA). Update Hero copy to emphasize AI summaries and personalized reading. Refresh the PublicHeader language selector to show a language icon with country abbreviations (US/VN/CN/JP/KR) and add a theme mode selector (system/light/dark) next to it.

## Goals
- Make the home page highly focused on a single Hero block.
- Update Hero copy to highlight AI summaries + personalization.
- Improve language selector with compact country abbreviations and icon.
- Expose theme mode (system/light/dark) in PublicHeader.
- Keep i18n fully updated across locales.

## Non-goals
- No changes to backend, API, or database.
- No new pages or routes.
- No new dependencies.
- No large design system refactors.

## UX / UI Decisions
- Keep the Hero container wrapper: `mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-12 pt-16`.
- Hero layout: two columns on desktop (left text, right compact AI summary card), single column on mobile.
- Remove all sections below the Hero from `apps/web/app/pages/index.vue`.
- Hero copy refreshed to emphasize AI summarization and personalization. CTA secondary removed.
- Trust chips remain (privacy/no spam/open RSS) unless wording adjustments are required by new copy.

## PublicHeader Updates
- Language button (desktop): `Languages` icon + country abbreviation (US/VN/CN/JP/KR).
- Language dropdown items: show abbreviation + localized language label (from `locale.options.*`).
- Theme mode button (desktop): `MonitorCog`/`Sun`/`Moon` icons with current mode label from `settings.appearance.options.themeMode.*`.
- Mobile sheet: include both Language and Theme selectors, matching desktop options.
- Theme mode changes continue to use `useReadingPreferences` and `reader-preferences` logic.

## i18n
- Update existing `public.home.*` keys for hero/demo text (EN/VI/JP/KR/ZH).
- Reuse existing keys where possible; avoid hard-coded strings.
- No new locale structure unless needed for language abbreviations (can be derived by mapping in code).

## Data / State
- No API changes.
- Language selection continues via `useI18n` `setLocale`.
- Theme mode continues via `useReadingPreferences` and stored in localStorage.

## Accessibility
- Keep button labels visible (no icon-only actions without text).
- Preserve focus styles from existing shadcn components.

## Testing / Validation
- Manual check: Home page only shows Hero.
- Verify i18n strings render correctly in all locales.
- Verify language switching works from PublicHeader (desktop + mobile).
- Verify theme mode switching updates UI and persists.

## Risks
- Missing i18n keys in non-English locales after copy change.
- Layout regressions in mobile if Hero card stacking is not handled.

## Rollout
- Single PR/branch.
- No feature flags required.
