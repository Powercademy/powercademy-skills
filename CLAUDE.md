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

1. **Dual-runtime, always.** Powercademy Skills is for GitHub Copilot CLI
   *and* Claude Code — never one of them. Every skill, plugin, installer step,
   manifest item, doc and test must work in both. Copilot CLI is the
   first-class citizen (target users are in Copilot-approved enterprises);
   Claude Code is never an afterthought either.
   - Anything that installs or registers something does it **into every runtime
     present** on the machine.
   - Runtime-specific divergence is allowed only when a runtime genuinely
     can't do the same thing, and only as explicit data with a reason — e.g.
     the manifest's `runtimes`, `marketplaceByRuntime` + `runtimeNote`. Never a
     silent "Claude-only" or "Copilot-only" path.
   - Proof, not intent: the fresh-machine workflow installs into both runtimes
     on Windows, macOS and Linux, and trigger evals run per runtime. A change
     that hasn't been shown working in both isn't done (see Testing below).
   - Skills only. No `commands/` directory, no `styles/`, no Claude-only
     features in core functionality.
   - Hooks are OPTIONAL enhancements only — nothing may depend on them.
   - Never add a `skills` field to plugin.json (Claude Code rejects it).
   - SKILL.md frontmatter: `name` and `description` only.

2. **Loose coupling to Microsoft's plugins.** Skills encode methodology, not
   Microsoft's mechanics. Any unavoidable reference to Microsoft plugin
   commands, MCP servers, or file layouts goes in ONE shared reference file per
   plugin (`shared/microsoft-refs.md`), never scattered through skills.
   - Exception: a plugin that needs those mechanics in machine-readable form
     (install commands, version floors, package IDs) may add ONE JSON companion
     beside it — currently only `plugins/doctor/shared/toolchain-manifest.json`.
     The rule is unchanged in spirit: one place per plugin for prose, one for
     data, nothing vendor-specific in SKILL.md bodies.
   - The toolchain manifest is the single source of truth for what gets
     installed and checked. Skills, `scripts/install.js` and the upstream watch
     read it; never duplicate its contents elsewhere.

3. **Trademark distance.** Never name anything in a way that implies Microsoft
   sponsorship. No "Copilot" in product or plugin names.

## Repo structure

```
powercademy-skills/
├── .claude-plugin/marketplace.json
├── plugins/
│   └── <plugin>/            # alm, canvas-planner, conventions, doctor
│       ├── .claude-plugin/plugin.json
│       ├── skills/<skill-name>/SKILL.md
│       └── shared/               # refs incl. microsoft-refs.md
│                                 # (doctor also: toolchain-manifest.json)
├── scripts/install.js            # bootstrapper
├── scripts/watch/                # upstream watch (weekly CI)
├── watch/upstream-snapshot.json  # accepted upstream baseline
├── evals/                        # test cases (post-v1)
├── CHANGELOG.md
└── README.md
```

## Skill authoring rules

- Frontmatter descriptions are the trigger mechanism. Write them "pushy":
  state what the skill does AND list the phrases/contexts that should trigger
  it ("Use whenever the user mentions deploying a solution, environments,
  promotion, pipelines, managed vs unmanaged…").
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
4. Anything touching the doctor plugin, the toolchain manifest or the
   installer: the `fresh-machine` workflow is green on Windows, macOS and
   Linux (throwaway GitHub-hosted VMs; installs into both runtimes). Never run
   `scripts/test/workstation-smoke.js` without `--no-install` on a real
   machine — it really installs things.

## Reference material

- Clone of microsoft/power-platform-skills is the structural template —
  mirror its marketplace.json shape, its `.claude/settings.json` pre-approved
  commands pattern (pac, git, npm, node), and its evals folder discipline.
