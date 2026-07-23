---
name: build-pcf-control
description: >
  Design and build Power Apps Component Framework (PCF) code components end to end - deciding first whether PCF is even the right tool, then producing a build plan and working control verified against Microsoft Learn, with checkpoints where PCF actually breaks. Trigger whenever the user says "build a PCF control", "PCF component", "code component", "custom control", "field control", "dataset control", "virtual control", "pac pcf", "component framework", "spec a control", or describes a bespoke UI for a model-driven or canvas app they want to build in code. Also trigger mid-build on questions about the manifest, a lifecycle method (init, updateView, getOutputs, destroy), the test harness, bundling, versioning, or deployment ("why won't my control update", "my getOutputs isn't firing", "works in the harness but not the form"). If the task is designing, building, packaging, deploying, or debugging a PCF control, trigger. When in doubt, trigger.
---

# PCF Builder — Build Methodology

You are building Power Apps Component Framework controls *with* the user, not
for them. Assume an experienced Power Platform practitioner: peer-to-peer, skip
the basics, and be willing to say when PCF is the wrong tool for the job.

The deliverable is not just code. It is a **build plan and a working control
that survives deployment** — plus a living record of what broke, because PCF's
cost is rarely the code. It's the versioning, the harness-vs-real-host gap, and
the deployment, every one of which has wasted an afternoon for someone before.

---

## The core loop

0. **Onboard the user** — tooling, environment, target app (`${PLUGIN_ROOT}/shared/preflight.md`).
1. **Decide whether PCF is even right.** It often isn't.
2. **Ground** in the existing solution, app, and conventions.
3. **Verify against Microsoft Learn** — APIs, manifest, and *licensing*. Never from memory.
4. **Produce the build plan and control**, manifest-first.
5. **Checkpoint at the points PCF actually breaks**, with risk tiers.
6. **Keep the plan alive** as reality contradicts it.
7. **Capture reusable lessons** into `${PLUGIN_ROOT}/shared/gotchas.md`.

Read `${PLUGIN_ROOT}/shared/gotchas.md` before building — it is the accumulated failure log.
For pac commands, the Learn MCP server, the pac CLI's built-in MCP server, and
solution packaging, read `${PLUGIN_ROOT}/shared/microsoft-refs.md`; that is the only place
this plugin names Microsoft plugin mechanics.

---

## Step 0: Preflight — onboard in natural language

Run `${PLUGIN_ROOT}/shared/preflight.md` the moment the user expresses intent. Do the work for
them: check Node/npm, the pac CLI, and the build toolchain; get connected to the
right environment; confirm the target app. Narrate what you find, offer fixes,
and surface any gap plainly — never let the user guess why something failed. On
a customer's machine, offer before installing.

---

## Step 1: Decide whether PCF is the right tool

PCF carries real cost — a build toolchain, a bundle that loads on every form, a
deployment story, and an upgrade story. Before writing a manifest, rule out the
cheaper options honestly:

- **Out-of-the-box** column formatting, a modern control, or a view already does it → no code.
- **A canvas component** or a **generative page** fits the need and is easier to maintain → prefer it.
- **PCF is right when**: you need a bespoke interactive UI bound to a column or dataset, reused across forms/tables, rendering *in the same context* as the rest of the form (unlike a web resource in an iframe).

Say which of these you'd choose and why. If PCF is overkill, say so — a skill
that talks the user out of unnecessary work earns the right to build the
necessary work.

Then pin the **control type**, because it determines everything downstream:

| Type | Binds to | Use for |
|---|---|---|
| **Field** | a single column of a specific data type | replacing one column's UI (slider, dial, colour picker) |
| **Dataset** | a view / subgrid | transforming a list (calendar, map, gallery) |
| **Virtual (React)** | either, using the platform's React + Fluent | complex interactive UI without bundling your own React |

---

## Step 2: Ground in what exists

If there's an existing solution, app, or repo, read it before proposing
anything. Never design against conventions you haven't looked at.

Audit and record:

- **Publisher prefix and solution** the control will belong to. Changing a publisher prefix after deployment is painful — get it right first.
- **Namespace and constructor naming** conventions. These must be unique and are painful to rename post-deployment.
- **Target app**: model-driven or canvas? Some APIs (e.g. full Web API access) differ by host.
- **Existing controls** in the repo — match their build setup, TypeScript config, and lint rules rather than inventing new ones.

**Absence is a finding.** If there's no ALM story for existing controls (they
were `pac pcf push`-ed straight to dev, never solutioned), say so — that's a
problem to fix, not a pattern to copy.

---

## Step 3: Verify against Microsoft Learn — always

PCF's framework APIs, manifest schema, and especially **licensing** move and
are easy to get wrong from memory. Verify against live Learn (Learn MCP server
or web fetch — see `${PLUGIN_ROOT}/shared/microsoft-refs.md`).

Verify, at minimum:

- **Licensing.** This is the trap. A code component that reaches an external
  service *directly from the browser* is **premium** — it makes the app premium
  and end users need Power Apps licences. A component using only standard
  features stays standard. Premium is declared with an `<external-service-usage>`
  node in the manifest. Get this wrong and you either mis-licence the customer
  or ship a component that quietly forces premium on their whole app. Confirm it
  against Learn and record it in the plan.
- **Manifest property types** — the exact `of-type` values, and that a field
  control's bound type matches the target column, or binding fails silently in
  the form editor.
- **Feature usage** — `feature-usage` nodes for Web API, device, or utility
  APIs; some aren't available in canvas, or in the test harness.
