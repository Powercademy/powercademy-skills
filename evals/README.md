# Evals — trigger harness

Answers the question no documentation can: **does each skill actually fire on
a natural phrasing, in each runtime, right now?** Descriptions are the routing
layer; an edit that silently stops a skill triggering is invisible without
this.

## Run it

```bash
node evals/run-evals.js                      # all scenarios, all available runtimes
node evals/run-evals.js --runtime copilot    # one runtime (copilot | claude)
node evals/run-evals.js --skill build-flow-spec
node evals/run-evals.js --alternates         # also test secondary trigger paths
```

Each scenario launches a real headless session, watches the event stream for a
skill invocation, and **kills the session the moment a verdict is decidable**
(~10s per scenario). Verdicts: `PASS` · `COMPETITOR` (a different skill fired
— named) · `NONE` · `TIMEOUT` · `ERROR` (environment problem, not a trigger
failure). Results land in `evals/last-run.json`.

## Rules of engagement (learned the hard way)

- **You are testing the INSTALLED plugins**, not the repo checkout. Push and
  update installs before re-running, or you'll re-test the old copy.
- **Claude runtime needs a normal terminal** — inside another agent session it
  fails auth (reports ERROR, not a trigger failure).
- **Not wired into CI, deliberately** — each run drives real agent sessions
  (tokens + minutes) and needs authenticated CLIs. This is a pre-release gate
  run by a human: before tagging a release, and after any description edit.
- **Scenarios must be honest.** A skill that doesn't fire on a prompt it
  *shouldn't* own is not a failure — calibrate the scenario to the skill's
  real audience before tuning the description. (Found live: a generic "review
  this text" prompt never triggers a meta-skill, because the model believes it
  can answer natively. Meta-skills need descriptions that assert the skill
  *contains information the model lacks* — enforced standards, lint rules —
  and scenarios that name the real context.)

## What this doesn't test

Behaviour depth (does the spec contain checkpoints, does preflight run the
auth ladder). That's the next tier — scenario criteria + deterministic
post-checks on produced files — worth adding when the skill count or
contributor count grows. Trigger correctness is the highest-value check per
token spent, so it comes first.
