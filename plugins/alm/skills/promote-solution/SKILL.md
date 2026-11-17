---
name: promote-solution
description: >
  Run a Power Platform solution promotion end to end - check the source and target, export the right solution as managed, move it, import, then verify with evidence - stopping before anything irreversible. Trigger whenever the user says "deploy this solution", "promote to test", "deploy to production", "ship this", "release this", "move this to UAT", "export the solution", "import the solution", "run the deployment", "publish my changes to another environment", or names two environments and a solution. Also trigger mid-deployment on "the import failed", "missing dependency", "why did my flow come across disabled", "the connection reference is wrong", or any solution import error. Drives Microsoft's deployment tooling; never crosses a production import without explicit approval. If the task is moving a solution between environments, trigger. When in doubt, trigger.
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
- **Promote with the CLI or native pipelines, not by clicking**, so the
  promotion can be repeated and audited.

---

## Step 0: Check both ends

Establish the promotion's shape and show it to the user before anything
moves:

> **Promoting:** `<SolutionName>` v`<version>`
> **From:** <source env> (unmanaged, dev) → **To:** <target env> (**PRODUCTION**)
> **Managed:** yes · **Approval required:** yes · **Rollback:** <named plan>

Check, and report as findings rather than assumptions:

- The source solution exists, is **unmanaged**, and is the one they mean.
- The target is what they think it is — confirm production status explicitly.
- Whether an **ALM process document** exists. If not, offer `design-alm-process`
  first; proceed only if they want a one-off, and say what that costs.
- Whether this promotion has ever been rehearsed.
- **Whether the target's data policies allow what the solution uses.** A
  solution that worked in a relaxed dev environment can import cleanly into a
  stricter target and then fail at run time — an agent that can't publish, a
  flow whose connector is blocked. Compare the connectors, channels and
  knowledge sources the solution uses with the target's policies before
  exporting, and report any gap as a finding with the admin who can close it.
- **Which environment the tooling is actually connected to.** Confirm the
  active connection points at the source you mean — an MCP session or CLI
  profile left on another environment builds or exports from the wrong place
  without complaint.

If a tool or sign-in isn't working, that's check-setup's job (workstation plugin) —
hand over to it rather than debugging the toolchain here.

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

**Check:** no unresolved dependencies, every environment variable has a
default, every custom connector is in a solution. If anything fails, fix it in
**dev**, never downstream, and re-run the checks.

---

## Step 2: Export

Export **managed** for anything downstream of dev (unmanaged downstream is a
one-way trip into an unmaintainable environment). Keep the exported artefact
somewhere durable and named with its version — the user's working directory,
path stated, not a temp folder.

**Check:** the file exists, its size is sane and its version matches the one
you set. State the path and version back to the user.

---

## Step 3: Import to a non-production target first

If a test/UAT environment exists, recommend rehearsing there first and say
why: the rehearsal is what turns the production import from a gamble into a
repeat. If the user chooses to skip it, say what that risks and note it in the
deployment record.

Name the target out loud and note the solution version already there, then
import. **Check:** the import completed *and* flows are present (note which
are **off** — solution flows arrive disabled by design), connection references
are bound, environment variables hold the right values for *this*
environment, and no dependencies are missing. If it fails, work the
symptom → cause table in `${PLUGIN_ROOT}/shared/gotchas.md`; fix in dev,
re-export, re-run. Do not patch the target.

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

**Check:** one real, low-risk end-to-end exercise in this environment. It
passes when the solution does its job against this environment's data and
nothing points back at dev.

---

## Step 5: Production — the hard stop

Offer this step only once everything above is green, or the user has chosen
to skip the rehearsal. **This is the one hard
stop: import to production only after an explicit "yes, go" for production,
in this conversation** — not implied by "deploy it", not carried over from an
earlier yes.

Before asking, state the environment, solution and version, what will change
for users, and where each of these stands: the rehearsal · the named
approver's sign-off for *this* deployment · the rollback plan · a maintenance
window, or an honest statement that none is needed · whether anyone affected
has been told.

After the import, run the same checks as the rehearsal, enable flows per the
process document, and exercise one real transaction. If it fails, stop: no
fixes directly in production. Work the rollback plan, then diagnose in dev.

---

## Step 6: Record what happened

Write a short deployment record beside the process document: what version went
where, when, who approved, what needed post-import configuration, and anything
that surprised you. Render it per `${PLUGIN_ROOT}/shared/artifact-style.md`.

---

## Calibration

**"Deploy to production"** → Preflight, then rehearse in test first. Offer the production hop only when the rehearsal is green, and get explicit approval for the production import.

**"Just push it, I'll test in prod"** → Say plainly what that risks and offer the rehearsal path. If they insist and it's their environment, get explicit approval for production and record that the rehearsal was skipped.

**"The import failed"** → Read the actual error; work the symptom→cause table in the gotchas file. Fix in dev, never downstream.

**"Why did my flow come across turned off?"** → By design. Solution flows arrive disabled; enabling is a deliberate post-import step (Step 4) precisely because a recurrence flow starts the moment it's on.

**"Can you roll this back?"** → Answer honestly: uninstalling a managed solution rarely restores data or dependencies. Rollback is usually forward-fix. Say so *before* the import, not after.

## Reference files

- `${PLUGIN_ROOT}/shared/gotchas.md` — import failures, symptom → cause → fix.
- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — pac commands, Dataverse solution skills, native pipelines.
- `${PLUGIN_ROOT}/shared/artifact-style.md` — the rendered deployment record.
