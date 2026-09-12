# HomeChore Stage 2

## Problem Statement

Busy families need a simple, shared household routine and meal planner that domestic help can follow without technical setup or a cloud account. The Local Edition should remain complete, understandable, and safe to run on a trusted home network while retaining a clean path to a future hosted service.

## Solution

HomeChore will provide configurable Household identity, Assignees, Routine Periods, and off-days through one focused management experience. Duties will have optional 30-minute times within their Routine Period and useful emoji cues. Meal images will be processed in the browser and stored as local Media Assets rather than enlarging the planner database. The app will support a memorable `chores.local:8787` address where mDNS is available, plus downloadable Daily and Weekly PDF exports.

## User Stories

1. As a parent, I want HomeChore to use a clear default Household identity, so that I can start planning without setup.
2. As a parent, I want to rename the Household and select its icon, so that the planner feels familiar to everyone at home.
3. As a household manager, I want to manage Household settings in one place, so that routine setup stays simple.
4. As a household manager, I want to add and rename Assignees, so that the planner represents the people in my home.
5. As a household manager, I want to configure off-days for Assignees, so that routine expectations are visible in the Daily and Weekly plans.
6. As a household manager, I want sensible Morning, Midday, and Evening defaults, so that I can plan immediately.
7. As a household manager, I want to rename and adjust Routine Periods, so that the schedule follows my Household's actual day.
8. As a household manager, I want between two and six Routine Periods, so that the planner stays readable while allowing necessary flexibility.
9. As a household manager, I want Routine Periods to reject invalid or overlapping ranges, so that the daily schedule remains understandable.
10. As a household manager, I want to add a Duty to a Routine Period, so that it appears in the correct part of the day.
11. As a household manager, I want optional Duty times in 30-minute increments within the selected Routine Period, so that instructions are precise without requiring typing.
12. As a household manager, I want to be prevented from removing a Routine Period that still contains Duties, so that no planned work becomes hidden or lost.
13. As an Assignee, I want clear Routine Period labels and times in the Daily view, so that I can follow the day at a glance.
14. As an Assignee, I want Duties to show a relevant emoji, so that recurring instructions are faster to scan.
15. As a household manager, I want HomeChore to suggest a Duty emoji from common words, so that I can set up duties quickly.
16. As a household manager, I want to choose or replace any Duty emoji myself, so that automatic suggestions never control the meaning.
17. As a household manager, I want Meal Options to show tidy, consistently sized images, so that meal planning is recognisable.
18. As a household manager, I want meal images limited to 5 MB before upload, so that local storage remains practical.
19. As a household manager, I want uploaded meal images resized and encoded as WebP in the browser, so that Media Assets are small and consistent.
20. As a household manager, I want Media Assets stored as files outside SQLite, so that planner data remains compact and the future cloud-storage transition is straightforward.
21. As a household manager, I want legacy embedded base64 meal images removed, so that the Local Edition does not retain database bloat.
22. As a household manager, I want the meal-management row to align its image, details, and actions, so that catalog maintenance is easy on desktop and mobile.
23. As a family member, I want to open the planner at `chores.local:8787` when my network supports mDNS, so that the local address is easy to remember.
24. As a family member, I want clear fallback instructions using the host's network address, so that the planner remains accessible when mDNS is unavailable.
25. As a parent, I want to print a Daily plan, so that I can leave a clear routine for the day.
26. As a parent, I want to print a Weekly plan, so that I can review the household routine in one place.
27. As a parent, I want to download a Daily plan as a PDF, so that I can share it directly through messaging apps.
28. As a parent, I want to download a Weekly plan as a PDF, so that I can share or retain the household plan without using a print dialog.
29. As a nontechnical self-hoster, I want concise README instructions for installing and running HomeChore, so that I can use it with Node.js alone.
30. As a self-hoster, I want private-network and firewall guidance, so that I can safely share HomeChore only within my home.
31. As an open-source user, I want the Local Edition to include all planning features, so that useful household planning does not depend on a paid tier.

## Implementation Decisions

- HomeChore is the product name. A configurable Household name and icon replace fixed Fairmont-specific presentation while retaining sensible defaults.
- The Local Edition is the complete open-source product for a trusted private network. It has no accounts or authentication and must not be exposed to the public internet.
- Planner state gains a Household configuration containing identity, Assignees, off-days, and ordered Routine Periods.
- A Routine Period has a stable identifier, display name, start time, and end time. Households can configure two to six non-overlapping periods.
- The initial Routine Periods remain Morning (06:30-11:00), Midday (11:00-15:00), and Evening (15:00-20:00).
- Existing Duties retain their Routine Period identifier. A period cannot be removed until its Duties are moved elsewhere.
- Optional Duty times are selected from 30-minute values constrained to the selected Routine Period.
- Duty emoji use a small local keyword suggestion map and a manual curated picker; neither requires an external service.
- Meal image processing remains client-side: accepted image files are limited to 5 MB, resized to a 480px maximum edge, and encoded as WebP.
- The server writes processed Media Assets to the local uploads directory, exposes them through a media route, and stores only safe asset filenames in planner state.
- Existing base64 meal-image values are cleared during state normalization; they are not migrated.
- The local server answers mDNS address queries for `chores.local` while continuing to listen on port 8787. It also prints fallback LAN URLs on startup.
- The management experience uses a single dialog with Household, Routine, Duties, and Meals tabs.
- Daily and Weekly PDF downloads are generated entirely in the browser with `jsPDF`. Browser print remains available for paper and browser-provided “Save as PDF”.
- The README will use HomeChore language, friendly icons where useful, and a concise Windows-first guide that remains valid for Node.js hosts on other operating systems.

## Testing Decisions

- Tests must observe externally visible behavior and avoid asserting private helpers or implementation details.
- The highest existing seam is the shared HTTP API: tests should verify normalized state, Household updates, Media Asset upload and retrieval, and rejection of invalid input through API responses.
- Browser-level tests should cover a Household manager saving settings, selecting a valid optional Duty time, being blocked from deleting an in-use Routine Period, uploading an image under the size limit, and downloading each PDF layout.
- The repository currently has no automated test runner or comparable test prior art. Add the smallest suitable test harness only where it can test these public seams.
- The production build remains a required check for every UI slice, with the complete test suite run before release.

## Out of Scope

- Cloud hosting, paid plans, landing pages, waitlists, accounts, remote access, and professional service features.
- Progressive Web App support.
- Automated backup, restore, and startup after the host restarts.
- Port-80 hosting, reverse proxies, and removal of the `:8787` port from the default URL.
- External AI services, emoji retrieval services, or automatic semantic image generation.
- Recurring Duty templates, helper-only Today view, missed-duty tracking, multilingual labels, meal-derived shopping lists, QR-code access, and calendar integrations.

## Further Notes

- `.local` is an mDNS hostname, not a Windows `lmhosts` alias. `lmhosts` cannot map a hostname to a port.
- Port 8080 still requires `:8080` in a URL. Only default HTTP/HTTPS ports can be omitted; port 80 is intentionally not the Local Edition default because it requires elevated privileges on Windows and may conflict with other software.
- The project has no configured issue tracker or triage label vocabulary. This repository copy is ready to publish with the `ready-for-agent` label after `/setup-matt-pocock-skills` configures that workflow.