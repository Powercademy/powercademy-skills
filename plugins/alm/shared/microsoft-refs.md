# Microsoft references

The **only** place in this plugin that names Microsoft plugin commands, MCP
servers, CLI commands, or file layouts. Skills state methodology; when they need
mechanics, they point here.

**Verified 2026-09-09.**

---

## Division of labour — route, never rebuild

| Scenario | Route to | We add |
|---|---|---|
| Dataverse solution mechanics (create, export, import, promote, validate) | Microsoft's **Dataverse skills** (`dv-solution`, entered via `dv-overview`) | the process, the checkpoints, the approvals |
| **Power Pages** sites end to end | Microsoft's **power-pages plugin** — it owns the full native-Pipelines chain (`plan-alm` → `setup-solution` → `setup-pipeline` → `deploy-pipeline` → `ensure-pipelines-host`) | nothing. Hand off entirely; do not re-implement a Pages pipeline |
| Solution-architecture design (what to build, platform fitness) | Power CAT's **architecture-advisor** plugin | our ALM design covers *how it ships*, not what it is |
| Flow-level review of a solution `.zip` | Power CAT's **overflow** plugin | cross-workload synthesis |

Install Microsoft's marketplaces inside a Claude Code or GitHub Copilot CLI
session:

```
/plugin marketplace add microsoft/power-platform-skills
/plugin marketplace add microsoft/power-cat-skills
```

## pac CLI — the ALM surface

```bash
# environments and context
pac auth who                                   # connection card: user, tenant, environment
pac auth list                                  # cached profiles
pac env list                                   # environments available to this identity

# solutions
pac solution list                              # solutions in the current environment
pac solution export --name <Unique> --path <file.zip> --managed true
pac solution import --path <file.zip> --activate-plugins --force-overwrite
pac solution check --path <file.zip>           # static analysis before shipping
pac solution version --patchversion <n>        # deliberate version bump
pac solution add-reference --path <project>    # e.g. a PCF project into a solution
```

Import flags worth understanding rather than copying: `--activate-plugins`
matters for plug-in registration, and `--force-overwrite` will replace an
unmanaged layer — never reach for it to "make an error go away".

**Auth ladder** (enterprises frequently block device code):

1. `pac auth create --environment <env> --deviceCode` — observable, preferred
2. `pac auth create --environment <env>` — interactive fallback when
   Conditional Access refuses rung 1 (*"sign-in was successful but does not
   meet the criteria"*)
3. Both blocked → policy exemption request: capture the error code,
   correlation ID and timestamp from *More details* for IT's sign-in logs

If `pac` resolves on PATH but every command fails with *"No
Microsoft.PowerApps.CLI has been installed"*, it is a deployment shim — run
`pac install latest` (user-scoped, **no admin required**).

## Native pipelines vs export/import

**Power Platform Pipelines** is Microsoft's in-product deployment mechanism and
needs no external CI/CD infrastructure. Prefer it when the team wants
in-product approvals and a repeatable path; prefer Git-backed build pipelines
when solution source is already committed and reviewed. Either way we design
the process and route execution to their tooling — we never build a bespoke
pipeline.

For Power Pages specifically, the power-pages plugin's chain already covers
host provisioning, solution setup, pipeline setup and deployment end to end.

## The pac CLI's built-in MCP server

Lets an agent invoke pac operations in natural language; Microsoft documents
Claude Code as a supported client, framed as *"an integrated Model Context
Protocol (MCP) server designed for local development and testing purposes."*

```bash
pac copilot mcp --run
# zero-install (requires .NET 10+):
dnx Microsoft.PowerApps.CLI.Tool --yes copilot mcp --run
```

Docs: https://learn.microsoft.com/en-us/power-platform/developer/howto/use-mcp

Use it for environment and solution operations where available; fall back to
the `pac` commands above otherwise. Its "local development and testing"
framing is worth quoting to enterprise reviewers — and worth respecting: a
production import still needs explicit approval whichever surface runs it.

## Verifying ALM guidance against Microsoft Learn

Solution and ALM behaviour changes; verify rather than recall — the **Learn MCP
server** where its tools are available (remote, no auth,
`https://learn.microsoft.com/api/mcp`; a plain browser fetch returns **405**,
which means *alive*), otherwise a web fetch of `learn.microsoft.com`.

Anchors worth checking when they matter:

- ALM overview and solution layers: search Learn for `Power Platform ALM solution layers`
- Managed vs unmanaged behaviour: search Learn for `managed unmanaged solutions differences`
- Environment variables & connection references in ALM: search Learn for `environment variables connection references solution deployment`
- Pipelines: search Learn for `Power Platform pipelines overview`

## Marketplace registration

```
/plugin marketplace add Powercademy/powercademy-skills
/plugin install alm@powercademy-skills
```
