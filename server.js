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
  routinePeriods: [
    { id: 'morning', label: 'Morning', start: '06:30', end: '11:00' },
    { id: 'midday', label: 'Midday', start: '11:00', end: '15:00' },
    { id: 'evening', label: 'Evening', start: '15:00', end: '20:00' },
  ],
  offDays: { Anu: [0], Swarna: [2] },
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

function minutesFor(time) {
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-4]):[0-5]\d$/.test(time)) return null
  const [hours, minutes] = time.split(':').map(Number)
  if (hours === 24 && minutes !== 0) return null
  if (minutes % 30 !== 0) return null
  return hours * 60 + minutes
}

function normalizeRoutinePeriods(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) return null
  const periods = value.map((period) => ({
    id: typeof period?.id === 'string' ? period.id.trim() : '',
    label: typeof period?.label === 'string' ? period.label.trim() : '',
    start: period?.start,
    end: period?.end,
  }))
  if (periods.some((period) => {
    const start = minutesFor(period.start)
    const end = minutesFor(period.end)
    return !/^[a-z0-9-]+$/i.test(period.id) || !period.label || start === null || end === null || start >= end
  })) return null
  if (new Set(periods.map((period) => period.id)).size !== periods.length) return null
  const ranges = periods.map((period) => ({ start: minutesFor(period.start), end: minutesFor(period.end) }))
  return ranges.some((range, index) => ranges.some((other, otherIndex) => index !== otherIndex && range.start < other.end && other.start < range.end))
    ? null
    : periods
}

function normalizeOffDays(value, assignees) {
  const offDays = {}
  for (const assignee of assignees) {
    const days = Array.isArray(value?.[assignee]) ? value[assignee] : []
    if (days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return null
    offDays[assignee] = [...new Set(days)]
  }
  return offDays
}

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
  const routinePeriods = normalizeRoutinePeriods(value.routinePeriods ?? defaultHousehold.routinePeriods)
  const offDays = normalizeOffDays(value.offDays ?? defaultHousehold.offDays, assignees)
  if (!routinePeriods || !offDays) return null
  return { name, icon, assignees, routinePeriods, offDays }
}

function removedPeriodIsInUse(state, periods) {
  const periodIds = new Set(periods.map((period) => period.id))
  return Object.values(state.weeks).some((week) => week.days.some((day) =>
    day.duties.some((duty) => !periodIds.has(duty.period)),
  ))
}

function weekHasInvalidDutyTimes(week, periods) {
  const periodById = new Map(periods.map((period) => [period.id, period]))
  return week.days.some((day) => day.duties.some((duty) => {
    const period = periodById.get(duty.period)
    if (!period) return true
    if (!duty.time) return false
    const time = minutesFor(duty.time)
    return time === null || time >= 1440 || time < minutesFor(period.start) || time >= minutesFor(period.end)
  }))
}

function normalizeLegacyDutyTimes(state) {
  for (const week of Object.values(state.weeks)) {
    for (const day of week.days) {
      for (const duty of day.duties) {
        if (!duty.time || minutesFor(duty.time) !== null) continue
        const match = duty.time.match(/^(\d{1,2}):(00|30)\s*(?:[-–]\s*\d{1,2}:\d{2})?\s*(am|pm)$/i)
        if (!match) continue
        let hours = Number(match[1]) % 12
        if (match[3].toLowerCase() === 'pm') hours += 12
        duty.time = `${String(hours).padStart(2, '0')}:${match[2]}`
      }
    }
  }
}

function readState() {
  const state = JSON.parse(readStateStatement.get().state_json)
  state.household = normalizeHousehold(state.household) ?? defaultHousehold
  normalizeLegacyDutyTimes(state)
  return state
}

const app = new Hono()

app.get('/api/state', (context) => context.json(readState()))

app.put('/api/state', async (context) => {
  const update = await context.req.json()
  const state = readState()
  const household = update.household === undefined ? state.household : normalizeHousehold(update.household)

  if (!household) return context.json({ error: 'A Household needs a name, icon, unique Assignees, and valid Routine Periods.' }, 400)
  if (update.household !== undefined && removedPeriodIsInUse(state, household.routinePeriods)) {
    return context.json({ error: 'Move Duties before removing their Routine Period.' }, 400)
  }
  if (update.household !== undefined && Object.values(state.weeks).some((week) => weekHasInvalidDutyTimes(week, household.routinePeriods))) {
    return context.json({ error: 'Adjust Duty times before changing their Routine Period.' }, 400)
  }

  if (update.week?.id && Array.isArray(update.week.days)) {
    if (weekHasInvalidDutyTimes(update.week, household.routinePeriods)) {
      return context.json({ error: 'Duty times must be 30-minute values within their Routine Period.' }, 400)
    }
    state.weeks[update.week.id] = update.week
  }
  if (update.catalog?.duties && update.catalog?.meals) {
    state.catalog = update.catalog
  }
  if (update.household !== undefined) {
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