# Microsoft references

The **only** place in this plugin that names Microsoft plugin commands, MCP
servers, or file layouts. Skills state methodology; when they need Microsoft
mechanics, they point here. If Microsoft renames something, this file is the
only thing that changes.

---

## Reaching Microsoft Learn

Step 2 of the build-spec loop requires verifying API touchpoints against live
Microsoft Learn documentation. In order of preference:

1. **Microsoft Learn MCP server**, if available in the session (ships with
   several Microsoft plugins; also available as a public endpoint at
   `https://learn.microsoft.com/api/mcp`). Tools:
   - `microsoft_docs_search` — up to 10 content chunks; breadth
   - `microsoft_code_sample_search` — code samples
   - `microsoft_docs_fetch` — full page as markdown; depth. Use for cmdlet
     references and permission tables, where a search excerpt can omit a
     parameter set entirely.
2. **Web fetch/search of `learn.microsoft.com`** when no MCP server is
   available. Same search patterns apply.

Either route satisfies the methodology. What is not acceptable is answering
from memory.

## Microsoft's power-automate plugin (FlowAgent)

`power-automate@power-platform-skills` provides the **FlowAgent MCP server** —
tools that operate on live flows: `create_flow`, `edit_flow`, `validate_flow`,
`run_flow`, `diagnose_run`, `get_expression_help`, connection management, and
more, plus skills such as `/power-automate:build-flow` and
`/power-automate:debug-flow`.

Division of labour when both plugins are installed:

- **This plugin** grounds in the existing solution, decides what to build, and
  produces the spec with checkpoints and risk tiers.
- **FlowAgent** can then execute the spec against the environment — but the
  checkpoint discipline still applies: stop at every 🟡/🔴 boundary in the spec
  regardless of which hands are on the keyboard.

If FlowAgent is not installed, the spec is built by hand in the designer — the
spec format assumes no tooling, so nothing is lost.

## pac CLI

The Power Platform CLI is the preferred way to add tooling without code.
Skills may instruct the agent to run `pac` commands directly. Common ones for
build-spec grounding:

```bash
pac auth list                      # confirm which tenant/environment you're pointed at
pac solution list                  # solutions in the environment
pac solution export --name <name>  # export for grounding (Step 1)
```

Install: `dotnet tool install --global Microsoft.PowerApps.CLI.Tool` or
https://aka.ms/PowerPlatformCLI.

## Marketplace registration

Inside a Claude Code or GitHub Copilot CLI session:

```
/plugin marketplace add microsoft/power-platform-skills
/plugin install power-automate@power-platform-skills
```

Or non-interactively: `claude plugin marketplace add …` / `copilot plugin
marketplace add …`. The bootstrapper at `scripts/install.js` in this repo does
both marketplaces in one pass.
