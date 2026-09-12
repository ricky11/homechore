# 01: Split Planner into Vue Components

**What to build:** Refactor HomeChore from its current monolithic `App.vue` into standard Vue components, a Pinia planner store, focused composables/utilities, and a `server/` implementation folder so each workflow has a clear owner.

**Blocked by:** None.

**Status:** resolved

- [x] `src/App.vue` is a small composition root and does not contain planner view markup, management-dialog markup, API persistence implementation, or PDF layout implementation.
- [x] The application has explicit `AppHeader`, `WeekToolbar`, `WeeklyPlan`, `DailyPlan`, and `ManagePlannerOptions` components under `src/components/`.
- [x] Pinia is registered at the Vue entry point, and a focused planner store owns shared planner state, API persistence, and save debouncing.
- [x] PDF export lives in a focused composable; pure date, time, emoji, and meal helpers live outside components where appropriate.
- [x] Components use the planner store for shared data; props and emits remain explicit for local reusable inputs/actions, without changing the `/api/state` or `/api/media` contracts.
- [x] Hono, SQLite, Media Asset, and mDNS implementation code lives under `server/`, with `server/index.js` as the active bootstrap entry point.
- [x] `npm run dev`, `npm start`, static asset serving, and Windows/LAN access work through the new server entry point.
- [x] Short intent comments precede composable methods and non-obvious component handlers.
- [x] Existing Daily, Weekly, Household, Routine Period, Duty emoji, Meal Media Asset, PDF, print, and responsive behavior remains functional.
- [x] Production build, diagnostics, and focused browser checks pass.

## Comments

- 2026-09-12: Created after review found `src/components/` empty and `src/App.vue` responsible for application state, network persistence, PDF generation, management UI, and both planner views. Preserve the user’s uncommitted `src/App.vue` changes when implementing.
- 2026-09-12: Expanded to use Pinia for shared planner state and move Hono/server code to `server/`, avoiding long prop/event chains and a root-level server implementation.
- 2026-09-12: Refactor verified with production build, clean diagnostics, isolated `server/index.js` startup/API response, and focused Weekly/Daily/Manage browser checks. Vite now proxies both `/api` and `/media` to preserve Media Asset behavior in development.