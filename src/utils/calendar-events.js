import { toDateKey } from './planner.js'

function eventEndDate(event) {
  return event.allDay ? event.end : toDateKey(new Date(new Date(event.end).getTime() - 1))
}

export function calendarEventsForDay(events, date) {
  return events.filter((event) => {
    const start = event.allDay ? event.start : toDateKey(new Date(event.start))
    return event.allDay ? start <= date && date < event.end : start <= date && date <= eventEndDate(event)
  })
}

export function calendarEventTime(event) {
  if (event.allDay) return 'All day'
  return new Date(event.start).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
}
