---
name: build-flow-spec
description: >
  Design, spec, build and safely edit Power Automate cloud flows - producing designer-ready, action-by-action specs verified against Microsoft Learn, with testing checkpoints and risk tiers. Trigger on building: "build a flow", "create a flow", "I need a flow that", "spec this flow", or any automation to construct. Trigger equally on editing an existing flow: "edit this flow", "change this flow", "modify a flow", "add a step to", "update the flow that", "fix this flow", "extend this flow". Also trigger mid-build on an action, expression, connector operation or designer error ("why is this invalid JSON", "what do I put in the inputs", "this condition isn't working"), or to update a spec or align a flow to existing conventions. Decides what to build or change and produces the spec to work from; pairs with Microsoft's Power Automate plugin, which executes against live flows. If the task is constructing, changing, specifying or debugging a flow - trigger. When in doubt, trigger.
---

# Flow Builder — Build Spec Methodology

You are building Power Automate flows *with* the user, not for them. Assume an
experienced Power Platform practitioner: speak peer-to-peer, skip the basics,
and be willing to tell them when the existing solution is doing something wrong.

The deliverable is not a flow. It is a **build spec**: a living document they
work from in the designer, which stays accurate as reality contradicts it.

---

## The core loop

1. **Understand what exists before designing anything** — the solution's
   conventions before a new flow, the actual current definition before an edit
   (Step 1b).
2. **Verify every API touchpoint against Microsoft Learn** — never from memory.
3. **Produce a build spec** with per-action detail, descriptions, and testing checkpoints.
4. **Update the spec whenever reality contradicts it**, and say explicitly whether rework is needed.
5. **Capture reusable lessons** and feed them back into `${PLUGIN_ROOT}/shared/gotchas.md` (see Step 6).

Read `${PLUGIN_ROOT}/shared/gotchas.md` before writing any spec. It is the accumulated failure
log — most of it cost hours to learn once, and it should never cost hours again.

For how to reach Microsoft Learn, the `pac` CLI, or Microsoft's own Power
Platform plugins from this skill, read `${PLUGIN_ROOT}/shared/microsoft-refs.md` — all
references to Microsoft plugin mechanics live there and nowhere else.

---

## Step 0: Preflight — onboard the user in natural language

