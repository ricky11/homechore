# HomeChore

HomeChore is a simple household routine and meal planner for busy families and their helpers. The Local Edition runs on one computer in a trusted home network, with no accounts or cloud service.

![Weekly planner overview](docs/images/weekly-plan.png)

![Daily planner editor](docs/images/daily-plan.png)

## Features

- Weekly overview and detailed Daily planning for Duties, Meals, and notes.
- Configurable Household identity, Assignees, off-days, and two to six Routine Periods.
- Optional 30-minute Duty times, emoji cues, Meal Option images, and shared local persistence.
- Browser printing plus Daily and Weekly PDF downloads.
- Friendly `chores.local:8787` access where the local network supports mDNS, with an IP-address fallback.

## Requirements

- [Node.js](https://nodejs.org/) 22.5 or newer.
- A trusted private network and a host computer that remains on while the planner is in use.

HomeChore has no accounts or sign-in. Every device that can reach the server can read and change the planner. Do not expose it directly to the public internet.

## How to Run

Clone the repository first:

```sh
git clone https://github.com/ricky11/homechore.git
cd homechore
```

### Option 1: Node.js (recommended)

This is the simplest option for most households. It runs HomeChore directly on a host computer and does not require Docker.

Install [Node.js 22.5 or newer](https://nodejs.org/), then run these commands in the cloned folder:

```sh
npm install
npm run build
npm start
```

On Windows, open **Command Prompt** in the cloned folder and run the same commands. Keep the window open while HomeChore is in use. Press `Ctrl+C` to stop it.

Open `http://localhost:8787/` on the host computer. If the operating system asks whether Node.js may accept incoming connections, allow it only on the trusted private network.

Keep the terminal running while HomeChore is in use. Press `Ctrl+C` to stop it.

### Option 2: Docker (advanced)

Docker is optional. It is useful if you already use Docker, Portainer, or another home-server management tool because it keeps the Node.js runtime inside the container and makes upgrades easier to repeat. For a first-time or non-technical setup, the direct Node.js option above has fewer moving parts.

Install Docker Desktop or Docker Engine by following the [official Docker installation guide](https://docs.docker.com/engine/install/), then build the image from the cloned repository:

```sh
docker build -t homechore:local .
```

Create a Docker-managed volume so the SQLite database and uploaded Media Assets remain available when the container is recreated:

```sh
docker volume create homechore-data
docker run -d \
	--name homechore \
	--restart unless-stopped \
	-p 8787:8787 \
	-v homechore-data:/app/data \
	homechore:local
```

Open `http://localhost:8787/` on the host computer. To view the container logs:

```sh
docker logs -f homechore
```

To stop and remove the container:

```sh
docker stop homechore
docker rm homechore
```

The Docker setup does not add authentication. Only publish port `8787` on a trusted private network; do not expose HomeChore directly to the public internet.

Google Calendar connection is not supported by this Docker bridge setup because HomeChore's host-only connection guard rejects Docker bridge traffic as non-loopback. Use the direct Node.js setup above when the Household needs Google Calendar.

### Share on Your Home Network

The start command prints a network address. On another device connected to the same private network, first try:

```text
http://chores.local:8787/
```

Some devices, browsers, Wi-Fi routers, and guest networks do not support `.local` discovery. In that case, use the Network address printed in the terminal, for example `http://192.168.50.143:8787/`. If devices still cannot connect, disable router client isolation and ensure they are not connected to guest Wi-Fi.

### Develop Locally

```sh
npm install
npm run dev
```

Vite runs the client on port `5173` and forwards API and Media Asset requests to the Hono server on port `8787`.

## Google Calendar

Google Calendar is optional and read-only. A Household does not need a Google Cloud project, OAuth client, client secret, or environment variables. HomeChore includes its own Desktop OAuth identity. Open `http://127.0.0.1:8787/` on the host computer, choose **Manage**, then use the **Integrations** tab to add Google Calendar, approve read-only access, and select one shared Calendar. The Google approval callback returns to `http://127.0.0.1:8787/api/integrations/google/callback`, so connection, Calendar selection, changes, and disconnection must be completed from the host using that numeric localhost address. These controls are unavailable from `chores.local` and network addresses.

HomeChore fetches current Calendar Events for Weekly and Daily plans and never writes to Google. Calendar Events display their title and time or all-day status. Use the add control to create an independent, editable HomeChore Duty with a Shared assignment; editing or removing that Duty does not change Google Calendar. Disconnecting stops future Calendar Event retrieval but preserves existing copied Duties.

HomeChore creates a private encryption key at `data/google-calendar.key` when needed. It encrypts the Google refresh token stored in `data/homechore.db`. Back up this key with the database; without it, the Household must reconnect Google Calendar after a restore.

The selected Calendar's event titles and times will be visible to every device that can access HomeChore on the trusted local network. Do not connect a Calendar whose details should not be shared with those devices.

## Using the Planner

Use **Manage** to configure the Household name and icon, Assignees, days off, Routine Periods, Duties, emoji cues, and Meal Options. Changes are shared with all browsers using the same server.

The Weekly view provides an overview. Select a day to edit Duties, optional exact times, Meals, and notes. A new week begins blank; **Copy Previous Week Data** brings forward Duties only. **Download PDF** exports the active Daily or Weekly view, while **Print** uses the browser's print dialog.

## Stack and Design Choices

| Technology | Role | Why it is used |
| --- | --- | --- |
| Vue 3 + Vite | Client application | Vue keeps the planner responsive and component-oriented; Vite provides a fast local development and production build workflow. |
| Pinia | Client state management | A shared planner store keeps Household, weekly plan, catalog, persistence, and save status consistent across views without prop forwarding. |
| Node.js | Local backend runtime | Node lets a Household run the entire app with one familiar command and no external service. |
| Hono | HTTP server and API | Hono provides a small, explicit server for the built app, shared state API, Media Assets, and local-network access. |
| SQLite | Local persistence | SQLite keeps the shared planner in one portable local database without requiring a separate database service. |

The Local Edition deliberately favors understandable self-hosting over internet exposure: a single Node process serves the built app and API on the home network, while SQLite and uploaded Media Assets remain on the host computer.

## Photos, Storage, and Backups

Meal Option images up to 5 MB are resized to a 480px maximum edge and saved as compact WebP Media Assets.

- `data/homechore.db` contains schedules, Household settings, Duties, Meal Options, and the encrypted Google refresh token when connected.
- `data/uploads/` contains Meal Option image files.
- `data/google-calendar.key` decrypts the saved Google connection. Keep it private and back it up with the database.

To back up HomeChore, stop it with `Ctrl+C`, copy `data/homechore.db`, `data/google-calendar.key`, and the complete `data/uploads/` directory, then restart it with `npm start`. Do not copy the database while the server is running. Restoring the database without the matching key requires reconnecting Google Calendar.

## Future Work

The Local Edition is the complete open-source planner for a trusted home network. The following ideas are intentionally deferred, not promised release dates:

- Optional cloud-hosted HomeChore for Households that need access beyond their home network; this may include accounts, remote access, paid plans, and professional-service features.
- Progressive Web App and offline support.
- In-app backup/download and restore, plus automatic startup after the host restarts.
- Optional port-80 and reverse-proxy deployment guidance for advanced self-hosters.
- Recurring Duty templates, an Assignee-focused Today view, and missed-Duty notes.
- Multilingual labels, meal-derived shopping lists, and QR-code access.
- Further refinement of the default Duty and Meal Option catalogs for individual Households.

## Project Layout

- `src/` contains Vue components, the Pinia store, shared utilities, and the starter catalog in `src/data/seed.json`.
- `server/` contains the Hono app and Node server bootstrap.
- `data/` contains local runtime data and is ignored by Git.
- `docs/images/` contains the README screenshots.
- `backup/original-index.html` preserves the original flat HTML prototype.