- **Platform libraries** — the supported React/Fluent versions to reference via
  `<platform-library>` rather than bundling your own.

State anything unverified as unverified.

---

## Step 4: The build plan and control — manifest first

The manifest is the contract; write it before the code. The plan covers:

**Manifest (`ControlManifest.Input.xml`)**
- `control` namespace + constructor (unique, convention-matched)
- `property` / `data-set` definitions with exact types and usage (bound vs input vs output)
- `feature-usage` for every platform API touched
- `resources` — every `.css`, image, and `.resx` declared, or it won't ship
- `<platform-library>` for React/Fluent on virtual controls
- `<external-service-usage>` if premium — matched to the licensing decision above

**Lifecycle (`index.ts`)** — give the intent and the traps for each:
- `init` — set up; stash `notifyOutputChanged`; don't do work that belongs in `updateView`
- `updateView` — called on *every* context change (data, container resize, mode), not just data. Check what actually changed; don't assume.
- `getOutputs` — only fires after you call `notifyOutputChanged`. Forgetting that call is the classic "my output never reaches the platform" bug.
- `destroy` — clean up listeners/timers; the platform destroys and reloads controls for performance while preserving state.
- **Virtual controls**: return the React element from `updateView`; do not `ReactDOM.render` yourself.

Give real, buildable specifics — property names, types, the actual bundle
entry — not "the usual manifest". Someone should be able to build it without
asking a question.

---

## Step 5: Checkpoints and risk tiers

Place checkpoints where PCF fails in a way that looks like something else.
Mark each:

| Tier | Meaning |
|---|---|
| 🟢 | Local only (harness, build). Run freely. |
| 🟡 | Touches a dev environment — proves a deploy, a binding, a licence flag. |
| 🔴 | Affects a shared/production environment, an app's premium status, or real users. Explicit pre-conditions. |

The checkpoints that matter for PCF specifically:

- **⏸ Harness build & run · 🟢** — `npm start watch`. Proves it compiles and renders. *But the harness is not the real host*: Web API isn't available, context differs. "Works in the harness" is necessary, not sufficient — say so.
- **⏸ Version bump before every redeploy · 🟡** — increment the manifest version or the platform serves the **cached old bundle**. This single gotcha wastes more PCF hours than any other. Make it a checkpoint, not a footnote.
- **⏸ Dev deploy · 🟡** — pushed to a dev environment and bound on a real form/view. First time the *real* host runs it. Test the actual data types, empty states, and permissions here.
- **⏸ Premium licensing check · 🟡** — if `<external-service-usage>` is set, confirm the app's premium status changed as expected and the customer is licensed for it. This is a hard stop before any production deploy.
- **⏸ ALM deploy · 🔴** — into a shared/production environment via a *managed solution*, not `pac pcf push`. `pac pcf push` is a dev-iteration tool that creates a temporary publisher — never the production path.

Each checkpoint is a runnable test, not a suggestion: the exact command, what to
look at, what "pass" means, and what to send back. Flag customer-tenant risk
proactively — a control deployed to a production app changes what real users
see on real records.

---

## Step 6: Keep the plan alive

The plan is the source of truth. When reality contradicts it — a manifest
rejected, a harness error, a binding that won't bind, a licence flag that
flipped the app to premium — **update the plan, then say plainly whether rework
is required**, which file, what to change, why. Add a versioned change-log entry.

---

## Step 7: Recognise when the skill should improve

After a build, scan for lessons *not specific to this control*: a manifest
constraint, a harness-vs-host difference, a deployment surprise, a licensing
edge. Tell the user once, at a natural pause, with the concrete lesson — then,
if they agree, add it to `${PLUGIN_ROOT}/shared/gotchas.md` (or, if installed from the
marketplace where the copy is overwritten on update, draft it for them to
contribute back). Don't nag; don't do it mid-build.

---

## What good looks like

**Bad:** "Add your external API call in `updateView`."

Incomplete, and it hides a licensing landmine — an external call makes the app
premium.

**Good:**

> The weather lookup calls `api.example.com` directly from the browser. That
> makes this a **premium** component: it flips the whole app to premium and end
> users will need Power Apps licences. Two consequences:
>
> 1. Declare it in the manifest so licensing is honest:
>    ```xml
>    <external-service-usage enabled="true">
>      <domain>api.example.com</domain>
>    </external-service-usage>
>    ```
> 2. Confirm the customer is licensed for premium before the 🔴 ALM deploy — this is a hard stop, recorded in the plan's open questions.
>
> *(Verify the current premium rule against Learn before committing — licensing moves.)*

---

## Calibration

**"Build me a PCF control that does X"** → Decide if PCF is right first. Then ground, verify, plan.

**"What do I put in the manifest for X?"** → Answer the manifest node. Then check the plan says so, and update it.

**"Why won't my control update?"** → Version bump. Ask if they incremented the manifest version; it's the usual cause. Then republish/clear cache.

**"Works in the harness but not the form"** → Expected. The harness isn't the real host — Web API and context differ. Diagnose against the real host.

**"Is this risky?"** → Answer in tiers. A dev push is amber; a production ALM deploy that flips an app to premium is red.

---

## Reference files

- `${PLUGIN_ROOT}/shared/preflight.md` — onboarding checks the skill runs itself (Step 0).
- `${PLUGIN_ROOT}/shared/gotchas.md` — accumulated failure log. **Read before building.**
- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — the only place this plugin names Microsoft plugin mechanics: pac commands, the Learn MCP server, the pac CLI's MCP server, solution packaging. Read when you need to reach any of them.
