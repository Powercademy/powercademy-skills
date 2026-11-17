---
name: agent-design
description: >
  Make the decisions that determine whether a Copilot Studio agent is worth building and affordable to run, before any YAML is authored: agent or workflow, which harness (standard, Microsoft Copilot harness, Customer Conversation, Agent Builder, or Foundry), knowledge vs tools vs workflows vs skills vs connected agents, who pays for each conversation in Copilot Credits, and which environment and data policies it will live under - then hand the build to Microsoft's Copilot Studio tooling. Trigger whenever the user wants to build, design, plan, rescope or cost an agent: "build an agent", "Copilot Studio agent", "should this be an agent", "standard or Copilot harness", "which harness", "child agent or tool", "knowledge or tool", "agent flow", "how many credits", "what will it cost", "agent or Power Automate", "migrate my agent to the new harness", "why is my agent so expensive". Also trigger mid-build when credits, harness limits or a blocked connector come up. Decides, doesn't author. When in doubt, trigger.
---

# Agent Design

Most agents that disappoint were the wrong shape before a line of YAML was
written: an agent where a workflow would have done, the expensive harness for a
bounded task, a knowledge source asked to do a tool's job, or a cost nobody
estimated until the bill arrived. This skill makes those calls first, writes
them down, then hands the build to Microsoft's Copilot Studio tooling — which
maps requirements to components and authors the YAML far faster than by hand.
*This skill decides; their tooling builds.*

Verify platform specifics against Microsoft Learn as you go — harnesses,
billing and policies change. Current references and rates are in
`${PLUGIN_ROOT}/shared/microsoft-refs.md` under "Agent design".

## Step 0: Ground in the brief

Before designing, establish — from the user, their documents or transcripts:

- **The job.** What should be true after the agent has done its work? Who asks,
  and how often?
- **The users.** Internal staff or customers? Do the internal users hold
  Microsoft 365 Copilot licences? (This changes who pays — Step 4.)
- **Where it runs.** Teams / Microsoft 365, a website, a phone line, or on a
  schedule with nobody chatting at all.
- **What it must *do*, not just know.** Every write, send, booking or update.
- **What it must produce.** Answers only, or files (Word, Excel, PowerPoint,
  PDF), images, documents for review?
- **The data.** Where it lives (Dataverse, SharePoint, another system), how
  clean it is, and whether test data exists. No test data means no proof.

## Step 1: Agent, or workflow?

Ask this before anything else. **"No agent" is a valid answer, and often the
right one.**

| Shape | Choose it when |
|---|---|
| **Workflow, no AI** | The steps are known and the inputs are clean. Deterministic, cheapest, easiest to trust. |
| **Workflow with an AI step** | The process is fixed but one step needs language — summarise, classify, draft. Fetch and filter the data first, give the AI step only what it needs, ask for structured output. |
| **Agent** | A person needs to converse, ask follow-ups, or the path genuinely varies request to request. |
| **Workflow + small agent** | The routine runs on a schedule; a person occasionally needs to adjust the result in conversation. |

A real example: a weekly customer report was first imagined as "a reporting
agent". It became a scheduled workflow (fetch hours, filter customers, AI step
for the summary, HTML, approval, send) plus a small agent that edits rejected
drafts on request — cheaper per run, predictable, and the agent only costs
credits when someone actually talks to it.

## Step 2: Which harness

If it's an agent, choose the harness from the **weight of the task**, not from
what's newest. Microsoft's own guidance is blunt that a more capable harness
can overwork a simple problem and raise both cost and latency.

| Harness | Choose it for | Watch out for |
|---|---|---|
| **Standard** | Bounded, rule-based work; ordered conversations with deterministic hand-offs; established channels and topics; predictable cost | No agent skills; no native file creation; more design work up front (topics, paths) |
| **Microsoft Copilot harness** | Long-running, reasoning-heavy, multi-step work; creating or editing Word, Excel, PowerPoint or PDF files; skills; memory; large files; image understanding | Every use is billed in Copilot Credits — build, test, evaluate and run — whatever the user's licence. No child agents: use skills or connected agents |
| **Customer Conversation** | Customers over web chat or voice, with escalation to a human | Billed in Copilot Credits |
| **Agent Builder (Microsoft 365)** | Simple knowledge Q&A for internal users | Limited tools — a client build needed SharePoint *data operations* it couldn't do, and moved to the standard harness |
| **Foundry** | Pro-developer scenarios: broader model choice, Azure integration, unusual deployment channels | Another service, another bill, a pro-code skill set |

**Migrating an existing standard agent** is re-architecture, not conversion.
Do it only for a specific benefit — quality, long-running work, a needed
capability. A working standard agent doesn't need to move because a new
harness exists.

It's fine to split by audience: one client used the Copilot harness for the
engineer-facing experience that needed image recognition and the cheaper
standard harness for the approver-facing one.

