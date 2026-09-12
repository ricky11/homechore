# HomeChore Vue Component Refactor

## Goal

Restructure the HomeChore application so `src/App.vue` is a small Vue composition root, reusable views and controls live in `src/components/`, shared planner state lives in Pinia, and Hono server code lives under `server/`.

## Target Structure

- `src/App.vue`: application shell, top-level route/view selection, and component composition only.
- `src/components/AppHeader.vue`: Household identity, save state, Manage, PDF download, and Print controls.
- `src/components/WeekToolbar.vue`: week navigation and Today action.
- `src/components/WeeklyPlan.vue`: weekly planner board and week actions.
- `src/components/DailyPlan.vue`: selected Daily plan editor, including Duties, Meals, and notes.
- `src/components/ManagePlannerOptions.vue`: Household, Routine, Duty, and Meal Option management dialog.
- `src/stores/planner.js`: Pinia store that owns shared Household, catalog, week, loading, save, and persistence state.
- `src/composables/`: focused UI behavior such as PDF export, separated from shared planner state.
- `src/utils/`: pure date, time, emoji, and meal formatting helpers when they do not need Vue reactivity.
- `server/app.js`: Hono routes, SQLite persistence, Media Asset handling, and mDNS responder lifecycle.
- `server/index.js`: server bootstrap and shutdown entry point.
- Root `server.js`: removed or reduced to a documented compatibility launcher only when needed; package scripts point at `server/index.js`.

Components use standard Vue single-file-component ordering: `<script setup>`, `<template>`, then scoped or component-specific `<style>` only when global styles are not appropriate. Components read and update shared planner data through the Pinia store instead of relaying routine state through long prop/event chains. Props and emits remain explicit for local, reusable component inputs and actions.

## Constraints

- Preserve all current planner behavior, API contracts, Local Edition persistence, PDF output, print support, responsive styling, and `npm run dev` / `npm start` behavior.
- Add and register Pinia in the Vue entry point; keep API calls and save debouncing owned by the planner store rather than duplicated across components.
- Keep Hono, SQLite, Media Asset, and mDNS code outside `src/` under `server/`; update imports, static-file paths, and package scripts for the new entry point.
- Preserve the user's existing uncommitted edits; do not overwrite or revert them.
- Add short intent comments before exported/composable methods and non-obvious component event handlers. Do not add redundant comments to self-explanatory bindings.
- Keep global visual tokens and shared layout rules in `src/style.css`; move only component-owned styling when that improves locality.