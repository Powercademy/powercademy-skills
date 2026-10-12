---
name: check-setup
description: >
  Diagnose and repair an existing Power Platform development toolchain - CLIs, auth profiles, agent runtimes, plugins, MCP wiring - finding what's broken, outdated or misconfigured, repairing it with consent, and ending with a readiness card. Trigger whenever the user says "check my setup", "is my setup ok", "something's broken", "doctor", "my auth is a mess", "which account am I signed in as", "why isn't pac working", "wrong tenant", "is anything out of date", "my plugins aren't loading", or hits any environment, tooling or authentication error while doing Power Platform work. Also trigger when another skill's preflight finds a tool that exists but doesn't work. For a fresh machine or adding a workload, setup-workstation runs instead - this skill checks and repairs what's already there. If the task is diagnosing or repairing the local toolchain, trigger. When in doubt, trigger.
---

# Doctor — check and repair

`setup-workstation` builds the machine. This skill is for afterwards: when
something stops working, goes stale, or nobody's sure which tenant they're
signed into. It diagnoses everything first, repairs with consent, and proves the
repair worked.

**What to check comes from `${PLUGIN_ROOT}/shared/toolchain-manifest.json`** —
the same source of truth setup-workstation installs from, so the two can never
disagree about what "set up" means. Read it before running checks.

---

## Posture

- **Diagnose everything before repairing anything.** Run all checks, then show
  one findings table — not fix-check-fix-check whiplash.
- **Repair, don't provision.** Broken, outdated, shimmed, misconfigured, stale
  auth — those are yours. **Missing items and new workloads are
  setup-workstation's job**: list them as findings and hand over ("3 items
  aren't installed — run setup-workstation to add them").
- **Repair with consent, in one batch.** On a customer's machine, never act
  silently.
- **The user never types a command.** Only browser sign-ins and admin-held
  permissions stay with them.
- **A repair isn't done until its check passes.**

---

## The check-up

Five layers. Exact commands live in the manifest and in
`${PLUGIN_ROOT}/shared/microsoft-refs.md`.

### Layer 1 — tools

For every manifest item the machine *has*: does its check pass, and does it meet
`min`? Classify as ✅ ready · ⬆ outdated · 🧩 shim · ⬜ missing (→ setup-workstation).

**Present on PATH is not the same as working.** Managed deployments (Intune,
MSI) often install a `pac.cmd` **shim** with no CLI behind it: `pac` resolves,
then every real command fails with *"No Microsoft.PowerApps.CLI has been
installed."* Always run the real check command. The repair — `pac install
latest` — is **user-scoped and needs no admin**, so it's self-service even on a
locked-down device. Apply the same scepticism to anything a managed device
claims to have.

**Known failure signatures live in the manifest.** If a check's output matches
`failIfOutputMatches` (the shim) or an entry in the check's `diagnose` list,
run the `repair` it names — e.g. pac's *"You must install .NET to run this
application"* on macOS/Linux means .NET sits outside its default folder and
`DOTNET_ROOT` must be set. A repair's `setEnv` applies to the current session
too, so the re-check can pass before a new terminal is opened.

**Outdated is a finding in its own right.** Node below the manifest's minimum,
Copilot CLI below the plugin-command floor, .NET below what the canvas tooling
needs, pac below what the Dataverse skills need — each causes errors that look
unrelated. Upgrade in place with the item's `update` command where it has one,
otherwise its install command.

**On managed devices, elevation is the wall.** Machine-wide repairs fail at UAC
with exit code **1602** for a standard user. Never leave them thinking that was
their mistake — route it to an IT request.

### Layer 2 — identity & auth (the pain centre)

This is where real users lose the most time. Surface it unprompted:

- **Who are you signed in as, everywhere?** pac auth profiles (active one
  highlighted) and the Azure CLI account. Present a **connection card**: user,
  tenant, environment, profile name.
- **Profile hygiene.** Multiple cached profiles from different customers are
  normal on consultant machines — and invisible until they bite. List them,
  offer to name unnamed ones per customer, delete stale ones, and select the
  right one for today.
- **Not signed in?** Work the **auth ladder**: device code first; interactive
  when Conditional Access blocks it (*"your sign-in was successful but does not
  meet the criteria to access this resource"*); if both fail, a policy-exemption
  request with the error code, correlation ID and timestamp from *More details*.
  **Never claim a browser window opened; you can't see their screen.**
- **Switching tenant? Say the whole cost upfront.** Auth lives in three places —
  the Azure CLI token, the pac profile, and any MCP tool-server process, which
  cached its token at startup and only refreshes on a **full host-app quit and
  relaunch**. Run the runbook in `${PLUGIN_ROOT}/shared/microsoft-refs.md`, and
  treat the switch as done only when a fresh environment list matches the
  *target* tenant.

### Layer 3 — agent runtimes

Which runtimes are installed and are they current? The Copilot desktop app
can't be detected from a terminal — ask.

### Layer 4 — plugins & marketplaces

Are the marketplaces registered and the plugins **loading**? Flag version drift
between runtimes — the same plugin at two versions behaves confusingly
differently. A plugin that installed but won't load usually means the agent
needs a restart, or a skill file is failing in one runtime only.

**Retired plugins.** Anything in the manifest's `retired` list that is still
installed is a finding: say what replaced it (`replacedBy`) and offer its
`action` — usually uninstall from every runtime — with consent, like any other
repair. A retired plugin left behind competes for triggers with its
replacement.

### Layer 5 — MCP wiring

Are the MCP servers the user relies on connected? Don't probe the Learn
endpoint with a plain fetch — a **405 means alive**. A server bundled by two
plugins and also registered by hand is duplication worth tidying.

---

## The readiness card

Always finish with this:

> ## Machine readiness
>
> | Layer | Status |
> |---|---|
> | Tools | ✅ git · node 24 · .NET 10 · Python 3.12 · ⬆ pac 2.10 → upgrade |
> | Identity | ✅ user@contoso.com · Contoso Dev (profile "ContosoDev", 1 of 3) |
> | Agent runtimes | ✅ Copilot CLI 1.0.80 · ⚠️ Claude Code not installed |
> | Plugins | ✅ dataverse · power-automate (both runtimes) · ⚠️ drift: pcf-builder 0.1.4 vs 0.2.0 |
> | MCP wiring | ✅ Learn (bundled) · ⚠️ pac MCP not registered |
>
> **Repaired this session:** upgraded pac, named 2 auth profiles, removed 1 stale profile.
> **Not installed (run setup-workstation to add):** Azure CLI.

Every ⚠️/❌ line carries its one-line fix. Offer the card as a rendered page
(`machine-readiness.html`) per `${PLUGIN_ROOT}/shared/artifact-style.md` —
useful as evidence for an IT request.

---

## Calibration

**"Check my setup"** → Full five-layer check-up, then the card.

**"Set up my new laptop" / "add canvas to my setup"** → That's setup-workstation. Hand over.

**"Which account am I signed in as?"** → Layer 2 only. Connection card, profile list, offer hygiene.

**"pac isn't working" / a tooling error pasted in** → Diagnose that layer first, repair, then offer the rest.

**Another skill's preflight found a broken tool** → Run the layers that matter for that build, report in card format.

---

## Feeding back

A failure this check-up didn't cover is a finding — add the check to the
manifest (or the fix to `${PLUGIN_ROOT}/shared/microsoft-refs.md`), or draft it
for the user to contribute back when running from an installed copy.
