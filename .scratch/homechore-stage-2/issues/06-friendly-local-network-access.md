# 06: Friendly Local Network Access

**What to build:** Make HomeChore easier to find on a trusted home network by supporting `chores.local:8787` where mDNS is available while retaining clear fallback LAN addresses.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The local server advertises and answers mDNS queries for `chores.local` on the trusted network.
- [x] The server continues to listen on port 8787 and prints localhost and discovered LAN URLs.
- [x] A failure to use mDNS does not prevent normal IP-based LAN access.
- [x] The server can start and stop cleanly with the mDNS responder active.