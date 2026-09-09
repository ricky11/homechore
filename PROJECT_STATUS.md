# Fairmont Home Chore & Activity List

## Objective

Create a simple, readable weekly household planner for Anu and Swarna. It is a planning guideline rather than a task-completion or sign-off system.

The app covers:

- Household duties and activities
- Anu, Swarna, or Shared responsibility
- Morning, Midday, and Evening periods
- Breakfast, Lunch, and Dinner planning
- Weekly navigation and printing
- Shared persistence for devices on the home network

## Current Status

The initial Vue application is complete and working.

### Completed

- Replaced the flat HTML prototype with Vue 3 and Vite.
- Preserved the original prototype at `backup/original-index.html`.
- Added a full Monday-to-Sunday overview.
- Added previous week, next week, and Today navigation.
- Added a detailed editor that replaces the weekly view when a day is selected.
- Added three broad periods:
  - Morning: 6:30-11:00 am
  - Midday: 11:00 am-3:00 pm
  - Evening: 3:00-8:00 pm
- Added editable duty occurrences with optional exact times.
- Added Anu, Swarna, and Shared assignment choices.
- Added Breakfast, Lunch, and Dinner planning.
- Added optional Appetizer, Main, and Side dropdowns.
- Added management screens to add, rename, and delete duty and meal options.
- Added a Hono Node server with one shared `/api/state` route.
- Added SQLite persistence through Node's built-in `node:sqlite` module.
- Stores all shared planner data in `data/homechore.db`.
- Added automatic saving with a visible save state.
- Added week creation behavior:
  - An unvisited week starts blank.
  - A blank week offers Copy Previous Week Data when a preceding saved week exists.
  - Copying brings across duties but not meals or notes.
  - Once created, each week remains independent.
- Added a Clear week action with a confirmation dialog.
- Added Tuesday `Swarna off` and Sunday `Anu off` labels without assignment warnings.
- Added print styling for A4 landscape.
- Fixed the Print button so it invokes the browser print dialog through Vue.
- Made duty selectors searchable and creatable from typed text.
- Added optional image upload when creating or editing meal choices.
- Added resized meal thumbnails to meal dropdowns and the Manage dialog.
- Added responsive desktop and mobile layouts.
- Added reduced-motion support.
- Replaced PrimeVue after it displayed a runtime license warning.
- Uses Naive UI for Vue-native controls and dialogs.
- Uses Lucide icons through `@lucide/vue`.

## Original Planning Reference

- Monday: Change all bed sheets
- Tuesday: Swarna off
- Wednesday: Clean car
- Wednesday: Sid's rock climbing, 5:00-6:00 pm
- Thursday: Wash rugs
- Thursday: Clean windows
- Friday: Aircon cleaning
- Sunday: Anu off
- Sunday lunch: Eating out

These items informed the initial design but are not inserted automatically into blank weeks. The starter meal and duty catalogs are stored in `src/data/seed.json`.

## Technical Decisions

- Framework: Vue 3 with Vite
- Main implementation: `src/App.vue`
- UI components: Naive UI
- Icons: `@lucide/vue`
- API server: Hono with `@hono/node-server`
- Persistence: SQLite using Node's built-in `node:sqlite`
- Authentication: None
- Backend: One local Node process serving both the API and built Vue app
- Hosting requirement: The host computer must remain running for LAN access
- Device sharing: All browsers using the Hono URL share the same SQLite state
- Animation: Vue's built-in `Transition`

The SQLite file is `data/homechore.db`. Stop the server before copying it as a backup. The `data/` directory is ignored by Git.

## Important Behavior

- Opening an unsaved week creates and saves a blank week.
- A blank week can explicitly copy duties from the immediately preceding saved week.
- Meals and notes are not copied.
- Editing an existing week does not overwrite future weeks that have already been created.
- Renaming or deleting a catalog option does not rewrite historical duty snapshots.
- Clear week removes all duties, meals, and notes from the selected week only.

## Validation Completed

- `npm run build` passes.
- VS Code diagnostics report no errors.
- Confirmed seven aligned weekday columns on desktop.
- Confirmed the detailed day editor on a 390 px mobile viewport.
- Confirmed no page-level mobile horizontal overflow.
- Confirmed edits survive a reload.
- Confirmed unvisited weeks start blank.
- Confirmed copying is disabled when no preceding saved week exists.
- Confirmed the copy button copies previous duties only and then disappears.
- Confirmed duty catalog add, rename, and delete operations.
- Confirmed the Clear week warning dialog.
- Confirmed the Print button reaches the browser print API without a page error.
- Confirmed new duties can be created directly from the duty combobox.
- Confirmed meal image upload, thumbnail rendering, selection, and reload persistence.
- Confirmed `GET` and `PUT /api/state` persist through SQLite.
- Confirmed a browser edit made through localhost appears through the LAN URL.

## Running the App

```sh
npm install
npm run dev
```

For access from another device on the local network:

```sh
npm run build
npm start
```

The host computer must remain on with the terminal running. Other users open `http://<host-ip>:8787/` and may need to allow Node.js through Windows Firewall on private networks. All users share the same SQLite data.

Production build:

```sh
npm run build
```

## Current Development URLs

- Production/local: `http://localhost:8787/`
- Production/LAN address used during development: `http://192.168.50.143:8787/`
- Vite development client: `http://localhost:5173/`

The LAN address may change when the network changes.

## Likely Next Iterations

- Refine the real household duty catalog inside the Manage dialog.
- Expand the meal options with the family's regular dishes.
- Add Google Calendar events to the detailed day view.
- Consider an in-app backup/download action for the SQLite state.
- Consider a hosted backend only if access outside the home network becomes necessary.
