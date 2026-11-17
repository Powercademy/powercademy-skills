# The Microsoft skills landscape

What Microsoft ships for AI-agent Power Platform delivery, where their coverage
ends, and how Powercademy Skills positions against it. This document exists to
enforce the CLAUDE.md rule — *never duplicate Microsoft's capabilities* — with
evidence instead of assumption.

**Verified 2026-07-23** (deep-research pass: 18 confirmed claims, 7 refuted,
plus direct inspection of the local clones); **full deep-dive 2026-11-17** —
every plugin and skill in power-platform-skills (05b634d), power-cat-skills
(ccc4e28), both Copilot Studio repos and Dataverse-skills read and compared
with ours. The weekly upstream watch keeps it current between deep-dives.

---

## The Microsoft properties (don't conflate them)

| Property | What it is | Runtime | Posture |
|---|---|---|---|
| [microsoft/power-platform-skills](https://github.com/microsoft/power-platform-skills) | The official **build-focused** marketplace (11 plugins, ~120 skills, including `dataverse` and `pcf`) | Claude Code + Copilot CLI | Foundation layer — route to it |
| [claude-plugins-official/dataverse](https://github.com/microsoft/Dataverse-skills) (`dv-*`, v1.6.0) | First-party Dataverse skills, agent-agnostic (Claude, Copilot, Cursor, Codex manifest present) | Multi-runtime | Foundation layer — route to it |
| [microsoft/power-cat-skills](https://github.com/microsoft/power-cat-skills) | Power CAT's **advisory/review** marketplace (15 plugins, incl. a cross-repo skills router) that *explicitly layers on* power-platform-skills foundation plugins | Copilot CLI primarily (+ .claude-plugin) | The near-neighbour — watch closely |
| [microsoft/skills-for-copilot-studio](https://github.com/microsoft/skills-for-copilot-studio) (`copilot-studio`) | Copilot Studio YAML authoring for **standard** agents | Claude Code + Copilot CLI + VS Code | Foundation layer — what setup-workstation installs for the Copilot Studio workload |
| [microsoft/copilot-studio-plugin](https://github.com/microsoft/copilot-studio-plugin) (`mcs-assistant`) | Copilot Studio authoring for **GitHub Copilot harness** agents, plus classic→harness migration. Self-described successor to skills-for-copilot-studio; needs pac ≥ 2.9.3 | Claude Code + Copilot CLI | Foundation layer — setup-workstation installs it for the Copilot Studio workload's *harness* variant |
| [microsoft/cat-agent-skills](https://github.com/microsoft/cat-agent-skills) | PR-based community gallery (~106 submissions for Cowork, Copilot Studio and Scout agents), not a curated product suite or plugin marketplace | Mixed | Discovery surface, not a competitor — watched for submissions entering our lanes (9 at baseline, e.g. power-automate-documentation, wcag-power-platform; since October also sap-power-platform-integration-architect and power-platform-solution-compare — Copilot Studio / Cowork skills, not plugins, so complements rather than competitors) |

**Strategic headline:** power-cat-skills declares foundation-plugin dependencies
on power-platform-skills ("install the companion foundation plugin first").
**Microsoft itself uses the layered-marketplace pattern Powercademy uses** —
our architecture is the vendor's own pattern, which is the strongest possible
validation of the approach.

## Inventory summary

**power-platform-skills (11 plugins):** power-pages (deepest — GA, site
creation→deployment→data model→Web API→server logic→**full native-Pipelines ALM
chain**→**security suite**: WAF, CSP, live scan, permission audit),
power-automate (FlowAgent MCP server bundled in-plugin: build/edit/run/debug
flows, plus setup/route-environments skills), canvas-apps (+ canvas-authoring
MCP), model-apps (genpage), mcp-apps, code-apps-preview, mobile-app, and —
new since July — **dataverse** (sourced from Dataverse-skills),
**process-intelligence**, **power-apps-mobile-extension** and — new in October —
**pcf** (build, test, diagnose, upgrade, deploy, verify from templates). Power
Pages has grown to 40+ skills, now including governance, performance analysis
and configuration comparison across environments. model-apps' app builder now
authors command bars (with an optional, empty-by-default icon).
**Five plugins bundle MCP servers via per-plugin `.mcp.json`** — the same
mechanism this marketplace uses for the Learn MCP server.

**dataverse dv-\*:** dv-overview (router), dv-connect, dv-data, dv-metadata,
dv-query, dv-solution (solution lifecycle mechanics), dv-admin, dv-security.
Runs under the calling user's Dataverse RBAC. Open-source, MIT.

**power-cat-skills (15):** powercat-overflow (**reviews every cloud flow in a
solution .zip** against Microsoft guidelines → findings.json + hosted viewer),
powercat-overpage (**Power Pages site audits**: security, performance,
accessibility, maintainability), powercat-procode-eval (eval generation for
Code Apps + Generative Pages — **not PCF** — with a self-contained HTML
dashboard), powercat-canvas-apps (performance analysis, InfoPath migration),
powercat-code-apps, powercat-dataverse, powercat-governance,
powercat-adoption, powercat-admin-digest, and — new since July —
**powercat-architecture-advisor**, powercat-migration-factory and — new since
October — **powercat-skills-router** (routes a request to the best-fit skill
across power-cat-skills *and* power-platform-skills, installing it with
approval), **powercat-pcf** (`create-pcf`: virtual React controls with Fluent
v9, accessibility, host validation), **powercat-codeappscompact** and
**loop-my-prompt** (prompt rewriting). powercat-canvas-apps now ships
`analyze-canvas-performance` (audit of an existing app). Plus **Power CAT Tools** — a GUI
(Dataverse-installed) maker tool doing code review, AI solution docs, and risk
evaluation; overlaps the audit space at the *GUI* level, not agent-skill level.

## Verdicts on our surface (shipped + roadmap)

| Ours | Verdict | Evidence & boundary |
|---|---|---|
| `build-flow-spec` (**retired 0.12.0**) | **Covered — retired** | power-automate's build-flow / create-flow / edit_flow / debug-flow now cover building, validating, surgical edits and debugging, and competing for the same trigger phrasing hurt both. The unique part — the flow gotchas log — lives on as `flow-conventions` in conventions |
| `build-pcf-control` (**retired 0.13.0**) | **Covered — retired** | Microsoft added a `pcf` plugin (preview, 2026-10-14) that builds, tests, diagnoses, upgrades, deploys and verifies controls from templates and recipes. The judgement — is PCF the right tool, licensing, gotchas — lives on as `pcf-conventions` in conventions |
| `workstation`: `setup-workstation` + `check-setup` (shipped; was `doctor`) | **Overlap risk — boundary drawn** | power-automate ships a `setup` skill (plugin-scoped: Node, Azure CLI, az login, FlowAgent wiring). Ours is machine-wide, cross-runtime, multi-workload provisioning (setup-workstation) and repair/auth hygiene (check-setup). **Rule: doctor routes to their setup for FlowAgent-specific wiring, never re-implements it** — and the skill is deliberately *not* named `setup` to avoid a trigger collision |
| `agent-design` (shipped 0.17.0) | **White space** | Microsoft's Copilot Studio tooling maps requirements to components and authors YAML (harness Architect; standard Author/Advisor); Power CAT's architecture advisor picks the product. Nobody owns the *before-authoring* calls: agent or workflow, which harness, credit cost and who pays, environment/policy fit. Learn's *Compare agent harnesses* guidance exists as docs, not as a skill. Ours decides, then hands off to theirs |
| `model-driven-ux` (shipped) | **White space, complements app-builder** | model-apps' app builder writes command bars but leaves icons empty by default; ours sets the UX rules it should follow |
| `tool-selection` (shipped) | **White space** | Microsoft's skills carry local browser-automation rules only (e.g. Power Pages: batch browser calls) |
| `flow-conventions`, `pcf-conventions`, `dataverse-conventions` (shipped) | **Complement** | Microsoft's pcf troubleshooting now covers the version bump and dv-metadata now asks for solution + prefix; ours keep the judgement (is PCF right, licensing, which prefix, status columns, live-flow editing, agent-built flows) |
| `plan-canvas-app` (shipped) | **Adapted 0.17.0** | Planning (shape, delegation strategy, screens) is still uncovered — canvas-apps' create agents check feasibility, not data-volume strategy. Whole-app audits of an *existing* app now hand off to Power CAT's `analyze-canvas-performance` |
| `audit-solution` (#11) | **CONTESTED — reposition** | powercat-overflow owns flow-level review; overpage owns Pages audits; Power CAT Tools (GUI) does code review/risk. Our lane: **cross-workload** solution audit (the whole inherited estate), conventions/judgement altitude, agent form factor. Route flow-zip review *to* overflow rather than rebuild it |
| `advise-licensing` (#12) | **Confirmed white space** | Appears in no Microsoft plugin inventory |
| `map-tenant` (#13) | **Confirmed white space** | Appears in no Microsoft plugin inventory |
| `alm` plugin (#14) | **White space with a carve-out** | Cross-workload ALM *process design* is uncovered. **Power Pages promotion is fully covered** (plan-alm→setup-solution→setup-pipeline→deploy-pipeline→ensure-pipelines-host, native Pipelines) and dv-solution owns Dataverse solution mechanics. Our plugin designs the process and routes execution to theirs; it never re-implements a pipeline |
| HTML artifacts (#15) | **Validated direction, contested aesthetics** | procode-eval already ships self-contained HTML dashboards — the pattern is proven; our bar is to be distinctively better (verdict-first design language) |
| Watch-mode (#16) | **Dropped (0.12.0)** | Closed with flow-builder's retirement — power-automate's own skills now build and edit flows directly |

## Routing table — where each kind of work goes

The "orchestrator" front door once on our roadmap is now Power CAT's
`powercat-skills-router`, which routes across both Microsoft marketplaces. We
don't build a competing router; this table is the reference our own skills'
hand-offs follow.

| Scenario | Route to | Powercademy adds |
|---|---|---|
| Build/edit/run/debug a flow | power-automate plugin (FlowAgent) | flow-conventions: the gotchas, before and during |
| Dataverse schema/data/query/solution/security | `dv-*` (enter via dv-overview) | conventions, before/after judgement |
| Power Pages lifecycle incl. promotion + security | power-pages plugin (native chains) | nothing — fully covered; hands off entirely |
| Canvas build | canvas-apps | plan-canvas-app: shape, delegation, screens first |
| Audit an existing canvas app | **powercat-canvas-apps** (`analyze-canvas-performance`) | plan-canvas-app for the design decision behind a finding |
| Copilot Studio agent | copilot-studio-plugin (harness) / skills-for-copilot-studio (standard) | agent-design: agent or workflow, harness, cost, policies — before authoring |
| "What should I build?" across products | **powercat-architecture-advisor** | — |
| "Which skill can do this?" | **powercat-skills-router** | — |
| Flow-level review of a solution .zip | **powercat-overflow** | cross-workload synthesis on top |
| Pages audit | **powercat-overpage** | cross-workload synthesis on top |
| Code Apps / genpage evals | powercat-procode-eval | — |
| PCF end to end | Microsoft's pcf plugin, or Power CAT's powercat-pcf | pcf-conventions: the decision gate and gotchas |
| New machine / add a workload | **setup-workstation (ours)**; FlowAgent wiring → their `setup` | whole toolchain, one plan, IT request for admin items |
| Something's broken / wrong tenant | **check-setup (ours)** | cross-runtime + auth hygiene |
| Docs/licensing verification | Learn MCP (`learn.microsoft.com/api/mcp`) | curated source maps, verdicts |
| Environment ops in natural language | pac MCP (`pac copilot mcp`) | preflight discipline |

## Update watch

**Observed cadence (2026-07-23):** power-platform-skills ≈ daily (12 commits in
6 days — including a power-automate API fix and power-pages 2.6.3 the day
before this snapshot); power-cat-skills ≈ weekly; Dataverse-skills announced
new runtimes twice in two months. Neither repo keeps a changelog file — commit
history and the Power Platform dev blog are the tracking mechanisms.

**The watch is automated (weekly).** `.github/workflows/upstream-watch.yml`
runs `scripts/watch/upstream-watch.js` every Monday. It covers three things:

- **Five plugin repos** — power-platform-skills, Dataverse-skills,
  skills-for-copilot-studio, copilot-studio-plugin, power-cat-skills: plugin
  lists, versions, MCP launchers, and the runtime versions they require
  (Node, .NET, Python, JDK, pac). If a plugin we install states a higher floor
  than the manifest's `check.min`, that's flagged too.
- **One gallery** — cat-agent-skills: new submissions that touch our lanes.
- **Every package ID and link in the toolchain manifest** — winget, Homebrew,
  npm, NuGet, PyPI, VS Code Marketplace and URLs, parsed from the install
  commands themselves, so a renamed or pulled package is caught within a week.

It diffs against `watch/upstream-snapshot.json` and opens (or comments on) an
`upstream-change` issue when something actionable moves. After acting on an
issue, update the toolchain manifest and run the script with
`--update-snapshot` to accept the new baseline.

**Still manual — positioning** (before starting any new skill):

1. Skim the [Power Platform dev blog](https://devblogs.microsoft.com/powerplatform/)
   and the watch's informational section for anything entering our lanes
   (PCF, licensing, tenant mapping, cross-workload ALM/audit, setup scope creep).
2. Update the verdict table above + re-stamp the date; if a lane flips from
   white space to contested, raise a roadmap issue to reposition *before*
   building further into it.

Marketplace auto-update keeps the installed *plugins* current on their own —
the watch keeps our *manifest and positioning* current.
