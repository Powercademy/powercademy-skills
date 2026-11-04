---
name: tool-selection
description: >
  Pick the right tool for each Power Platform task before acting - purpose-built plugin tools and MCP servers first, then the Dataverse SDK, Web API or pac CLI, and browser automation (Playwright) only for what has no API - and never tell the user something can't be done while browser automation could do it. Prevents the two failure modes: driving the maker portal through a browser for work an SDK does in one call (slow, brittle, costly), and refusing work that only the UI can do. Trigger whenever several tools could do the job: "use Playwright", "open the browser", "click through the portal", "is there an API for this", "bulk update records", "load this data", "create these columns", "change this setting", "check it looks right", "why is this so slow", "can you do this", and before saying any Power Platform task is impossible. Also trigger when browser automation is about to be used for data, schema, solution or flow work. When in doubt, trigger.
---

# Tool Selection — the right tool for the job

An agent with a browser can do almost anything on the Power Platform — slowly.
An agent with only APIs is fast — until it hits a setting with no API and
declares the task impossible. Both are wrong. The job is to reach for the most
direct tool that can do the work, and to keep going down the ladder rather
than give up.

## The ladder

Work top-down. Stop at the first rung that can do the job.

1. **Purpose-built tools for the workload** — the Microsoft plugin skills and
   MCP servers built for it (flows, Dataverse, canvas apps, Power Pages,
   Copilot Studio). They know the platform's rules and validate as they go.
2. **SDK, Web API or CLI** — the Dataverse SDK or Web API for data and schema
   (batched for anything bulk), the pac CLI for solutions, environments, auth
   and components, the Azure CLI for Azure. Seconds, repeatable, scriptable,
   auditable.
3. **Browser automation** — for what has no API: UI-only settings, admin-centre
   toggles, maker-portal-only features, and anything where *the UI itself* is
   the thing being checked (does the form render, does the site look right,
   what does the user actually see).

Concrete tool names per rung live in `${PLUGIN_ROOT}/shared/microsoft-refs.md`
under "Tool map".

**Browser automation is the last resort, not never.** If rungs 1 and 2 can't do
it, use rung 3 — don't tell the user it can't be done. If no browser
automation is available either, give them the exact click path instead.

## Why the order matters

- **Speed.** One SDK call creates a column; the browser route is a dozen page
  loads, waits and clicks.
- **Reliability.** Pages change, load slowly, throw pop-ups. A script that
  worked yesterday fails today on a renamed button. APIs don't move like that.
- **Cost.** Every browser step returns a snapshot of the page into the
  conversation. Twenty steps is twenty page dumps.
- **Repeatability.** An SDK or CLI script can be re-run, reviewed and put in a
  pipeline. A browser session can't be promoted to test and production.
- **Auditability.** API calls leave a clear record of what changed; clicks
  leave a recording at best.

## Common pairings

| Task | Reach for | Fall back to |
|---|---|---|
| Create or change tables, columns, choices, relationships | Dataverse tools / SDK / Web API | Maker portal in the browser |
| Load, update or delete many records | SDK or Web API, **batched** | Never record-by-record in a browser |
| Query or read data | Dataverse tools / SDK | — |
| Export, import or promote a solution; environment operations | pac CLI or native pipelines | Admin centre in the browser |
| Build, edit or debug a cloud flow | Microsoft's flow tooling | Designer in the browser |
| Edit a canvas app | Microsoft's canvas authoring tooling | Studio in the browser |
| Check a deployed site, form or app *looks and behaves right* | **Browser automation** — the right tool here | Ask the user for a screenshot |
| A tenant or environment setting with no API | Browser automation | Exact click path for the user |
| Verify a fact about the platform | Microsoft Learn | — |

## Anti-patterns

- Opening the maker portal to create a column the SDK could create in one call.
- Clicking through records one by one to update them.
- Taking screenshots to *read data* that can be queried.
- Using the browser to "double-check" what an API call already confirmed —
  unless the point is to check the UI itself.
- Saying "I can't change that setting" when browser automation is available.
- Changing environment, security or tenant settings through the browser without
  explicit consent — UI-only changes are still changes, and harder to undo.

## Say which tool, and why

Before acting, one line: which rung, and why — especially when choosing the
browser. *"There's no API for this setting, so I'll use the browser — slower,
but it works."* When the browser is the right call for verification, say that
too: *"Changes made through the Web API; opening the form in the browser to
confirm it renders."* API to change, browser to see — that pairing is often
the best of both.

## Grow

When a task teaches a better pairing — a new API that replaces a browser
route, or a UI-only setting worth knowing about — offer to add it to the table
above, the same way the other conventions grow.
