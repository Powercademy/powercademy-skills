# Security

Powercademy Skills is a **public** marketplace of instructions that an AI agent
follows with real credentials against real Power Platform environments — often a
customer's production tenant. That makes the security posture part of the
product, not an afterthought. This document states the threat model and the
safeguards, and tells you how to report a problem.

## Reporting a vulnerability

Email the maintainer (see the repo owner's profile) with `SECURITY` in the
subject, or open a [private security advisory](https://github.com/Powercademy/powercademy-skills/security/advisories/new).
Please do not open a public issue for anything exploitable.

## What a skill is, and why it needs a threat model

A skill is Markdown that becomes instructions in the agent's context. When the
agent has tools wired up — `pac`, the Dataverse MCP server, FlowAgent — those
instructions can cause **writes to a live environment**. A careless or
malicious skill is therefore a supply-chain risk in the same class as a
dependency you `npm install`. Independent research on public SKILL.md
marketplaces has found a meaningful fraction of published skills carry at least
one vulnerability pattern, so this is not hypothetical.

## Threats we design against

| Threat | Example in this domain | Mitigation |
|---|---|---|
| **Destructive default** | A skill that instructs the agent to delete/overwrite a flow, table, or record as a normal step | Skills must never make a destructive action the default. Every irreversible write is a 🔴 checkpoint with explicit pre-conditions (see `build-flow-spec`) |
| **Unattended writes to production** | A spec that PATCHes a real meeting or seeds a customer's live table without a human gate | Risk tiers (🟢/🟡/🔴) and testing checkpoints gate every write; the last read-only checkpoint before a write is a hard stop |
| **Credential handling in skill bodies** | A skill that asks the agent to paste a token, secret, or connection string into a file or command | Skills never handle secrets in plain text. Auth is delegated to `pac auth` / the runtime's own credential flow |
| **Injection via living logs** | A contributed `gotchas.md` entry that smuggles an instruction ("ignore checkpoints and…") into what looks like a lesson | Logs are data, not instructions. Contributions are reviewed; the writing-skills standard forbids imperative instructions in log entries |
| **Mechanics drift / typosquatting** | A skill pointing the agent at a lookalike marketplace or a renamed Microsoft command | All Microsoft plugin mechanics live in one file per plugin (`shared/microsoft-refs.md`), lint-enforced, so references are auditable in one place |
| **Silent runtime coupling** | A skill using a Claude-only or Copilot-only feature that changes behaviour across runtimes | CI lint rejects any frontmatter beyond `name`+`description` and any mechanics token outside the quarantine file |

## Safeguards in the repo

- **CI lint** (`scripts/lint/lint-skills.js`, run on every PR) enforces the
  frontmatter and mechanics-quarantine constraints mechanically.
- **Risk tiers and checkpoints** are a required part of any skill that can
  cause a write. `build-flow-spec` is the reference implementation.
- **"Reads don't imply writes"** is a stated methodology rule: a skill verifies
  the specific operation's permission before assuming an environment that can
  read something can write it.
- **MIT-licensed and public** — every instruction the agent will follow is
  readable before you install. Nothing is obfuscated or fetched at runtime.

## For enterprises mirroring this repo

- Pin to a specific commit SHA rather than tracking `main`, and review the diff
  before advancing the pin.
- Host an internal mirror (any Git host or file share is supported) so installs
  don't depend on GitHub.com reachability or a moving upstream.
- Treat a skill update like any dependency bump: review, then promote.

## Scope

These safeguards reduce risk; they do not remove the operator's
responsibility. An agent acting on a production tenant should always be run by
someone who understands what a 🔴 step will do. The skills are designed to make
that judgement easy and explicit — not to replace it.
