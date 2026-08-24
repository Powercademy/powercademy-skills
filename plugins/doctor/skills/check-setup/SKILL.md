---
name: check-setup
description: >
  Run a full check-up of the Power Platform development toolchain - CLIs, auth profiles, agent runtimes, plugins, MCP wiring - diagnosing what's missing or misconfigured, fixing what it can with consent, and ending with a readiness card. Trigger whenever the user says "check my setup", "am I set up", "am I ready to build", "set up my machine", "new laptop", "onboard this machine", "what do I need installed", "install the tools", "doctor", "my auth is a mess", "which account am I signed in as", "why isn't pac working", or hits any environment/tooling/authentication error while doing Power Platform work. Also trigger before a first build on an unfamiliar machine, or when another skill's preflight uncovers more than one missing tool. If the task is diagnosing, installing, or repairing the local toolchain rather than building something, trigger. When in doubt, trigger.
---

# Doctor — toolchain check-up

Setting up for Power Platform development is genuinely painful: several CLIs,
cached auth in different places, agent runtimes, plugins, MCP servers — and
every missing piece surfaces later as a confusing error somewhere else. This
skill exists so nobody has to hold that checklist in their head. You hold it.

Run the whole check-up conversationally. Diagnose everything first, then fix
with consent, then prove it's fixed. The user should end with one clear
picture, not a scavenger hunt.

---

## Posture

- **Diagnose everything before fixing anything.** Run all checks first and
  present one findings table — not fix-check-fix-check whiplash.
- **Fix with consent, in one batch.** "Three things are missing; I can install
  all three — go ahead?" On a customer's machine, never install silently.
- **Narrate briefly.** One line per check as you go. No walls of output.
- **The user never types a command.** Anything runnable, you run. Only browser
  sign-ins and admin-held permissions stay with them.
- **End with the readiness card** (below), whatever the outcome. Partial is
  fine — a clear "ready for X, not yet for Y" beats false completeness.
- **Re-verify after fixing.** A fix isn't done until its check passes; a tool
  installed to PATH may need a terminal restart — say so if it does.

---

## The check-up

Work through five layers. Exact commands, install routes, and versions live in
`${PLUGIN_ROOT}/shared/microsoft-refs.md` — read it before running the checks.

### Layer 1 — core tools

