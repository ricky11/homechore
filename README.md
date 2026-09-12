# HomeChore Local Edition

HomeChore is a simple household routine and meal planner for busy families and their helpers. It runs on one computer in your trusted home network, with no accounts or cloud service.

## What You Need

- Node.js 22.5 or newer. Download it from [nodejs.org](https://nodejs.org/).
- A computer that remains on while the planner is in use.
- A trusted private home network. Do not expose HomeChore directly to the public internet.

HomeChore has no accounts or sign-in. Every device that can reach the server can read and change the shared planner, so use it only with people and devices your Household trusts.

## Set Up and Start

Open a terminal in the HomeChore folder and run:

```sh
npm install
npm run build
npm start
```

The terminal prints the addresses that can open HomeChore. Keep that terminal running while others use the planner.

On the host computer, open `http://localhost:8787/`.

On another device connected to the same home network, try:

```text
http://chores.local:8787/
```

Some phones, browsers, or Wi-Fi routers do not support `.local` name discovery. In that case, use the Network address printed by the server instead, for example:

```text
http://192.168.50.143:8787/
```

If Windows asks about network access, allow Node.js on **Private networks**. If another device cannot reach the Network address, make sure it is not on a guest Wi-Fi network and that router client isolation is disabled.

For development, use `npm run dev`. Vite runs on port 5173 and forwards planner data requests to the HomeChore server on port 8787.

## Using the Planner

Use **Manage** to set the Household name and icon, Assignees, days off, Routine Periods, Duties, emoji cues, and Meal Options. Changes are shared with every browser using the same server.

The weekly view provides an overview. Select a day to edit its Duties, optional exact times, Meals, and notes. A new week begins blank; **Copy Previous Week Data** copies only the previous week's Duties.

Use **Download PDF** for the current Daily or Weekly view. PDFs are generated entirely in the browser. **Print** continues to use the browser's print dialog.

## Photos and Storage

When you add a Meal Option image, HomeChore rejects sources larger than 5 MB, resizes accepted images to a 480px maximum edge, and saves them as compact WebP Media Assets.

All shared planner data is local:

- `data/homechore.db` contains schedules, Household settings, Duties, and Meal Options.
- `data/uploads/` contains Meal Option image files.

## Back Up Your Planner

1. Stop HomeChore with `Ctrl+C` in its terminal.
2. Copy both `data/homechore.db` and the whole `data/uploads/` folder to a safe backup location.
3. To restore, stop HomeChore and replace both items with the saved copies.
4. Start HomeChore again with `npm start`.

Do not copy the database while HomeChore is running.

## Deferred Work

HomeChore Local Edition intentionally does not include cloud hosting, accounts, PWA/offline support, automatic restart on boot, or port-80 hosting. These may be considered in a future release.

## Project Files

The starter catalog is in `src/data/seed.json`. The original flat HTML prototype remains in `backup/original-index.html`.
