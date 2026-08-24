# Setup guide — GitHub Copilot CLI

How to install Powercademy Skills in GitHub Copilot and use it on your own
projects. Should take about five minutes.

> **Which "Copilot"?** Plugins and skills live in the **GitHub Copilot CLI** —
> the terminal agent — not the VS Code Copilot panel, the Windows Copilot app,
> or copilot.microsoft.com. None of those can install plugin marketplaces. If
> you want to use these skills, the CLI is the tool.

*Verified 2026-07-23 against Copilot CLI 1.0.73, pac CLI 2.7.4.*

## 1. Prerequisites

- **Node.js 18+** — check with `node --version`.
- **A GitHub Copilot subscription** (Individual, Business, or Enterprise). The
  CLI signs in with your GitHub account.
- **pac CLI** — the installer below adds it if it's missing (needs the .NET
  SDK); or get it from https://aka.ms/PowerPlatformCLI.

## 2. Install the Copilot CLI

```bash
npm install -g @github/copilot
```

Confirm it's on your PATH and recent enough (plugin commands need **1.0.71+**):

```bash
copilot --version
```

If it's older, run `copilot update`. Then start it once to sign in:

```bash
copilot
```

Follow the browser sign-in prompt. Once you're in, you can `/exit` and come back
any time.

## 3. Install the skills

Two options.

**Option A — one command (recommended).** Sets up both marketplaces
(Microsoft's and Powercademy's) and installs the plugins, in Copilot *and*
Claude Code if you have both:

```bash
curl -fsSL https://raw.githubusercontent.com/Powercademy/powercademy-skills/main/scripts/install.js | node
```

Windows PowerShell:

```powershell
iwr https://raw.githubusercontent.com/Powercademy/powercademy-skills/main/scripts/install.js -OutFile install.js; node install.js; del install.js
```

**Option B — manual, inside a `copilot` session.** Add the marketplace and
install the plugin:

```
/plugin marketplace add Powercademy/powercademy-skills
```

```
/plugin install flow-builder@powercademy-skills
```

You should see `Plugin "flow-builder" installed successfully. Installed 1 skill.`

While you're there, add Microsoft's Power Automate plugin too — the flow-builder
spec can drive it, and the two are designed to work together:

```
/plugin marketplace add microsoft/power-platform-skills
```

```
/plugin install power-automate@power-platform-skills
```

## 4. Point pac at your environment

The skill checks this itself, but doing it once up front is smoother. In a
normal terminal (not inside Copilot):

```bash
pac auth create --environment https://yourorg.crm.dynamics.com
```

```bash
pac auth list
```

Sign-in is a browser flow — it can't be automated, which is why you do it by
hand. Point at a **dev** environment for anything you're going to build.

## 5. Use it

Open a terminal in your project folder and start Copilot:

```bash
copilot
```

Then just describe what you need in plain language — the skill triggers on the
description, no command to remember:

> spec a flow that posts a Teams message to the delivery channel whenever a
> Dataverse case is set to Escalated

What good looks like: it **interviews you first** (which solution? which
environment? who owns it?), runs its preflight checks, verifies the API
touchpoints against Microsoft Learn, and produces a **build spec** as a
Markdown file in your project — action by action, with copy-pasteable
expressions and testing checkpoints tagged 🟢/🟡/🔴. You build from that spec in
the Power Automate designer, and paste run results back as you hit each
checkpoint so the spec stays honest.

Mid-build, it answers box-level questions too:

> what do I put in the left side of this condition?

## 6. Keeping it current

The Copilot CLI plugin surface moves fast. To update the skills:

```
/plugin marketplace update powercademy-skills
```

```
/plugin update flow-builder@powercademy-skills
```

Restart the session afterwards — a running session keeps the old copy.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/plugin` not recognised | Copilot CLI below 1.0.71 | `copilot update`, then reopen |
| Marketplace add fails | Not signed in | Run `copilot`, complete browser sign-in |
| Skill doesn't trigger | Phrasing too terse | Describe the *outcome* ("a flow that…"), not just "flow" |
| pac checks fail | No auth profile | `pac auth create --environment <url>` |
| Skill edits don't take effect | Session cached the old version | `/exit` and restart `copilot` |

## Enterprise rollout

Everything above is a **personal** install. If you want every developer in an
org to get these skills automatically on sign-in, that's the enterprise-managed
plugin path (a `settings.json` in your `.github-private` repo) — see
[issue #3](https://github.com/Powercademy/powercademy-skills/issues/3).
It's preview-era and worth doing once you've validated the skills yourself.
