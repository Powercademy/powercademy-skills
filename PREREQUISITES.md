# Prerequisites

A living document — updated as the toolchain moves. When a session hits a
missing prerequisite that isn't listed here, add it (same discipline as the
gotchas log: it cost time once; it shouldn't again).

**Last verified: 2026-07-23** against Claude Code 2.1.207, GitHub Copilot CLI
1.0.73, pac CLI 2.7.4.

## The principle

You should need to do almost nothing by hand. The installer and the skills
check for and fix whatever can be fixed from a terminal. What remains for you
is only what genuinely cannot be automated: browser sign-ins, licences, and
permissions someone else controls. The skills surface those in one message
when they're actually needed — not as a checklist up front.

## Who handles what

| Prerequisite | Handled by | Notes |
|---|---|---|
| Node.js 18+ | **you** | Needed once, to run the installer |
| Claude Code and/or GitHub Copilot CLI | **you** | At least one, signed in |
| pac CLI | **installer / skill** | Auto-installed via `dotnet tool` when missing; manual fallback https://aka.ms/PowerPlatformCLI |
| Marketplace registration + plugins | **installer** | Both marketplaces (Microsoft's and this one), both CLIs |
| Power Platform authentication (`pac auth`) | **you, when prompted** | Browser sign-in cannot be automated; the skill asks at the moment it's needed, with the exact command |
| A Dataverse environment with maker access | **you / your admin** | Licensing and security roles are organisational, not technical |
| An unmanaged dev solution to build in | **skill checks** | Builds belong in dev; the skill verifies before speccing (see gotchas) |
| Microsoft Learn access for verification | **skill** | Learn MCP server when available, web fetch otherwise |

## Updating this document

- Re-verify the version line when the installer or a skill changes.
- New prerequisite discovered mid-session → add a row, say who handles it, and
  prefer moving it into the *handled-by-tooling* column: extend
  `scripts/install.js` or `plugins/*/shared/preflight.md` rather than
  lengthening the *you* column.
