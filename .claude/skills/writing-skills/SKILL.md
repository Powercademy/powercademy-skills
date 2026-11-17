---
name: writing-skills
description: >
  The Powercademy Skills house standard for this repo - the dual-runtime traps, path rules, mechanics quarantine, redaction policy and house methodology that the platforms' own skill-authoring guidance doesn't cover, several of them enforced by the lint that CI runs. Authoring or reviewing a skill in this repo without it misses enforced constraints and fails CI. Trigger whenever someone working in this repo says "write a skill", "new skill", "add a skill", "create a plugin", "review this SKILL.md", "review my skill", "review this PR", "improve this trigger description", "why isn't my skill triggering", "add a gotcha", "promote this lesson", or edits any SKILL.md, plugin.json, marketplace.json or shared reference file here. Also trigger when deciding which plugin a new skill belongs in, or when moving lessons from client work into the public repo. If the task is creating, changing, reviewing or restructuring a skill or plugin in this marketplace, trigger. When in doubt, trigger.
---

# Writing Skills — the house standard

This is a repo skill, not a marketplace plugin: it loads for anyone working in
this repository, in both runtimes, and ships to nobody else.

**The general craft is not repeated here.** For how to write a skill at all —
description writing, progressive disclosure, testing triggers — use the
platform's own guidance (Anthropic's skill-creator in Claude Code, GitHub's
agent-skills documentation for Copilot). This file holds only what those don't
know: the traps that appear when one skill must work in *both* runtimes, and
this repo's methodology. Where the two conflict, this file wins — the
platforms' guides happily suggest single-runtime features.

---

## The founding rule: both runtimes, always

