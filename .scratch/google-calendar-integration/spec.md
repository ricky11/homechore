# Google Calendar Integration

Status: ready-for-agent

## Problem Statement

A Household plans duties and meals in HomeChore, but appointments and activities already recorded in Google Calendar must be manually re-entered. This duplicates work and makes the Daily and Weekly plans less useful as a complete view of the Household's commitments.

## Solution

HomeChore will offer a Google Calendar Integration in the Manage dialog. A Household organizer on the host computer can make a one-time, read-only Google connection, choose one readable Google Calendar, and disconnect it later. Google remains the source of truth for Calendar Events: HomeChore fetches current Calendar Events whenever a Weekly or Daily plan opens and shares them with every trusted local-network device using HomeChore.

Weekly plans show Calendar Events grouped by day. Daily plans show that day's Calendar Events. Each event can be copied once into the relevant Daily plan using an add control. The resulting Duty belongs only to HomeChore, remains editable, and is never written back to Google.

## User Stories

1. As a Household organizer on the host computer, I want to see a Google Calendar Integration in Manage, so that I can connect the Household's calendar without leaving the planner.
2. As a Household organizer, I want HomeChore to state when Google credentials have not been configured on the host, so that I know why I cannot connect yet.
3. As a Household organizer, I want to start the standard Google OAuth consent flow from the Integrations tab, so that I can authorize only the selected Google Calendar access.
4. As a Household organizer, I want the OAuth return to complete on the host computer, so that the connection works reliably with local HomeChore hosting.
5. As a Household organizer, I want HomeChore to request only read-only Google Calendar permission, so that it cannot alter my Google Calendar.
6. As a Household organizer, I want to choose exactly one readable Google Calendar after authorization, so that HomeChore displays the relevant shared Household calendar.
7. As a Household organizer, I want readable shared calendars included in the calendar choices, so that I can select a calendar shared with me.
8. As a Household organizer, I want to see which Google Calendar is selected, so that I can confirm what the Household is viewing.
9. As a Household organizer, I want to change the selected Google Calendar, so that the Household can switch to a different shared calendar later.
10. As a Household organizer, I want to disconnect Google Calendar from the Integrations tab, so that HomeChore immediately stops accessing Calendar Events.
11. As a Household organizer, I want disconnecting to preserve existing HomeChore Duties, so that planning work copied earlier is not lost.
12. As a Household member on any trusted local-network device, I want to view Calendar Events from the selected calendar, so that the Weekly and Daily plans show current Household commitments.
13. As a Household member, I want the Weekly plan to group Calendar Events under their corresponding days, so that I can scan the whole week alongside planned Duties and meals.
14. As a Household member, I want the Daily plan to show Calendar Events for its selected day, so that I can plan the day without manually checking Google Calendar.
15. As a Household member, I want each Calendar Event to display its title and an understandable time or all-day label, so that I can identify it quickly.
16. As a Household member, I want recurring events to appear as their actual occurrences, so that the displayed week reflects the calendar accurately.
17. As a Household member, I want an all-day event to appear on each day it covers, so that multi-day commitments are visible throughout their duration.
18. As a Household member, I want a timed multi-day event to appear on every affected day, so that long events are not hidden after their start date.
19. As a Household member, I want to add a Calendar Event to that day's plan with one action, so that I can avoid re-entering an existing appointment.
20. As a Household member, I want a copied timed Calendar Event on its start day to retain its time when it fits a Routine Period, so that the new Duty remains useful in HomeChore.
21. As a Household member, I want a copied all-day event and later days of a multi-day timed event to become untimed Duties, so that HomeChore does not show misleading exact times.
22. As a Household member, I want a copied Calendar Event to default to Shared responsibility, so that it does not accidentally assign a person.
23. As a Household member, I want a copied Calendar Event to choose its matching Routine Period when possible, so that it appears in the appropriate part of the day.
24. As a Household member, I want a copied Calendar Event to remain editable and removable as a normal HomeChore Duty, so that I can adapt it to Household planning needs.
25. As a Household member, I want an event's add control to change to Added after copying, so that I do not accidentally create duplicate Duties.
26. As a Household member, I want removing the copied Duty to make the event addable again, so that I can restore it when needed.
27. As a Household member, I want HomeChore to refresh Calendar Events when opening or navigating a Weekly or Daily plan, so that Google remains the source of truth.
28. As a Household member, I want calendar retrieval failures to be shown clearly without blocking the rest of HomeChore, so that I can still manage Duties and meals when Google is unavailable.
29. As a Household member, I want events to disappear from HomeChore views when they are removed or changed in Google, after the next refresh, so that the calendar view stays current.
30. As a Household member, I want HomeChore to avoid storing fetched Calendar Events in its database, so that Google remains the single source of truth for calendar data.

## Implementation Decisions

