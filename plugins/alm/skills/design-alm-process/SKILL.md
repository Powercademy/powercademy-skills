---
name: design-alm-process
description: >
  Design the delivery process for a Power Platform solution - environment strategy, solution segmentation, publisher and naming, promotion path, environment-variable and connection-reference handling, and who approves what - producing a written ALM process the team can actually follow. Trigger whenever the user says "set up ALM", "ALM process", "environment strategy", "how many environments do I need", "dev test prod", "solution strategy", "how do I move this to production", "deployment process", "release process", "promotion path", "who approves deployments", "we're deploying by hand", "governance", or is planning how work will travel between environments. Also trigger when a build starts without a named target solution, or when someone is about to build directly in production. Designs the process; execution is handed to promote-solution and Microsoft's tooling. If the task is deciding how a solution gets built, packaged and promoted, trigger. When in doubt, trigger.
---

# ALM Process Design — decide how it ships, before it ships

Most Power Platform ALM problems are not tooling problems. They are decisions
nobody made: which environments exist and why, what belongs in which solution,
who owns the publisher, what happens to connection references and environment
variables on the way up, and who is allowed to press the button.

**This skill makes those decisions explicit and writes them down.** Execution is
somebody else's job — Microsoft's tooling is good at it (see
`${PLUGIN_ROOT}/shared/microsoft-refs.md`), and `promote-solution` in this
plugin drives a promotion with checkpoints once the process exists.

You are designing *with* an experienced practitioner. Peer-to-peer, no basics,
and be willing to say the process they have is the reason deployments hurt.

---

## The core loop

0. **Onboard** — connect and see the real estate (`${PLUGIN_ROOT}/shared/preflight.md`).
1. **Interview** — team, cadence, risk appetite, what exists today.
2. **Decide the environment strategy.**
3. **Decide solution segmentation, publisher and naming.**
4. **Decide what varies per environment** — the config boundary.
5. **Decide the promotion path and who approves.**
6. **Write the process document**, then hand execution to the tooling.
7. **Feed lessons back** into `${PLUGIN_ROOT}/shared/gotchas.md`.

Read `${PLUGIN_ROOT}/shared/gotchas.md` before designing — most of it is
deployment pain somebody already paid for.

---

## Step 0: Preflight and ground truth

Run `${PLUGIN_ROOT}/shared/preflight.md`. Then **look at what actually exists**
before designing anything: list environments (which are production, which are
sandboxes, who owns them), list solutions in the dev environment, and check
whether anything is being built in the default environment.

**Absence is a finding.** No dev environment, everything in Default, unmanaged
solutions sitting in production, no publisher convention — say so plainly and
prove it. That inventory *is* the current ALM process, and naming it honestly
is usually the most valuable thing you do.

---

## Step 1: Interview before designing

Ask, don't assume. Six questions, and the answers determine everything:

| Question | Why it changes the design |
|---|---|
| Who builds — pro devs, citizen makers, or both? | Decides how much ceremony the process can carry before people route around it |
| How often do you release? | Weekly cadence justifies pipelines; twice a year does not |
| What's the blast radius if production breaks? | Sets approval gates and rollback requirements |
| Is anyone building in production today? | The most common and most urgent finding |
| Do you have source control, and is it used for solutions? | Decides whether the process is Git-backed or environment-to-environment |
| Who is allowed to approve a production deployment? | An unnamed approver means everyone and no one |

If the honest answer is "we're two people shipping a small app", say so and
design something proportionate. **A heavyweight process nobody follows is worse
than a light one everybody does.**

---

## Step 2: Environment strategy

The minimum defensible shape is **dev → test → production**, with dev holding
the unmanaged solution and everything downstream managed. Justify any
departure:

- **Fewer** (dev → production) is acceptable for genuinely low-risk internal
  tooling. Say what you're trading away: no rehearsal of the import itself.
- **More** (dev per developer, integration, UAT, pre-prod) is justified by team
  size or regulatory rehearsal needs — not by enthusiasm.
- **Never the Default environment** for anything that matters. It has no
  meaningful lifecycle, everyone has access, and it cannot be governed.

Record for each environment: purpose, type (production vs sandbox), who has
maker access, what data it holds (real or masked), and its refresh policy.

**Data policies are part of the environment design, not an afterthought.**
Read which data policies and advanced connector policies apply to each
environment — tenant-wide, environment-group or per environment — before
designing what gets built where. Agents, agent flows, approval steps and newer
connectors are exactly what a restrictive policy blocks, and the Default
environment's group is usually the most locked down. Microsoft's own pattern
is strict policies in personal dev environments and relaxed ones in a
*dedicated* dev environment where the project's connectors are explicitly
allowed. Record, per environment, which connectors, channels and knowledge
sources the solution needs and whether the policy allows them; anything that
needs an admin change becomes an open question with a named owner. Details in
`${PLUGIN_ROOT}/shared/gotchas.md` under "Data policies".

