# 04: Copy Calendar Events into Duties

**What to build:** Allow a Household member to copy a displayed Calendar Event into that day's HomeChore plan as one editable, independent Duty without writing anything to Google.

**Blocked by:** 03: Read-only Calendar Events in plans.

**Status:** ready-for-agent

- [ ] Each displayed Calendar Event has an accessible add action for its applicable day.
- [ ] Adding an event creates an independent Duty with its title and Shared assignment.
- [ ] A timed event copied on its start day retains a valid matching Routine Period and exact time when possible; all-day, later multi-day, and unmappable timed events become untimed Duties with a safe Routine Period fallback.
- [ ] Copied Duties can be edited and removed normally without changing Google Calendar.
- [ ] Once copied, the event action becomes Added for that day and prevents duplicate additions; removing the copied Duty allows it to be added again.
- [ ] Automated behavior tests cover time mapping, all-day and multi-day fallbacks, independence, duplicate prevention, and re-adding after removal.
- [ ] The production build passes.
