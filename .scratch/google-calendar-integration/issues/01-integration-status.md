# 01: Google Calendar integration status

**What to build:** Add an Integrations tab to Manage that makes Google Calendar's pre-connection unavailable and disconnected states understandable without disrupting normal HomeChore planning. Ticket 02 adds the OAuth connection lifecycle.

**Blocked by:** None (can start immediately).

**Status:** completed

- [x] The Manage dialog includes an Integrations tab that follows existing controls and accessibility conventions.
- [x] When host Google configuration is absent, the tab clearly explains that the integration is unavailable and gives safe host-setup guidance without exposing credential fields.
- [x] The tab shows the unavailable or disconnected status returned by HomeChore; ticket 02 adds connecting and ready states.
- [x] Normal Weekly and Daily planning continues to work regardless of integration status or errors.
- [x] Automated behavior tests cover the observable integration states without contacting Google.
- [x] The production build passes.

## Comments

Completed with a non-blocking status endpoint, an Integrations tab, browser verification of the unavailable state, and focused Node behavior tests for unconfigured and configured hosts. The compact legacy tab template requires a scoped CSS selector to hide its meal fallback while Integrations is selected; ticket 02 should retain this behavior until a dedicated Manage-dialog formatting refactor is scheduled.
