# The Microsoft skills landscape

What Microsoft ships for AI-agent Power Platform delivery, where their coverage
ends, and how Powercademy Skills positions against it. This document exists to
enforce the CLAUDE.md rule — *never duplicate Microsoft's capabilities* — with
evidence instead of assumption.

**Verified 2026-07-23** (deep-research pass: 18 confirmed claims, 7 refuted,
plus direct inspection of the local clones). **Re-verify monthly** — see the
update watch at the bottom; power-platform-skills moved 12 commits in the six
days before this snapshot.

---

## The four Microsoft properties (don't conflate them)

| Property | What it is | Runtime | Posture |
|---|---|---|---|
| [microsoft/power-platform-skills](https://github.com/microsoft/power-platform-skills) | The official 7-plugin **build-focused** marketplace | Claude Code + Copilot CLI | Foundation layer — route to it |
| [claude-plugins-official/dataverse](https://github.com/microsoft/Dataverse-skills) (`dv-*`, v1.6.0) | First-party Dataverse skills, agent-agnostic (Claude, Copilot, Cursor, Codex manifest present) | Multi-runtime | Foundation layer — route to it |
| [microsoft/power-cat-skills](https://github.com/microsoft/power-cat-skills) | Power CAT's **advisory/review** marketplace (~9 plugins) that *explicitly layers on* power-platform-skills foundation plugins | Copilot CLI primarily (+ .claude-plugin) | The near-neighbour — watch closely |
| [microsoft/cat-agent-skills](https://github.com/microsoft/cat-agent-skills) | PR-based community gallery, not a curated product suite | Mixed | Discovery surface, not a competitor |

**Strategic headline:** power-cat-skills declares foundation-plugin dependencies
on power-platform-skills ("install the companion foundation plugin first").
**Microsoft itself uses the layered-marketplace pattern Powercademy uses** —
our architecture is the vendor's own pattern, which is the strongest possible
validation of the approach.

## Inventory summary

**power-platform-skills (7 plugins):** power-pages (deepest — GA, site
creation→deployment→data model→Web API→server logic→**full native-Pipelines ALM
chain**→**security suite**: WAF, CSP, live scan, permission audit),
power-automate (FlowAgent MCP server bundled in-plugin: build/edit/run/debug
flows, plus setup/route-environments skills), canvas-apps (+ canvas-authoring
MCP), model-apps (genpage), mcp-apps, code-apps (preview), mobile-apps.
**Five plugins bundle MCP servers via per-plugin `.mcp.json`** — the same
mechanism this marketplace uses for the Learn MCP server.

**dataverse dv-\*:** dv-overview (router), dv-connect, dv-data, dv-metadata,
dv-query, dv-solution (solution lifecycle mechanics), dv-admin, dv-security.
Runs under the calling user's Dataverse RBAC. Open-source, MIT.

**power-cat-skills (~9):** powercat-overflow (**reviews every cloud flow in a
solution .zip** against Microsoft guidelines → findings.json + hosted viewer),
powercat-overpage (**Power Pages site audits**: security, performance,
accessibility, maintainability), powercat-procode-eval (eval generation for
Code Apps + Generative Pages — **not PCF** — with a self-contained HTML
dashboard), powercat-canvas-apps (performance analysis, InfoPath migration),
powercat-code-apps, powercat-dataverse, powercat-governance,
powercat-adoption, powercat-admin-digest. Plus **Power CAT Tools** — a GUI
(Dataverse-installed) maker tool doing code review, AI solution docs, and risk
evaluation; overlaps the audit space at the *GUI* level, not agent-skill level.

## Verdicts on our surface (shipped + roadmap)

| Ours | Verdict | Evidence & boundary |
|---|---|---|
| `build-flow-spec` (shipped) | **Safe** | FlowAgent does mechanics; nobody ships spec-first methodology with checkpoints. Boundary: we decide/spec, FlowAgent executes |
| `build-pcf-control` (shipped) | **Confirmed white space** | Zero PCF hits (`pac pcf`/`ControlManifest`/`component framework`) across all 7 plugins; procode-eval scope checked — Code Apps + genpages only |
| `doctor`/`check-setup` (shipped) | **Overlap risk — boundary drawn** | power-automate ships a `setup` skill (plugin-scoped: Node, Azure CLI, az login, FlowAgent wiring). Ours is machine-wide, cross-runtime, auth-hygiene-centric. **Rule: doctor routes to their setup for FlowAgent-specific wiring, never re-implements it** |
| `audit-solution` (#11) | **CONTESTED — reposition** | powercat-overflow owns flow-level review; overpage owns Pages audits; Power CAT Tools (GUI) does code review/risk. Our lane: **cross-workload** solution audit (the whole inherited estate), conventions/judgement altitude, agent form factor. Route flow-zip review *to* overflow rather than rebuild it |
| `advise-licensing` (#12) | **Confirmed white space** | Appears in no Microsoft plugin inventory |
| `map-tenant` (#13) | **Confirmed white space** | Appears in no Microsoft plugin inventory |
| `alm` plugin (#14) | **White space with a carve-out** | Cross-workload ALM *process design* is uncovered. **Power Pages promotion is fully covered** (plan-alm→setup-solution→setup-pipeline→deploy-pipeline→ensure-pipelines-host, native Pipelines) and dv-solution owns Dataverse solution mechanics. Our plugin designs the process and routes execution to theirs; it never re-implements a pipeline |
| HTML artifacts (#15) | **Validated direction, contested aesthetics** | procode-eval already ships self-contained HTML dashboards — the pattern is proven; our bar is to be distinctively better (verdict-first design language) |
| Watch-mode (#16) | **Solid** | FlowAgent bundling confirmed locally (power-automate `.mcp.json` + `server/mcp.mjs`) |

## Orchestrator routing table (draft — for the orchestrator skill)

| Scenario | Route to | Powercademy adds |
|---|---|---|
| Build/edit/run/debug a flow | power-automate plugin (FlowAgent) | build-flow-spec: grounding, spec, checkpoints |
| Dataverse schema/data/query/solution/security | `dv-*` (enter via dv-overview) | conventions, before/after judgement |
| Power Pages lifecycle incl. promotion + security | power-pages plugin (native chains) | nothing — fully covered; hands off entirely |
| Canvas build / performance | canvas-apps (+ powercat-canvas-apps for perf) | conventions |
| Flow-level review of a solution .zip | **powercat-overflow** | cross-workload synthesis on top |
| Pages audit | **powercat-overpage** | cross-workload synthesis on top |
| Code Apps / genpage evals | powercat-procode-eval | — |
| PCF end to end | **pcf-builder (ours)** | whole lifecycle — white space |
| Machine/toolchain readiness | **doctor (ours)**; FlowAgent wiring → their `setup` | cross-runtime + auth hygiene |
| Docs/licensing verification | Learn MCP (`learn.microsoft.com/api/mcp`) | curated source maps, verdicts |
| Environment ops in natural language | pac MCP (`pac copilot mcp`) | preflight discipline |

## Update watch

**Observed cadence (2026-07-23):** power-platform-skills ≈ daily (12 commits in
6 days — including a power-automate API fix and power-pages 2.6.3 the day
before this snapshot); power-cat-skills ≈ weekly; Dataverse-skills announced
new runtimes twice in two months. Neither repo keeps a changelog file — commit
history and the Power Platform dev blog are the tracking mechanisms.

**The watch, monthly (or before starting any new skill):**

1. `git -C <local marketplace clone> log --since="1 month ago" --oneline` for
   power-platform-skills; `gh api repos/microsoft/power-cat-skills/commits` for
   Power CAT — scan for anything entering our lanes (PCF, licensing, tenant
   mapping, cross-workload ALM/audit, setup-doctor scope creep).
2. Skim the [Power Platform dev blog](https://devblogs.microsoft.com/powerplatform/)
   for skills/plugin announcements.
3. Update the verdict table above + re-stamp the date; if a lane flips from
   white space to contested, raise a roadmap issue to reposition *before*
   building further into it.

Marketplace auto-update keeps the installed *plugins* current on their own —
this watch is about keeping our *positioning* current.
