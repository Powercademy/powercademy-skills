---
name: plan-canvas-app
description: >
  Make the decisions that determine whether a Power Apps canvas app survives contact with real data - delegation strategy, data architecture, screen and navigation design, performance conventions - and produce a build plan Microsoft's canvas authoring tooling can then execute. Trigger whenever the user says "canvas app", "plan a canvas app", "build a canvas app", "design an app", "app screens", "gallery", "Power Fx", "delegation", "delegation warning", "which data source should I use", or describes a bespoke app UI for makers or field users. Also trigger mid-build on "why is my gallery only showing 500 records", "this filter isn't returning everything", "the app is slow", "should this be canvas or model-driven", or any question about app performance, data volumes, or screen structure. Plans and decides; hands execution to Microsoft's canvas tooling. If the task is designing, planning or de-risking a canvas app - trigger. When in doubt, trigger.
---

# Canvas Planner — decide before you generate

Generating a canvas app is now cheap. Microsoft's canvas tooling will plan
screens and write them for you (see `${PLUGIN_ROOT}/shared/microsoft-refs.md`
for how to reach it). What it will *not* do is tell you that the app you asked
for silently returns the wrong data at 50,000 rows, or that this should have
been a model-driven app.

**That is this skill's entire job: make the decisions that generation can't,
then hand a decided plan to the tooling that builds.**

You are planning *with* an experienced practitioner. Peer-to-peer, no basics,
and be willing to say the app shouldn't be built this way.

---

## The core loop

0. **Onboard** — tooling, environment, target (`${PLUGIN_ROOT}/shared/preflight.md`).
1. **Decide whether canvas is right at all.** Often it isn't.
2. **Decide the data and delegation strategy.** The decision that ages worst.
3. **Decide screen and navigation architecture.**
4. **Set conventions** — naming, components, performance.
5. **Write the plan, then hand off** to Microsoft's canvas tooling to build.
6. **Checkpoint at real data volumes**, not test volumes.
7. **Feed lessons back** into `${PLUGIN_ROOT}/shared/gotchas.md`.

Read `${PLUGIN_ROOT}/shared/gotchas.md` before planning.

---

## Step 0: Preflight

Run `${PLUGIN_ROOT}/shared/preflight.md`. Connect, confirm the environment and
tenant with a connection card, and confirm the canvas authoring tooling is
available before promising a generated app.

---

## Step 1: Is canvas the right shape?

Canvas is right for **task-shaped, opinionated UI** — a field worker doing one
job on a phone, a guided multi-step process, a bespoke layout over a handful of
tables.

Rule it out honestly first:

| Instead consider | When |
|---|---|
| **Model-driven app** | The job is CRUD over Dataverse with standard grids, forms, and security-trimmed views. You get delegation, auditing, and responsive layout for free — and no formulas to maintain |
| **Code app / custom page** | The UI genuinely needs component libraries, complex state, or web-developer tooling |
| **Power Pages** | The audience is external / unauthenticated |
| **Nothing** | An existing view, a modern control, or a well-configured form already does it |

Canvas costs are real and mostly deferred: Power Fx logic isn't unit-testable
the way code is, ALM is heavier than model-driven, and performance problems
appear only at production data volume. Say which option you'd choose and why.
**If canvas is the wrong shape, say so before generating anything** — a
generated app is much harder to argue with than a paragraph.

---

## Step 2: Data and delegation — the decision that ages worst

This is where canvas apps die quietly. A `Filter()` over 500 test rows looks
perfect; the same formula over 50,000 production rows returns **the first page
and stops**, with no error. The app doesn't break — it lies.

### How to think about it

- **Delegation** means the query runs *at the data source*. Non-delegable means
  the client pulls up to the row limit (default 500, configurable to 2,000) and
  evaluates locally. Everything past that limit is invisible.
- Delegability depends on **the function *and* the connector** — the same
  formula can delegate against one source and not another.
- **Collections and imported/static data never delegate** — they're in memory,
  so the row limit is the whole story.
- Studio shows delegation warnings as *warnings*, not errors. The app ships.

### What to do about it, in the plan

1. **Estimate real volumes per table, in production, in three years.** Ask; do
   not assume. Any table plausibly over the row limit is a delegation risk and
   must be named as one in the plan.
2. **Verify delegability against Microsoft Learn for the specific connector
   you're using** — never from memory, and never from another project.
   Delegation support tables change and differ by source. See
   `${PLUGIN_ROOT}/shared/microsoft-refs.md` for the verification route. State
   anything unverified as unverified.
3. **Choose the data source with delegation in mind, not just familiarity.**
   Dataverse generally delegates the broadest set of operations; file-shaped
   sources the least. If the volumes are large and the source is weak, that is
   an architecture decision — raise it now, not after the screens exist.
4. **Design the query to be delegable**, rather than filtering in the app:
   push filtering and sorting to the source, keep predicates simple, and avoid
   wrapping the filtered column in transformations.
5. **Where a query genuinely cannot delegate**, make it *structurally* safe:
   constrain the set first (by user, by date window, by status) so the working
   set is provably below the limit, and say in the plan why it's bounded.
6. **Never raise the row limit as a fix.** It moves the cliff; it doesn't
   remove it, and it slows every query. If someone proposes it, name that.

