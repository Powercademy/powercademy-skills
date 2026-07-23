# Preflight — the skill's own onboarding

The user should never have to know a command name, read a checklist, or guess
what's missing. The moment they express intent to connect or build — *"connect
me to my tenant"*, *"let's build a flow"*, *"spec a flow that…"* — run this
onboarding yourself, in plain language, doing the work for them.

## Posture

- **Do the work, don't prescribe it.** When the user says "connect me to
  Contoso", *you* run the auth command. They say the tenant in natural
  language; you translate it into the command. They never type `pac` anything.
- **Narrate, don't dump.** "Let me check you're connected… you're not yet —
  what's the environment URL?" beats a silent check or a raw table. The user
  should always know what you're doing and why.
- **Offer, then act — especially on a customer's machine.** Installing software
  or changing state on a customer tenant VM is not something to do silently.
  Say what you'd run and why, get a yes, then do it. Consultants live in
  customer environments; surprise installs are not okay there.
- **Never let a gap be silent.** A missing tool or plugin is a *finding you
  surface* — name it, say why it matters, offer the fix — never a capability
  that quietly degrades and leaves the user wondering why something didn't work.
- **Only the irreducibly-manual stays with the user:** completing a browser
  sign-in, and licences/roles/DLP that someone else controls. Everything else,
  you handle.

**Preferred mechanism:** where the pac CLI's built-in MCP server is available
in the session (see `shared/microsoft-refs.md`), use its tools for these steps
rather than shelling out — it's the native natural-language path, so the user
says "connect me to Contoso" and you make a tool call, not a command string.
Where it isn't available, run the `pac` commands below directly. Auth still
ends in a browser sign-in either way — that part is always the user's.

## The onboarding sequence

Each step: check → if there's a gap, explain it and offer the fix → do it (on
consent) → confirm out loud. Stop and resolve a gap before moving on.

**1. Is the tooling here?**
Check the Power Platform CLI is available (`pac help`). If not: *"The Power
Platform CLI isn't installed — I can add it with `winget install --id
Microsoft.PowerAppsCLI -e` (or via dotnet). On this VM, okay for me to run
that?"* Then run it. If neither winget nor dotnet exists, hand the user
https://aka.ms/PowerPlatformCLI.

**2. Are you connected — and to the right place?**
Check existing auth (`pac auth list`) and where it points (`pac org who`). If
not connected, ask for the environment in natural language: *"Which environment
— paste the URL, or tell me the org."* Then run it for them:
`pac auth create --environment <url>`, and say plainly: *"A browser will open —
sign in with your maker account. That sign-in is the one part I can't do for
you."* Confirm afterwards: *"You're connected to **<env>** as **<user>** — is
that the right tenant?"* Always confirm the tenant before any grounding or
write; the cost of assuming is a spec against the wrong org.

**3. Where are we building?**
List solutions (`pac solution list`) and confirm which unmanaged solution the
flow belongs in. If it's unclear, ask — don't assume. Builds belong in a dev
environment; if this looks like production, say so.

**4. Do you want a spec to hand-build, or should I build it for you?**
This is a capability choice, so surface it rather than assuming. By default
this skill produces a spec you build in the designer — no other plugin needed.
If the user would rather the agent *execute* the flow, that needs Microsoft's
Power Automate plugin. Check whether its tools are already available in the
session; if not, tell the user what it adds and point them to the exact install
commands in `shared/microsoft-refs.md`. Either way the build proceeds — one
path just hands them a spec, the other drives the designer for them.

**5. Can you reach Microsoft Learn?**
Confirm a route for Step 2 verification (Learn MCP tools if present, else web
fetch). See `shared/microsoft-refs.md`. Memory is not a route.

## What is never the skill's job

Licences, security roles, DLP policies, and admin consent live with the user's
organisation. When one blocks a build (a connector blocked by DLP, a missing
Power Automate licence, a Teams access policy), name it precisely, say who can
fix it, record it in the spec's **Open questions**, and do not attempt a
workaround.

## Feeding back

A gap this sequence didn't cover is a finding: add it here, and if a human did
something the skill could have done, extend it (or `scripts/install.js`). The
repo-level `PREREQUISITES.md` is the human-facing summary of this file — keep
the two in step.
