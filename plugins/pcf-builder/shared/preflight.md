# Preflight — the skill's own onboarding

The user should never have to know a command name, read a checklist, or guess
what's missing. The moment they express intent — *"build a PCF control that…"*,
*"connect me to my tenant"* — run this onboarding yourself, in plain language,
doing the work for them.

## Posture

- **Do the work, don't prescribe it.** When the user names a tenant or a target
  app, *you* run the commands. They describe intent; you translate it.
- **Narrate, don't dump.** Say what you're checking and why, not a silent scan
  or a raw table.
- **Offer, then act — especially on a customer's machine.** Installing a
  toolchain or changing state on a customer VM is not something to do silently.
  Say what you'd run and why, get a yes, then do it.
- **Never let a gap be silent.** A missing tool is a *finding you surface* —
  name it, say why it matters, offer the fix.
- **Only the irreducibly-manual stays with the user:** completing a browser
  sign-in, and licences/roles someone else controls.

**Preferred mechanism:** where the pac CLI's built-in MCP server is available
(see `${PLUGIN_ROOT}/shared/microsoft-refs.md`), use its tools for environment/solution steps
rather than shelling out. Otherwise run the `pac` commands directly.

## The onboarding sequence

Each step: check → if there's a gap, explain it and offer the fix → do it (on
consent) → confirm. Resolve a gap before moving on.

**1. Is the build toolchain here?**
PCF needs **Node.js LTS** (`node --version`), **npm**, the **pac CLI**
(`pac help`), and a **.NET SDK** for solution packaging (`dotnet --version`).
For anything missing, offer the install (`winget install …` / the vendor link
in `${PLUGIN_ROOT}/shared/microsoft-refs.md`) and, on a yes, run it. Node and the .NET SDK are
easy to forget — check them up front, because their absence surfaces as a
confusing build error three steps later.

**2. Are you connected — and to the right place? Lead with the connection card.**
Before anything else, surface *who the user is connected as* unprompted — never
make them ask. Run `pac auth who` (and `pac auth list` if profiles exist) and
present a **connection card**: user, tenant, environment, profile name, and
"is this the right place?". Multiple cached profiles → list them and ask which
(`pac auth select`); offer `pac auth name` to label profiles per customer —
cached-auth confusion is a known time sink.

If not connected, authenticate with the **device-code flow**:
`pac auth create --environment <env> --deviceCode` — fully observable in agent
sessions. Present the code and URL from the command output: *"Go to <url> and
enter code **XXXX-XXXX** — tell me when you're done."* **Never claim "a browser
has opened"** — you cannot observe it. Re-run `pac auth who` afterwards and
show the card to confirm. PCF is online-only, so also confirm the target isn't
on-premises.

**After any auth change, verify with evidence** — re-list and compare against
the *target* tenant; a sign-in can succeed against the wrong one. MCP-served
tools cache their token at process start: a tenant switch needs a full host-app
quit and relaunch (`/restart` only resets the conversation) — say so upfront.
Never fix CLI auth by sending the user to sign into a website.

**3. Where does the control live?**
Confirm the **publisher prefix** and **solution** the control belongs in
(`pac solution list`), and the **target app** (model-driven or canvas — some
APIs differ). These are painful to change after the first deploy, so pin them
now, not later. If there's an existing controls repo, match its setup.

**4. Can you reach Microsoft Learn?**
Confirm a route for Step 3 verification — especially the *licensing* check
(premium vs standard). Learn MCP tools if present, else web fetch. See
`${PLUGIN_ROOT}/shared/microsoft-refs.md`. Memory is not a route.

## What is never the skill's job

Licences, security roles, and admin consent live with the user's organisation.
When one blocks a build — most often the **premium licensing** a component's
external calls trigger — name it precisely, say who can fix it, record it in the
plan's **Open questions**, and don't attempt a workaround.

## Feeding back

A gap this sequence didn't cover is a finding: add it here, and if a human did
something the skill could have done, extend it (or `scripts/install.js`). Keep
the repo-level `PREREQUISITES.md` in step.
