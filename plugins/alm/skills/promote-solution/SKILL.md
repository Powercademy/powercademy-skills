---
name: promote-solution
description: >
  Run a Power Platform solution promotion end to end with checkpoints - pre-flight the source and target, export the right solution as managed, move it, import, then verify with evidence - stopping before anything irreversible. Trigger whenever the user says "deploy this solution", "promote to test", "deploy to production", "ship this", "release this", "move this to UAT", "export the solution", "import the solution", "run the deployment", "publish my changes to another environment", or names two environments and a solution. Also trigger mid-deployment on "the import failed", "missing dependency", "why did my flow come across disabled", "the connection reference is wrong", or any solution import error. Drives Microsoft's deployment tooling with checkpoint discipline; never crosses a production import without explicit approval. If the task is moving a solution between environments, trigger. When in doubt, trigger.
---

# Promote Solution — deploy with the safety on

A solution import into a live environment is one of the few genuinely
irreversible things in this platform. This skill runs the promotion *for* the
user — but it stops at every point where a mistake becomes permanent, and it
proves each step worked before taking the next.

The mechanics belong to Microsoft's tooling (see
`${PLUGIN_ROOT}/shared/microsoft-refs.md`); the discipline belongs here.

---

## Non-negotiables

- **Never import to production without explicit, in-the-moment approval.**
  Not implied by "deploy it", not carried over from an earlier yes.
- **Never build or patch downstream.** If the fix belongs in dev, say so and
  stop, even when patching test would be quicker.
- **Never declare success from an exit code.** A solution import can report
  success and still leave flows off, connection references unbound, or
  environment variables empty. Verify with evidence.
- **Never claim a side effect you cannot observe.** No "the import is running"
  unless you can see it.
- **Say which environment you are about to change, every time**, before you
  change it.
- **Promote with the CLI or native pipelines, not by clicking.** Export,
  import, dependency checks and environment-variable values all have
  scriptable routes — use them, so the promotion can be repeated and audited.
  The browser is for what has no API (some admin-centre settings) and for
  confirming the result looks right in the target environment.

---

## Step 0: Preflight both ends

Run `${PLUGIN_ROOT}/shared/preflight.md`, then establish the promotion's shape
and put it in front of the user before anything moves:

> **Promoting:** `<SolutionName>` v`<version>`
> **From:** <source env> (unmanaged, dev) → **To:** <target env> (**PRODUCTION**)
> **Managed:** yes · **Approval required:** yes · **Rollback:** <named plan>
>
> Confirm before I export?

Check, and report as findings rather than assumptions:

- The source solution exists, is **unmanaged**, and is the one they mean.
- The target is what they think it is — confirm production status explicitly.
- Whether an **ALM process document** exists. If not, offer `design-alm-process`
  first; proceed only if they want a one-off, and say what that costs.
- Whether this promotion has ever been rehearsed. First runs get more
  checkpoints, not fewer.

---

## Step 1: Pre-flight the solution itself

Before export, catch what makes imports fail — cheaper now than mid-import:

- **Unresolved dependencies.** Components referencing things not in the
  solution and not in the target. This is the number-one import failure.
- **Custom connectors** referenced by connection references must belong to a
  solution, or export refuses.
- **Environment variables** — every definition needs a Default Value, or the
  target import leaves it empty and things fail at runtime, not import time.
- **Connection references** — know which need binding in the target and who
  owns those connections.
- **Version number** — bump it deliberately; two artefacts with one version is
  a debugging nightmare later.

> ### ⏸ CHECKPOINT 1 — the solution is exportable · 🟢
> **Run it** — the dependency and pre-flight checks above.
> **✅ Pass when** — no unresolved dependencies, every environment variable has
> a default, every custom connector is solutioned.
> **📋 Send me** — the dependency list if anything is flagged, verbatim.
> **If it fails** — fix in **dev**, never downstream, then re-run this checkpoint.

---

## Step 2: Export

Export **managed** for anything downstream of dev (unmanaged downstream is a
one-way trip into an unmaintainable environment). Keep the exported artefact
somewhere durable and named with its version — the user's working directory,
path stated, not a temp folder.

> ### ⏸ CHECKPOINT 2 — artefact in hand · 🟢
> **Check** — file exists, size is sane, version matches what you bumped.
> **✅ Pass when** — you can state the exact file path and version back to the user.

