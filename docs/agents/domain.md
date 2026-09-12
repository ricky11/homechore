# Domain docs

Before exploring or changing HomeChore, read the root `CONTEXT.md`. If `CONTEXT-MAP.md` exists in the future, read it and the relevant context glossaries instead.

Read ADRs under `docs/adr/` when they touch the area being changed. If these documents do not exist, proceed silently; create domain documentation lazily through the domain-modeling workflow.

Use canonical terms from `CONTEXT.md` in tickets, specifications, tests, and implementation discussions. Flag an ADR conflict rather than silently overriding it.

## Layout

HomeChore is a single-context repository. Its glossary is `CONTEXT.md` at the repository root, and system decisions belong under `docs/adr/`.