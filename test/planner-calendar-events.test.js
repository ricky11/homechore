import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import seed from '../src/data/seed.json' with { type: 'json' }
import { usePlannerStore } from '../src/stores/planner.js'
import { addDays, defaultHousehold, parseDate, toDateKey } from '../src/utils/planner.js'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

async function settle() {
  await nextTick()
  await new Promise(setImmediate)
}

function createState() {
  return { weeks: {}, catalog: structuredClone(seed), household: structuredClone(defaultHousehold) }
}

test('refreshes Calendar Events for Weekly and Daily plan boundaries', async () => {
  const requests = []
  globalThis.fetch = async (url, options = {}) => {
    requests.push(String(url))
    if (url === '/api/state' && !options.method) return response(createState())
    if (url === '/api/state') return response({ saved: true })
    if (String(url).startsWith('/api/calendar-events')) return response({ events: [{ id: 'event', title: 'Appointment', start: '2026-09-14T09:00:00Z', end: '2026-09-14T10:00:00Z', allDay: false }] })
    if (url === '/api/integrations/google') return response({ status: 'ready' })
    throw new Error(`Unexpected request: ${url}`)
  }
  setActivePinia(createPinia())
  const planner = usePlannerStore()

  await planner.initialize()
  await settle()
  const weekStart = planner.currentWeek.id
  const weekEnd = toDateKey(addDays(parseDate(weekStart), 7))
  assert.ok(requests.includes(`/api/calendar-events?start=${weekStart}&end=${weekEnd}`))

  planner.selectedDayIndex = 0
  await settle()
  assert.ok(requests.includes(`/api/calendar-events?start=${weekStart}&end=${planner.currentWeek.days[1].date}`))

  planner.selectedDayIndex = null
  await settle()
  assert.equal(requests.at(-1), `/api/calendar-events?start=${weekStart}&end=${weekEnd}`)
})

test('keeps the plan usable when Calendar Event retrieval fails', async () => {
  globalThis.fetch = async (url, options = {}) => {
    if (url === '/api/state' && !options.method) return response(createState())
    if (url === '/api/state') return response({ saved: true })
    if (String(url).startsWith('/api/calendar-events')) return response({ error: 'Google Calendar is unavailable.' }, 503)
    if (url === '/api/integrations/google') return response({ status: 'ready' })
    throw new Error(`Unexpected request: ${url}`)
  }
  setActivePinia(createPinia())
  const planner = usePlannerStore()

  await planner.initialize()
  await settle()

  assert.equal(planner.loading, false)
  assert.equal(planner.serverError, '')
  assert.ok(planner.currentWeek)
  assert.deepEqual(planner.calendarEvents, [])
  assert.equal(planner.calendarEventsError, 'Google Calendar is unavailable.')
})

test('copies a Calendar Event once as an independent Duty with safe time mapping', () => {
  setActivePinia(createPinia())
  const planner = usePlannerStore()
  planner.household.routinePeriods = [
    { id: 'morning', label: 'Morning', start: '06:30', end: '11:00' },
    { id: 'evening', label: 'Evening', start: '15:00', end: '20:00' },
  ]
  const startDay = { date: '2026-09-14', duties: [] }
  const laterDay = { date: '2026-09-15', duties: [] }
  const timedEvent = { id: 'timed', title: 'School concert', start: '2026-09-14T17:00:00+08:00', end: '2026-09-14T18:00:00+08:00', allDay: false }
  const allDayEvent = { id: 'all-day', title: 'School holiday', start: '2026-09-14', end: '2026-09-16', allDay: true }
  const unmappableEvent = { id: 'unmappable', title: 'Midday appointment', start: '2026-09-14T12:15:00+08:00', end: '2026-09-14T13:15:00+08:00', allDay: false }

  planner.copyCalendarEvent(startDay, timedEvent)
  planner.copyCalendarEvent(startDay, timedEvent)
  planner.copyCalendarEvent(startDay, allDayEvent)
  planner.copyCalendarEvent(startDay, unmappableEvent)
  planner.copyCalendarEvent(laterDay, timedEvent)

  assert.deepEqual(startDay.duties.map(({ sourceEventId, name, assignee, period, time }) => ({ sourceEventId, name, assignee, period, time })), [
    { sourceEventId: 'timed', name: 'School concert', assignee: 'Shared', period: 'evening', time: '17:00' },
    { sourceEventId: 'all-day', name: 'School holiday', assignee: 'Shared', period: 'morning', time: '' },
    { sourceEventId: 'unmappable', name: 'Midday appointment', assignee: 'Shared', period: 'morning', time: '' },
  ])
  assert.deepEqual(laterDay.duties.map(({ sourceEventId, period, time }) => ({ sourceEventId, period, time })), [
    { sourceEventId: 'timed', period: 'morning', time: '' },
  ])
  assert.equal(planner.calendarEventIsCopied(startDay, timedEvent), true)
  planner.removeDuty(startDay, startDay.duties[0].id)
  assert.equal(planner.calendarEventIsCopied(startDay, timedEvent), false)
  startDay.duties[0].name = 'Edited HomeChore Duty'
  assert.equal(allDayEvent.title, 'School holiday')
})