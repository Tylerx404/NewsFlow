# NavUser Preferences Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert `NavUser` so language and appearance controls open from dedicated dropdown submenus instead of rendering inline in the root menu.

**Architecture:** Keep all behavior inside `apps/web/app/components/NavUser.vue`. Reuse the existing dropdown-menu sub primitives so the top-level menu remains action-oriented while the selection controls live in nested radio submenus. Avoid API or state model changes.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, `nuxt-i18n`, local reader preferences, shadcn-style dropdown components built on `reka-ui`

---

### Task 1: Restructure NavUser menu

**Files:**
- Modify: `apps/web/app/components/NavUser.vue`

**Step 1: Update imports**

Add the submenu primitives and any icons needed for submenu triggers.

**Step 2: Replace inline preference groups**

Remove the top-level language and appearance radio sections from the root dropdown content.

**Step 3: Add submenu triggers**

Create one submenu trigger for `locale.label` and one submenu trigger for `shell.user.appearance`.

**Step 4: Render nested radio groups**

Move the existing locale radio items into the language submenu and the existing theme mode radio items into the appearance submenu.

**Step 5: Keep handlers unchanged**

Retain the existing `handleLanguageChange` and `handleThemeModeChange` functions so behavior does not change.

**Step 6: Commit**

```bash
git add apps/web/app/components/NavUser.vue
git commit -m "feat(web): move NavUser preferences into submenus"
```

### Task 2: Verify translations and typing

**Files:**
- Review: `apps/web/i18n/locales/en.json`
- Review: `apps/web/i18n/locales/vi.json`

**Step 1: Reuse existing labels where possible**

Prefer `locale.label` and `shell.user.appearance` instead of adding new copy.

**Step 2: Add translations only if implementation requires them**

If the submenu triggers need extra wording, add the same keys across maintained locales.

**Step 3: Run typecheck**

Run: `bun run check-types`

Expected: the workspace typecheck finishes without errors introduced by the dropdown refactor.

**Step 4: Commit**

```bash
git add apps/web/app/components/NavUser.vue apps/web/i18n/locales/en.json apps/web/i18n/locales/vi.json
git commit -m "chore(web): verify NavUser preference menu labels"
```
