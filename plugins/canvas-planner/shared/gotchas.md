# Canvas App Planning — Gotchas Log

Accumulated failures, each of which cost real time once. Read before planning.
Append after any session that teaches something new.

Format per entry: **Symptom** → **Cause** → **Fix**. Short and mechanical.

> **Seed note (2026-07-24):** this log starts from well-documented platform
> behaviour rather than one specific build. Entries marked *(unproven here)*
> haven't yet bitten on a Powercademy engagement — confirm and sharpen them
> with real evidence as they come up, and delete any that turn out to be wrong.

---

## Delegation and data volume

**A gallery silently shows only the first 500 rows and nobody notices for months.**
A non-delegable query pulls up to the row limit and evaluates locally. There is no error — the app returns a confident, wrong answer.
→ Treat any table that could exceed the row limit as a delegation risk *in the plan*. Verify the specific functions against the specific connector on Learn. Test against more rows than the limit, or the test proves nothing.

**Raising the data row limit is not a fix.**
Moving 500 → 2,000 just relocates the cliff, and it slows every query that now pulls more rows to the client.
→ Fix the query so it delegates, or constrain the working set so it's provably bounded. If someone proposes raising the limit as the solution, name what it actually does.

**The same formula delegates against one source and not another.**
Delegability is a property of *function × connector*, not of the formula alone. A pattern that worked on a Dataverse project can quietly break on a file- or list-shaped source.
→ Never carry a delegation assumption between projects. Re-verify per connector, per operation.

**Collections and imported data never delegate.**
They live in memory, so the row limit is the whole story — `Collect` of a large table truncates at the limit, and every subsequent filter operates on the truncated set.
→ Collections are for small, bounded sets (lookups, config, user's own current work). If a collection could ever be large, that's an architecture problem.

**Test data hides every delegation problem.**
A 50-row test table delegates and doesn't delegate identically.
→ The delegation checkpoint must use production-scale volumes. Load the rows or don't claim it's tested.

## Shape and architecture

**Canvas chosen because it's familiar, not because it fits.** *(unproven here)*
Straightforward CRUD over Dataverse is usually a model-driven app: delegation, security trimming, responsive layout and auditing come free, with no formulas to maintain.
→ Make the shape decision explicitly and record why. It is much easier to argue with a paragraph than with a generated app.

**Navigation model chosen implicitly, screen by screen.** *(unproven here)*
Mixed wizard/hub patterns produce confusing back behaviour that's expensive to unpick once screens exist.
→ Decide the navigation model once, before generation.

**Two screens that differ only by a filter.** *(unproven here)*
→ One screen with a parameter. Catch this at the screen-inventory stage; after generation it's duplicated logic in two places.

## Performance

**Everything loads at app start.**
Sequential startup work is time the user spends watching a splash screen, and it usually loads data the first screen never shows.
→ Load what the first screen needs; defer the rest; parallelise where the platform allows.

**Performance measured on the maker's desktop.**
Fast laptop, corporate LAN, warm cache — none of which the field user has.
→ Measure startup and screen transitions on a realistic device and network.

**Makers see data their users can't.**
Testing as a maker with elevated privileges hides both empty states and permission errors.
→ Test as the least-privileged role that will actually use the app.

## Session log

Append a one-line entry per session that added a gotcha, so patterns across
builds become visible.

- **2026-07-24 — seeded** ahead of a first real canvas engagement. Delegation
  entries are the ones expected to earn their keep.
