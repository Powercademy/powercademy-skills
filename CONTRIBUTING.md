# Contributing

The most valuable contribution to this marketplace is a **lesson from real
delivery work** — a gotcha that cost you an afternoon, a convention that
prevented one, a trigger phrasing that should have fired and didn't.

## The fast path: contribute a gotcha

1. Find the right log: each plugin has a `shared/gotchas.md` (flow-builder,
   pcf-builder, canvas-planner) or a conventions list
   (`plugins/conventions/skills/dataverse-conventions/SKILL.md`).
2. Write the entry in the established form — **Symptom → Cause → Fix**, short
   and mechanical, with the reasoning included.
3. **Redact before you open the PR.** No client names, tenant/org identifiers,
   URLs, GUIDs, or user identities. Phrase the lesson for any project. PRs
   with identifying detail will be asked to rewrite, not edited for you.

## Contributing or changing a skill

The house standard is itself a skill: read
[`plugins/conventions/skills/writing-skills/SKILL.md`](plugins/conventions/skills/writing-skills/SKILL.md)
before authoring — it encodes the dual-runtime constraints (frontmatter,
description length, path conventions, the mechanics quarantine), the trigger-
description craft, and the review checklist. The lint enforces the hard rules:

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
