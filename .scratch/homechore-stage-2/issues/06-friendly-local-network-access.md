# 06: Friendly Local Network Access

**What to build:** Make HomeChore easier to find on a trusted home network by supporting `chores.local:8787` where mDNS is available while retaining clear fallback LAN addresses.

**Blocked by:** None (can start immediately).

**Status:** unresolved

- [ ] The local server advertises and answers mDNS queries for `chores.local` on the trusted network.
- [x] The server continues to listen on port 8787 and prints localhost and discovered LAN URLs.
- [x] A failure to use mDNS does not prevent normal IP-based LAN access.
- [x] The server can start and stop cleanly with the mDNS responder active.

## Comments

- 2026-09-12: Host-side mDNS query returned `192.168.50.143`, and another device can reach `http://192.168.50.143:8787/`, but `http://chores.local:8787/` does not resolve on that device. Investigate device mDNS support and router multicast/client-isolation settings; retain the IP URL as the working fallback.