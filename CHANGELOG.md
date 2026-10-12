# Changelog

All notable changes to this marketplace are documented here.
Versioning follows [semver](https://semver.org/).

## [0.10.1] — 2026-10-12

### Added

- **Upstream watch, wider net:**
  - `microsoft/copilot-studio-plugin` (`mcs-assistant`, the plugin for
    GitHub Copilot harness agents) joins the watched repos alongside
    skills-for-copilot-studio (standard agents).
  - `microsoft/cat-agent-skills` watched as a **gallery**: new submissions
    that touch our lanes are actionable, the rest informational.
  - **Package existence check** — every winget, Homebrew, npm, NuGet, PyPI and
    VS Code Marketplace ID plus every URL in the toolchain manifest, parsed
    from the install commands themselves, checked weekly (33 at baseline, all
    resolving). Latest versions are recorded and reported as informational.
  - **Version floor check** — if an upstream plugin we install states a
    higher Node/.NET/Python/JDK/pac floor than the manifest's `check.min`,
    it's flagged. New `pac x.y.z or higher` prerequisite signal.

### Fixed

The first run of the wider watch caught three real drifts:

- **Azure CLI on macOS** moved from a Homebrew formula to a cask —
  `brew install azure-cli` now fails; manifest uses `--cask`.
- **Node.js floor 22 → 24** — Microsoft's mobile-apps plugin now requires
  Node 24 LTS. The Windows LTS install already delivers 24; macOS/Linux
  commands, the installer fallback and docs updated.
- **pac floor 2.11.1** (previously none) — the Dataverse plugin's X++ skill
  requires it. pac also gains an `update` command
  (`dotnet tool update --global …`) so outdated installs upgrade in place;
  both doctor skills now prefer an item's `update` command.
- doctor 0.4.1.

## [0.10.0] — 2026-10-12

### Added

- **`setup-workstation`** (doctor) — the first thing a new user runs. Takes a
  machine from nothing to fully equipped for end-to-end Power Platform work:
  detects OS, admin rights and managed-device signals; asks which workloads
  you'll build (flows, canvas, model-driven, Pages, code apps, Copilot Studio,
  PCF, mobile, process mining, ALM); inventories what's there; shows **one
  plan for one approval**; installs user-scoped first, with admin-only items
  collected into a paste-ready `it-request.md`; signs you in; and counts a
  tool as installed only when its check passes. Ends with a readiness card
  and a "try this first" prompt per workload. Re-run to add a workload.
  Deliberately not named `setup` — power-automate already ships one.
- **Toolchain manifest** (`plugins/doctor/shared/toolchain-manifest.json`) —
  one versioned source of truth for every tool across four tiers (bootstrap,
  required, per-workload, recommended): the check that proves it works, the
  version floor, install commands per OS and runtime, admin scope, and which
  workloads need it. Read by both doctor skills and the installer. Verified
  2026-10-12: Node 22 LTS floor, .NET 10 SDK, Azure CLI, Python 3.12 with the
  Dataverse Python SDK, and Microsoft's newer plugins (`dataverse` in their
  marketplace, `process-intelligence`, `power-apps-mobile-extension`).
- **Upstream watch** (`.github/workflows/upstream-watch.yml` +
  `scripts/watch/upstream-watch.js`) — every Monday, fingerprints the four
  Microsoft repos we depend on (plugin lists, versions, MCP launchers, the
  runtime versions they require), diffs against `watch/upstream-snapshot.json`,
  and opens or comments on an `upstream-change` issue when something
  actionable moves. Also flags the manifest stale after 90 days without
  re-verification.
- Eval scenario for `setup-workstation` (9 total).

### Changed

- **doctor 0.4.0** — `check-setup` is now diagnose-and-repair only (outdated
  or shimmed tools, auth profiles and tenant switching, plugin drift and
  loading, MCP wiring). Anything *missing* is handed to setup-workstation
  rather than installed in place. Its eval prompt is now repair-shaped.
- **`scripts/install.js` is now a bootstrap** — checks Node and git, detects
  the agent runtimes, registers this marketplace and installs `doctor`, then
  hands over: "say *set up my workstation*". It no longer installs pac or
  Microsoft's marketplace (setup-workstation does). Reads version floors from
  the manifest, and explains the Claude Code "network source differs from the
  one declared" error when a stale `extraKnownMarketplaces` entry is present.
- **conventions 0.1.2** — writing-skills constraint 5 allows one
  machine-readable JSON companion beside `microsoft-refs.md`.
- README, PREREQUISITES, the Copilot setup guide and the Microsoft landscape
  doc updated for the two-step flow (bootstrap → set up my workstation) and the
  refreshed Microsoft inventory.

