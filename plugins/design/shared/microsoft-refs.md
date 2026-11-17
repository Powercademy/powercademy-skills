# Microsoft references

The **only** place in this plugin that names Microsoft plugin commands, MCP
servers, CLI commands, or file layouts. The skills state methodology; when it
needs mechanics, it points here. If Microsoft renames something, this file is
the only thing that changes.

**Verified 2026-07-24; audit hand-off added 2026-11-17.**

---

## Auditing an existing app — Power CAT

Power CAT's `powercat-canvas-apps` plugin (marketplace `power-cat-skills`)
ships `analyze-canvas-performance`: an audit of an existing canvas app or its
`.pa.yaml` files — slow load, delegation warnings, N+1 calls, collections,
OnStart, Named Formulas, concurrency, naming, variable scope, modern controls,
responsive layout, accessibility. Hand whole-app reviews to it; plan-canvas-app
owns the design decisions before (and behind) the build.

## Handing off generation to Microsoft's canvas tooling

Microsoft's `canvas-apps` plugin (from their `power-platform-skills`
marketplace) is the execution layer this skill plans for. It ships:

- **`canvas-app`** — the main skill: takes an approved plan and drives the build.
- **`add-data-source`** — wires a data source into an existing app.
- **`configure-canvas-mcp`** — sets up the authoring MCP server. **Run this
  first** on a new machine.
- **`report-issue`** — file a bug against Microsoft's plugin.
- Agents: **`canvas-app-planner`** (writes the plan document and `App.pa.yaml`)
  and **`canvas-screen-builder`** (implements one screen per invocation, run in
  parallel).

Install (inside a Claude Code or GitHub Copilot CLI session):

```
/plugin marketplace add microsoft/power-platform-skills
/plugin install canvas-apps@power-platform-skills
```

**The canvas authoring MCP server** is bundled in that plugin and launched via:

```
dnx Microsoft.PowerApps.CanvasAuthoring.McpServer --yes --prerelease --source https://api.nuget.org/v3/index.json
```

Prerequisite: **.NET 10+** (`dnx` ships with it) and reachable `api.nuget.org`.
Its tools compile and sync `.pa.yaml` source, list controls and APIs, describe
control properties, and read data-source schemas.

**Division of labour.** This plugin decides shape, delegation strategy, screen
architecture, and conventions, and writes the build plan. Microsoft's tooling
generates and compiles the app from it. Never re-implement generation here; if
their tooling isn't installed, say so and offer the install commands above
rather than hand-writing YAML.

## Verifying delegation against Microsoft Learn

Delegation support differs per connector and changes over time — **never answer
from memory or from another project**. Verify per connector, per operation.

Route: the **Microsoft Learn MCP server** where its tools are available in the
session (remote, no auth, `https://learn.microsoft.com/api/mcp`), otherwise a
web fetch of `learn.microsoft.com`.

> The Learn MCP endpoint speaks only the MCP protocol — a plain browser-style
> fetch returns **405**, which means *alive*, not broken.

Starting points (confirm they still resolve; Learn URLs move):

- Delegation overview: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview
- Understand data sources & row limits: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/working-with-data-sources
- Per-connector delegable functions: search Learn for `<connector> delegable functions`

Useful search patterns: `"<connector> delegation support Filter Sort"`,
`"power apps delegable functions <source>"`, `"canvas app data row limit"`.

## pac CLI

For environment and solution context during planning:

```bash
pac auth who                       # who/where am I connected (connection card)
pac auth list                      # cached profiles
pac env list                       # environments available
pac solution list                  # solutions in the environment
```

Auth ladder (enterprises frequently block device code):

1. `pac auth create --environment <env> --deviceCode` — observable, preferred
2. `pac auth create --environment <env>` — interactive fallback when
   Conditional Access refuses rung 1 (*"sign-in was successful but does not
   meet the criteria"*); interactive carries device-compliance state
3. Both blocked → policy exemption request: capture the error code,
   correlation ID and timestamp from *More details* for IT's sign-in logs

If `pac` resolves on PATH but every command fails with *"No
Microsoft.PowerApps.CLI has been installed"*, it's a deployment shim — run
`pac install latest` (user-scoped, **no admin required**).

Install pac: `dotnet tool install --global Microsoft.PowerApps.CLI.Tool` or
https://aka.ms/PowerPlatformCLI.

## Agent design (agent-design)

Verified 2026-11-17 against Microsoft Learn. Rates and coverage change — check
the linked pages before quoting a figure to a client.

**Harness guidance:** *Harnesses in Copilot Studio* (`/microsoft-copilot-studio/harnesses-overview`)
and *Compare Copilot Studio agent harnesses* (`/microsoft-copilot-studio/guidance/choose-harness`).
Agents on the Microsoft Copilot harness have no child agents — skills for
in-agent capabilities, connected agents for separate ones
(*FAQ for agents powered by the Microsoft Copilot harness*).

**Who pays** (*Manage costs for agents powered by the Microsoft Copilot harness*, Power Platform admin):

| Feature | Covered by a Microsoft 365 Copilot licence? |
|---|---|
| Standard harness agents | Yes, in Microsoft 365 channels, for licensed authenticated users |
| Agent flows | Yes, when a standard harness agent calls them via *When an agent calls the flow* for a licensed user; otherwise billed (including autonomous runs). Test runs aren't billed |
| Workflows, prompts | Yes, inside a standard harness agent used by a licensed user |
| Microsoft Copilot harness agents | **No** — all creation and runtime billed |
| Computer use | No |

**Copilot Credit rates** (*Billing rates and management*, standard harness):

| Event | Credits |
|---|---|
| Classic answer | 1 |
| Generative answer | 2 |
| Agent action | 5 |
| Tenant graph grounding | 10 |
| Agent flow actions | 13 per 100 actions |
| AI tools — basic / standard / premium | 0.1 / 1.5 / 10 per 1,000 tokens |
| Reasoning models | feature rate **plus** premium per 1,000 tokens |

Estimator: the *Microsoft Copilot Studio agent usage estimator*
(`https://microsoft.github.io/copilot-studio-estimator/`).

**Hand-off tooling** (Microsoft):

| Need | Tool |
|---|---|
| Microsoft Copilot harness agent — map requirements to components, write the YAML | `copilot-studio-plugin` marketplace, `mcs-assistant` plugin: **Copilot Studio Architect** agent |
| Standard harness agent — author YAML | `skills-for-copilot-studio`, `copilot-studio` plugin: **Copilot Studio Author** agent |
| Patterns, reviews, troubleshooting (standard) | Same plugin: **Copilot Studio Advisor** agent |
| Whole-solution architecture ("agent, app or site?") | Power CAT `powercat-architecture-advisor` |
