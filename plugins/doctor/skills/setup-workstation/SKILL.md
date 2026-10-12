---
name: setup-workstation
description: >
  Take a machine from nothing to fully equipped for building Power Platform solutions with AI agents - installs the CLIs, SDKs, runtimes, Microsoft and Powercademy plugin marketplaces, workload plugins and recommended MCP servers, signs in, verifies everything works, and ends with a readiness card. The first thing to run on any new machine. Trigger whenever the user says "set up my machine", "set up my workstation", "setup workstation", "new laptop", "new machine", "first-time setup", "get me started", "install everything I need", "what do I need installed", "install the tools", "onboard this machine", "prepare my PC for Power Platform", or "add canvas / Pages / Copilot Studio / mobile to my setup". Covers the whole machine across every plugin - not one plugin's own first-run. If the task is installing or provisioning the toolchain on a machine, trigger. When in doubt, trigger.
---

# Setup Workstation — from nothing to ready

The first thing anyone runs. It installs what a Power Platform agent workstation
needs, in the right order, with consent — then proves it all works. Afterwards,
`check-setup` (the doctor) is where they go when something breaks.

**The single source of truth is `${PLUGIN_ROOT}/shared/toolchain-manifest.json`.**
Read it before doing anything. Every item, tier, check command, install command,
admin requirement and workload mapping lives there — never improvise an install
command from memory. If the manifest's `lastVerified` date is more than 90 days
old, say so up front: commands may have moved.

---

## Posture

- **The user never types a command.** Anything runnable, you run.
- **Plan once, consent once.** Inventory everything first, show one plan, get one
  "yes" — not install-ask-install-ask.
- **Offer before installing on a customer's machine.** Say whose machine it
  looks like if unsure, and ask.
- **User-scoped first.** Install everything that needs no admin rights before
  touching anything that does.
- **Never claim a side effect you cannot observe** — no "a browser has opened",
  no "installed" without a passing check.
- **A tool is installed when its check passes**, not when its installer exits 0.

---

## Step 1: Detect the machine

Establish, and state back in one short block:

- **OS** (Windows / macOS / Linux) — picks the install column in the manifest.
- **Agent runtime(s) present** — Copilot CLI, Claude Code, or both. Plugins get
  installed into every runtime present. The Copilot desktop app can't be
  detected from a terminal — ask whether they use it.
- **Admin rights** — can this user elevate? (Windows: check membership of the
  local Administrators group.) If not, every `admin`-scoped item becomes part of
  the IT request in Step 5.
- **Managed device signals** — Intune/MDM enrolment, Entra join. A managed
  corporate device changes the plan: expect elevation to fail and Conditional
  Access to block device-code sign-in.

---

## Step 2: Ask what they'll build

Offer the manifest's `workloads` as a short multi-select — flows, canvas apps,
model-driven apps, Power Pages, code apps, Copilot Studio, PCF, mobile, process
mining, ALM. "Not sure yet" is a valid answer: install the required tier only and
say they can re-run this any time to add a workload.

A workload with `variants` gets one follow-up question (its `question`, offering
its `options`); use its `default` if they don't mind. Its items are the union of
the chosen options' items.

Then offer the **recommended** tier as an opt-in, one line each with its *why*.
Default answer: yes to Microsoft Learn MCP (it underpins "verify, never recall"),
the user's choice for the rest.

---

## Step 3: Inventory before installing

Resolve the plan — required items + every chosen workload's items + opted-in
recommended items, plus everything they `dependsOn`. Then run each item's
**check** from the manifest and classify it:

| State | Meaning |
|---|---|
| ✅ ready | Check passes and meets `min` |
| ⬆ outdated | Present but below `min` — upgrade with the item's `update` command (else its install command), don't uninstall first |
| 🧩 shim | Resolves on PATH but doesn't function (pac's `failIfOutputMatches`) — use the item's `repair` |
| ⬜ missing | Not present |
| 🔁 bundled | Recommended MCP already provided by an installed plugin (`bundledIn`) — skip, don't double-register |

---

## Step 4: Show one plan, get one yes

