# Fairmont Home Chore & Activity List

A Vue 3 weekly planner for household duties, activities, and meals.

## Requirements

- Node.js 22.5 or newer

## Development

```sh
npm install
npm run dev
```

Vite runs on port 5173 and proxies API requests to Hono on port 8787.

## Run on the local network

Build and start the shared application server:

```sh
npm run build
npm start
```

On the host computer, open `http://localhost:8787/`. Other devices on the same network open `http://<host-ip>:8787/`, for example `http://192.168.50.143:8787/`.

The host computer must remain on and `npm start` must remain running. If Windows Firewall prompts, allow Node.js on private networks.

## Storage

Schedules, meal images, and custom options are shared by every browser through Hono and stored in `data/homechore.db`. Back up the planner by copying that file while the server is stopped.

An unvisited week starts blank. When a preceding saved week exists, use **Copy Previous Week Data** to copy its duties; meals remain blank.

The initial duty and meal options live in `src/data/seed.json`. The original flat HTML template is preserved in `backup/original-index.html`.

## Build

```sh
npm run build
```
