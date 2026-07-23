# Power Automate Build — Gotchas Log

Accumulated failures, each of which cost real time once. Read before writing a spec. Append after any session that teaches something new.

Format per entry: **Symptom** → **Cause** → **Fix**. Keep them short and mechanical.

---

## Contents

1. [Designer behaviour](#designer-behaviour)
2. [Expressions](#expressions)
3. [Parse JSON](#parse-json)
4. [HTTP actions and Microsoft Graph](#http-actions-and-microsoft-graph)
5. [Child flow patterns](#child-flow-patterns)
6. [Environment variables and ALM](#environment-variables-and-alm)
7. [Testing when a dependency is unavailable](#testing-when-a-dependency-is-unavailable)
8. [Anti-patterns seen in the wild](#anti-patterns-seen-in-the-wild)

---

## Dual-runtime portability

**A bare `shared/x.md` reference in a SKILL.md fails to load — it resolves relative to the skill folder, not the plugin root.**
The shared files live at `<plugin>/shared/`, but a SKILL.md sits at `<plugin>/skills/<name>/SKILL.md`. Writing "read `shared/gotchas.md`" makes the agent look for `<plugin>/skills/<name>/shared/gotchas.md` — which doesn't exist ("Path does not exist"). The skill limps on from its inline text but never reads its own gotchas or preflight.
→ Reference plugin-root files as `${PLUGIN_ROOT}/shared/x.md` — the convention Microsoft's own dual-runtime skills use, which both Claude Code and Copilot expand to the plugin directory. The repo lint enforces this now. Caught live on the first Copilot desktop-app run.

**GitHub Copilot CLI rejects skill descriptions over 1024 characters; Claude Code does not.**
A description of 1025+ chars loads fine in Claude Code and fails in Copilot CLI with *"Skill description must be at most 1024 characters"* — the skill silently doesn't load in that runtime. Because it only fails on one side, it survives any Claude-Code-only test.
→ Keep every skill description ≤ 1024 characters, with margin. The repo lint (`scripts/lint/lint-skills.js`) enforces this now — but the lesson is general: a constraint present in one runtime and absent in the other must be encoded mechanically, because half your test surface won't see it.

---

## Designer behaviour

**Action descriptions truncate at 255 characters, silently.**
No warning, no error. The description is simply cut mid-word.
→ Write every description under 255 characters. Verify by counting, not by eye. In a spec, put all descriptions in one appendix table so they can be checked in a single pass.

**Condition has no advanced mode. Filter array does.**
Writing a Condition as a single `@equals(...)` or `@and(...)` expression will not work — Condition is always left value / operator / right value.
→ Put the whole expression in the **left** box and compare to a literal on the right. For multiple clauses, add rows and group with **And**/**Or**. Only `Filter array` accepts a single boolean expression via "Edit in advanced mode".

**Boolean literals typed into a Condition's right box become strings.**
Typing `false` stores the string `"false"`, which never equals the boolean `false`. The condition silently always takes the same branch.
→ Click the box, open the expression editor (fx), and enter `true` / `false` there.

**Typing `[]` into an Array variable's initial value can store the string `"[]"`.**
`Append to array variable` then fails at runtime with a type mismatch.
→ Leave the value box **empty**. The designer treats that as a real empty array.

**Header key/value boxes serialise into JSON.**
A header value containing unescaped double quotes — e.g. `outlook.timezone="UTC"` — produces *"Enter a valid JSON."*
→ Either omit the header, or use the header block's code view with escaped quotes: `{ "Prefer": "outlook.timezone=\"UTC\"" }`

**`Select` in key/value mode returns objects, not strings.**
An array of objects where you expected an array of strings breaks downstream `union()` and loops.
→ Switch the map to **text mode** (icon on the right) and supply a single expression.

**Variables cannot be initialised inside a Scope.**
→ All `Initialize variable` actions must sit at the top level, before the scope.

**Action names must be unique within a flow.**
Easy to miss when specs describe a repeated action ("increment the skip counter") in several branches. The designer rejects the duplicate.
→ Suffix by cause: `Increment_varSkipped_no_meeting`, `_already_set`, `_no_hubspot`. The names then double as run-history diagnostics — you can see *why* an item was skipped without opening the action.

**A spec that says "append the join URL" is incomplete.**
Whenever an action takes a value, give the value. For diagnostic arrays, append an object with enough context to be useful later (the identifier, the count that was wrong, a timestamp), not a bare string.

**Markdown headings are flat; flows are not.**
A spec listing `Compose_X`, `Condition_Y`, `Do_Z` as consecutive headings reads as three sibling actions. In the designer they may be nested three levels inside true-branches. The reader builds it flat, and nothing works.
→ Always include an ASCII nesting tree, and a `Placement:` line on every nested action naming its container and branch.

**Condition names can read backwards from their property.**
`Condition_not_already_flagged` with left value `coalesce(recordAutomatically, false)` compared to `false` — the **true** branch means "proceed". Name conditions after the branch semantics, then say so explicitly.

---

## Expressions

**`union(x, x)` is the idiomatic distinct.**
`@union(body('Select_thing'), body('Select_thing'))` de-duplicates an array against itself.

**`?[]` is the null-safe accessor.** `triggerBody()?['value']`, not `triggerBody()['value']`. Missing `?` throws where the property is absent rather than returning null.

**`coalesce()` before comparing anything that might be absent.**
A property that is *missing* is not `false`, `0`, or `''`. `null` equals none of them.
→ `@coalesce(outputs('X')?['flag'], false)`

**Comparing datetimes: normalise the kind.**
Some APIs return UTC values with no `Z` suffix (Graph `start.dateTime` returns `2026-07-10T10:00:00.0000000` with a sibling `timeZone: "UTC"`). `ticks()` on an unspecified-kind string against `ticks(utcNow())` is not reliably an apples-to-apples comparison.
→ `ticks(concat(item()?['start']?['dateTime'],'Z'))`

**FetchXML injected from a variable is an injection surface.**
A value containing `&` or `<` breaks the XML.
→ `@{replace(replace(outputs('X'),'&','&amp;'),'<','&lt;')}`

---

## Parse JSON

**"Use sample payload to generate schema" produces schemas that fail in production.**
The generator marks every property it saw as `required` and infers types from that one sample. A nullable object (e.g. `onlineMeeting` on a non-Teams calendar event) is typed as a non-nullable `object` and throws the first time a `null` arrives.
→ Hand-write the schema. Declare only the properties you read. Mark nothing `required`. Widen nullable properties to `["object", "null"]` / `["string", "null"]`.

**Parse JSON is often optional.**
`?[]` accessors null-guard on their own. Parse JSON buys designer intellisense and legible early failure. If it fights you, delete it and read the HTTP body directly.

---

## HTTP actions and Microsoft Graph

**The literal word `Bearer` and a space must precede the token.**
Pasting only the token output yields a 401 that looks like a permissions failure.
→ `Bearer @{outputs('Compose_access_token')}`

**Reads do not imply writes.**
A solution reading a resource today says nothing about whether the app registration can write it. Check the *operation's* permission table, not the resource's.

**`404 MailboxNotEnabledForRESTAPI`** — the account has no Exchange Online mailbox: no licence, disabled, guest, or on-prem hybrid.
Not a bug. In a sweep across a group, treat as a **skip**, not an error — otherwise a single mailbox-less member writes an error row on every run, forever.
→ Set the HTTP action to **Continue on failure**, then gate on `statusCode = 200`.

**Consultants are usually guests in the customer tenant.**
An app-only token scoped to the customer's tenant cannot read a guest's calendar — their mailbox lives elsewhere.
→ Testing needs a licensed user *in that tenant*. Establish this before promising a timeline.

**Teams `onlineMeetings` endpoints require the Entra object ID, not the UPN.**
Other endpoints (e.g. `calendarView`) accept either. This one fails in a way that looks like an encoding problem.

**Teams application access policy is separate from Graph scopes.**
App-only calls against `/users/{id}/onlineMeetings` need `New-CsApplicationAccessPolicy` + `Grant-CsApplicationAccessPolicy` **as well as** the Graph permission. Read *and* write both require it.
Documented 403: `"No application access policy found for this app <appId> on the user"` — that string means the policy, not the scope.

**Do not infer the policy exists because production works.** A policy covering production users will still 403 for a test or service account that isn't in scope. This inference was made and falsified on a real build.

**Grants can be per-user (`-Identity`), per-group (`-Group`), or tenant-wide (`-Global`).** The Learn *concept* page documents only `-Identity` and `-Global`; the **cmdlet reference** shows a `GrantToGroup` parameter set. Read the cmdlet reference, not just the concept page — a task-oriented doc can omit a parameter set entirely and mislead you into recommending per-user maintenance that isn't needed.

Changes take **up to 30 minutes** to propagate. A retry immediately after the grant will still 403 — don't debug during that window.

**"Test environment" may mean a live group with a test account added to it.**
Before designing a test plan around an environment variable pointing at a "test group", confirm the group is actually a test group. If it isn't, the orchestrator/fan-out flow must never be triggered, and its member list must be mocked instead. Ask; don't assume the isolation you designed for exists.

**Graph URLs in `$filter` values may already be percent-encoded.**
Graph returns `joinUrl` pre-encoded (`%3a`, `%40`, `%7b`). Wrapping in `uriComponent()` double-encodes and matches nothing.
→ Pass raw first. Only reach for `uriComponent()` if a known-good value returns zero results.

**`calendarView`, not `/events`, for "meetings in a window".**
`calendarView` expands recurring series into individual occurrences. `/events` returns the series master, whose start date may be months in the past and would be silently filtered out.

**Retry policy: `fixed` for Key Vault, `exponential` for Graph.**
Graph throttles under load and returns 429. Fixed retry against a throttled endpoint extends the throttle.

---

## Child flow patterns

**Never use `Terminate` inside a child flow.**
`Terminate` ends the run immediately, so the `Response` action never executes, and the parent's `Run a Child Flow` gets nothing back. Its `success` check has nothing to read.
→ Handle failure with `runAfter` chaining so `Response` always runs.

**The house contract in most solutions: child flows never fail.**
They return `{ success: false, errorDetails: {...} }` and let the orchestrator decide. Keeps run history from filling with red for normal outcomes (e.g. "this isn't a HubSpot meeting").
→ The orchestrator must then *inspect the payload*, because `Run a Child Flow` will always report success.

**Response envelopes get unwrapped inconsistently across a solution — check the callee, not the caller.**
The unwrap expression is a property of the child flow's own `Response` action, not of the calling flow's house style. Two shapes commonly coexist:

| Response action | Body | Caller reads |
|---|---|---|
| `Respond to a PowerApp or flow` (kind `PowerApp`) | `{ "response": "@{variables('varResponse')}" }` | `json(body('X')?['response'])?['result']?['thing']` |
| `Response` (kind `Http`) | `@variables('varResponse')` | `body('X')?['result']?['thing']` |

Copying the first expression to call a flow of the second kind throws *"The template language function 'json' expects its parameter to be a string or an XML. The provided value is of type 'Null'"* — `?['response']` was null. Open the child flow, look at its `Response` action, then write the expression.

**Logging-only inputs can usually be passed as `"0"`.**
Verify first: check whether the target column is plain text (often wrapped in `coalesce`) or a Dataverse lookup bind. Text is safe. Lookups are not.

**"Not found" is not an error — but shared child flows often disagree.**
A lookup CF written for a pipeline that only calls it on known-good records will index `results[0]` unconditionally. Reuse it in a sweep, where most lookups legitimately find nothing, and every miss produces a failed scope, an error response, *and* a row in the error log. Volume matters: once per processing run is invisible; once per meeting per user per 30-minute sweep is thousands of rows a day.

Before reusing a lookup child flow at higher volume, check what it does when the search returns zero results. Fix it in the child (a Condition on `length(body('Search')?['results'])`) rather than swallowing the error in the caller — and get the owner's agreement first, because other flows depend on its behaviour.

**Condition run-results can't render `body()`.** *"The following functions could not be evaluated: body"* on a condition row is a **display** limitation, not an evaluation failure. Check the branch actually taken rather than trusting the per-row icons.

**Child flow trigger schemas can skip keys.** A `Request` trigger's inputs may run `text`, `text_1`, `text_3`, `text_4` — with no `text_2`. Map by the designer's **label**, never by position. And check the `required` array: optional fields fail silently at runtime rather than in the designer.

**Error handlers are parallel branches, not links in the chain.**
An action whose `runAfter` is `[Failed, TimedOut, Skipped]` is **skipped** when its predecessor succeeds. If the next action in the happy path runs after *it*, that skip propagates and the whole success path dies silently — the run still reports green, because the response envelope was never overwritten.
→ The error handler must be a **dead end**: nothing depends on it. The success path runs after the *same* predecessor, on `Succeeded`. Two siblings, not a sequence.

**A converging `Response` needs multiple predecessors — and `runAfter` across them is an AND, not an OR.**
Every listed predecessor must land on one of *its* listed statuses, or the action is skipped. A converging action therefore needs **all four statuses ticked on every predecessor**: on a failure run the success-setter is `Skipped`, and without *is skipped* ticked the AND fails and the convergence point never fires.

In a child flow this is silent and severe: `Response` is skipped, the caller's `Run a Child Flow` receives nothing, and the orchestrator's `success` check has no payload to read. The run still reports green.

**Watch for the error-handler overwrite.** If a scope is *skipped* because an upstream action failed, an error handler with `runAfter: [..., Skipped]` on that scope will also fire — overwriting the earlier, more specific error code with a generic one. Untick *is skipped* on the downstream handler, or accept that only the last error code reaches the log.

**Know which scope your test actually breaks.** Sabotaging an action to test an error path only exercises the handler attached to *that action's* container. Breaking a Compose inside a scope fails the scope, not the child flow call above it — so you get the scope's error code, not the auth one. Check where the action sits before predicting the branch.

**A named error-handler scope is usually three actions, not one.**
`Scope → Condition (success = false) → Run a Child Flow`. Read the existing implementation and copy it verbatim rather than describing it. "Add a Log_Error scope" is not a specification.

---

**Name the connector, not just the operation.**
"Office 365 Groups → List group members" is precise. "List group members" is not — searching *group* in the designer surfaces `Office 365 Users` (which has `Get direct reports` and looks plausible), `Office 365 Groups`, and `Azure AD`, all with overlapping operations.
→ Give the connector's API name too (`shared_office365groups` / `ListGroupMembers`) and check it against the solution's existing connection references. Picking a different connector means a new connection reference, which means a solution change and per-environment configuration.

**Never copy a solution flow with "Save As" to get a scratch version.** The copy lands outside the solution, where environment variables don't resolve (`parameters()` returns nothing), `Run a Child Flow` can't reach children in the original solution, and connection references become connections owned by you. It will look like a copy and behave like a different flow.

**Prefer a permanent, environment-driven guard over throwaway test scaffolding.**
If a solution already has a test-mode environment variable, gate the dangerous write on it plus an allow-list. In production the flag is off, the condition short-circuits, and writes proceed. In dev only allow-listed identifiers are written to. Nothing is torn down, so nothing is forgotten — and the next person to touch the flow inherits the protection without reading a runsheet.

Then invert the deploy check: instead of *"did we remove the gate?"*, ask *"is the test-mode flag off in production?"* A gate left in place with the flag on means the flow silently does nothing.

## Environment variables and ALM

**Build in the dev environment that holds the unmanaged solution.**
Anything built in a downstream environment gets overwritten on the next managed deployment.

**Environment variables are the test-isolation boundary.**
A group ID in an environment variable lets dev/UAT point at a dummy group while production points at the real one — with no flow changes. This is usually the *entire* safety mechanism. Verify it resolves correctly before enabling any recurrence.

**An environment variable needs a value, not just a definition.**
A definition with no Default Value and no Current Value in the environment fails at save with *"Attribute 'value' was not found for environment variable ..."* — `parameters()` has nothing to resolve. Blank is absent, not empty.
→ Always give a **Default Value**, even a placeholder. Choose one that is *fail-closed* for whatever the variable gates: an allow-list should default to a string that matches nothing, not to empty.

**Default Value travels with the solution; Current Value is per-environment and overrides it.** Set defaults once; set current values only where they differ. A current value set in dev does not follow the solution downstream, which is usually what you want for test scaffolding.

**The `parameters()` string is `Display name (schema_name)`.**
Exact. Don't type it from a spec — create the variable, then use the designer's dynamic content picker and let it write the string.

**Solution flows are created disabled.** Keep them that way until the group/scope they resolve to has been verified.

**A custom connector must belong to *a* Dataverse solution before any solution referencing its connection reference can export.**
Error: *"Exporting connection reference ... requires the custom connector to be added to a dataverse solution."*
→ Add it to any unmanaged solution. Needs edit rights on the connector (its sharing is separate from the flow's).

---

## Testing when a dependency is unavailable

**Mock at the child-flow boundary, not inside the child flow.**
When an integration (CRM, external API) can't be reached in dev, replace the *consumer* of its output — usually a Compose — with a literal, and neutralise the success check that guards it. Never edit the child flow itself; other flows depend on it.

**A mock tests everything downstream of the boundary, and nothing at it.**
Say this explicitly in the spec. String mismatches — casing, whitespace, display name vs internal value — are invisible to a mock and will silently make the real flow do nothing. The real test is deferred, not cancelled. Mark it **do not skip**.

**Every mock needs a revert checklist, and the last item must be a re-run.**
Prefix the mocked actions' descriptions with `TODO: MOCK — revert before <checkpoint>`. End the checklist with a re-run of a negative case, because that is what actually proves the mock is gone. A hardcoded value left in a gate means every item matches.

**Look for what's testable without the dependency first.**
Usually a third of the test matrix needs nothing: the "no record found" path is often the default state, and gates that sit *before* the integration can be tested in isolation. Query fragments (FetchXML, OData filters) can be run standalone in a throwaway action with hardcoded values — often the highest-risk line in the flow, tested for free.

**When the dependency cannot be faked at all, gate the writes instead of mocking the reads.**
Some data is only *connected* in production — a CRM record joined to a calendar event joined to a config table. No test account has it. Mocking the read then validates your logic against a shape you invented, and the one thing you needed to check — does the real string match the configured string — goes untested.

Invert it: let **every read run against live data**, and wrap the write in a temporary Condition that only permits a single hardcoded allow-listed identifier (a meeting ID, a record ID). Log the would-have-written case to a diagnostic array. You then get a full end-to-end read validation against real data, with a write that is structurally incapable of touching anything but your own fixture.

Two rules: the gate goes in **before** anything downstream of it exists, and the teardown checklist removes it. A write gate left in production means the flow silently does nothing.

**Name the residual gap at sign-off.** With this pattern, the write and the real data are never exercised in the same run. Say so, and characterise the failure mode — "if it's wrong, it records nothing" is a very different risk from "if it's wrong, it records everything." Do not let *tested* be heard as *proven end to end*.

**Never write test data into a customer's production system to unblock yourself.**
Even where the flow's own credentials make it trivial. Ask, or use a sandbox.

**When a checkpoint is blocked and the build must continue, specify a dry-run guard.**
Building past a 🔴 write before its gate is proven is sometimes the right call — waiting on a tenant admin can cost days. But the write must be made *unreachable*, not merely untested. Pin an upstream gate to the value that always fails, and empty the test data so the loop has nothing to act on. Two independent guards, because one gets forgotten.

**A dry-run guard and a test mock are often the same action with opposite values — check the write is still reachable when you need to test it.**
If the write only fires when an upstream gate opens, and that gate depends on the unavailable dependency, then reverting the mock makes the write untestable. The revert must come *after* the write is tested, not before. Sequence the checkpoints with an explicit **mock state** column, and say plainly which guard is active at each step. Run the negative case (gate must close) *before* the positive case (gate must open), so a broken gate is caught while it still can't do anything.

Record this in the spec as a **deferred testing mode** notice at the top of the build order, with the guards listed and a pointer to the checklist that removes them. A skipped checkpoint that looks skipped is fine. One that looks passed is dangerous.

---

## Anti-patterns seen in the wild

**`div(1,0)` to force a scope failure.**
Seen used to fail a scope when a lookup returns anything other than exactly one result. It works, but converts a *normal* outcome into an exception and produces misleading error telemetry.
→ Use a `Condition`. Flag it to the owner; don't propagate it.

**`<filter type="or">` with an `isdefault eq 1` fallback in FetchXML.**
Guarantees a row always comes back. Correct when you want a default; catastrophic when zero rows *is* the meaningful answer (e.g. "is this meeting type configured for recording?").
→ Know which semantics you need before copying the nearest query.

**Hardcoded tenant IDs and client IDs in token flows.**
Common, and usually inherited. Don't copy it into new flows — use environment variables.

---

## Session log

Append a one-line entry per session that added a gotcha, so patterns across builds become visible.

- **2026-07 — Auto-record sweep (client build):** seeded this file. Descriptions truncating at 255 chars, Condition advanced-mode error, and the guest-mailbox blocker were the three that cost the most time.
