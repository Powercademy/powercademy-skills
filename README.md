# Powercademy Skills

An opinionated plugin marketplace for **Power Platform delivery**, for Claude
Code and GitHub Copilot CLI.

Microsoft's official plugins
([power-platform-skills](https://github.com/microsoft/power-platform-skills),
[power-cat-skills](https://github.com/microsoft/power-cat-skills)) give your
agent *capabilities* — MCP servers, CLIs, scaffolding. This marketplace layers
*judgement* on top: a working delivery methodology, conventions, and
architecture thinking from real Power Platform engagements, encoded as skills.

Complementary, not competing. Nothing here duplicates what Microsoft ships —
the installer sets up both marketplaces side by side.

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
curl -fsSL https://raw.githubusercontent.com/HowdangPowercademy/powercademy-skills/main/scripts/install.js | node
```

Windows PowerShell:

```powershell
iwr https://raw.githubusercontent.com/HowdangPowercademy/powercademy-skills/main/scripts/install.js -OutFile install.js; node install.js; del install.js
```

The installer detects Claude Code and/or GitHub Copilot CLI, installs the
`pac` CLI if missing, registers **both** marketplaces (Microsoft's and this
one), and installs the plugins.

Manual install, inside a Claude Code or Copilot CLI session:

```
/plugin marketplace add HowdangPowercademy/powercademy-skills
/plugin install flow-builder@powercademy-skills
```

## What's included

### flow-builder (0.1.2)

Build Power Automate cloud flows from a **designer-ready build spec**, not
from vibes:

- **`build-flow-spec`** — the methodology skill. Grounds in the existing
  solution before designing, verifies every API touchpoint against Microsoft
  Learn (never from memory), and produces an action-by-action spec with
  copy-pasteable expressions, nesting trees, and testing checkpoints marked
  with risk tiers (🟢/🟡/🔴). The spec is a living document: when reality
  contradicts it, it gets updated and rework is called out explicitly.
- **`shared/gotchas.md`** — an accumulated failure log (designer quirks,
  expression traps, Graph permission edges, child-flow contracts), read before
  every spec so lessons that cost hours once never cost hours again.

Works in both runtimes with no plugin-specific tooling required. When
Microsoft's `power-automate` plugin (FlowAgent) is installed alongside, the
spec drives it; when it isn't, the spec is built by hand in the designer.

### pcf-builder (0.1.0)

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

### doctor (0.1.0)

The answer to "why is setting this up such a pain?":

- **`check-setup`** — one conversational check-up for the whole toolchain:
  CLIs (git, Node, .NET, pac, az), **auth profiles** (who am I signed in as,
  where, with which cached profile — the pain centre), agent runtimes, plugins
  across runtimes, and MCP wiring. Diagnoses everything first, fixes with your
  consent, and ends with a **readiness card**: ready for X, not yet for Y,
  fixed this session. Say "am I set up?", "new laptop", or "my auth is a mess".

## Roadmap

All tracked in [issues](https://github.com/HowdangPowercademy/powercademy-skills/issues) with the `roadmap` label. Headlines:

- **audit-solution** — inherited-solution auditor (grounding as a product)
- **advise-licensing** — doc-verified licensing verdicts, never from memory
- **map-tenant** — first-day cartography of an unfamiliar customer tenant
- **alm plugin** — ALM process design and checkpointed promotion discipline
- **Interactive HTML artifacts** — specs, readiness cards, and reports as
  styled, self-contained build-along pages
- **Watch-mode building** — spec-driven execution with checkpoint gates when
  Microsoft's tooling is present
- **session-debrief** — end-of-session retrospective that drafts gotcha
  contributions
- **Next — the orchestrator.** A top-level "front door" skill that knows the
  whole Power Platform delivery surface (Dataverse, Power Automate, Power
  Pages, Code Apps, `pac`) and routes, sequences, and applies methodology
  across them. Skills can't wrap each other, but they *can* tell the agent
  which capability to reach for, in what order, with what checks — which is
  where the consolidation value actually lives. Ships alongside the first
  conventions skills (solution naming, environment strategy, ALM).
- **0.3 — installer config interview + eval harness.** A guided setup, and
  automated checks that each skill triggers and behaves in both runtimes.

Tracked in [issues](https://github.com/HowdangPowercademy/powercademy-skills/issues).

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