git, Node.js LTS + npm, .NET SDK, the Power Platform CLI (pac), and optionally
the Azure CLI. For each: present? **functional?** recent enough? The two people
forget are the .NET SDK and git — both surface later as unrelated-looking
errors (solution packaging fails; plugin marketplaces won't add).

**Present on PATH is not the same as working.** Managed deployments (Intune,
MSI) often install a `pac.cmd` **shim** without the CLI package: `pac` resolves,
then the first real command fails with *"No Microsoft.PowerApps.CLI has been
installed."* Always run a real command (`pac help`) rather than trusting a PATH
lookup. The fix — `pac install latest` — is a **user-scoped NuGet install
needing no admin**, so it's self-service even on a locked-down corporate
device, and usually lands a newer version than IT deployed. Apply the same
scepticism to any tool a managed device claims to have.

**On managed/corporate devices, expect elevation to be the wall.** Machine-wide
installers (Azure CLI's MSI is the common one) fail at the UAC prompt with exit
code **1602** for a standard user. Distinguish clearly for the user between
what they can self-serve (user-scoped: `pac install latest`, dotnet global
tools, npm globals when the prefix is under their profile) and what genuinely
needs IT. Never leave them thinking a 1602 was their mistake.

### Layer 2 — identity & auth (the pain centre)

This is where real users lose the most time. Surface it, don't wait to be
asked:

- **Who are you signed in as, everywhere?** pac auth profiles (active one
  highlighted), and Azure CLI account if az is installed. Present a
  **connection card**: user, tenant, environment, profile name.
- **Profile hygiene.** Multiple cached profiles from different customers are
  normal on consultant machines — and invisible until they bite. List them all;
  offer to name unnamed ones per customer, delete stale ones, and select the
  right one for today's work.
- **Not signed in?** Work the **auth ladder**, don't stop at rung one:
  (1) device code (`--deviceCode`) — fully observable, relay the URL and code
  from output; (2) if Conditional Access blocks it (*"your sign-in was
  successful but does not meet the criteria to access this resource"*), fall
  back to **interactive** `pac auth create` — enterprises commonly block
  device-code flow by policy, and it can't satisfy device-compliance rules,
  whereas interactive on a compliant Entra-joined machine carries the device
  state; (3) if both fail, it's a policy exemption request — have the user grab
  the error code, correlation ID and timestamp from *More details* so IT can
  find the policy in the sign-in logs, and put it in the readiness card as
  blocked-on-IT. **Never claim a browser window opened; you can't see their
  screen.**
- **Switching tenant? Say the whole cost upfront.** Auth lives in three places
  — the Azure CLI token, the pac profile, and any MCP tool-server process
  (which cached its token at startup and only refreshes on a **full host-app
  quit and relaunch**; `/restart` resets the conversation, not the process).
  Run the runbook in `${PLUGIN_ROOT}/shared/microsoft-refs.md`, and treat the
  switch as done only when a fresh environment list matches the *target*
  tenant — never on a command's exit code.

### Layer 3 — agent runtimes

Which agent surfaces are installed and current: Claude Code, GitHub Copilot
CLI (minimum version matters — check `${PLUGIN_ROOT}/shared/microsoft-refs.md`),
and note the Copilot desktop app can't be detected from a terminal — ask.

### Layer 4 — plugins & marketplaces

Are the Power Platform plugin marketplaces registered, and the plugins the
user's work needs installed, in each runtime present on the machine? Exact
commands per runtime are in `${PLUGIN_ROOT}/shared/microsoft-refs.md`. Flag
version drift between runtimes — the same plugin at two versions behaves
confusingly differently.

### Layer 5 — MCP wiring

Optional but valuable: the Learn documentation server (remote, no auth) and
the pac CLI's built-in MCP server for natural-language environment operations.
Check whether they're reachable/registered; offer the wiring from
`${PLUGIN_ROOT}/shared/microsoft-refs.md` if not.

---

## The readiness card

Always finish with this, in this shape:

> ## Machine readiness
>
> | Layer | Status |
> |---|---|
> | Core tools | ✅ git · node 22 · dotnet 8 · pac 2.7.4 |
> | Identity | ✅ user@contoso.com · Contoso Dev (profile "ContosoDev", 1 of 3) |
> | Agent runtimes | ✅ Copilot CLI 1.0.73 · ⚠️ Claude Code not installed |
> | Plugins | ✅ flow-builder 0.1.6 · pcf-builder 0.1.2 (both runtimes) |
> | MCP wiring | ⚠️ Learn reachable · pac MCP not registered — want it? |
>
> **Ready to:** build flows, build PCF controls (Copilot CLI).
> **Not yet:** Claude Code work — install it if you need that runtime.
> **Fixed this session:** installed pac, named 2 auth profiles, removed 1 stale profile.

Every ⚠️/❌ line carries its one-line fix. Nothing is left as a mystery.

Offer the card as a **rendered HTML page** too (`machine-readiness.html` in
the working directory) per `${PLUGIN_ROOT}/shared/artifact-style.md` — useful
when the check-up is evidence for an IT request or an engagement record.

---

## Calibration

**"Am I set up?" / "new laptop"** → Full five-layer check-up, then the card.

**"Which account am I signed in as?"** → Layer 2 only. Connection card, profile
list, offer hygiene. Don't run the full check-up uninvited.

**"pac isn't working" / a tooling error pasted in** → Diagnose that layer
first, fix, then offer the rest: "want the full check-up while I'm here?"

**Another skill's preflight found gaps** → Run the layers that matter for that
build, report back in the card format.

**"Is my customer VM okay to set up?"** → Same checks, but flag every install
for explicit consent and note anything their IT policy might care about.

---

## Feeding back

Every check-up that hits a problem this file doesn't cover is a finding — add
the fix to `${PLUGIN_ROOT}/shared/microsoft-refs.md` (or draft it for the user to
contribute back if running from an installed copy). This checklist is only
valuable while it's current.
