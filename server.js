import { mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { bodyLimit } from 'hono/body-limit'
import { Hono } from 'hono'

const root = fileURLToPath(new URL('.', import.meta.url))
const dataDirectory = fileURLToPath(new URL('./data/', import.meta.url))
const mediaDirectory = fileURLToPath(new URL('./data/uploads/', import.meta.url))
const databasePath = fileURLToPath(new URL('./data/homechore.db', import.meta.url))
const maxMediaBytes = 5 * 1024 * 1024
const maxMediaRequestBytes = maxMediaBytes + 64 * 1024
const mediaCleanupGracePeriodMs = 15 * 60 * 1000
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
mkdirSync(mediaDirectory, { recursive: true })

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

function isMediaFilename(value) {
  return typeof value === 'string' && /^[a-f0-9-]+\.webp$/i.test(value)
}

function isWebp(bytes) {
  if (bytes.length < 20 || bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WEBP') return false
  if (bytes.readUInt32LE(4) + 8 !== bytes.length) return false
  let offset = 12
  let imageChunkFound = false
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return false
    const chunkName = bytes.subarray(offset, offset + 4).toString()
    const chunkLength = bytes.readUInt32LE(offset + 4)
    offset += 8 + chunkLength + (chunkLength % 2)
    if (offset > bytes.length) return false
    if (chunkName === 'VP8 ' || chunkName === 'VP8L') imageChunkFound = true
  }
  return imageChunkFound && offset === bytes.length
}

function normalizeCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object') return seed
  const meals = Array.isArray(catalog.meals) ? catalog.meals.map((meal) => ({
    ...meal,
    image: isMediaFilename(meal.image) ? meal.image : null,
  })) : seed.meals
  return { ...catalog, meals }
}

function removeUnreferencedMediaAssets(catalog) {
  const referenced = new Set(catalog.meals.map((meal) => meal.image).filter(isMediaFilename))
  for (const filename of readdirSync(mediaDirectory)) {
    const path = `${mediaDirectory}${filename}`
    if (isMediaFilename(filename) && !referenced.has(filename) && Date.now() - statSync(path).mtimeMs > mediaCleanupGracePeriodMs) {
      unlinkSync(path)
    }
  }
}

function readState() {
  const storedState = readStateStatement.get().state_json
  const state = JSON.parse(storedState)
  state.household = normalizeHousehold(state.household) ?? defaultHousehold
  state.catalog = normalizeCatalog(state.catalog)
  normalizeLegacyDutyTimes(state)
  const normalizedState = JSON.stringify(state)
  if (normalizedState !== storedState) writeStateStatement.run(normalizedState)
  return state
}

removeUnreferencedMediaAssets(readState().catalog)

const app = new Hono()

app.get('/api/state', (context) => context.json(readState()))
app.use('/api/media', bodyLimit({
  maxSize: maxMediaRequestBytes,
  onError: (context) => context.json({ error: 'Upload a WebP image smaller than 5 MB.' }, 413),
}))

app.post('/api/media', async (context) => {
  const contentLength = Number(context.req.header('content-length'))
  if (!Number.isFinite(contentLength) || contentLength > maxMediaRequestBytes) {
    return context.json({ error: 'Upload a WebP image smaller than 5 MB.' }, 413)
  }
  const body = await context.req.parseBody()
  const image = body.image
  if (!image || typeof image === 'string' || image.type !== 'image/webp') {
    return context.json({ error: 'Upload a processed WebP image.' }, 400)
  }
  const bytes = Buffer.from(await image.arrayBuffer())
  if (bytes.length > maxMediaBytes || !isWebp(bytes)) {
    return context.json({ error: 'Upload a valid WebP image smaller than 5 MB.' }, 400)
  }
  const filename = `${randomUUID()}.webp`
  writeFileSync(`${mediaDirectory}${filename}`, bytes)
  return context.json({ filename })
})

app.get('/media/:filename', (context) => {
  const filename = context.req.param('filename')
  if (!isMediaFilename(filename)) return context.notFound()
  try {
    return context.body(readFileSync(`${mediaDirectory}${filename}`), 200, { 'Content-Type': 'image/webp' })
  } catch {
    return context.notFound()
  }
})

app.put('/api/state', async (context) => {
  const update = await context.req.json()
  const state = readState()
  let catalogUpdated = false
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
    state.catalog = normalizeCatalog(update.catalog)
    catalogUpdated = true
  }
  if (update.household !== undefined) {
    state.household = household
  }

  writeStateStatement.run(JSON.stringify(state))
  if (catalogUpdated) removeUnreferencedMediaAssets(state.catalog)
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