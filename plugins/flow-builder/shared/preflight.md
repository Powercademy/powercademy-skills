# Preflight — prerequisite checks the skill runs itself

Run these at the start of a build session (Step 0 in SKILL.md), before
grounding. The point is to do the heavy lifting inside the session: fix what a
terminal can fix, and surface — once, in a single message — only what
genuinely needs the user.

Rules:

- **Fix silently where possible.** Installing a tool is not worth announcing.
- **Batch what you can't fix.** One message with every human-only step and its
  exact command, at the moment it blocks progress — never a checklist up front.
- **Never assume the environment.** Confirming *which* tenant and environment
  you're pointed at is a preflight check, not an afterthought. Consultants
  work in customer tenants; the cost of assuming is a spec (or worse, a write)
  against the wrong org.
- **Don't re-run preflight mid-session** unless something failed in a way that
  suggests the environment changed.

## The checks

| # | Check | Command | Pass looks like | If it fails |
|---|---|---|---|---|
| 1 | pac CLI present | `pac help` | Version banner | Install: `dotnet tool install --global Microsoft.PowerApps.CLI.Tool` (then restart terminal). No dotnet → hand the user https://aka.ms/PowerPlatformCLI |
| 2 | Authenticated | `pac auth list` | At least one profile, one active | Human-only: give the user `pac auth create --environment <url>` — browser sign-in, cannot be automated |
| 3 | Right environment | `pac org who` | Org + environment match the stated target | Wrong env: `pac auth select --index <n>` or `pac env select --environment <url>`. Unsure which is right → ask, don't guess |
| 4 | Dev solution exists | `pac solution list` | The unmanaged solution the build belongs in | Absent → ask which solution to use or whether to create one. Never spec into "no solution" silently — see `gotchas.md` on building in dev |
| 5 | Learn verification route | — | Learn MCP tools available in session | Fall back to web fetch of learn.microsoft.com — see `microsoft-refs.md`. Either route passes; memory does not |

## What is never the skill's job

Licences, security roles, DLP policies, and admin consent live with the
user's organisation. When one of these blocks a build (e.g. a connector
blocked by DLP, a missing Power Automate licence), name it precisely, say who
can fix it, and record it in the build spec's **Open questions** — don't
attempt workarounds.

## Feeding back

A prerequisite failure not covered by this table is a finding: add a row here
and, if a human ended up doing something tooling could have done, extend
`scripts/install.js` in the marketplace repo. The repo-level
`PREREQUISITES.md` is the human-facing summary of this file — keep the two in
step.