- Introduce a Google Calendar gateway as the single server-side boundary for Google OAuth, encrypted connection persistence, readable-calendar discovery, selected-calendar management, and Calendar Event retrieval. Client code must never call Google directly.
- Add Google API support with the standard OAuth authorization-code flow. The redirect endpoint is served by the HomeChore host at `http://localhost:8787/api/integrations/google/callback`.
- Read configuration only from the host environment: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- Request only the Google Calendar read-only scope. HomeChore must not call Google endpoints that create, update, or delete calendar data.
- Encrypt the persisted Google refresh token with the required host encryption key. Persist the encrypted token, selected calendar ID, and connection metadata in SQLite. Never return tokens or client credentials from HomeChore API endpoints.
- When required Google configuration is absent, expose an unavailable integration status and host-setup guidance in the Integrations tab. Do not collect OAuth credentials in the browser.
- The integration can be connected and disconnected only through a browser running on the host computer. Other trusted local-network devices can view the status and Calendar Events but cannot initiate or end the connection.
- The integration setup must list all readable calendars returned by Google, including shared calendars, and require exactly one selected calendar before Calendar Events are shown.
- HomeChore serves Calendar Events from the selected Google Calendar to all trusted local-network devices. This is intentionally unauthenticated in the Local Edition and must be documented as a privacy implication.
- Calendar Event retrieval is on demand for the displayed Weekly or Daily range. Calendar Event data is not cached or saved to SQLite.
- Define Calendar Event data for UI use as a provider identifier, title, start/end boundaries, all-day status, and occurrence date range. Exclude event descriptions, attendees, locations, conference links, and other unnecessary Google data.
- Weekly retrieval uses the displayed Monday-through-Sunday range; Daily retrieval uses the selected day. Recurring events are returned as individual occurrences. Multi-day events appear in each day they intersect.
- Add Calendar Event presentation areas to the Weekly and Daily plans. An unavailable, disconnected, or failed integration must not prevent the normal planner UI from rendering.
- Copying a Calendar Event creates an independent Duty with the event title, `Shared` assignee, and a stored source event identifier. The source identifier prevents duplicate additions to the same day but does not create synchronization.
- A timed event on its start day uses its start time only when it fits a configured Routine Period and available 30-minute time choice. Otherwise, and for all-day events or subsequent days of a multi-day event, the copied Duty is untimed. The Routine Period is selected from the time when possible; otherwise use the first Routine Period.
- The event add control is disabled as Added when the day already contains a Duty copied from the same Calendar Event occurrence. Deleting that Duty re-enables the control.
- Disconnect deletes the encrypted token, selected calendar data, and integration metadata immediately. It does not alter independently copied Duties.
- Add an Integrations tab to the existing Manage dialog, using the existing component and control conventions. Use familiar icon-only actions with accessible labels and tooltips where appropriate.
- Update local-hosting documentation with Google Cloud OAuth client setup, required environment variables, localhost-only connection behavior, encryption-key backup implications, read-only scope, and local-network event visibility.

## Testing Decisions

- Test observable behavior and API contracts, not private implementation details or CSS class names.
- Add an automated Node test setup suitable for the existing ESM server and Vue project. The test command must run independently of a real Google account.
- Test the Google Calendar gateway through injected or replaceable provider behavior, using a fake provider for OAuth, token refresh, calendar discovery, selected calendar retrieval, event retrieval, and provider failures.
- Test HomeChore API behavior for unconfigured, disconnected, authorizing, connected-but-unselected, selected, expired-token, and provider-error states. Verify no response exposes credentials or refresh tokens.
- Test that only the read-only scope is requested and no Google write operation is reachable from the gateway interface.
- Test encrypted connection persistence can be read after a server restart using the same encryption key and cannot be read without it.
- Test calendar selection accepts only a readable calendar and that changing or disconnecting a connection updates observable status correctly.
- Test event range mapping for timed, all-day, recurring, and multi-day Calendar Events, including correct day grouping.
- Test Calendar Event retrieval failures leave regular planner data and operations available.
- Test Calendar Event copying through the planner behavior: title, Shared assignee, time and Routine Period mapping, untimed fallbacks, independent editability, duplicate prevention, and re-addition after deletion.
- Add browser/component tests for the Integrations tab, Weekly event lists, Daily event list, and add/Added controls using API fixtures. Verify that an event refresh failure is understandable and non-blocking.
- Retain `npm run build` as a production compilation check. There is no existing automated-test prior art in this repository, so the introduced test harness becomes the local pattern for this feature.

## Out of Scope

- HomeChore accounts, sign-in, roles, or authorization. A future authenticated product may replace the host-only connection restriction.
- Google Calendar write access, creating/updating/deleting Google events, RSVPs, reminders, or bidirectional synchronization.
- Selecting or aggregating multiple Google Calendars.
- Persisting, offline caching, background polling, push notifications, or historical storage of Calendar Events.
- Importing event descriptions, locations, attendees, video links, attachments, or private extended event data.
- Automatic updates to Duties after their source Calendar Events change.
- OAuth providers other than Google Calendar.
- Caddy, local TLS, reverse proxies, public internet access, or remote OAuth callbacks.

## Further Notes

- Calendar Event and Google Calendar Integration use the canonical definitions in `CONTEXT.md`.
- The connected Google Calendar can contain sensitive appointment titles and times. In the Local Edition, all devices able to use the unauthenticated HomeChore server can see this data.
- The host should use a stable encryption key and retain it securely. Restoring a database backup without the same key will require reconnecting Google Calendar.
- The initial OAuth connection must be started on the machine that runs HomeChore. `chores.local` and LAN addresses are for viewing shared planner and Calendar Event data, not OAuth callbacks.
