# NavUser Preferences Dropdown Design

**Date:** 2026-03-09

**Goal:** Move language and appearance controls in `NavUser` into dedicated nested dropdown submenus on the right side of the user menu.

## Context

`apps/web/app/components/NavUser.vue` currently renders language and appearance radio groups directly in the top-level user dropdown. That makes the menu tall and mixes navigation actions with preference controls at the same hierarchy level.

The approved UX is to keep `Ngôn ngữ` and `Giao diện` as top-level entries that each open their own submenu. The existing locale switching and theme switching behavior should remain unchanged.

## Approach

Use the existing dropdown primitives in `apps/web/app/components/ui/dropdown-menu`, specifically:

- `DropdownMenuSub`
- `DropdownMenuSubTrigger`
- `DropdownMenuSubContent`
- `DropdownMenuRadioGroup`
- `DropdownMenuRadioItem`

This keeps the implementation aligned with the existing shadcn-style dropdown system already present in the repo.

## Component Changes

Modify `apps/web/app/components/NavUser.vue` so the top-level dropdown contains:

- Account summary label
- Link to personal settings
- `Language` submenu trigger
- `Appearance` submenu trigger
- Sign out action

The `Language` submenu will render the current locale options as radio items using the existing `setLocale` flow.

The `Appearance` submenu will render the existing `system`, `light`, and `dark` options with the same icons and `useReadingPreferences()` update path.

## Data Flow

- Locale selection continues to use `useI18n()` with `setLocale(value)`.
- Theme selection continues to use `useReadingPreferences()` and mutate `readingPreferences.value.themeMode`.
- No API contract, persistence format, or route behavior changes are needed.

## i18n

The current locale label already exists under `locale.label`.

If submenu trigger copy needs explicit wording beyond the existing labels, add the smallest possible new keys in all maintained locales. Reuse existing text where possible to avoid unnecessary translation churn.

## Risks

- Nested dropdown primitives must already be exported and styled consistently.
- The current locale ref from `useI18n()` must still work as the radio group model value inside a submenu.

Both risks are low because the repo already ships the required sub-components and the selection handlers are unchanged.

## Validation

- Run `bun run check-types`.
- Verify `NavUser` still renders on desktop and mobile sidebar states.
- Verify locale switching still updates labels after selection.
- Verify `system`, `light`, and `dark` theme mode selection still mutates reader preferences and updates the document theme.
