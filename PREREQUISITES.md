# Prerequisites

You should need to do almost nothing by hand. Two steps get a machine from
nothing to ready:

1. **Bootstrap** — the one-line installer in the README. It needs Node.js and
   git, checks for an agent runtime (GitHub Copilot CLI or Claude Code),
   registers this marketplace and installs the `doctor` plugin.
2. **Say "set up my workstation"** — the `setup-workstation` skill does the rest
   conversationally: asks what you'll build, installs the SDKs, CLIs,
   Microsoft's plugins and the workloads you choose, signs you in, verifies
   everything works, and writes an IT request for anything that needs admin
   rights you don't have.

Afterwards, if anything stops working, say **"check my setup"**.

## What gets installed

The complete, versioned list — every item, the check that proves it works, the
install command per OS, whether it needs admin, and which workloads need it —
lives in one place:
[`plugins/doctor/shared/toolchain-manifest.json`](plugins/doctor/shared/toolchain-manifest.json).
Both skills and the installer read it, so they can never disagree.

At a glance:

| Tier | Items |
|---|---|
| **Bootstrap** | Node.js 22 LTS · git · GitHub Copilot CLI ≥1.0.71 or Claude Code |
| **Required** | .NET 10 SDK · Power Platform CLI (pac) · Azure CLI · Python 3.12 + Dataverse Python SDK · Microsoft's Power Platform marketplace + Dataverse skills · Powercademy core plugins |
| **Per workload** | Flows · canvas · model-driven · Power Pages · code apps · Copilot Studio (+ VS Code and its extension) · PCF · mobile (JDK 17, Android Studio, Xcode on Mac) · process mining · ALM |
| **Recommended** | Microsoft Learn MCP · Playwright MCP · pac CLI MCP server · Power Platform Tools for VS Code · Power CAT marketplace · PowerShell 7 |

## Kept current automatically

A weekly workflow (`.github/workflows/upstream-watch.yml`) fingerprints the
Microsoft repos these skills depend on — their plugin lists, the MCP servers
they launch, and the runtime versions they require — and opens an
`upstream-change` issue when something moves. The manifest also flags itself
stale after 90 days without re-verification. See
[`scripts/watch/upstream-watch.js`](scripts/watch/upstream-watch.js).
