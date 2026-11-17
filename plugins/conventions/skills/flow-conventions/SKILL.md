---
name: flow-conventions
description: >
  Apply Powercademy's Power Automate lessons before building, editing or debugging a cloud flow - whichever tool does the building - so known traps are avoided rather than rediscovered. This skill holds the accumulated flow gotchas log: editing flows that already run (renames, child-flow contracts, blast radius, regression checks), designer quirks (255-character descriptions, nesting), expressions, Parse JSON, HTTP and Microsoft Graph permissions, child flow patterns, environment variables and ALM, testing when a dependency is unavailable (mocks, write gates, dry-run guards) and anti-patterns. Trigger alongside any flow work: "build a flow", "edit this flow", "add a step to my flow", "why did my flow fail", "child flow", "Parse JSON", "flow expression", "Graph call from a flow", "test this flow without the real system". It does not build flows itself - apply it, then carry on with the build tool. Also trigger when the user wants a flow lesson recorded. When in doubt, trigger.
---

# Flow Conventions

The judgement layer for Power Automate cloud flows. Building is done by other
tools — Microsoft's power-automate plugin, or a maker in the designer. This
skill makes sure whichever one is used doesn't walk into a trap that has
already cost someone hours. Its job is twofold:

1. **Apply** — before building, editing or debugging a flow, read
   `${PLUGIN_ROOT}/shared/flow-gotchas.md` (the sections relevant to the task —
   the contents list makes that quick) and apply what fits. Then hand back to
   the build tool and carry on.
2. **Grow** — when the user wants a flow lesson kept, add it in the format below.
   Working in the marketplace repo, append it directly; from an installed copy,
   draft it for the user to contribute back, because installed copies are
   overwritten on update.

## The non-negotiables

These come up on almost every flow and are worth stating before anything is
built. The gotchas file has the detail and the reasoning.

- **A flow is production until proven otherwise.** Before editing one, find
  out what triggers it today and what it writes. That's the blast radius —
  say it out loud before changing anything.
- **Renames and response shapes are breaking changes.** Action names are
  referenced as strings in `runAfter` and expressions; a child flow's
  `Response` is a contract its callers depend on. Search for references, and
  agree changes with the owner.
- **Test the regression, not just the change.** Run the existing happy path
  before and after an edit, and prove the rollback works before making the
  change that might need it.
- **Never write test data into a customer's production system** to unblock a
  test. Gate the write, use a sandbox, or ask.
- **A mock tests everything downstream of the boundary and nothing at it.**
  Say so at sign-off; don't let *tested* be heard as *proven end to end*.
- **Edit flows through the flow tooling, not by driving the designer.** The
  purpose-built flow tools read and change the definition directly, validate
  it, and can roll back. Automating the designer in a browser is slower and
  breaks on UI changes — keep it for what the tools can't reach, and for
  watching a run render. See the tool-selection skill.
- **Built through the API? Keep changing it through the API.** Saving an
  agent-built flow from the designer can rewrite it, and the designer's
  validation lags the runtime — a red badge on a flow that runs is not proof
  it's broken.
- **With an AI step: fetch and filter first, structured output, check there's
  something to say.** The AI decides the words; the flow decides the data and
  the shape.

## How to add an entry

Add it under the right section of `${PLUGIN_ROOT}/shared/flow-gotchas.md`:

```
**<Symptom, as the maker would describe it>.**
<Cause — what's actually going on.>
→ <Fix — the concrete thing to do instead.>
```

Then add a one-line entry to the file's session log. Keep it lean — if two
entries overlap, merge them. **Never add client-identifying detail**: phrase
every lesson for any project, and strip tenant, org and customer names at the
door.

## Verify, don't recall

Connector behaviour, licensing and Graph permissions change. Before relying on
one in a fix, check it against Microsoft Learn — see
`${PLUGIN_ROOT}/shared/microsoft-refs.md` for how.
