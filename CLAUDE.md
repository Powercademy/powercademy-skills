# Powercademy Skills — Project Instructions

## What this repo is
An opinionated plugin marketplace for Power Platform delivery, sitting ON TOP of
Microsoft's official plugins (microsoft/power-platform-skills and
microsoft/power-cat-skills). Microsoft's plugins provide capabilities; this repo
provides judgement — Howdang's delivery methodology, conventions, and
architecture thinking encoded as skills.

We never duplicate Microsoft's capabilities. We reference their marketplaces and
layer opinions on top.

## Hard constraints (never violate)

1. **Dual-runtime portability.** Every skill MUST work in both GitHub Copilot
   CLI and Claude Code. Copilot CLI is the first-class citizen (target users are
   in Copilot-approved enterprises).
   - Skills only. No `commands/` directory, no `styles/`, no Claude-only
     features in core functionality.
   - Hooks are OPTIONAL enhancements only — nothing may depend on them.
   - Never add a `skills` field to plugin.json (Claude Code rejects it).
   - SKILL.md frontmatter: `name` and `description` only.

2. **Loose coupling to Microsoft's plugins.** Skills encode methodology, not
   Microsoft's mechanics. Any unavoidable reference to Microsoft plugin
   commands, MCP servers, or file layouts goes in ONE shared reference file per
   plugin (`shared/microsoft-refs.md`), never scattered through skills.

3. **Trademark distance.** Never name anything in a way that implies Microsoft
   sponsorship. No "Copilot" in product or plugin names.

## Repo structure

```
powercademy-skills/
├── .claude-plugin/marketplace.json
├── plugins/
│   └── flow-builder/
│       ├── .claude-plugin/plugin.json
│       ├── skills/<skill-name>/SKILL.md
│       └── shared/               # refs incl. microsoft-refs.md
├── scripts/install.js            # bootstrapper
├── evals/                        # test cases (post-v1)
├── CHANGELOG.md
└── README.md
```

## Skill authoring rules

- Frontmatter descriptions are the trigger mechanism. Write them "pushy":
  state what the skill does AND list the phrases/contexts that should trigger
  it ("Use whenever the user mentions building a flow, flow spec,
  Power Automate automation, expressions, connector actions…").
- Keep SKILL.md under 500 lines. Longer material goes in `shared/` reference
  files with clear pointers on when to read them.
- Skills may instruct the agent to run `pac` CLI commands directly — that is
  the preferred way to add tooling without code.
- British English throughout. Practical, direct tone. No fluff.

## Versioning & licence

- Start at 0.1.0. Semver from there. Every release updates CHANGELOG.md.
- Public repo licence: MIT.

## Testing definition of done

A change is done only when verified in BOTH runtimes:
1. `claude --plugin-dir ./plugins/<plugin>` — skill triggers and behaves
2. Copilot CLI local install of the same plugin — skill triggers and behaves
3. Fresh-clone install flow works via `scripts/install.js`

## Reference material

- Clone of microsoft/power-platform-skills is the structural template —
  mirror its marketplace.json shape, its `.claude/settings.json` pre-approved
  commands pattern (pac, git, npm, node), and its evals folder discipline.
