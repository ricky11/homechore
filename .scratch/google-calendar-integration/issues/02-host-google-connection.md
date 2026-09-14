# 02: Host Google connection and calendar choice

**What to build:** Let a Household organizer on the HomeChore host connect Google Calendar with read-only authorization, select one readable shared Calendar, later change it, or disconnect it, while other trusted devices can only view connection status.

**Blocked by:** 01: Google Calendar integration status.

**Status:** ready-for-agent

- [ ] The host can begin and complete the standard Google OAuth authorization-code flow through the localhost callback.
- [ ] HomeChore requests only read-only Google Calendar permission and keeps client credentials and tokens out of browser responses.
- [ ] The encrypted connection survives a server restart with the same host encryption key.
- [ ] The organizer can choose exactly one readable Calendar, including a shared Calendar, and can change the selection later.
- [ ] The organizer can disconnect from the Integrations tab; connection data is deleted while existing Duties remain unchanged.
- [ ] A non-host device can view the state but cannot start or end the Google connection.
- [ ] Automated behavior tests use a fake Google Calendar gateway and cover connection, calendar selection, encryption, disconnection, and provider failures.
- [ ] The production build passes.
