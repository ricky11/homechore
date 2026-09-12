# 07: Local Edition Documentation

**What to build:** Give nontechnical families a concise, welcoming guide to installing and running the completed HomeChore Local Edition on a trusted home network.

**Blocked by:** 01: Household Identity and Management; 04: Local Meal Media Assets; 05: Daily and Weekly PDF Downloads; 06: Friendly Local Network Access.

**Status:** blocked

- [x] The README describes HomeChore as a simple household routine and meal planner for busy families and their helpers.
- [x] Setup instructions cover the Node.js requirement, install, build, start, Windows Firewall, and trusted-network safety.
- [x] Access instructions cover `chores.local:8787` with a LAN-IP fallback.
- [x] Documentation explains local Media Asset storage, PDF downloads, printing, and the manual database-and-uploads backup procedure.
- [x] Cloud hosting, accounts, PWA support, restart automation, and port-80 hosting are clearly marked as deferred.

## Comments

- 2026-09-12: Documentation is complete. Ticket remains blocked until Ticket 06 confirms that `chores.local` resolves from another device on the home network; the README documents the working LAN-IP fallback.