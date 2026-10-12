# Powercademy Skills

An opinionated plugin marketplace for **Power Platform delivery**, for GitHub
Copilot CLI **and** Claude Code — every skill works in both.

Microsoft's official plugins
([power-platform-skills](https://github.com/microsoft/power-platform-skills),
[power-cat-skills](https://github.com/microsoft/power-cat-skills)) give your
agent *capabilities* — MCP servers, CLIs, scaffolding. This marketplace layers
*judgement* on top: a working delivery methodology, conventions, and
architecture thinking from real Power Platform engagements, encoded as skills.

Complementary, not competing. Nothing here duplicates what Microsoft ships —
setup-workstation installs both marketplaces side by side.

Microsoft ships the verbs; Powercademy ships the sentence. Their skills know
*how* to create a table or a flow; these skills carry the judgement about
*whether, in what order, and what breaks if you don't* — the delivery
methodology the capability-scoped Microsoft skills can't hold.

> **New here and using Copilot?** Jump to the
> [GitHub Copilot setup guide](docs/copilot-setup.md).

## Prerequisites

Almost none by hand — the installer and the skills do the heavy lifting
(tool installs, marketplace registration, environment checks). What remains
for you is only what can't be automated: sign-ins, licences, permissions.
[PREREQUISITES.md](PREREQUISITES.md) is the living who-handles-what list.

## Install

One command, from any terminal with Node.js:

```bash
curl -fsSL https://raw.githubusercontent.com/Powercademy/powercademy-skills/main/scripts/install.js | node
```

Windows PowerShell:

```powershell
iwr https://raw.githubusercontent.com/Powercademy/powercademy-skills/main/scripts/install.js -OutFile install.js; node install.js; del install.js
```

The installer is a **bootstrap**: it checks Node.js and git, detects Claude
Code and/or GitHub Copilot CLI, registers this marketplace and installs the
`doctor` plugin. Then start your agent and say:

> set up my workstation

The `setup-workstation` skill takes it from there — asks what you'll build,
installs the SDKs, CLIs, Microsoft's plugins and the workloads you choose,
signs you in, and proves each tool works.

Manual bootstrap, inside a Claude Code or Copilot CLI session:

```
/plugin marketplace add Powercademy/powercademy-skills
/plugin install doctor@powercademy-skills
```

## What's included

### pcf-builder (0.2.0)

Build Power Apps Component Framework (PCF) code components **end to end** —
without the afternoons PCF usually costs:

- **`build-pcf-control`** — decides first whether PCF is even the right tool
  (often it isn't), then produces a manifest-first build plan and working
  control, verified against Microsoft Learn (APIs, manifest schema, and the
  premium-licensing trap). Checkpoints sit exactly where PCF breaks: the
  version-bump-or-cached-bundle gotcha, the harness-is-not-the-real-host gap,
  and `pac pcf push` vs a proper managed-solution ALM deploy.
- **`shared/gotchas.md`** — the accumulated PCF failure log (versioning,
  manifest, lifecycle, harness-vs-host, licensing, bundling), read before every
  build.

Fills genuine white space — Microsoft's own plugins don't cover PCF.

### canvas-planner (0.2.0)

The decisions that determine whether a canvas app survives contact with real
data — made *before* anything is generated:

- **`plan-canvas-app`** — is canvas even the right shape (or is this a
  model-driven app?), then the decision that ages worst: **delegation and data
  strategy**, verified per connector against Microsoft Learn rather than from
  memory. Plus screen and navigation architecture, and conventions set before
  generation. Produces a build plan, then hands execution to Microsoft's canvas
  authoring tooling — it generates far faster than you can by hand; it just
  can't tell you the app will silently return the wrong rows at 50,000 records.
- Checkpoints run at **production volumes**, because a 50-row test proves
  nothing about delegation.

### alm (0.1.0)

How the work actually ships — and the deployment that doesn't ruin your evening:

- **`design-alm-process`** — grounds in the estate you really have (including
  the uncomfortable bits), interviews, then decides environment strategy,
  solution segmentation, publisher, **the config boundary** (what varies per
  environment and who owns it), promotion path and named approvers — written
  up as a process the team can follow.
- **`promote-solution`** — runs a promotion end to end with checkpoints:
  pre-flights dependencies, exports managed, rehearses in test, verifies with
  evidence rather than exit codes, and treats **production import as a 🔴 hard
  stop** requiring explicit in-the-moment approval. Fixes go in dev, never
  downstream.

Routes execution to Microsoft's Dataverse solution skills, native pipelines and
`pac` — and hands Power Pages promotion off entirely, because their plugin
already covers it end to end.

### conventions (0.2.0)

The judgement layer as a checklist — applied before anything gets built:

- **`dataverse-conventions`** — living Dataverse schema and ALM conventions,
  each with its reasoning: `statecode`/`statuscode` over custom status
  columns, build-in-the-right-solution-with-the-right-publisher discipline,
  subcomponent and dependency packaging that survives import, modal dialogs
  for focused tasks. Grows every time a mistake is corrected.
- **`flow-conventions`** — the Power Automate lessons that cost hours once:
  editing flows that already run (renames, child-flow contracts, regression
  checks), designer quirks, expressions, Graph permissions, testing without
  the real system (write gates, dry-run guards). Applied alongside whichever
  tool builds the flow — usually Microsoft's power-automate plugin.
- **`writing-skills`** — the house standard for authoring marketplace skills:
  dual-runtime constraints, trigger-description craft, redaction rules, and
  the review checklist. The contribution workflow, as a skill.

### doctor (0.5.0)

The answer to "why is setting this up such a pain?" — the first thing you run,
and the place you come back to when something breaks:

- **`setup-workstation`** — takes a machine from nothing to fully equipped for
  end-to-end Power Platform work. Asks which workloads you'll build (flows,
  canvas, model-driven, Pages, code apps, Copilot Studio — standard or GitHub
  Copilot harness agents — PCF, mobile, process mining, ALM), inventories what's there, shows **one plan** for one approval,
  then installs — user-scoped first, with anything needing admin rights written
  up as a paste-ready IT request. Signs you in, verifies every tool actually
  runs, and ends with a readiness card. Re-run it to add a workload.
- **`check-setup`** — diagnose and repair an existing toolchain: outdated or
  shimmed CLIs, **auth profiles** (who am I signed in as, where — the pain
  centre), the wrong tenant, plugins that won't load or drift between
  runtimes, MCP wiring. Say "check my setup" or "my auth is a mess".

Both read one versioned
[toolchain manifest](plugins/doctor/shared/toolchain-manifest.json), and a
weekly [upstream watch](.github/workflows/upstream-watch.yml) opens an issue
whenever Microsoft's plugins change what they need, a package in the manifest
is renamed or pulled, or a community skill lands in our lanes — so the setup
doesn't quietly rot. A [fresh-machine](.github/workflows/fresh-machine.yml)
workflow proves it: clean Windows, macOS and Linux VMs run the bootstrap and
the whole manifest, installing into both Claude Code and Copilot CLI.

## Roadmap

All tracked in [issues](https://github.com/Powercademy/powercademy-skills/issues) with the `roadmap` label. Headlines:

- **audit-solution** — inherited-solution auditor (grounding as a product)
- **advise-licensing** — doc-verified licensing verdicts, never from memory
- **map-tenant** — first-day cartography of an unfamiliar customer tenant
- **session-debrief** — end-of-session retrospective that drafts gotcha
  contributions
- **Next — the orchestrator.** A top-level "front door" skill that knows the
  whole Power Platform delivery surface (Dataverse, Power Automate, Power
  Pages, Code Apps, `pac`) and routes, sequences, and applies methodology
  across them. Skills can't wrap each other, but they *can* tell the agent
  which capability to reach for, in what order, with what checks — which is
  where the consolidation value actually lives. Ships alongside the first
  conventions skills (solution naming, environment strategy, ALM).

Tracked in [issues](https://github.com/Powercademy/powercademy-skills/issues).

## Security

These skills instruct an agent that may act on a live tenant. The threat model
and safeguards are in [SECURITY.md](SECURITY.md); a CI lint enforces the
portability and mechanics-quarantine constraints on every change.

## Licence & trademarks

[MIT](LICENSE).

Powercademy Skills is an independent, community project. It is **not affiliated
with, endorsed by, or sponsored by Microsoft**. "Power Platform", "Power
Automate", "Dataverse", "Power Pages", and "Copilot" are trademarks of the
Microsoft group of companies; they are used here only to describe what the
software works with (nominative use).
