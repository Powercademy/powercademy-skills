# Microsoft references

The **only** place in this plugin that names Microsoft plugin commands, MCP
servers, CLI commands, or file layouts. Skills state methodology; when they need
Microsoft mechanics, they point here. If Microsoft renames something, this file
is the only thing that changes.

---

## Reaching Microsoft Learn

Step 3 requires verifying APIs, manifest schema, and licensing against live
Microsoft Learn. In order of preference:

1. **Microsoft Learn MCP server** — a remote, no-auth, streamable-HTTP server at
   `https://learn.microsoft.com/api/mcp`. Where its tools are available in the
   session, use them: doc search, code-sample search, and full-page fetch (use
   fetch for the licensing and manifest-schema pages, where a search excerpt can
   omit a node or a condition).
2. **Web fetch/search of `learn.microsoft.com`** when no MCP server is present.

Either route satisfies the methodology. Answering from memory does not.

Key pages to verify against:

- Component framework overview & licensing: https://learn.microsoft.com/en-us/power-apps/developer/component-framework/overview
- Manifest schema reference: https://learn.microsoft.com/en-us/power-apps/developer/component-framework/manifest-schema-reference/
- Power Apps pricing (for the premium/standard licensing decision): https://powerapps.microsoft.com/pricing/

## pac CLI — the PCF lifecycle

The Power Platform CLI drives the PCF lifecycle. Common commands:

```bash
pac pcf init --namespace <ns> --name <name> --template <field|dataset>   # scaffold
npm install                                                              # deps
npm run build                                                            # build the bundle
npm start watch                                                          # test harness (compile/render check only)
pac pcf push --publisher-prefix <prefix>                                 # DEV iteration only — not ALM
```

For production ALM, do **not** use `pac pcf push`. Package the control into a
solution and deploy a managed solution:

```bash
pac solution init --publisher-name <n> --publisher-prefix <prefix>
pac solution add-reference --path <path-to-pcf-project>
# build the solution (msbuild / dotnet), then import the managed solution to the target
```

Install pac: `dotnet tool install --global Microsoft.PowerApps.CLI.Tool` or
https://aka.ms/PowerPlatformCLI. PCF also needs **Node.js LTS** and a build
toolchain (npm; .NET SDK for solution packaging).

## pac CLI built-in MCP server (Microsoft-sanctioned Claude Code bridge)

The pac CLI ships an integrated MCP server that lets an agent invoke pac
operations in natural language; Microsoft documents Claude Code as a supported
client. Microsoft's framing, quoted for enterprise reviewers: *"an integrated
Model Context Protocol (MCP) server designed for local development and testing
purposes."*

```bash
pac copilot mcp --run
# or zero-install (requires .NET 10+):
dnx Microsoft.PowerApps.CLI.Tool --yes copilot mcp --run
```

Register it with Claude Code using the `claude mcp add-json pac-cli …` command
Microsoft publishes. Where available, the preflight (Step 0) and grounding steps
can use it for environment/solution operations rather than shelling out.

- Docs: https://learn.microsoft.com/en-us/power-platform/developer/howto/use-mcp
- Command reference: https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/copilot

> **Verified 2026-07-23.** The Learn component-framework overview confirms the
> premium/`external-service-usage` licensing rule and the on-premises
> exclusion; the pac MCP page lists Claude Code as a client. Re-check
> command syntax and licensing against the docs — both surfaces move.

## Marketplace registration

Inside a Claude Code or GitHub Copilot CLI session:

```
/plugin marketplace add HowdangPowercademy/powercademy-skills
/plugin install pcf-builder@powercademy-skills
```

The bootstrapper at `scripts/install.js` in this repo handles both marketplaces
in one pass.