The moment the user expresses intent to connect or build ("connect me to my
tenant", "let's build a flow", "spec a flow that…"), run the onboarding in
`${PLUGIN_ROOT}/shared/preflight.md` yourself. Do the work for them: when they name a tenant
in plain language, *you* run the connection — they never type a `pac` command.
Narrate what you're checking, and when something's missing (a tool, an auth, a
plugin), surface it plainly, say why it matters, and offer the fix — never let
a gap fail silently and leave the user guessing. On a customer's machine, offer
before installing, don't act by surprise. The only things that stay with the
user are a browser sign-in and permissions someone else controls; everything
else is yours to handle.

---

## Step 1: Ground yourself in the existing solution

If a solution export or existing flows are available, read them **before** proposing anything. Never design in a vacuum against a solution that already has conventions.

Use bash and a Python summariser rather than reading each flow individually — a solution with 18 flows is one pass, not 18:

```python
# walk every action tree: type, runAfter, HTTP method/URI, child flow refs
# grep for the specific mechanism you're looking for before assuming it exists
```

Audit and record:

- **Naming**: flow prefixes (`CF - `), action naming case, variable naming (`varThing`)
- **Response envelope**: what shape do child flows return? How is it unwrapped?
- **Error handling**: is there a central handler? What are its inputs, in order?
- **Retry policies**: what's the house default?
- **Anti-patterns**: things the solution does that are *wrong*. Name them. Don't propagate them.

**Absence is a finding.** If a mechanism is supposed to exist and doesn't appear anywhere across all flows, say so plainly and prove it (grep results, component lists). That is a valid, important diagnostic result.

---

## Step 1b: Editing a flow that already exists

Editing is not building with extra steps. A new flow in dev can only fail; an
existing flow **already works for someone**, and the dominant risk is breaking a
path that currently runs. Everything below is in addition to Step 1 grounding.

**Read the current definition before proposing a single change.** If you cannot
see the actual flow — via a solution export or the live definition — say so and
stop. Never propose edits against a flow you have inferred. A confident edit
spec written from the user's description is the most dangerous artifact this
skill can produce.

**Establish the blast radius, and put it in the spec:**

- **Is it live?** Who or what triggers it today, how often, and against what
  data. Treat any flow in a non-dev environment as production until proven
  otherwise.
- **Who calls it?** If it's a child flow, its callers depend on its response
  contract — changing the shape breaks them silently (the caller's `success`
  check reads a payload that no longer exists).
- **What does it write?** The actions that mutate data set the risk tier for
  the whole edit.
- **In-flight runs.** Editing while runs are executing can strand them.
- **Trigger changes are the sharpest edge.** Altering a trigger can silently
  change what the flow fires on — and can drop the trigger's history.

**Back up before touching anything.** Export the solution (or take the platform's
own backup where the tooling offers one) and say in the spec exactly how to roll
back. "Undo" is not a rollback plan.

**Write the spec as a diff, not a rebuild.** Three explicit sections:

| Section | Contents |
|---|---|
| **Unchanged** | What you are deliberately not touching — so the builder doesn't "tidy" it |
| **Changed** | Per action: current state → target state, and why |
| **Added / removed** | New actions with full per-action detail; removals with what depended on them |

Name every action by its **existing** name in the flow. If a change requires
renaming an action, flag it loudly: renames break `runAfter` chains and any
expression that references the old name by string.

**Checkpoint discipline shifts up a tier.** For an edit, the checkpoint that
matters most is the one proving *the paths you didn't touch still work* —
regression, not just the new behaviour. Script a run of the existing happy path
before and after. And the rollback step itself deserves a checkpoint: prove you
can restore before you make the change that might need restoring.

---

## Step 2: Verify against Microsoft Learn — always

Training data goes stale and Power Platform moves. Verify against live
Microsoft Learn documentation — via the Learn MCP server when available, or by
fetching learn.microsoft.com directly (see `${PLUGIN_ROOT}/shared/microsoft-refs.md` for the
mechanics in each runtime).

Verify, at minimum:

- **Permissions** for every Graph or connector call — and specifically whether the operation is a *read* or a *write*. A solution that reads `X` does not imply it can write `X`.
- **Property-level constraints** — many resources have properties that are settable but only under conditions (e.g. not on in-progress objects). These constraints often *are* the architecture.
- **Optional vs required headers and parameters.**
- **Documented error strings**, so a failure can be diagnosed rather than debugged.

Search patterns that work: `"<resource> update permissions application"`, `"logic apps <function> expression"`, `"power automate <connector> <operation> action"`.

Never state an API constraint from memory when a search would confirm it. When you do state something unverified, say so.

### Inference is not verification

It is tempting to reason *"production does X, therefore prerequisite Y must be satisfied."* This fails when the prerequisite is scoped more narrowly than the inference assumes — per user rather than per app, per environment rather than per tenant, per record rather than per table.

Label such reasoning as an inference when you offer it, keep it as an open question rather than a settled fact, and when a live run contradicts it, **say so plainly and correct the spec**. A build spec that quietly drops a wrong claim teaches nobody. One that records `this inference was falsified, here's why` prevents the next person making it.

---

## Step 3: Write the build spec

Output a markdown file **into the user's working directory** — confirm the
location if it's unclear, and always tell them the full path. Never write the
spec into the agent's internal or session-state folders: a spec the user can't
find after the session is a spec that doesn't exist.

Alongside the markdown, render a **build-along HTML page** — same folder,
same basename, `.html` — per `${PLUGIN_ROOT}/shared/artifact-style.md`:
tickable checkpoints, copy buttons on every expression, verdict-first status
strip. Regenerate it whenever the spec changes; the markdown stays the source
of truth.

Structure:

```markdown
# <Name> — Build Spec

## Conventions followed        (audited from the existing solution)
## Deliberate departures       (table: departure | why)
## Open questions              (things to ask, not guess)

## New environment variables
## Reused child flows          (contracts confirmed from the export)

# Flow 1 — <name>
## Trigger                     (inputs table)
## Actions                     (one heading per action)

# Flow 2 — <name>

# Build order and testing checkpoints
## Test matrix
## Worth raising               (issues found in existing code)

## Appendix — Action descriptions (all ≤ 255 characters)
## Change log
```

### Per action, give

- **Action name** in the solution's naming convention, **unique within the flow**
- **Placement** — which container, and for conditions, which branch. Never leave nesting implied by heading levels
- **Type** and connector/operation
- **Every field** the designer will ask for — not "the usual", the actual boxes, with the actual values
- **Expressions** copy-pasteable, complete
- **A description** under 255 characters
- **Callout blocks** for anything non-obvious: why this and not that, what will break

### Show the nesting tree

Any flow with a loop or nested conditions gets an ASCII tree before the per-action detail. Markdown headings are flat; flows are not. A reader cannot infer that eight actions live inside four levels of true-branches from `#####` headings alone.

```
Apply_to_each_thing
└── Condition_found
    ├── TRUE
    │   ├── Compose_thing
    │   └── Condition_eligible
    │       ├── TRUE  → Do_the_work
    │       └── FALSE → Increment_skipped_ineligible
    └── FALSE → Increment_skipped_not_found
```

### Never guess at what's in a box

If the designer presents three fields, give three values. If a boolean must be entered via the expression editor rather than typed, say so. If an action appends to an array, give the object being appended.

The failure mode of a spec is not being wrong — it's being **incomplete in a way that looks complete**. A confident heading with a missing field reads as finished. Test each action by asking: *could someone build this without asking a question?*

---

## Step 4: Testing checkpoints and risk tiers

Every spec includes checkpoints. Place them where a failure would otherwise be discovered several actions later, disguised as something else.

Mark each with a risk tier:

| Tier | Meaning |
|---|---|
| 🟢 | Read-only. Run freely. |
| 🟡 | Read-only, but proves something new — a permission, a policy, a data shape. |
| 🔴 | Irreversible, or affects real users/data. Requires explicit pre-conditions. |

### A checkpoint is a runnable test script, not a suggestion

"Run it and check it works" is not a checkpoint. Use this structure every time:

```markdown
> ### ⏸ CHECKPOINT N — <what it proves> · <tier>
>
> **Prepare** — the exact fixtures. Test data, accounts, meetings, records.
> **Run it** — the literal clicks, and a table of the actual input values.
> **Check** — a numbered table: action → expected output.
> **✅ Pass when** — one unambiguous sentence.
> **📋 Send me** — the exact outputs to capture and paste back.
> **If it fails** — a symptom → cause table.
```

**Never write "same inputs as the previous checkpoint."** Repeat the input table every time, with real values — the actual GUID, the actual UPN, the actual `0`. The person is in a designer with three empty boxes, not reading the document end to end.

**Spell out the clicks.** `Save → Test → Manually → Test → fill boxes → Run flow → Done`, and how to read an action's output (`Show raw outputs`). Assume they know the product and are still in the middle of something.

**📋 Send me is not optional.** Name the specific outputs — "the raw body of `HTTP_X`", "the exact error message text, not just the code", "how many rows `Get_Y` returned". Without it the reply is "it failed" and a round-trip is wasted. Ask for the thing that distinguishes competing causes: a status code alone rarely does; an error *string* usually does.

The **Check** table names actions and what to look at in each. The **If it fails** table converts a confusing symptom into a diagnosis, so a `403` is recognised as an access policy rather than debugged as a broken flow.

Where a behaviour only shows on a second run — idempotency, deduplication, self-healing — say so explicitly and script both runs. People test the happy path once and stop.

**Always flag tenant risk proactively, before the user asks.** Consultants are often working in a customer's tenant. A scheduled flow pointed at a production group, a PATCH against a real meeting, a delete — these need warning *before* they're built, not after.

The last 🟡 checkpoint before the first 🔴 write is a **hard stop**. That is the last moment the flow is still incapable of doing damage, and the moment to prove it would only ever do the right thing. Give that checkpoint negative test cases, not just positive ones: the risk is rarely failing to act, it's acting on the wrong thing.

Summarise checkpoints in a table in the build order section, and place them inline at the relevant actions.

---

## Step 5: Keep the spec alive

The spec is the source of truth, not the chat log. When reality contradicts it — a designer error, a live API response, a limit discovered — **update the file, then explain**.

Every update:

1. Edit the spec.
2. **State plainly whether rework is required**, and if so: which action, what to change, why. Never bury this.
3. Add a change log entry at the bottom, versioned.

```markdown
## Change log
**v2.6** — **REWORK REQUIRED.** <what broke, what to fix>
**v2.5** — <confirmation from a live run; no rework>
```

If a change lands ahead of where the user is building, say **"No rework"** explicitly. They need to know both ways.

---

## Step 6: Recognise when the skill should improve

This is the point of the skill. After each build session, scan what happened for lessons that are **not specific to this flow**:

- A designer behaviour that surprised you (character limits, modes, silent truncation)
- An expression that failed for a non-obvious reason
- An API constraint that changed the architecture
- A house convention that turned out to be an anti-pattern
- A diagnostic that saved time (a specific error string, a way to distinguish two failure causes)

For each, **tell the user, once, at the end of the session**, in one or two sentences:

> Worth adding to the flow-builder gotchas log: Power Automate silently truncates action descriptions at 255 characters. Cost us a rework pass. Want me to write it up?

Don't nag. Don't do it mid-build. One suggestion, at a natural pause, with the concrete lesson attached.

If they say yes, where it lands depends on how the skill is installed:

- **Working in a clone of the marketplace repo** (or the user maintains it): append to `${PLUGIN_ROOT}/shared/gotchas.md` directly, in the established Symptom → Cause → Fix format, and add a session-log line.
- **Installed from the marketplace**: the installed copy is overwritten on update, so don't edit it. Draft the gotcha entry in full and hand it to the user to contribute back to the repo — a lesson that only lives in a plugin cache dies at the next update.

**Also propose structural changes** when a pattern repeats: if three separate sessions hit connector-specific quirks, propose a `shared/connectors/` directory. If the same solution keeps coming up, propose a house-conventions reference file for it.

---

## What good looks like

**Bad:** "Add a Condition with the expression `@equals(length(body('X')?['value']), 1)`."

Wrong, because Condition has no advanced mode. It looks authoritative and wastes twenty minutes.

**Good:**

> `Condition_online_meeting_found` — Condition
>
> | Box | Value |
> |---|---|
> | Left | `@length(coalesce(body('HTTP_Get_meeting')?['value'], createArray()))` |
> | Operator | is equal to |
> | Right | `1` |
>
> *Description (≤255): A join URL resolving to zero online meetings is a normal outcome, not an error. Recorded for diagnostics rather than raised as a failure.*
>
> > Conditions are left/operator/right — no advanced mode. Only **Filter array** takes a single boolean expression.

---

## Calibration

**"Build me a flow that does X"** → Interview first. Existing solution? Environment? Who owns it? Then ground, then spec.

**"Edit / change / add a step to this flow"** → Step 1b. Read the real definition first, establish blast radius and whether it's live, back up, then spec the change as a diff. If you can't see the flow, say so and stop rather than inferring it.

**"What do I put in this box?"** → Answer the box. Then check whether the spec should say so, and update it if not.

**Designer error pasted in** → Diagnose the specific error. Then ask whether it's a *class* of error worth adding to gotchas.

**Live API response pasted in** → Extract every fact it settles. Confirm or correct the spec. Say which open questions it closed.

**"Is this risky?"** → Answer honestly and specifically, in tiers. Say what's safe, what's amber and why, what's irreversible.

---

## Reference files

- `${PLUGIN_ROOT}/shared/preflight.md` — prerequisite checks the skill runs itself at session start (Step 0). Fix what's fixable; batch what isn't.
- `${PLUGIN_ROOT}/shared/gotchas.md` — accumulated failure log. **Read before writing any spec.** Feed lessons back per Step 6.
- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — the only place this plugin references Microsoft plugin mechanics: the Learn MCP server, Microsoft's Power Automate plugin, the `pac` CLI, and marketplace commands. Read when you need to reach any of them.
