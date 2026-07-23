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

### flow-builder (0.1.0)

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

## Roadmap

- **0.2** — conventions plugin: solution naming, environment strategy, and
  ALM conventions as skills.

## Licence

[MIT](LICENSE)
