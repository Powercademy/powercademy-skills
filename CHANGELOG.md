# Changelog

All notable changes to this marketplace are documented here.
Versioning follows [semver](https://semver.org/).

## [0.5.0] — 2026-07-24

### Added

- **flow-builder 0.2.0 — edit mode.** The skill was build-first; editing a flow
  that already runs is a different risk profile and now has its own discipline:
  - Trigger description now fires on edit phrasing ("edit this flow", "change
    this flow", "modify a flow", "add a step to", "fix this flow", "extend
    this flow") as strongly as on build phrasing.
  - **Step 1b**: read the real definition before proposing any change (and
    stop if you can't see it — never edit an inferred flow); establish and
    record blast radius (is it live, who calls it, what it writes, in-flight
    runs, trigger-change risk); back up with a stated rollback plan; write the
    spec as a **diff** (unchanged / changed / added-removed) using the flow's
    existing action names; and shift checkpoint discipline to **regression** —
    prove the untouched paths still work, and prove rollback before you need it.
  - Four edit-specific gotchas: renames break `runAfter` and expression
    references; child-flow response-shape changes break callers silently; a
    flow is production until proven otherwise; the regression checkpoint is the
    one people skip.

## [0.4.0] — 2026-07-24

Managed-device release — everything here came from setting up on a real
locked-down corporate Cloud PC (doctor 0.2.0, flow-builder 0.1.8,
pcf-builder 0.1.4).

### Added

- **Auth ladder** across all three plugins: device code first (observable),
  **falling back to interactive when Conditional Access blocks it**, then to a
  policy-exemption request with the error code / correlation ID / timestamp IT
  needs. Enterprises commonly block device-code flow by policy and it cannot
  satisfy device-compliance rules — confirmed live: device code refused,
  interactive succeeded immediately.
- **Functional-not-present tool checks**: a `pac.cmd` shim can sit on PATH
  without the CLI package (managed Intune/MSI deployments), so `pac` resolves
  but every real command fails. Skills now verify pac *works* and offer
  `pac install latest` — user-scoped, **no admin required**, self-service even
  on a locked-down device.
- doctor: explicit managed-device guidance — distinguish what the user can
  self-serve (user-scoped installs) from what genuinely needs IT, and never
  let a UAC exit code 1602 read as user error.
- Two gotchas recording both failures.

## [0.3.1] — 2026-07-23

Transcript-analysis release — fixes from the line-by-line review of the first
real build session (flow-builder 0.1.7, pcf-builder 0.1.3, doctor 0.1.1).

### Added

- **Tenant-switch runbook** in flow-builder and doctor mechanics files: all
  three auth surfaces (Azure CLI token, pac profile, MCP tool-server process
  cache) in order, full host-app restart requirement (`/restart` is not
  enough), and evidence-based verification.
- Four gotchas from live failures: portal sign-in ≠ CLI auth; three auth
  surfaces must agree; MCP servers cache tokens at startup; a tenant switch
  isn't done until the environment list proves it.

### Changed

- Preflights: after any auth change, verify with evidence (re-list and compare
  against the *target* tenant) — never declare success from an exit code; warn
  about the full-restart requirement at the *start* of a tenant switch.
- build-flow-spec: specs are written into the user's working directory with
  the path stated — never into agent session-state folders (a live spec was
  buried in `.copilot\session-state\…`).

## [0.3.0] — 2026-07-23

First-session field feedback release — every change traces to a real friction
point from live use.

### Added

- **New plugin: `doctor` (0.1.0)** — skill `check-setup`: one conversational
  check-up for the whole Power Platform toolchain (core tools, auth profiles,
  agent runtimes, plugins across runtimes, MCP wiring). Diagnose-first,
  fix-with-consent, ends with a readiness card. Born from the finding that
  setup pain and tool sprawl are the biggest adoption blocker.
- **Learn MCP auto-wiring (experimental):** `flow-builder` and `pcf-builder`
  now ship a `.mcp.json` declaring the Microsoft Learn MCP server (remote,
  no-auth) so verification tooling provisions on install where the runtime
  supports plugin MCP configs. Skills keep the web-fetch fallback — nothing
  depends on the server being present.

### Changed

- **Connection card** (`flow-builder` 0.1.6, `pcf-builder` 0.1.2): preflights
  now lead by surfacing who you're connected as — user, tenant, environment,
  profile — unprompted, with profile hygiene (`pac auth name`/`select`/
  `delete`) offered when multiple cached profiles exist.
- **Device-code sign-in**: preflights prefer `pac auth create --deviceCode` in
  agent sessions (fully observable), and are forbidden from claiming
  unobservable side effects ("a browser has opened").
- Gotchas: two new entries — never claim unobserved side effects; users don't
  know who they're connected as until it bites.

## [0.2.1] — 2026-07-23

### Fixed

- **Skills now load their `shared/` reference files in every runtime.** Both
  SKILL.md files referenced `shared/x.md` with a bare path, which the agent
  resolved relative to the skill folder (`skills/<name>/shared/…`) — where the
  files don't exist — so `gotchas.md`, `preflight.md`, and `microsoft-refs.md`
  failed to load ("Path does not exist"). Now referenced as
  `${PLUGIN_ROOT}/shared/x.md`, the convention Microsoft's own dual-runtime
  skills use. Affects `flow-builder` (0.1.5) and `pcf-builder` (0.1.1). Caught
  live on the first Copilot desktop-app run.
- Lint now rejects any bare `shared/x.md` reference; a gotchas entry records the
  path-resolution rule.

## [0.2.0] — 2026-07-23

### Added

- **New plugin: `pcf-builder` (0.1.0)** — Power Apps Component Framework code
  components end to end. Skill `build-pcf-control`: PCF-vs-alternatives
  decision gate, manifest-first build plan, Microsoft Learn verification
  (including the premium-licensing trap), and checkpoints at the points PCF
  actually breaks (version bump, harness-vs-real-host, `pac pcf push` vs
  managed-solution ALM). Ships `shared/gotchas.md` (seeded with real PCF
  pain), `shared/microsoft-refs.md` (Learn MCP + pac MCP + pac pcf lifecycle),
  and `shared/preflight.md` (conversational toolchain/environment onboarding).
  Fills genuine white space — Microsoft's marketplaces don't cover PCF.
- Marketplace now lists two plugins; the repo is a methodology marketplace, not
  a single skill.

## [0.1.4] — 2026-07-23

### Changed

- **Preflight is now conversational onboarding, not a silent check.** The skill
  drives connection in natural language — the user says "connect me to Contoso"
  and the agent runs the auth; they never type a `pac` command. Gaps (missing
  tool, no auth, missing plugin) are surfaced plainly with an offered fix rather
  than failing silently. On a customer machine the agent offers before
  installing. Preferred mechanism is the pac CLI's built-in MCP server where
  available (natural-language tool calls), falling back to `pac` commands.
- SKILL.md Step 0 rewritten to match the natural-language, do-the-work posture.

## [0.1.3] — 2026-07-23

### Fixed

- **`build-flow-spec` now loads in GitHub Copilot CLI.** Its description was
  1054 chars; Copilot CLI enforces a 1024-char limit (Claude Code does not, so
  it only failed in one runtime). Rewritten to 993 chars, triggers preserved.

### Added

- Lint now enforces the 1024-char description limit, and a gotchas entry
  records the dual-runtime asymmetry. Caught in the wild during first Copilot
  CLI install on a customer VM.

## [0.1.2] — 2026-07-23

### Added

- **CI lint** (`scripts/lint/lint-skills.js` + `.github/workflows/lint.yml`):
  enforces name+description-only frontmatter, the 500-line skill cap, the
  Microsoft-mechanics quarantine (mechanics tokens only in
  `shared/microsoft-refs.md`), and manifest validity on every push/PR.
- **SECURITY.md** — threat model and safeguards for a public skill marketplace
  that acts on live tenants.
- **docs/copilot-setup.md** — step-by-step GitHub Copilot CLI setup and usage
  guide, version-stamped.
- `flow-builder` 0.1.2: `shared/microsoft-refs.md` now documents the pac CLI's
  built-in MCP server (Microsoft-sanctioned Claude Code bridge) with the
  vendor's own "local development and testing" framing quoted.

### Changed

- Installer pins a minimum GitHub Copilot CLI version (1.0.71) and warns below
  it, since plugin/marketplace subcommands only stabilised there.
- README: trademark/non-affiliation disclaimer, security section, setup-guide
  link, and a roadmap that names the 0.2 orchestrator direction.

### Fixed

- Removed a `FlowAgent` mechanics token that had leaked into the SKILL.md
  pointer text — caught by the new lint.

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