---

## Step 3: Import to a non-production target first

If a test/UAT environment exists, **always rehearse there first**, even when
the user asks to go straight to production. Say why: the rehearsal is what
turns the production import from a gamble into a repeat.

> ### ⏸ CHECKPOINT 3 — rehearsal import · 🟡
> **Prepare** — target confirmed non-production; note existing solution version there.
> **Run it** — the import, with the environment named out loud.
> **Check** — import completed *and*: flows present (note which are **off** —
> solution flows arrive disabled by design), connection references bound,
> environment variables holding the right per-environment values, no missing
> dependencies.
> **✅ Pass when** — the solution is present at the expected version and every
> item in the config boundary reads correctly for *this* environment.
> **📋 Send me** — the import status, and the environment-variable values as
> they landed.
> **If it fails** — see the symptom→cause table in `${PLUGIN_ROOT}/shared/gotchas.md`;
> fix in dev, re-export, re-run. Do not patch the target.

---

## Step 4: Post-import configuration

Import is not deployment. Walk the config boundary explicitly:

- Set **environment variable current values** for this environment.
- Bind **connection references** to the environment's own connections, owned by
  a service account or a person who will still be here next year.
- **Turn on** the flows that should run — deliberately, one at a time, knowing
  what each will do the moment it's enabled. A recurrence flow pointed at
  production data starts *immediately*.
- Assign security roles / share apps as the process document specifies.

> ### ⏸ CHECKPOINT 4 — it actually works here · 🟡
> **Run it** — one real, low-risk end-to-end exercise of the solution in this
> environment.
> **✅ Pass when** — the thing does its job against this environment's data and
> nothing points back at dev.
> **📋 Send me** — what you exercised and what it produced.

---

## Step 5: Production — the hard stop

Everything above must be green before this step is even offered.

> ### ⏸ CHECKPOINT 5 — production import · 🔴
> **Pre-conditions, all required:** rehearsal passed in a non-production
> environment · the named approver has approved *this* deployment now · a
> rollback plan exists and its first step has been checked · a maintenance
> window or an honest statement that none is needed · anyone whose work depends
> on this has been told.
> **Prepare** — restate the target environment, the solution, the version, and
> what will change for users when this lands.
> **Run it** — only after an explicit "yes, go" for production, in this
> conversation.
> **Check** — the same verification as Checkpoint 3, plus the flows enabled
> per the process document and one real end-to-end exercise.
> **✅ Pass when** — the solution is live at the expected version and a real
> transaction has worked.
> **📋 Send me** — the import result, the enabled-flow list, and the outcome of
> the live exercise.
> **If it fails** — stop. Do not attempt fixes directly in production. Work the
> rollback plan, then diagnose in dev.

---

## Step 6: Record what happened

Write a short deployment record beside the process document: what version went
where, when, who approved, what needed post-import configuration, and anything
that surprised you. Render it per `${PLUGIN_ROOT}/shared/artifact-style.md`.

Then offer, once: anything that surprised you belongs in
`${PLUGIN_ROOT}/shared/gotchas.md` so the next promotion is duller.

---

## Calibration

**"Deploy to production"** → Preflight, then rehearse in test first. Offer the production hop only when the rehearsal is green, and require explicit approval at the 🔴 checkpoint.

**"Just push it, I'll test in prod"** → Say plainly what that risks and offer the rehearsal path. If they insist and it's their environment, make the 🔴 checkpoint explicit and record that the rehearsal was skipped.

**"The import failed"** → Read the actual error; work the symptom→cause table in the gotchas file. Fix in dev, never downstream.

**"Why did my flow come across turned off?"** → By design. Solution flows arrive disabled; enabling is a deliberate post-import step (Step 4) precisely because a recurrence flow starts the moment it's on.

**"Can you roll this back?"** → Answer honestly: uninstalling a managed solution rarely restores data or dependencies. Rollback is usually forward-fix. Say so *before* the import, not after.

## Reference files

- `${PLUGIN_ROOT}/shared/preflight.md` — onboarding and connection card.
- `${PLUGIN_ROOT}/shared/gotchas.md` — import failures, symptom → cause → fix. **Read before promoting.**
- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — pac commands, Dataverse solution skills, native pipelines.
- `${PLUGIN_ROOT}/shared/artifact-style.md` — the rendered deployment record.