---

## Step 3: Solution segmentation, publisher, naming

- **One publisher per customer/tenant**, reused everywhere. The prefix is
  permanent — get it right before the first component exists. Never the default
  publisher.
- **Segment by lifecycle, not by tidiness.** Components that ship together
  belong in one solution. A shared "core" solution plus feature solutions works
  when the core genuinely changes less often; it becomes a dependency trap when
  everything depends on everything.
- **Name for the pipeline, not the project du jour.** The solution name will
  outlive the project code name.
- Record the dependency direction between solutions explicitly. Circular
  dependencies between solutions cannot be imported and are painful to unpick.

---

## Step 4: The config boundary — what varies per environment

This is where deployments actually fail. Decide, per item, what changes on the
way up:

- **Environment variables** for anything environment-specific: URLs, IDs, keys
  (via Key Vault references), feature flags, allow-lists. Every variable needs
  a **Default Value** that is safe if nobody overrides it — fail-closed, not
  empty.
- **Connection references** so flows don't carry a maker's personal connection
  into production. Name who owns the production connections; a departed owner's
  connection is a future outage.
- **Data** — configuration/reference data that must travel needs a deliberate
  mechanism, not hand-entry in each environment.
- **Anything that must NOT travel** — test scaffolding, dev-only flags. Say how
  it's kept out.

Write this as a table in the process document: item → dev value → test value →
production value → who sets it.

---

## Step 5: Promotion path and approvals

State the path in one line (e.g. *"dev → export managed → test → approval →
production"*), then for each hop: what is exported, how it moves, who
approves, and how it's verified afterwards. Name **people or roles**, not
"the team".

Two rules worth stating explicitly in every process document:

- **Production imports are irreversible in practice.** A managed solution can
  be uninstalled, but data and dependencies rarely survive the round trip.
  Treat production import as a 🔴 action requiring an explicit approval and a
  rehearsed rollback.
- **Nothing is built downstream.** Any change made directly in test or
  production is destroyed by the next deployment — or silently blocks it.

For the mechanism (native pipelines vs export/import vs Git-backed
build pipelines), see `${PLUGIN_ROOT}/shared/microsoft-refs.md` and prefer
Microsoft's own tooling over anything bespoke.

---

## Step 6: Write the process document

Output a markdown file **into the user's working directory**, path stated, and
render the build-along HTML companion per
`${PLUGIN_ROOT}/shared/artifact-style.md`. Structure:

```markdown
# <Customer/Solution> — ALM Process

## Current state            (what exists today, including the uncomfortable bits)
## Environment map          (purpose, type, access, data, refresh)
## Solutions & publisher    (segmentation, prefix, dependency direction)
## Config boundary          (table: item → per-environment values → owner)
## Promotion path           (per hop: what moves, how, who approves, how verified)
## Approvals & ownership    (named people or roles)
## Rollback                 (what we do when an import goes wrong)
## Open questions           (things to confirm, not guess)
## First run                (the checkpointed rehearsal — see promote-solution)
## Change log
```

Then say plainly what to do first. The process is not real until one promotion
has been rehearsed end to end with `promote-solution`.

---

## Step 7: Keep it alive

When reality contradicts the process — an import fails, an approver leaves, a
solution splits — update the document, state whether anything already deployed
needs rework, and add a change-log entry. Offer new lessons once, at a natural
pause, for `${PLUGIN_ROOT}/shared/gotchas.md`.

---

## Calibration

**"Set up ALM for us"** → Ground first (Step 0), interview (Step 1), then design. Never hand over a generic three-environment diagram.

**"How many environments do I need?"** → Ask the six questions first. The answer is a consequence, not a preference.

**"We build in production"** → Say plainly why that ends badly, then design the smallest credible path out — usually: create dev, extract into a solution, rehearse one promotion.

**"Just deploy it"** → That's `promote-solution`. If no process exists, say so and offer to design a minimal one first — thirty minutes now against a bad afternoon later.

**"Which pipeline tooling?"** → Prefer Microsoft's native tooling; see the mechanics file. Our job is the decisions around it, not a bespoke pipeline.

## Reference files

- `${PLUGIN_ROOT}/shared/preflight.md` — onboarding the skill runs itself.
- `${PLUGIN_ROOT}/shared/gotchas.md` — accumulated deployment failures. **Read before designing.**
- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — the only place this plugin names Microsoft tooling: pac commands, Dataverse solution skills, native pipelines, Learn verification.
- `${PLUGIN_ROOT}/shared/artifact-style.md` — the rendered build-along page.
