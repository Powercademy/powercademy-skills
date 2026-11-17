# ALM — Gotchas Log

Deployment failures, each of which cost real time once. Read before designing a
process or running a promotion. Append after any session that teaches something.

Format per entry: **Symptom** → **Cause** → **Fix**. Short and mechanical.

---

## Contents

1. [Import failures — symptom → cause](#import-failures--symptom--cause)
2. [Environment variables](#environment-variables)
3. [Connection references and connections](#connection-references-and-connections)
4. [Solutions, publishers and layers](#solutions-publishers-and-layers)
5. [Environments](#environments)
6. [Data policies](#data-policies)
7. [Session log](#session-log)

---

## Import failures — symptom → cause

| Symptom at import | Usual cause | Fix |
|---|---|---|
| Missing dependency on a component you didn't expect | The solution references something not included and not present in the target | Add the dependency to the source solution (or confirm it exists in the target) and re-export. Never hand-create it downstream |
| *"Exporting connection reference … requires the custom connector to be added to a dataverse solution"* | A custom connector isn't in any solution | Add the connector to any unmanaged solution — needs edit rights on the connector, which are separate from the flow's |
| *"Attribute 'value' was not found for environment variable …"* | An environment variable definition has neither Default Value nor Current Value | Give every definition a Default Value in the source. Blank is absent, not empty |
| Import succeeds; flows are all off | By design — solution flows arrive **disabled** | Enable deliberately, post-import, knowing what each will do the instant it runs |
| Import succeeds; flow runs against the wrong data | Environment variable current values not set for this environment | Set current values as a named post-import step; verify by reading them back |
| Import blocked by an unmanaged layer on a component | Someone edited the component directly in the target | Remove the unmanaged layer; then fix the underlying habit — that edit is the real bug |

**Never reach for `--force-overwrite` to make an import error go away.** It
replaces layers rather than resolving the cause, and hides the problem until it
resurfaces somewhere worse.

## Environment variables

**A definition needs a value, not just a definition.** Blank is absent, not empty — `parameters()` has nothing to resolve.
→ Always give a **Default Value**, even a placeholder, and choose one that is *fail-closed* for whatever it gates: an allow-list defaults to a string matching nothing, not to empty.

**Default Value travels with the solution; Current Value is per-environment and overrides it.**
→ Set defaults once in the source; set current values only where they differ. A current value set in dev does not follow the solution downstream — which is usually exactly what you want for test scaffolding.

**Environment variables are the test-isolation boundary.** An ID in a variable lets dev/UAT point at a dummy target while production points at the real one, with no component changes. This is often the *entire* safety mechanism — verify it resolves correctly in the target before enabling anything that runs on a schedule.

## Connection references and connections

**A maker's personal connection in production is a future outage.** It breaks when they leave, change password, or lose the licence.
→ Bind production connection references to a service account or an owner who will still be there. Name the owner in the process document.

**Connection references need binding in each environment.** An import can succeed with them unbound; the failure appears at first run.
→ Verify bindings as a post-import step, not by assuming.

## Solutions, publishers and layers

**Build in the dev environment that holds the unmanaged solution.** Anything built downstream is overwritten by the next managed deployment — or blocks it with an unmanaged layer.

**The publisher prefix is permanent.** Choosing it casually, or letting the default publisher get used, means recreating components later to fix naming.
→ Confirm the org's established publisher before the first component exists, and reuse it.

**Never ship unmanaged downstream.** Unmanaged in test or production is a one-way trip: no clean uninstall, no layer separation, and every later import fights it.

**Circular dependencies between solutions cannot be imported.**
→ Decide dependency direction when you segment, and write it down.

**Two artefacts with the same version number is a debugging nightmare.**
→ Bump deliberately on every export; the version is how you know what's actually running.

## Environments

**The Default environment is not a home for anything that matters.** Everyone has access, it has no meaningful lifecycle, and it cannot be governed.

**"Rollback" mostly isn't.** Uninstalling a managed solution rarely restores data or dependent components, so real recovery is usually forward-fix.
→ Say this *before* the production import, not after. A rollback plan whose first step has never been checked is not a plan.

**A recurrence flow starts the moment it's enabled.** Enabling a batch of flows after import can immediately hit production data.
→ Enable one at a time, knowing what each does on its first run.

## Data policies

**An agent, agent flow or approval step won't publish or run, though it worked somewhere else.**
A data policy or advanced connector policy blocks a connector, channel or knowledge source it uses. In Copilot Studio, connectors introduced after 2019 land in the *Non-business* group by default, and many organisations block that group automatically. The Default environment's group is usually the most restrictive — a client build hit exactly this and moved to a dedicated dev environment.
→ Check before building, not when publish fails: list the connectors, channels and knowledge sources the solution needs against each environment's policies. Copilot Studio shows a blocked tool as disabled with the reason on hover, and the agent's **Channels** page lets you download every violation as a workbook — send that to the admin rather than describing the error.

**Advanced connector policies are an allowlist.**
Everything not explicitly allowed is blocked, including connectors released later and whole MCP servers. With classic data policies also in place (mixed mode), the most restrictive setting wins.
→ A connector that "appeared overnight" in a new feature is blocked until someone adds it. Name the connector and the policy scope when you ask.

**Removing a policy from an environment group doesn't remove it from the environments.**
Environments keep the last advanced connector policy they inherited, to avoid an enforcement gap.
→ If a block survives a group change, check the environment's own policy.

**Inline agents and other new building blocks can trip policies a classic flow never touched.**
Seen on a client build: publishing an inline agent in a workflow failed on a policy that ordinary flow actions passed, and the documentation pointed at an older admin location.
→ Look at the environment's advanced connector policy and the Copilot Studio rules in the Power Platform admin center before assuming the feature is broken.

## Session log

Append a one-line entry per session that added a gotcha, so patterns across
deployments become visible.

- **2026-09 — seeded** from lessons already paid for on flow builds (environment variables, publisher/solution discipline, custom-connector export) plus the standard import-failure table. Entries here are expected to sharpen fast once real promotions run through `promote-solution`.
- **2026-11 — data policies** added from a client workshop: default-environment DLP blocking agents and approvals, the move to a dedicated dev environment, advanced connector policies. Platform behaviour verified against Microsoft Learn (Copilot Studio data policies; advanced connector policies).
