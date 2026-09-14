# 05: Google Calendar host setup and release validation

**What to build:** Make the completed Google Calendar Integration safe and repeatable for a Household to configure and operate on its local host.

**Blocked by:** 01: Google Calendar integration status; 02: Host Google connection and calendar choice; 03: Read-only Calendar Events in plans; 04: Copy Calendar Events into Duties.

**Status:** completed

- [x] Local-hosting documentation explains the included Desktop OAuth client, that no Household environment variables are required, and the numeric localhost callback requirement.
- [x] Documentation explains that access is read-only, Google remains the source of truth, and copied Duties are independent.
- [x] Documentation explains the encryption-key backup and restore implication.
- [x] Documentation warns that all trusted local-network devices using HomeChore can view selected Calendar Event titles and times.
- [x] The full automated test suite and production build pass.
- [x] A manual host connection, Calendar selection, Weekly/Daily event display, event copy, edit, removal, duplicate prevention, and disconnect flow is verified.

## Comments

- The original environment-variable requirement was superseded by the approved HomeChore-owned Desktop OAuth design: Households configure no Google Cloud credentials or environment variables.
- README now documents the host-only connection flow, read-only behavior, independent copied Duties, local-network visibility, and encryption-key backup and restore requirements.
- Manual validation was performed against the running Local Edition during tickets 02 through 04, including host OAuth, Calendar selection, Weekly/Daily display, copy, edit/removal, duplicate prevention, and disconnect behavior.
