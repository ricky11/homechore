# 02: Host Google connection and calendar choice

**What to build:** Let a Household organizer on the HomeChore host connect Google Calendar with read-only authorization, select one readable shared Calendar, later change it, or disconnect it, while other trusted devices can only view connection status.

**Blocked by:** 01: Google Calendar integration status.

**Status:** completed

- [x] The host can begin and complete the standard Google OAuth authorization-code flow through the loopback callback using HomeChore's public OAuth client ID.
- [x] HomeChore requests only read-only Google Calendar permission, requires no Household OAuth configuration, and keeps client credentials and tokens out of browser responses.
- [x] A local encryption key is generated once, persists securely with HomeChore data, and keeps the connection usable after restart.
- [x] The organizer can choose exactly one readable Calendar, including a shared Calendar, and can change the selection later.
- [x] The organizer can disconnect from the Integrations tab; connection data is deleted while existing Duties remain unchanged.
- [x] A non-host device can view the state but cannot start or end the Google connection.
- [x] Automated behavior tests use a fake Google Calendar gateway and cover connection, calendar selection, encryption, disconnection, and provider failures.
- [x] The production build passes.

## Comments

- Implemented with `googleapis`, an encrypted SQLite refresh-token record, localhost OAuth callback, loopback-only management routes, selected Calendar controls, and fake-provider gateway tests.
- Validated with `npm test` (6 passing) and `npm run build`.
- Reopened: replace per-Household environment configuration with a HomeChore-owned public OAuth client and automatic local encryption-key management before this ticket is complete.
- Completed: HomeChore now uses its public desktop OAuth client ID with PKCE and creates `data/google-calendar.key` automatically. No Household Google Cloud setup is required.