> ## Workstation plan
> | Item | Now | Action | Needs admin |
> |---|---|---|---|
> | Node.js LTS | ⬆ 22.14 | upgrade to 24 | yes |
> | .NET 10 SDK | ⬜ | install | yes |
> | pac CLI | 🧩 shim | `pac install latest` | no |
> | Python 3.12 | ⬜ | install | no |
> | … | | | |
>
> **Already fine:** git, Copilot CLI 1.0.80
> **Will need IT:** .NET 10 SDK, Azure CLI (no admin rights on this machine)
>
> Go ahead?

Order follows dependencies: bootstrap → required → workload → recommended, and
`dependsOn` within each tier.

---

## Step 5: Install

Work the approved plan:

1. **User-scoped items first**, each followed immediately by its check.
2. **Admin items** — if the user can elevate, run them (they'll see an elevation
   prompt; say so before it appears). If they can't, or an install fails with
   UAC exit code **1602**, do not retry and do not imply it was their mistake:
   collect every admin item into an **IT request** (see below).
3. **PATH refresh.** A fresh install isn't on the current session's PATH. Refresh
   it in-session where the platform allows (see
   `${PLUGIN_ROOT}/shared/microsoft-refs.md`), re-run the check, and only if that
   still fails tell the user to open a new terminal.
4. **Marketplaces and plugins** — register each marketplace, then install each
   plugin, into **every runtime present**. Exact commands per runtime are in
   `${PLUGIN_ROOT}/shared/microsoft-refs.md`. New plugins and MCP servers load
   only after the agent restarts — say so, and say it once, at the end.

**The IT request** — when admin items can't be installed here, write
`it-request.md` into the working directory: one line per item with its exact
package ID from the manifest, the reason it's needed, and the endpoints the tools
must reach (nuget, npm, PyPI, GitHub, Microsoft Learn, Microsoft sign-in). Make it
paste-ready. Then carry on with everything that doesn't depend on those items.

---

## Step 6: Sign in

Two sign-ins matter, and both are the user's to complete:

- **pac** — work the auth ladder in `${PLUGIN_ROOT}/shared/microsoft-refs.md`:
  device code first, interactive when Conditional Access blocks it. Ask which
  environment in plain language; prefer a dev environment.
- **Azure CLI** — interactive by default (managed tenants often block device
  code), allowing for no subscriptions.

Finish with a **connection card**: user, tenant, environment, profile. Confirm
it's the right place.

---

## Step 7: Verify and hand over

Re-run every check in the plan. Then produce the **readiness card** (same shape
as `check-setup` uses) and write it, plus a short setup record, into the working
directory as `workstation-setup.md` with a rendered page per
`${PLUGIN_ROOT}/shared/artifact-style.md`:

> ## Workstation ready
> | Layer | Status |
> |---|---|
> | Core | ✅ node 24 · git · .NET 10 · pac 2.13 · az 2.81 · Python 3.12 |
> | Identity | ✅ user@contoso.com · Contoso Dev |
> | Runtimes | ✅ Copilot CLI 1.0.80 · ✅ Claude Code |
> | Plugins | ✅ dataverse · power-automate · flow-builder · conventions · doctor |
> | Recommended | ✅ Learn MCP (bundled) · ✅ Playwright (bundled) |
> | Waiting on IT | ⏳ Azure CLI — see `it-request.md` |
>
> **Restart your agent now** so the new plugins load.
> **Try first:** *"spec a flow that emails me when a Dataverse case is escalated"*

Give one "try first" prompt per chosen workload. Tell them that from now on, if
anything stops working, they say **"check my setup"**.

---

## Re-running

Re-running is how workloads get added. Skip everything already ✅, show only the
delta in the plan, and never reinstall something whose check passes.

## Calibration

**"Set up my new laptop"** → Full flow, Steps 1–7.

**"Add Copilot Studio to my setup"** → Skip to Step 3 for that workload's items only.

**"Is my machine set up properly?" / something's broken** → That's `check-setup`, not this skill. Hand over.

**Customer's VM** → Ask before installing anything, prefer user-scoped items, and expect the IT request.

## Reference files

- `${PLUGIN_ROOT}/shared/toolchain-manifest.json` — **the source of truth**: items, tiers, checks, install commands, workloads.
- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — marketplace/plugin commands per runtime, PATH refresh, auth ladder.
- `${PLUGIN_ROOT}/shared/artifact-style.md` — the rendered setup record.
