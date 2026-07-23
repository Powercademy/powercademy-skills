# Changelog

All notable changes to this marketplace are documented here.
Versioning follows [semver](https://semver.org/).

## [0.1.1] — 2026-07-23

### Added

- `PREREQUISITES.md` — living, human-facing prerequisites document with a
  who-handles-what split; updated over time like the gotchas log.
- `flow-builder` 0.1.1: `shared/preflight.md` — prerequisite checks the skill
  runs itself, wired in as Step 0 of `build-flow-spec`. The skill fixes what a
  terminal can fix and batches human-only steps into a single message.

## [0.1.0] — 2026-07-23

### Added

- Initial marketplace with one plugin: **flow-builder**.
- `flow-builder` plugin:
  - `build-flow-spec` skill — designer-ready Power Automate build specs with
    per-action detail, verified API touchpoints, testing checkpoints with risk
    tiers, and living-spec discipline.
  - `shared/gotchas.md` — accumulated failure log read before every spec.
  - `shared/microsoft-refs.md` — the single home for references to Microsoft
    plugin mechanics (Learn MCP server, FlowAgent, marketplace commands).
- `scripts/install.js` — one-command bootstrapper: detects Claude Code and
  GitHub Copilot CLI, installs `pac` if missing, registers both marketplaces
  (microsoft/power-platform-skills and this repo), installs plugins.
- `.claude/settings.json` with pre-approved commands (pac, git, npm, node).