## [0.9.0] — 2026-09-09

### Added

- **New plugin: `alm` (0.1.0)** — Power Platform ALM, the long-planned
  conventions-adjacent domain (closes #14):
  - **`design-alm-process`** — ground the real estate first ("absence is a
    finding": work in the Default environment, unmanaged solutions in
    production, no dev environment), six-question interview, then environment
    strategy, solution segmentation/publisher, **the config boundary** table
    (environment variables, connection references, what must *not* travel),
    promotion path and named approvers → a written process document plus
    build-along HTML.
  - **`promote-solution`** — checkpointed execution: dependency pre-flight
    (🟢), managed export (🟢), rehearsal import with evidence-based
    verification (🟡), post-import config and a real end-to-end exercise (🟡),
    then **production as a 🔴 hard stop** with explicit in-the-moment approval
    and a rollback plan whose first step has been checked. Fixes go in dev,
    never downstream; `--force-overwrite` is never a way to clear an error.
  - Seeded gotchas including an import symptom→cause→fix table, and the honest
    line that "rollback" mostly isn't — say so *before* the import.
- Eval scenarios for both new skills (8 total).

### Notes

- Landscape re-verified before building: Power CAT has since shipped
  `powercat-architecture-advisor` (designs *what to build*); this plugin
  designs *how it ships*. Power Pages promotion remains fully covered by
  Microsoft and is handed off, not rebuilt.

## [0.8.0] — 2026-08-24

The two pre-release hardening features.

### Added

- **Trigger eval harness** (`evals/run-evals.js` + `scenarios.json`, closes
  #5): headless trigger evals in both runtimes with kill-on-verdict (~10s per
  scenario), verdicts PASS / COMPETITOR / NONE / TIMEOUT / ERROR, results in
  `last-run.json`. First full sweep: **6/6 PASS** in Copilot CLI — after the
  harness caught a real trigger miss on `writing-skills` (fixed via an
  information-assertion description) and a miscalibrated scenario. Deliberately
  not in CI: a human-run pre-release gate (see `evals/README.md`).
- **Rendered artifact layer** (closes #15): every major deliverable — build
  spec, edit spec, canvas/PCF plan, readiness card — now gets a self-contained
  **build-along HTML page** alongside the markdown: verdict-first status
  strip, tickable checkpoints persisted in localStorage, copy buttons on every
  expression, offline-safe (no CDN, opens from `file://` on locked-down
  machines). Canonical spec in each plugin's `shared/artifact-style.md`; a new
  lint rule keeps the copies byte-identical. Markdown remains the source of
  truth.

### Changed

- flow-builder 0.3.0, pcf-builder 0.2.0, canvas-planner 0.2.0, doctor 0.3.0
  (artifact rendering); conventions 0.1.1 (writing-skills trigger fix).

## [0.7.0] — 2026-07-25

### Added

- **New plugin: `conventions` (0.1.0)** — the judgement layer as a checklist,
  and the long-promised conventions plugin:
  - **`dataverse-conventions`** — living schema/ALM conventions with
    reasoning: `statecode`/`statuscode` over custom status columns; build
    inside the target solution with the org's established publisher;
    subcomponents + required dependencies with system tables as shell
    references; modal dialogs for focused tasks. Seeded from a
    privately-maintained checklist, client details redacted; grows via the
    apply-and-record loop.
  - **`writing-skills`** — the house authoring standard as a skill
    (closes #2): lint-enforced dual-runtime constraints, trigger-description
    craft, the redaction door policy, the new-skill process, and the review
    checklist.
- **CONTRIBUTING.md** — the gotcha fast path, redaction rules, and the lint
  gate for contributions.

## [0.6.0] — 2026-07-24

### Added

- **New plugin: `canvas-planner` (0.1.0)** — skill `plan-canvas-app`. Microsoft's
  canvas tooling generates apps well; what it can't do is decide whether canvas
  is the right shape, or warn that a query silently returns the first 500 of
  50,000 rows. This plugin makes those decisions and hands a decided plan to
  their tooling to build:
  - Shape gate (canvas vs model-driven / code app / Pages / nothing).
  - **Delegation and data strategy** — volumes per table, delegability verified
    *per connector* against Learn (never from memory, never carried between
    projects), delegable query design, bounded working sets where delegation
    isn't possible, and an explicit rule that raising the row limit is not a fix.
  - Screen inventory, navigation model, state, and conventions decided before
    generation.
  - Checkpoints at **production volumes** — plus startup timing on real devices
    and testing as a least-privileged user.
  - Seeded gotchas log (delegation, shape, performance), with unproven entries
    marked as such pending real engagement evidence.

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
