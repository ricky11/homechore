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

The Vue application and shared LAN persistence are complete and working. Hono serves both the built application and a small SQLite-backed API from one Node process.

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
- Added automatic saving with a 250 ms debounce and a visible Saved, Saving, or Save failed state.
- Added a server-unavailable screen instead of allowing the SPA to open with missing data.
- Refreshes shared state when navigating between weeks or returning to Today.
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
- Prints Local, Network, and Database locations when the Hono server starts.

## Recovered Data

The previous browser IndexedDB state was migrated into SQLite. Users do not need to recreate it.

- 14 duty options, including the custom household duties
- 16 meal options
- Week `2026-09-07`: 7 duties and 1 meal selection
- Week `2026-09-14`: 7 duties and 1 meal selection
- No uploaded meal images existed in the old browser database

The old browser IndexedDB may still exist locally, but it is no longer read or written by the application. SQLite is the source of truth.

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
- Required runtime: Node.js 22.5 or newer
- Authentication: None
- Backend: One local Node process serving both the API and built Vue app
- Hosting requirement: The host computer must remain running for LAN access
- Device sharing: All browsers using the Hono URL share the same SQLite state
- Animation: Vue's built-in `Transition`

The SQLite file is `data/homechore.db`. Stop the server before copying it as a backup. The `data/` directory is ignored by Git.

`GET /api/state` returns the shared catalog and weeks. `PUT /api/state` accepts a single week or catalog update and merges it into the stored document so editing one week does not replace unrelated weeks.

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
- Confirmed the API responds through `192.168.50.143`, not only localhost.
- Confirmed the shared SQLite database contains the recovered catalog and two populated weeks.

## Running the App

Requirements: Node.js 22.5 or newer.

Development runs Vite and Hono together:

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

`npm start` prints the current Local and Network URLs. The LAN address can change when the network changes.

### Windows Firewall

If another device cannot connect while the host can, run PowerShell as Administrator once:

```powershell
New-NetFirewallRule -DisplayName "Fairmont Home Planner" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8787 -Profile Private
```

Both devices must be connected to the same local network. The active Windows network profile should be Private.

### Backup

1. Stop `npm start`.
2. Copy `data/homechore.db` to a safe location.
3. Restart with `npm start`.

The live database must not be committed to Git.

## Current Development URLs

- Production/local: `http://localhost:8787/`
- Production/LAN address used during development: `http://192.168.50.143:8787/`
- Vite development client: `http://localhost:5173/`

The LAN address may change when the network changes.

## Repository

- GitHub: `https://github.com/ricky11/homechore`
- Branch: `main`
- Last verified pushed commit: `80362b2` (`Build shared home chore planner`)
- `data/`, `dist/`, and `node_modules/` are ignored

## Likely Next Iterations

- Refine the real household duty catalog inside the Manage dialog.
- Expand the meal options with the family's regular dishes.
- Add Google Calendar events to the detailed day view.
- Consider an in-app backup/download action for the SQLite state.
- Consider a hosted backend only if access outside the home network becomes necessary.

## Stage 2 Checklist

 - [x] Rename the product to HomeChore and make the household name and icon configurable with sensible defaults.
- [ ] Rewrite the README for nontechnical local hosting, including Node.js setup, private-network guidance, Windows Firewall, and `http://chores.local:8787/`.
- [ ] Advertise `chores.local` through mDNS while retaining port 8787 as the default local server port.
- [ ] Store processed WebP meal images in `data/uploads/` and store only their filenames in SQLite.
- [ ] Limit source meal images to 5 MB and remove any existing embedded base64 images rather than migrating them.
- [ ] Align the meal management row so its padded image, details, and edit/delete actions are on one row.
- [ ] Add suggested and manually selectable emoji for duties without external AI or network calls.
 - [x] Add Household settings for identity, Assignees, off-days, and Routine Periods in a single Manage dialog.
 - [x] Keep three sensible Routine Period defaults while allowing users to rename and edit 2-6 non-overlapping periods.
 - [x] Replace free-text optional duty times with 30-minute choices within the selected Routine Period.
 - [x] Prevent a Routine Period from being removed while Duties still use it.
- [ ] Add dedicated Daily and Weekly downloadable PDF exports with `jsPDF`, retaining browser Print.

## Deferred Work

- [ ] In-app backup/download and restore.
- [ ] Start HomeChore automatically after host restart.
- [ ] Progressive Web App support.
- [ ] Cloud hosting, accounts, remote access, and professional service features.
- [ ] Advanced port-80 and reverse-proxy setup.
- [ ] Recurring duty templates, helper-focused Today view, missed-duty notes, multilingual labels, meal-derived shopping list, and QR-code access.
