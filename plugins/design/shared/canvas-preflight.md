# Preflight — the skill's own onboarding

The user should never have to know a command name, read a checklist, or guess
what's missing. The moment they express intent — *"plan a canvas app"*,
*"connect me to my tenant"* — run this onboarding yourself, in plain language,
doing the work for them.

## Posture

- **Do the work, don't prescribe it.** They describe intent; you run the
  commands. They never type `pac` anything.
- **Narrate briefly**, and surface any gap plainly with the fix offered — never
  let a missing tool fail silently and leave them guessing.
- **Offer before installing on a customer's machine.** Say what you'd run and
  why, get a yes, then do it.
- **Only the irreducibly-manual stays with the user:** completing a browser
  sign-in, and licences/roles someone else controls.

## The onboarding sequence

**1. Is the tooling here — and working?**
Check the `pac` CLI **functions** (`pac help`), not merely that it resolves —
managed deployments can leave a shim on PATH with no CLI behind it, fixed
self-service with `pac install latest` (**no admin needed**). For generation
you also need Microsoft's canvas authoring tooling and **.NET 10+**; see
`${PLUGIN_ROOT}/shared/microsoft-refs.md`. If the canvas tooling isn't
installed, say so early — planning still works, but generation won't.

**2. Are you connected — and to the right place? Lead with the connection card.**
Surface *who they're connected as* unprompted: run `pac auth who` (and
`pac auth list` if several profiles exist) and present user, tenant,
environment, profile, plus "is this the right place?". Multiple cached profiles
→ list them and let them pick (`pac auth select`); offer `pac auth name` to
label profiles per customer.

If not connected, work the **auth ladder** in
`${PLUGIN_ROOT}/shared/microsoft-refs.md`: device code first (observable),
interactive fallback when Conditional Access blocks it, then a policy-exemption
request with the correlation ID. **Never claim "a browser has opened"** — you
cannot see their screen. After any auth change, verify with evidence: re-list
and compare against the *target* tenant, because a sign-in can succeed against
the wrong one and look identical to success.

**3. Where does the app live?**
Confirm the target **environment** and **solution** (`pac solution list`), and
whether this is dev or something closer to production. Canvas apps built
outside a solution are painful to move later — flag it if there isn't one.

**4. What are the real data volumes?**
Ask, at onboarding, for the row counts of the tables the app will touch — today
and in a few years. This is not a detail for later: it determines the
delegation strategy, and therefore the data source, and therefore the whole
architecture. If the answer is "I don't know", that's an open question to chase,
not a number to assume.

**5. Can you reach Microsoft Learn?**
Confirm a route for delegation verification (Learn MCP tools if present, else
web fetch — see `${PLUGIN_ROOT}/shared/microsoft-refs.md`). Memory is not a
route.

## What is never the skill's job

Licences, security roles, DLP policies, and admin consent live with the user's
organisation. When one blocks the work — a premium connector blocked by DLP, a
missing licence — name it precisely, say who can fix it, record it in the plan's
**Open questions**, and don't attempt a workaround.

## Feeding back

A gap this sequence didn't cover is a finding: add it here, and keep the
repo-level `PREREQUISITES.md` in step.
