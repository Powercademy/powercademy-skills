# Contributing

The most valuable contribution to this marketplace is a **lesson from real
delivery work** — a gotcha that cost you an afternoon, a convention that
prevented one, a trigger phrasing that should have fired and didn't.

## The fast path: contribute a gotcha

1. Find the right log: the design plugin has `shared/canvas-gotchas.md`; flow and PCF lessons live in
   `plugins/conventions/shared/flow-gotchas.md` and `pcf-gotchas.md`, and Dataverse conventions in
   `plugins/conventions/skills/dataverse-conventions/SKILL.md`.
2. Write the entry in the established form — **Symptom → Cause → Fix**, short
   and mechanical, with the reasoning included.
3. **Redact before you open the PR.** No client names, tenant/org identifiers,
   URLs, GUIDs, or user identities. Phrase the lesson for any project. PRs
   with identifying detail will be asked to rewrite, not edited for you.

## Contributing or changing a skill

The house standard is itself a skill: read
[`.claude/skills/writing-skills/SKILL.md`](.claude/skills/writing-skills/SKILL.md)
before authoring. It's a repo skill, so Claude Code and GitHub Copilot CLI
both load it automatically when you work in a clone of this repo. It covers
only what the platforms' own skill-authoring guidance doesn't: the
dual-runtime constraints (frontmatter, description length, path conventions,
the mechanics quarantine), which plugin a skill belongs in, the house
methodology, redaction, and the review checklist. The lint enforces the hard rules:

```bash
node scripts/lint/lint-skills.js
```

CI runs the same lint on every PR; a red lint will not merge.

## Ground rules

- Every skill must work in **both** GitHub Copilot CLI and Claude Code —
  no runtime-specific features in core functionality.
- Check [`docs/microsoft-landscape.md`](docs/microsoft-landscape.md) before
  proposing a new skill: we never rebuild what Microsoft ships; we route to it.
- British English, practical tone, reasoning included.
- By contributing you agree your contribution is licensed under the
  repository's [MIT licence](LICENSE).

## Reporting problems

Open an issue with: what you asked, which runtime and versions
(`copilot --version` / Claude Code), what the skill did, and what you expected.
"The skill didn't trigger when I said X" is a first-class bug report — trigger
phrasings are part of the product.
