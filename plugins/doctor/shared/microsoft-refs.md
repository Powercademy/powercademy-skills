# Microsoft references — the doctor's command book

The **only** place in this plugin that names Microsoft plugin commands, MCP
servers, or install mechanics. The check-setup skill reads this before running
its layers. Verified 2026-07-23 — re-check versions against vendor docs; this
surface moves weekly.

---

## Layer 1 — core tools

| Tool | Check | Install (Windows) | Notes |
|---|---|---|---|
| git | `git --version` | `winget install --id Git.Git -e` | Needed for remote plugin marketplaces |
| Node.js LTS | `node --version` | `winget install OpenJS.NodeJS.LTS` | 18+ required; also gives npm |
| .NET SDK | `dotnet --version` | `winget install Microsoft.DotNet.SDK.8` | Solution packaging; pac install route |
| pac CLI | `pac help` | `dotnet tool install --global Microsoft.PowerApps.CLI.Tool` or `winget install --id Microsoft.PowerAppsCLI -e` | https://aka.ms/PowerPlatformCLI · restart terminal after install |
| Azure CLI (optional) | `az version` | `winget install -e --id Microsoft.AzureCLI` | Only needed for Azure-adjacent work (app registrations, Key Vault) |

macOS/Linux: `brew` equivalents; pac via `dotnet tool install`.

## Layer 2 — identity & auth

```bash
pac auth who                                   # active profile: user, tenant, environment
pac auth list                                  # every cached profile (index, name, user, env)
pac auth select --index <n>                    # switch active profile
pac auth name --index <n> --name "<Customer>"  # label a profile (30 chars max)
pac auth delete --index <n>                    # remove one stale profile
pac auth clear                                 # remove ALL profiles (confirm with user first)
pac auth create --environment <env> --deviceCode   # sign in — device-code flow, agent-observable
az account show                                # Azure CLI identity, if az installed
```

Device code is the preferred interactive flow in agent sessions: the URL and
code appear in command output, so the agent relays them verbatim rather than
guessing what happened on screen. (`--deviceCode` is a documented switch;
Microsoft auto-applies it in Codespaces and recommends it for WSL2.)

## Layer 3 — agent runtimes

| Runtime | Check | Minimum | Install |
|---|---|---|---|
| Claude Code | `claude --version` | — | https://docs.anthropic.com/en/docs/claude-code |
| GitHub Copilot CLI | `copilot --version` | **1.0.71** (plugin marketplace commands) | `npm install -g @github/copilot`; update: `copilot update` |
| Copilot desktop app | not detectable from terminal — ask the user | — | https://github.com/features/ai/github-app |

## Layer 4 — plugins & marketplaces

Registration (same commands inside either CLI session):

```
/plugin marketplace add microsoft/power-platform-skills
/plugin marketplace add HowdangPowercademy/powercademy-skills
/plugin install power-automate@power-platform-skills
/plugin install flow-builder@powercademy-skills
/plugin install pcf-builder@powercademy-skills
/plugin install doctor@powercademy-skills
```

Non-interactive: `claude plugin …` / `copilot plugin …` with the same
arguments. List installed: `claude plugin list` / `copilot plugin list` —
compare versions across runtimes and flag drift. The desktop app manages
plugins in Settings → Plugins (add marketplace via the Install dropdown).

One-shot bootstrap: `scripts/install.js` in the powercademy-skills repo does
marketplaces + plugins + pac in one pass.

## Layer 5 — MCP wiring

**Microsoft Learn MCP server** — remote, streamable HTTP, no auth, free:
endpoint `https://learn.microsoft.com/api/mcp`. Register in Claude Code:
`claude mcp add --transport http microsoft-learn https://learn.microsoft.com/api/mcp`.
In Copilot CLI: `/mcp add` (or the desktop app's MCP servers settings page).
Serves public documentation only — it answers "what does this require", never
"what does this tenant have".

**pac CLI built-in MCP server** — natural-language pac operations. Microsoft's
framing: *"designed for local development and testing purposes."*

```bash
pac copilot mcp --run
# zero-install (requires .NET 10+):
dnx Microsoft.PowerApps.CLI.Tool --yes copilot mcp --run
```

Register with Claude Code via the `claude mcp add-json pac-cli …` command
Microsoft publishes: https://learn.microsoft.com/en-us/power-platform/developer/howto/use-mcp