Record every decision in the plan's delegation table: table → expected volume →
source → the operations used → delegable? → mitigation.

---

## Step 3: Screen and navigation architecture

Decide before generation, because retrofitting navigation is expensive:

- **Screen inventory** — one line per screen: purpose, the data it shows, and
  what the user can do there. If two screens differ only in filter, that's one
  screen with a parameter.
- **Navigation model** — linear wizard, hub-and-spoke, or tabbed. Say which
  and why; mixed models confuse users and complicate back behaviour.
- **State** — what lives in global variables, what in context variables, what
  in collections, and what is re-queried. Name the few pieces of state that
  cross screens; everything else should be local.
- **Form pattern** — new/edit/view as separate screens or one parameterised
  screen. Decide once.
- **Responsive intent** — phone, tablet or both. This changes layout
  fundamentally and is painful to change later.

---

## Step 4: Conventions to set before generation

Cheap now, expensive later:

- **Naming** — a consistent prefix scheme per control type and screen, so
  formulas stay readable and generated screens stay consistent.
- **Components** — what gets built once and reused (headers, cards, empty
  states). Decide before screens are generated, or you'll get five variants.
- **Startup work** — keep app-start work minimal and parallel where possible;
  every sequential call at startup is time the user stares at a splash screen.
  Prefer loading what the *first* screen needs, not everything.
- **Error and empty states** — decide the pattern once; generated screens
  rarely include them and they're what makes an app feel finished.
- **Environment-specific values** — connection references and any environment
  variables the app depends on, so ALM works later.

---

## Step 5: Write the plan, then hand off

Output a markdown file **into the user's working directory**, path stated.
Structure:

```markdown
# <App> — Build Plan

## Shape decision            (canvas vs alternatives, and why)
## Data & delegation         (the table: volume → source → operations → delegable? → mitigation)
## Screen inventory          (purpose, data, actions per screen)
## Navigation & state
## Conventions               (naming, components, startup, error/empty states)
## Open questions            (things to ask, not guess — volumes, licensing, owners)
## Build order & checkpoints
## Change log
```

Render the plan as a **build-along HTML page** alongside the markdown (same
basename, `.html`) per `${PLUGIN_ROOT}/shared/artifact-style.md` — the
delegation table and checkpoints tickable, verdict-first status strip.
Markdown stays the source of truth; regenerate on change.

Then **hand execution to Microsoft's canvas authoring tooling** with these
decisions as its input — it plans and generates screens far faster than doing
it by hand. See `${PLUGIN_ROOT}/shared/microsoft-refs.md`. The division is
strict: *this skill decides; their tooling builds.* Do not re-implement
generation here.

When their tooling produces something that contradicts the plan, the plan is
the source of truth — update it and say whether rework is needed.

---

## Step 6: Checkpoints — at real volumes

Risk tiers as elsewhere: 🟢 local/no data risk · 🟡 proves something new in a
dev environment · 🔴 touches production data or real users.

The checkpoints that matter for canvas specifically:

- **⏸ Delegation proof · 🟡** — the one people skip. Point the app at a table
  loaded with **more rows than the row limit** and confirm the screen returns
  what it should. Testing against 50 rows proves nothing. Script it: expected
  count, actual count, and the specific query being exercised.
- **⏸ Startup timing · 🟡** — measure app start on a realistic device and
  network, not the maker's desktop.
- **⏸ Permissions as a real user · 🟡** — run as someone with the *least*
  privileged role that will use it; makers see data their users can't.
- **⏸ Write path · 🔴** — the first checkpoint that creates or edits real
  records. Explicit pre-conditions, and a way to undo the test data.

Always flag tenant risk before it's asked about — a canvas app pointed at a
customer's production table is a production system.

---

## Step 7: Keep the plan alive, and improve the skill

When reality contradicts the plan — a delegation warning, a volume that turns
out to be ten times the estimate, a screen that needed splitting — update the
plan, state plainly whether rework is required, and add a versioned change-log
entry.

After the build, scan for lessons that aren't specific to this app: a connector
that delegated differently than documented, a formula pattern that quietly
broke, a generation behaviour worth knowing. Offer them once, at a natural
pause, for `${PLUGIN_ROOT}/shared/gotchas.md` — appending directly when working
in the marketplace repo, or drafting the entry for the user to contribute back
when running from an installed copy.

---

## Calibration

**"Build me a canvas app that…"** → Step 1 first. Is canvas right? Then volumes and delegation, then screens, then hand off to generate.

**"Why is my gallery only showing 500 records?"** → Delegation. Identify the non-delegable operation, name the connector, verify against Learn, then fix the query rather than the row limit.

**"The app is slow"** → Startup work and per-screen queries first; then unbounded galleries and nested lookups. Ask what device and network — maker desktops lie.

**"Should this be canvas or model-driven?"** → Answer it properly with the Step 1 table. This is the highest-value question anyone asks you.

**"Can you just generate it?"** → Yes — after the delegation table exists. Generation is the cheap part; that's exactly why the decisions must come first.

---

## Reference files

- `${PLUGIN_ROOT}/shared/preflight.md` — onboarding the skill runs itself.
- `${PLUGIN_ROOT}/shared/gotchas.md` — accumulated failure log. **Read before planning.**
- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — the only place this plugin names Microsoft tooling: the canvas authoring route, Learn verification, and the `pac` CLI.
