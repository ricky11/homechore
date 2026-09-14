import assert from 'node:assert/strict'
import test from 'node:test'
import { calendarEventsForDay } from '../src/utils/calendar-events.js'

const events = [
  { id: 'timed', title: 'Swimming', start: '2026-09-14T17:00:00+08:00', end: '2026-09-14T18:00:00+08:00', allDay: false },
  { id: 'all-day', title: 'School holiday', start: '2026-09-16', end: '2026-09-19', allDay: true },
  { id: 'multi-day', title: 'Trip', start: '2026-09-17T10:00:00+08:00', end: '2026-09-19T09:00:00+08:00', allDay: false },
]

test('groups timed and all-day Calendar Events under each affected day', () => {
  assert.deepEqual(calendarEventsForDay(events, '2026-09-14').map((event) => event.id), ['timed'])
  assert.deepEqual(calendarEventsForDay(events, '2026-09-16').map((event) => event.id), ['all-day'])
  assert.deepEqual(calendarEventsForDay(events, '2026-09-18').map((event) => event.id), ['all-day', 'multi-day'])
  assert.deepEqual(calendarEventsForDay(events, '2026-09-19').map((event) => event.id), ['multi-day'])
  assert.deepEqual(calendarEventsForDay(events, '2026-09-20'), [])
})
