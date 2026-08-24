---
name: writing-skills
description: >
  Author and review skills for the Powercademy Skills marketplace so every skill meets the house standard - dual-runtime portability, pushy trigger descriptions, the 500-line cap, shared-file conventions, living gotchas logs, and self-run preflights. Trigger whenever the user says "write a skill", "new skill", "create a plugin", "add a skill to the marketplace", "review this SKILL.md", "review my skill", "improve this trigger description", "why isn't my skill triggering", or mentions a SKILL.md file, a trigger description, a skill description, authoring or reviewing an agent skill, or a skills marketplace in any way. Also trigger before authoring any SKILL.md, when editing a trigger description, or when promoting lessons from a private checklist into public skills. If the task is creating, modifying, reviewing, or structuring agent skills or plugins, trigger. When in doubt, trigger.
---

# Writing Skills — the house standard

Every rule below was paid for: a skill that silently failed to load in one
runtime, a reference that resolved to nowhere, a description that stopped
triggering. Authoring to this standard is what keeps the marketplace working
in every runtime it ships to. Apply it when writing; enforce it when reviewing.

---

## The hard constraints (lint-enforced — violating them fails CI)

1. **Frontmatter is `name` + `description` only.** Anything else
   (`allowed-tools`, `argument-hint`) is runtime-specific and breaks
   dual-runtime portability. Both major runtimes document exactly these two
   fields as the portable set.
2. **Description ≤ 1024 characters.** One runtime enforces this hard and the
   skill silently fails to load; the other doesn't — so a Claude-only test
   never catches it. Keep ~30 characters of headroom for future edits.
3. **SKILL.md ≤ 500 lines.** Longer material goes in `shared/` files with
   clear pointers on when to read them.
4. **Reference shared files as `${PLUGIN_ROOT}/shared/<file>.md`** — never a
   bare `shared/<file>.md`. Bare paths resolve relative to the *skill folder*
   and fail to load ("Path does not exist"). `${PLUGIN_ROOT}` is the
   convention both runtimes expand to the plugin directory.
5. **Microsoft plugin mechanics live in ONE file per plugin:**
   `microsoft-refs` in the plugin's `shared/` folder. Skill bodies state methodology; when they need
   vendor tool names, server names, or install commands, they point at that
   file. If the vendor renames something, one file changes.

Run the repo lint (`node scripts/lint/lint-skills.js`) before every commit —
it checks all five mechanically, plus manifest validity.

## The description is the product's front door

The `description` is the trigger mechanism — the model loads the skill when
the user's message matches it. Write it "pushy":

- **State what the skill does**, then **list the literal phrases** that should
  fire it, in quotes — including mid-task phrasings ("why is this failing",
  "what do I put in this box"), not just kick-off phrasings.
- Cover **every verb the skill serves**: a build-only trigger list will not
  fire on "edit this flow" — a real gap found in live use.
- End with a catch-all and the house sign-off: state the task shape, then
  "When in doubt, trigger."
- When a natural phrasing fails to fire in live use, that is a **description
  bug** — fix the trigger list, don't coach the user to phrase differently.

## The body: methodology, in the house voice

- **Peer-to-peer, no basics, willing to disagree** — including talking the
  user out of the skill's own subject when it's the wrong tool. British
  English, practical, no fluff.
- **Step 0 is a conversational preflight** (the plugin's shared `preflight` file): the skill
  runs the checks and the connection itself; the user never types a tool
  command. Lead with a connection card; work the auth ladder (device code →
  interactive fallback → policy-exemption request); verify tools *function*
  rather than merely resolve on PATH; offer before installing on customer
  machines; **never claim a side effect you cannot observe** (a browser
  "opening", for instance).
- **Ground before designing; verify against live documentation, never from
  memory** — and label inference as inference.
- **Checkpoints with risk tiers** (🟢/🟡/🔴) wherever the skill can cause a
  write. Every irreversible action sits behind an explicit checkpoint.
- **Deliverables land in the user's working directory** with the path stated —
  never in agent session-state folders, where they die with the session.
- **A living `gotchas` file in `shared/`** in Symptom → Cause → Fix form, read before
  the skill acts, grown via the skill's own self-improvement step: offer
  lessons once, at a natural pause; append directly in the repo, draft for
  contribution when running from an installed copy.

## Redaction: the door policy for a public repo

Lessons come from client work; the repo is public. Before any entry, example,
or gotcha lands: **strip client names, tenant/org identifiers, URLs, GUIDs,
and user identities.** Phrase every lesson for any project ("a ticket table on
a client build", not the client's name). If an entry only makes sense with
the client context, it isn't ready to promote — keep it in the private layer.

## Process for a new skill

1. **Check the landscape first** (`docs/microsoft-landscape.md`): is this
   white space, contested, or covered? Never rebuild what Microsoft ships —
   route to it. Re-verify if the doc's date is stale; the vendor repos move
   ~daily.
2. Draft description → measure length → body → shared files.
3. Register the plugin in `.claude-plugin/marketplace.json`; plugin.json gets
   `name`, `version` (semver from 0.1.0), `description`, MIT licence. Never a
   `skills` field.
4. Lint + validate, update README and CHANGELOG, commit, push, confirm CI.
5. **Test in both runtimes** — install and check the skill *loads* and
   *triggers* on its listed phrasings. A single-runtime test misses
   single-runtime failures by construction.
6. Version-bump on every behavioural change; every release updates the
   changelog.

## Reviewing a skill (or a contribution)

Work the checklist above in order, then ask the two questions that matter:
*Would this trigger when it should?* (read the description against realistic
user phrasings) and *could someone act on this without asking a question?*
(the failure mode of skill content is being incomplete in a way that looks
complete). Check redaction last, always.