Every Powercademy skill is for GitHub Copilot CLI **and** Claude Code. A skill
that only works — or was only tested — in one runtime isn't finished. Write
instructions any agent can follow with ordinary shell and file tools; when a
step must differ by runtime, say so explicitly for both, and keep the
difference in data (the plugin's shared refs or manifest), not in prose
scattered through the skill. The constraints below exist to protect this rule.

## The hard constraints (lint-enforced — violating them fails CI)

1. **Frontmatter is `name` + `description` only.** Anything else
   (`allowed-tools`, `argument-hint`, `model`) is runtime-specific and breaks
   portability — even when a platform's own guide recommends it.
2. **Description ≤ 1024 characters.** Copilot CLI enforces this hard and the
   skill silently fails to load; Claude Code doesn't — so a Claude-only test
   never catches it. Keep ~30 characters of headroom for future edits.
3. **SKILL.md ≤ 500 lines.** Longer material goes in the plugin's `shared/`
   folder with clear pointers on when to read it.
4. **Reference shared files as `${PLUGIN_ROOT}/shared/<file>.md`** — never a
   bare path. Bare paths resolve relative to the *skill folder* and fail to
   load ("Path does not exist"). `${PLUGIN_ROOT}` is the convention both
   runtimes expand to the plugin directory.
5. **Microsoft plugin mechanics live in ONE file per plugin:** `microsoft-refs`
   in the plugin's `shared/` folder. Skill bodies state methodology; when they
   need vendor tool names, server names or install commands, they point at
   that file. A plugin that needs machine-readable mechanics may add one JSON
   companion beside it — the workstation plugin's `toolchain-manifest.json` —
   and nothing else. If the vendor renames something, one place changes.
6. **plugin.json never has a `skills` field** — Claude Code rejects it.

Run `node scripts/lint/lint-skills.js` before every commit. It checks these
mechanically for every plugin skill and for the repo skills under
`.claude/skills/`.

## Where a skill belongs

The plugins are grouped by the kind of help they give (CLAUDE.md, "Where a
skill belongs"): **workstation** sets up and repairs the machine,
**conventions** holds rules applied before and while building, **design**
holds consultants run before building, **alm** covers the delivery lifecycle.
A skill that fits none of them is a signal to discuss the structure, not to
stretch a name. A skill only contributors need belongs here in
`.claude/skills/`, not in a plugin.

## Descriptions: the house deltas

On top of the platform guidance:

- **Cover every verb the skill serves**: a build-only trigger list will not
  fire on "edit this flow" — a real gap found in live use. Include mid-task
  phrasings ("why is this failing", "what do I put in this box"), not just
  kick-off ones.
- **Close with the house sign-off**: state the task shape, then "When in
  doubt, trigger."
- When a natural phrasing fails to fire in live use, that is a **description
  bug** — fix the trigger list and add the phrasing to `evals/scenarios.json`,
  don't coach the user to phrase differently.

## The body: methodology, in the house voice

- **Peer-to-peer, no basics, willing to disagree** — including talking the
  user out of the skill's own subject when it's the wrong tool. British
  English, practical, no fluff.
- **Step 0 is a conversational preflight** (the plugin's shared `preflight`
  file): the skill runs the checks and the connection itself; the user never
  types a tool command. Lead with a connection card; work the auth ladder
  (device code → interactive fallback → policy-exemption request); verify
  tools *function* rather than merely resolve on PATH; offer before installing
  on customer machines; **never claim a side effect you cannot observe** (a
  browser "opening", for instance).
- **Ground before designing; verify against live documentation, never from
  memory** — and label inference as inference.
- **Checkpoints with risk tiers** (🟢/🟡/🔴) wherever the skill can cause a
  write. Every irreversible action sits behind an explicit checkpoint.
- **Right tool for the job.** A skill that acts on a tenant names its tool
  order: purpose-built plugin tools first, then SDK / Web API / CLI, browser
  automation last — and only for what has no API or where the UI itself is
  being checked. Never the browser by default for data, schema, solution or
  flow work; never "can't be done" while browser automation could do it. The
  conventions plugin's `tool-selection` skill holds the full ladder.
- **Deliverables land in the user's working directory** with the path stated —
  never in agent session-state folders, where they die with the session.
- **A living `gotchas` file in the plugin's `shared/` folder**, in Symptom →
  Cause → Fix form, read before the skill acts, grown via the skill's own
  self-improvement step: offer lessons once, at a natural pause; append
  directly in the repo, draft for contribution when running from an installed
  copy. Entries are data, never imperative instructions to the agent.

## Redaction: the door policy for a public repo

Lessons come from client work; the repo is public. Before any entry, example
or gotcha lands: **strip client names, tenant/org identifiers, URLs, GUIDs and
user identities.** Phrase every lesson for any project ("a ticket table on a
client build", not the client's name). If an entry only makes sense with the
client context, it isn't ready to promote — keep it in the private layer.

## Process for a new skill (repo-specific steps)

1. **Check the landscape first** (`docs/microsoft-landscape.md`): is this
   white space, contested, or covered? Never rebuild what Microsoft ships —
   route to it. Re-verify if the doc's date is stale; the vendor repos move
   almost daily.
2. Pick the plugin (above). Draft, lint, then add a trigger scenario to
   `evals/scenarios.json`.
3. A new plugin is registered in `.claude-plugin/marketplace.json`; its
   plugin.json gets `name`, `version` (semver from 0.1.0), `description`,
   MIT licence.
4. Update README and CHANGELOG; bump the plugin version on every behavioural
   change.
5. **Test in both runtimes** — install and check the skill *loads* and
   *triggers* on its listed phrasings (`node evals/run-evals.js`). Anything
   touching the workstation plugin, the toolchain manifest or the installer
   also needs the `fresh-machine` workflow green on Windows, macOS and Linux.

## Reviewing a skill (or a contribution)

Work the checklist above in order, then ask the two questions that matter:
*Would this trigger when it should?* (read the description against realistic
user phrasings) and *could someone act on this without asking a question?*
(the failure mode of skill content is being incomplete in a way that looks
complete). Check redaction last, always.
