# Microsoft references

The **only** place in this plugin that names Microsoft plugin commands, MCP
servers, or file layouts. Skills state methodology; when they need Microsoft
mechanics, they point here.

**Verified 2026-07-25; tool map added 2026-11-04; command-bar icons verified 2026-11-12.**

---

## Command-bar icons (model-driven-ux entry 1)

Per Microsoft Learn, *Customize the command bar using command designer*: a
command's **Icon** can be "any system icons or web resource SVG files".

Every **modern** command is a row in the Dataverse `appaction` table
(*App Action (appaction) table reference*). The columns that matter:

| Column | Holds |
|---|---|
| `fonticon` | System icon chosen in the designer (string) |
| `iconwebresourceid` | SVG web resource used instead (lookup to `webresource`) |
| `buttonlabeltext` | Label |
| `buttontooltiptitle`, `buttontooltipdescription` | Tooltip |
| `buttonaccessibilitytext` | Screen-reader text |
| `appmoduleid`, `contextentity`, `location` | Which app, table and command bar |

**The audit:** query `appaction` for the app, filtered to rows where
`fonticon` is null **and** `_iconwebresourceid_value` is null — those are the
buttons with no icon. Group the rest by `fonticon` per command bar to find one
icon reused for different actions. Classic (ribbon) commands are not in this
table and can't be edited in the command designer.

**Fixing:** in the designer, or by writing `fonticon` through the Web API. The
value format isn't documented on the reference page, so read it from a button
that already shows the right icon and copy that format rather than guessing.

**SVG icons** (Learn, *Image web resources*): use SVG over PNG/JPG; leave out
hard-coded fills and use `fill="currentColor"` so the app applies theme
colours and contrast; set `width`, `height` and `viewBox` on the `svg` element.

## Generative-page modal dialog mechanics (model-driven-ux entry 2)

On pages built with Microsoft's generative-page tooling (the `model-apps`
plugin's genpage), the Fluent `Dialog` default is `modalType="non-modal"`. To
make a focused-task dialog modal without the scrim bleeding into the app
shell: pass `mountNode` to the `DialogSurface` and make the page root a
containing block (`position: relative; contain: layout`) — then
`modalType="modal"` clips the scrim to the page region. The genpage rules
permit `modalType="modal"` under exactly these conditions. These are
plugin-specific mechanics and may change with that plugin — re-verify against
its current reference docs when applying.

## Verifying platform behaviour against Microsoft Learn

Where a convention cites platform mechanics (metadata actions, solution
component behaviours), verify against live Learn before relying on details:
the **Microsoft Learn MCP server** where available in the session (remote,
no-auth, `https://learn.microsoft.com/api/mcp` — a plain fetch returns 405,
which means *alive*), otherwise a web fetch of `learn.microsoft.com`.

Useful anchors:

- statecode/statuscode metadata actions: search Learn for `InsertStatusValue UpdateStateValue`
- Solution components & root behaviour: search Learn for `AddSolutionComponent rootcomponentbehavior`

## Tool map (tool-selection)

Concrete tools behind each rung of the tool-selection ladder. Re-check against
the installed plugins — Microsoft add and rename tools often.

| Rung | Workload | Tool |
|---|---|---|
| 1 — purpose-built | Cloud flows | `power-automate` plugin (FlowAgent MCP server: build, edit, validate, run, debug) |
| 1 | Dataverse | `dataverse` plugin (`dv-*` skills; Dataverse MCP, Python SDK and pac underneath) |
| 1 | Canvas apps | `canvas-apps` plugin (canvas authoring MCP server) |
| 1 | Model-driven apps, generative pages | `model-apps` plugin |
| 1 | Power Pages | `power-pages` plugin |
| 1 | Copilot Studio | `copilot-studio` (standard agents) / `mcs-assistant` (harness agents) |
| 1 | PCF | `pcf` plugin |
| 2 — SDK / API / CLI | Dataverse data and schema | Dataverse Python SDK (`PowerPlatform-Dataverse-Client`) or the Web API; for bulk work use batching — search Learn for `Dataverse Web API batch requests` and `CreateMultiple UpdateMultiple` |
| 2 | Solutions, environments, auth, components | `pac` CLI (`pac solution`, `pac admin`, `pac auth`, `pac pcf`); native Power Platform pipelines for promotion |
| 2 | Azure resources and sign-in | `az` CLI |
| 3 — browser | UI-only settings, visual checks, user's-eye testing | Playwright MCP — bundled by `model-apps` and `power-pages`; standalone registration in doctor's toolchain manifest |
| — | Platform facts | Microsoft Learn MCP server (see above) |

Microsoft's own Power Pages guidance makes the cost point concretely: each
Playwright MCP navigation returns a full page snapshot, so batch browser work
into as few calls as possible when the browser *is* the right tool.

## Marketplace registration

Inside a Claude Code or GitHub Copilot CLI session:

```
/plugin marketplace add Powercademy/powercademy-skills
/plugin install conventions@powercademy-skills
```

The bootstrapper at `scripts/install.js` in this repo handles both
marketplaces in one pass.