## Step 3: The right component for each job

Map each thing the agent must do to the component that does it most
reliably. Microsoft's Copilot Studio tooling does the detailed mapping and
writes the YAML; this step sets the principles it should follow.

- **Knowledge to answer, tools to act.** Never ask a knowledge source to create
  or update anything. **Knowledge names and descriptions are routing
  metadata** — say exactly what each source covers and when to use it; vague
  descriptions mean wrong answers from the right documents.
- **Writes go through a deterministic tool or workflow** with explicit target
  columns — booking, cancelling, updating. A direct "add row" tool is enough
  for a single simple write; use a workflow when there's validation, a lookup,
  confirmation, a person or another system involved.
- **A Dataverse MCP connection is for reasoning over related data** — complex
  reads across tables. Give it read access and keep writes on deterministic
  tools.
- **Skills** (Copilot harness) for reusable procedures inside the agent.
  **Connected agents** only for something with its own purpose that could stand
  alone. Small tasks don't need their own agent — a skill, tool, workflow or
  prompt is cheaper and simpler.
- **Agent flows** called by the agent need at least one input before they
  appear as usable tools (seen in delivery — check before blaming the flow).

## Step 4: Who pays, and roughly how much

Estimate cost per conversation before building, and decide who carries it.

- **Microsoft 365 Copilot licensed users** in Microsoft 365 channels: standard
  harness agents, and agent flows they trigger through the agent, are covered.
- **Everyone else** — unlicensed users, external channels, autonomous or
  scheduled runs — consumes Copilot Credits.
- **Microsoft Copilot harness agents** consume Copilot Credits for all use,
  regardless of licence, including building and testing.

Work out the expected mix of events per conversation (answers, generative
answers, actions, agent flow actions, grounding, AI tools) against the current
rates in `${PLUGIN_ROOT}/shared/microsoft-refs.md`, multiply by expected
volume, and say the monthly figure out loud. Microsoft's usage estimator is
linked there too.

**Test a lighter model before assuming the default.** On a client build, a
lighter model produced comparable output for about 11 credits against roughly
62 for the stronger one. The opposite also happens: a cheaper model that needs
several attempts can cost more overall. Measure on real tasks; don't reason
from the price per call.

## Step 5: Where it will live

Agents, agent flows, approval steps and newer connectors are exactly what data
policies block, and the Default environment's group is usually the strictest.
Before building, check which connectors, channels and knowledge sources the
design needs against the target environment's data policies and advanced
connector policy. Build in a dedicated dev environment, and confirm your
tooling is connected to the environment you mean. The alm plugin's
`design-alm-process` covers the full environment strategy.

## Step 6: Write the design, then hand off

Write `<agent>-design.md` into the user's working directory, path stated:

```markdown
# <Agent> — Design

## Job and users            (who, how often, licences, channels)
## Agent or workflow        (the decision and why)
## Harness                  (choice, why, what it rules out)
## Components               (job → component → why)
## Cost                     (events per conversation, volume, monthly credits, who pays)
## Environment & policies   (target env, connectors/channels needed, policy gaps + owner)
## Tests                    (scenarios from the brief, expected outcomes)
## Open questions
## Change log
```

Then hand the build to Microsoft's Copilot Studio tooling with this design as
its input — the harness-specific author for the chosen harness, and its
advisor to check patterns. Which tools those are is in
`${PLUGIN_ROOT}/shared/microsoft-refs.md`. Whole-solution questions — "should
this be an agent, a canvas app or a Power Pages site?" — belong with Power CAT's
architecture advisor, also listed there.

## Step 7: Build-path traps (seen in delivery)

- **A standard-harness agent needs a scaffold first.** Create the agent in
  Copilot Studio, then clone it locally before a coding agent edits its files;
  building one from nothing locally was unreliable.
- **Sync both ways, deliberately.** Pull cloud changes before editing locally;
  push local changes and confirm they landed. Edits made in the portal while
  files are open locally get overwritten.
- **Validate generated topics.** Generated files can be invalid; validate
  before pushing, and don't call it done while any file is flagged.
- **Test against the brief, not "it was created".** Scenarios come from the
  brief, with expected outcomes, run on real (or realistic) data. An agent with
  no test rows can't be validated.

## Calibration

**"Build me an agent that…"** → Steps 0–6 before any authoring. Be willing to
conclude it's a workflow.

**"Standard or the new harness?"** → Step 2, then Step 4 for the cost of the
choice.

**"Why is this agent so expensive?"** → Step 4 against what it actually does;
look for retrieval the workflow should do first, a heavier model or harness
than the task needs, and autonomous runs nobody counted.

**Agent can't publish / a tool is greyed out** → Step 5; it's usually policy.

## Reference files

- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — "Agent design": Learn references,
  current billing rates and licence coverage, the Microsoft tooling to hand off
  to.
