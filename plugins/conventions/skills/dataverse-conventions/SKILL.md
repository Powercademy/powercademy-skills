---
name: dataverse-conventions
description: >
  Apply Powercademy's Dataverse and Power Platform conventions before creating or changing schema - tables, columns, choices, record status, relationships, solutions, publishers - so established judgement is applied and known mistakes are not repeated. Trigger before any Dataverse schema work: "create a table", "add a column", "new choice column", "status field", "statecode", "status reason", "set up a solution", "which publisher", "add to solution", "import failed", "missing dependency", or any Power Platform / Dynamics 365 build or review touching schema, solutions, or ALM packaging - even when nobody says "best practice". Also trigger when a new convention is agreed or a mistake is corrected during Power Platform work, so the lesson gets recorded. Each entry carries its reasoning, so you can tell when it applies and when an exception is justified. If the task creates or changes Dataverse components, trigger. When in doubt, trigger.
---

# Dataverse Conventions

A living checklist of conventions for Power Platform / Dataverse work. Every
entry exists because ignoring it, at least once, caused real rework or breakage
on a real engagement. Its job is twofold, and both matter equally:

1. **Apply** — before you build or change anything (a table, column, choice,
   solution, app, page, security setup), skim the entries and apply the ones
   that are relevant.
2. **Grow** — when a new convention surfaces (the user teaches you one, you
   discover one, or a mistake is corrected), offer to record it — once, at a
   natural pause. Working in the marketplace repo, append it directly; running
   from an installed copy, draft the entry for the user to contribute back,
   because installed copies are overwritten on update.

Treat this as accumulated judgement, not a rulebook to follow blindly — each
entry explains its reasoning so you can tell when it genuinely applies and when
an exception is justified. **Never add client-identifying detail to an entry**:
phrase every lesson for any project, and strip tenant, org, and customer names
at the door.

## How to add an entry

```
### N. <Short imperative title>
**Rule:** <what to do / not do>
**Why:** <the reasoning — what breaks or degrades without this>
**How:** <optional: the concrete mechanism, API, or setting>
```

Keep the file lean — if two entries overlap, merge them.

---

## The conventions

### 1. Use `statecode` / `statuscode` for record lifecycle status — never a custom "status" choice

**Rule:** Model a record's lifecycle/workflow status with the out-of-the-box
**`statecode`** (Status) and **`statuscode`** (Status Reason) columns. Do
**not** create a custom `status` choice column for this.

**Why:** `statecode` is what actually **activates/deactivates** a record. The
whole platform keys off it — active/inactive filtering, security and sharing,
rollups, business process flows, SLAs, and every standard view, chart, and
report ("Active X", "Inactive X"). A parallel custom status column duplicates
this, drifts out of sync, and silently bypasses all of that built-in behaviour.
`statuscode` gives you the granular stages, each mapped to exactly one state.

**How:** Custom tables allow only two states — **Active (0)** and
**Inactive (1)** — so put all the nuance in **Status Reasons** on `statuscode`.
Map open/working stages (New, Triaged, In Progress, On Hold) to **Active** and
terminal stages (Resolved, Closed, Won't Do) to **Inactive**, so closing a
record genuinely deactivates it. Configure via the maker portal's Status Reason
editor, or the metadata actions `InsertStatusValue` (add a reason under a
state), `UpdateOptionValue` (rename a reason), and `UpdateStateValue` (relabel
a state) — then `PublishXml`. This entry exists because a custom status choice
on a ticket table had to be ripped out and replaced mid-build.

### 2. Build every component inside its target solution, with the correct publisher

**Rule:** Create and modify tables, columns, choices, relationships etc.
**inside the intended solution**, using the org's **established publisher** —
never the Default solution or the default publisher. Confirm the publisher up
front, and reuse the org's existing prefix rather than minting a new one.

**Why:** Components created in the Default solution, or under the wrong
publisher, get the wrong prefix and are **not packaged for ALM** — they
silently won't travel to test/prod, and because a prefix is permanent you'd
have to recreate the components to fix it. Reusing the org's publisher also
keeps schema naming consistent with everything already there.

**How:** SDK — pass `solution="<UniqueName>"` on every create call. Web API —
set the `MSCRM.SolutionUniqueName` header on every metadata POST (Microsoft
Learn's name for it; `MSCRM.SolutionName` is ignored, and the component lands
outside the solution). Verify with the solution's `publisherid` (expand
`customizationprefix`).

### 3. Include each table's subcomponents AND required dependencies; system tables as shell references only

**Rule:** Add every custom table to the solution as a **root component that
includes all subcomponents** (columns, choices, relationships, forms, views),
and pull in its **required dependencies** (e.g. referenced custom tables) so
the solution imports cleanly elsewhere. Add *system* dependencies
(`systemuser`, etc.) as **shell references only** — never as full copies.

**Why:** If columns or relationships are added piecemeal, or a referenced
table is missing, export misses pieces and import fails with
unresolved-dependency errors. Conversely, fully copying a system table like
`systemuser` bloats the solution and causes import conflicts in the target —
a shell reference satisfies the dependency without the baggage.

**How:** `AddSolutionComponent` with `ComponentType=1`,
`DoNotIncludeSubcomponents=false` (root behaviour "Include All
Subcomponents"), `AddRequiredComponents=true`. Verify via
`solutioncomponents` + `rootcomponentbehavior`: your tables should read
**"Include all subcomponents" (0)**, system dependencies **"Do not include
subcomponents" (1)**.

### 4. Change schema and data through the API, not the maker portal

**Rule:** Create and change tables, columns, choices and relationships, and
load or update records, through the Dataverse tools, SDK or Web API — batched
for anything bulk. Use browser automation of the maker portal only for what
has no API, or to check how the result looks.

**Why:** An SDK call creates a column in seconds and can be re-run, reviewed
and promoted; driving the portal through a browser takes a dozen page loads
per column, breaks when the UI changes, and leaves no repeatable record.
Clicking through hundreds of records is never the answer. The full ladder is
in the tool-selection skill.

**How:** Concrete tools in `${PLUGIN_ROOT}/shared/microsoft-refs.md`
under "Tool map".

---

## Calibration

**About to create a table/column/choice** → skim entries 1–3 first; apply what's relevant without being asked.

**User proposes a custom status column** → entry 1. Explain *why* statecode wins, don't just cite the rule.

**Solution import failed with missing dependencies** → entry 3. Check root-component behaviour before debugging anything else.

**A new convention surfaces mid-build** → offer to record it, once, at a natural pause — phrased for any project, client names stripped.

**Command buttons, dialogs, page look and feel** → not here: the model-driven-ux skill holds the UX conventions.

## Reference files

- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — the only place this plugin names Microsoft plugin mechanics (Learn verification route, tool map).
