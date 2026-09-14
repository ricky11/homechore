# 03: Read-only Calendar Events in plans

**What to build:** Show fresh Calendar Events from the Household's selected Google Calendar in the Weekly and Daily plans for every trusted local-network device, while leaving Google as the source of truth.

**Blocked by:** 02: Host Google connection and calendar choice.

**Status:** ready-for-agent

- [ ] Weekly plans show selected-calendar events grouped under every affected day.
- [ ] Daily plans show selected-calendar events for the selected day.
- [ ] Calendar Events show an understandable title and time or all-day label, without unnecessary private Google fields.
- [ ] Recurring occurrences, all-day events, and multi-day events appear on each applicable day.
- [ ] Opening or navigating Weekly and Daily plans refreshes Calendar Events from Google without saving fetched events in SQLite.
- [ ] Unavailable, disconnected, expired, or failed Calendar Event retrieval is clear to the Household and does not block Duties, meals, or notes.
- [ ] Automated behavior and component tests cover event grouping, refresh, and non-blocking failures through fake API/provider data.
- [ ] The production build passes.
