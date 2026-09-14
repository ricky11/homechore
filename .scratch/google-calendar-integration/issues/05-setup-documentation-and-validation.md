# 05: Google Calendar host setup and release validation

**What to build:** Make the completed Google Calendar Integration safe and repeatable for a Household to configure and operate on its local host.

**Blocked by:** 01: Google Calendar integration status; 02: Host Google connection and calendar choice; 03: Read-only Calendar Events in plans; 04: Copy Calendar Events into Duties.

**Status:** ready-for-agent

- [ ] Local-hosting documentation explains Google Cloud OAuth client setup, required host environment variables, and the localhost callback requirement.
- [ ] Documentation explains that access is read-only, Google remains the source of truth, and copied Duties are independent.
- [ ] Documentation explains the encryption-key backup and restore implication.
- [ ] Documentation warns that all trusted local-network devices using HomeChore can view selected Calendar Event titles and times.
- [ ] The full automated test suite and production build pass.
- [ ] A manual host connection, Calendar selection, Weekly/Daily event display, event copy, edit, removal, duplicate prevention, and disconnect flow is verified.
