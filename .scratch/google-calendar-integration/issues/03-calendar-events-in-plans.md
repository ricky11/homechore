# 03: Read-only Calendar Events in plans

**What to build:** Show fresh Calendar Events from the Household's selected Google Calendar in the Weekly and Daily plans for every trusted local-network device, while leaving Google as the source of truth.

**Blocked by:** 02: Host Google connection and calendar choice.

**Status:** completed

- [x] Weekly plans show selected-calendar events grouped under every affected day.
- [x] Daily plans show selected-calendar events for the selected day.
- [x] Calendar Events show an understandable title and time or all-day label, without unnecessary private Google fields.
- [x] Recurring occurrences, all-day events, and multi-day events appear on each applicable day.
- [x] Opening or navigating Weekly and Daily plans refreshes Calendar Events from Google without saving fetched events in SQLite.
- [x] Unavailable, disconnected, expired, or failed Calendar Event retrieval is clear to the Household and does not block Duties, meals, or notes.
- [x] Automated behavior and gateway/API tests cover event grouping, refresh boundaries, and non-blocking failures through fake provider data.
- [x] The production build passes.

## Comments

- Added on-demand Calendar Event retrieval through the Google Calendar gateway and `GET /api/calendar-events`; fetched event data is never written to SQLite.
- Weekly plan loads request the displayed Monday-through-Sunday range; opening a Daily plan requests that selected day.
- Verified against the selected Calendar in the running Local Edition without exposing event data in this ticket.
- Validated with `npm test` (12 passing tests) and `npm run build`.
