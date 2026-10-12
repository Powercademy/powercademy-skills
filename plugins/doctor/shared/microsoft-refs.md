# Microsoft references — the doctor's command book

Together with its machine-readable companion `toolchain-manifest.json`, this is
the **only** place in this plugin that names Microsoft plugin commands, MCP
servers, or install mechanics. Both skills (setup-workstation and check-setup)
read them.

- **What to install and check** — every tool, version floor, install command per
  OS, admin requirement and workload mapping — lives in
  `toolchain-manifest.json`. Do not duplicate it here.
- **How to operate** — marketplace and plugin commands per runtime, PATH
  refresh, the auth ladder, tenant switching, MCP wiring — lives below.

**Verified 2026-10-12.**

---

## Marketplaces and plugins, per runtime

Inside a Claude Code or GitHub Copilot CLI session:

```
/plugin marketplace add <owner>/<repo>
/plugin install <plugin>@<marketplace>
```

Non-interactive (what the skills run):

```bash
claude  plugin marketplace add <owner>/<repo>
claude  plugin install <plugin>@<marketplace> --scope user
copilot plugin marketplace add <owner>/<repo>
copilot plugin install <plugin>@<marketplace>
```

Marketplaces used by the manifest:

| Marketplace name | Repo | Carries |
|---|---|---|
| `power-platform-skills` | `microsoft/power-platform-skills` | Microsoft's build plugins — **including `dataverse`**, which it sources from `microsoft/Dataverse-skills` |
| `powercademy-skills` | `Powercademy/powercademy-skills` | Our methodology plugins |
| `skills-for-copilot-studio` | `microsoft/skills-for-copilot-studio` | Copilot Studio skills |
| `power-cat-skills` | `microsoft/power-cat-skills` | Power CAT advisory plugins |

List and compare: `claude plugin list` / `copilot plugin list` — flag version
drift between runtimes.

**Re-pointing a marketplace to a new slug** (e.g. after a repo transfer):

- *Copilot CLI* stores registrations in its own data store: `copilot plugin
  marketplace remove <name> --force` (uninstalls its plugins), re-add on the new
  slug, reinstall.
- *Claude Code* has **two** records: the registration (`known_marketplaces.json`)
  **and a declaration in `~/.claude/settings.json` under
  `extraKnownMarketplaces.<name>.source`**. Update the declaration first —
  otherwise every add fails with *"its network source differs from the one
  declared for it in settings"* — then `claude plugin marketplace add
  <owner>/<repo>`. Installed plugins survive. Back up settings.json before
  editing it. The Copilot desktop app manages plugins in
**Settings → Plugins** (add a marketplace via the Install dropdown).

**New plugins and MCP servers load only after the agent restarts.**

## PATH refresh after an install

A fresh install isn't on the current session's PATH. On Windows, refresh
in-session before concluding an install failed:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
```

Then re-run the item's check. Only if it still fails, ask the user to open a new
terminal.

## Managed devices

- Machine-wide installers (manifest `scope: admin`) fail at UAC with exit code
  **1602** for a standard user — collect them into an IT request rather than
  retrying.
- Self-service despite lockdown: `pac install latest`, `dotnet tool install`,
  npm globals when `npm config get prefix` is under the user profile, per-user
  Python and VS Code.
- Endpoints the toolchain must reach (for IT allowlists): `api.nuget.org`,
  `registry.npmjs.org`, `pypi.org` + `files.pythonhosted.org`, `github.com` +
  `raw.githubusercontent.com`, `learn.microsoft.com`,
  `login.microsoftonline.com`.

## Identity & auth

```bash
pac auth who                                   # active profile: user, tenant, environment
pac auth list                                  # every cached profile (index, name, user, env)
pac auth select --index <n>                    # switch active profile
pac auth name --index <n> --name "<Customer>"  # label a profile (30 chars max)
pac auth delete --index <n>                    # remove one stale profile
pac auth clear                                 # remove ALL profiles (confirm with user first)
az account show                                # Azure CLI identity
az login --allow-no-subscriptions              # interactive — preferred on managed tenants
```

**Auth ladder — enterprises frequently block rung 1:**

| Rung | Command | When |
|---|---|---|
| 1 | `pac auth create --environment <env> --deviceCode` | Default — observable |
| 2 | `pac auth create --environment <env>` | Rung 1 refused by Conditional Access (*"sign-in was successful but does not meet the criteria"*). Interactive carries device-compliance state on an Entra-joined machine |
| 3 | — | Both blocked → policy exemption request. Capture error code + correlation ID + timestamp from *More details* |

**Tenant-switch runbook** (all three auth surfaces, in order):

```bash
az logout
az login --tenant <tenant-id> --allow-no-subscriptions
pac auth create --environment <env>
pac auth select --index <new-profile-index>
```

Then a **full host-app quit and relaunch** — MCP tool servers cache their token
at process start; `/restart` resets only the conversation. Done means: fresh
environment list matches the *target* tenant. Portal sign-ins in a browser
change nothing locally.

## MCP wiring

**Microsoft Learn MCP server** — remote, streamable HTTP, no auth:
`https://learn.microsoft.com/api/mcp`. A plain browser-style fetch returns
**405 — that means alive**. The real check is whether the runtime lists it as
connected. Already bundled by several plugins (see the manifest's
`bundledIn`) — don't register a duplicate.

**Playwright MCP** — bundled by `model-apps` and `power-pages`. Standalone
registration and browser install commands are in the manifest.

**pac CLI built-in MCP server** — *"designed for local development and testing
purposes"* (Microsoft's framing):

```bash
pac copilot mcp --run
dnx Microsoft.PowerApps.CLI.Tool --yes copilot mcp --run   # zero-install, .NET 10+
```

Register via the `claude mcp add-json pac-cli …` command Microsoft publishes:
https://learn.microsoft.com/en-us/power-platform/developer/howto/use-mcp
