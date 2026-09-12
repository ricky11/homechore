# 04: Local Meal Media Assets

**What to build:** Store meal imagery as compact local Media Assets instead of embedded planner data, while preserving an easy and aligned meal-management experience.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Meal source images larger than 5 MB are rejected with a clear message.
- [ ] Accepted images are processed client-side to WebP with a 480px maximum edge.
- [ ] Processed Media Assets are saved locally and planner state stores only safe asset filenames.
- [ ] Existing base64 meal images are cleared rather than migrated.
- [ ] Meal images are served safely and rendered in selectors and management views.
- [ ] Meal management aligns the padded image, meal details, and edit/delete actions on desktop and mobile.
- [ ] The production build passes.