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

## Start here — two steps

1. **Bootstrap** (one command, below) — installs the `workstation` plugin into
   GitHub Copilot CLI and/or Claude Code.
2. **Say "set up my workstation"** — the `setup-workstation` skill asks what
   you'll build, then installs everything else: SDKs, CLIs, Microsoft's
   plugins, the workloads you pick. One plan, one approval, verified at the
   end. Proven on clean Windows, macOS and Linux machines.

Later, if anything breaks: **"check my setup"**.

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
`workstation` plugin. Then start your agent and say:

> set up my workstation

The `setup-workstation` skill takes it from there — asks what you'll build,
installs the SDKs, CLIs, Microsoft's plugins and the workloads you choose,
signs you in, and proves each tool works.

Manual bootstrap, inside a Claude Code or Copilot CLI session:

```
/plugin marketplace add Powercademy/powercademy-skills
/plugin install workstation@powercademy-skills
```

## What's included

### workstation (0.7.0) — start here

The answer to "why is setting this up such a pain?" — the first thing you run,
and the place you come back to when something breaks:

- **`setup-workstation`** — takes a machine from nothing to fully equipped for
  end-to-end Power Platform work. Asks which workloads you'll build (flows,
  canvas, model-driven, Pages, code apps, Copilot Studio — standard or GitHub
  Copilot harness agents — PCF, mobile, process mining, ALM), inventories
  what's there, shows **one plan** for one approval, then installs — user-scoped first, with anything needing admin rights written
  up as a paste-ready IT request. Signs you in, verifies every tool actually
  runs, and hands over a **workstation health report**: a score out of 100 with
  a one-line summary, the top fixes, everything installed, and the workloads
  not set up yet with what each unlocks and links to its docs. Asks which
  project-management tool the team uses and, for Azure DevOps, offers its MCP
  server. Re-run it to add a workload.
- **`check-setup`** — diagnose and repair an existing toolchain: outdated or
  shimmed CLIs, **auth profiles** (who am I signed in as, where — the pain
  centre), the wrong tenant, plugins that won't load or drift between
  runtimes, MCP wiring. Say "check my setup" or "my auth is a mess".

Both read one versioned
[toolchain manifest](plugins/workstation/shared/toolchain-manifest.json), and a
weekly [upstream watch](.github/workflows/upstream-watch.yml) opens an issue
whenever Microsoft's plugins change what they need, a package in the manifest
is renamed or pulled, or a community skill lands in our lanes — so the setup
doesn't quietly rot. A [fresh-machine](.github/workflows/fresh-machine.yml)
workflow proves it: clean Windows, macOS and Linux VMs run the bootstrap and
the whole manifest, installing into both Claude Code and Copilot CLI.

### conventions (0.7.0) — the rules

Applied before and while you build, whichever tool does the building. Each
rule carries its reasoning:

- **`dataverse-conventions`** — living Dataverse schema and ALM conventions,
  each with its reasoning: `statecode`/`statuscode` over custom status
  columns, build-in-the-right-solution-with-the-right-publisher discipline,
  subcomponent and dependency packaging that survives import. Grows every
  time a mistake is corrected.
- **`model-driven-ux`** — the details that make an app feel finished: every
  command button has an icon that says what it does (paired icons for paired
  actions, no icon reused for different actions on one bar), and focused-task
  dialogs are modal. Audits a whole app's command bars in one query.
- **`flow-conventions`** — the Power Automate lessons that cost hours once:
  editing flows that already run (renames, child-flow contracts, regression
  checks), designer quirks, expressions, Graph permissions, testing without
  the real system (write gates, dry-run guards). Applied alongside whichever
  tool builds the flow — usually Microsoft's power-automate plugin.
- **`pcf-conventions`** — whether PCF is even the right tool (often it isn't),
  which control type, and the PCF traps: the version bump or the cached
  bundle keeps rendering, dev push isn't deployment, the harness isn't the
  real host, and the premium-licensing trap. Applied alongside Microsoft's
  pcf plugin.
- **`tool-selection`** — the right tool for the job: Microsoft's purpose-built
  tools first, then the SDK, Web API or pac CLI, and browser automation
  (Playwright) only for what has no API or where the UI itself is being
  checked. Stops agents clicking through the maker portal for work one SDK
  call does — and stops them saying "can't be done" when the browser can.

### design (0.1.0) — the consultants

The decisions that are expensive to change later, made before anything is
built. Each one interviews, decides, writes the design down, then hands the
build to Microsoft's tooling:

- **`agent-design`** — the calls to make before a Copilot Studio agent is
  authored: agent or workflow, which harness (standard, Microsoft Copilot,
  Customer Conversation, Agent Builder, Foundry), knowledge vs tools vs
  workflows, what each conversation costs in credits and who pays, and whether
  the environment's data policies allow it. Then hands the build to
  Microsoft's Copilot Studio tooling.
- **`plan-canvas-app`** — is canvas even the right shape (or is this a
  model-driven app?), then the decision that ages worst: **delegation and data
  strategy**, verified per connector against Microsoft Learn rather than from
  memory. Plus screen and navigation architecture, and conventions set before
  generation. Produces a build plan, then hands execution to Microsoft's canvas
  authoring tooling — it generates far faster than you can by hand; it just
  can't tell you the app will silently return the wrong rows at 50,000 records.
- Checkpoints run at **production volumes**, because a 50-row test proves
  nothing about delegation.

### alm (0.2.0) — design the process, ship safely

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

### skill-authoring (0.1.0) — for skill writers

Not needed to use the marketplace. Install it when you're writing skills —
for this repo or your own team's:

- **`writing-skills`** — the house standard for authoring marketplace skills:
  dual-runtime constraints, trigger-description craft, redaction rules, and
  the review checklist. The contribution workflow, as a skill — and a solid base for a team building
  its own Power Platform skills.


## Roadmap

All tracked in [issues](https://github.com/Powercademy/powercademy-skills/issues) with the `roadmap` label. Headlines:

- **audit-solution** — inherited-solution auditor (grounding as a product)
- **advise-licensing** — doc-verified licensing verdicts, never from memory
- **map-tenant** — first-day cartography of an unfamiliar customer tenant
- **session-debrief** — end-of-session retrospective that drafts gotcha
  contributions
- **The delivery method as a skill** — Capture → Consolidate → Constrain →
  Construct → Confirm, applied across every build. (A cross-repo "router" is
  no longer on our roadmap: Power CAT's skills router now does that job.)

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
