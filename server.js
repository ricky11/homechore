import { mkdirSync, readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

const root = fileURLToPath(new URL('.', import.meta.url))
const dataDirectory = fileURLToPath(new URL('./data/', import.meta.url))
const databasePath = fileURLToPath(new URL('./data/homechore.db', import.meta.url))
const seed = JSON.parse(readFileSync(new URL('./src/data/seed.json', import.meta.url), 'utf8'))
const defaultHousehold = {
  name: 'My Home',
  icon: '🏠',
  assignees: ['Anu', 'Swarna'],
}

mkdirSync(dataDirectory, { recursive: true })

const database = new DatabaseSync(databasePath)
database.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS planner_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`)

const initialState = JSON.stringify({ weeks: {}, catalog: seed, household: defaultHousehold })
database.prepare(`
  INSERT OR IGNORE INTO planner_state (id, state_json, updated_at)
  VALUES (1, ?, datetime('now'))
`).run(initialState)

const readStateStatement = database.prepare('SELECT state_json FROM planner_state WHERE id = 1')
const writeStateStatement = database.prepare(`
  UPDATE planner_state
  SET state_json = ?, updated_at = datetime('now')
  WHERE id = 1
`)

function normalizeHousehold(value) {
  if (!value || typeof value !== 'object') return null
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const icon = typeof value.icon === 'string' ? value.icon.trim() : ''
  const assignees = Array.isArray(value.assignees)
    ? value.assignees.map((assignee) => typeof assignee === 'string' ? assignee.trim() : '').filter(Boolean)
    : []
  if (!name || !icon || !assignees.length || assignees.includes('Shared') || new Set(assignees).size !== assignees.length) {
    return null
  }
  return { name, icon, assignees }
}

function readState() {
  const state = JSON.parse(readStateStatement.get().state_json)
  state.household = normalizeHousehold(state.household) ?? defaultHousehold
  return state
}

const app = new Hono()

app.get('/api/state', (context) => context.json(readState()))

app.put('/api/state', async (context) => {
  const update = await context.req.json()
  const state = readState()

  if (update.week?.id && Array.isArray(update.week.days)) {
    state.weeks[update.week.id] = update.week
  }
  if (update.catalog?.duties && update.catalog?.meals) {
    state.catalog = update.catalog
  }
  if (update.household !== undefined) {
    const household = normalizeHousehold(update.household)
    if (!household) return context.json({ error: 'A Household needs a name, icon, and unique Assignees.' }, 400)
    state.household = household
  }

  writeStateStatement.run(JSON.stringify(state))
  return context.json({ saved: true })
})

app.use('/*', serveStatic({ root: `${root}/dist` }))
app.get('*', serveStatic({ path: `${root}/dist/index.html` }))

const port = Number(process.env.PORT ?? 8787)
const server = serve({ fetch: app.fetch, hostname: '0.0.0.0', port }, () => {
  console.log(`HomeChore server`)
  console.log(`  Local:   http://localhost:${port}/`)

  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((address) => address?.family === 'IPv4' && !address.internal)

  for (const address of addresses) {
    console.log(`  Network: http://${address.address}:${port}/`)
  }

  console.log(`  Database: ${databasePath}`)
})


function shutdown() {
  server.close(() => {
    database.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)