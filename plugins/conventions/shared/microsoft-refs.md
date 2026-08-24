# Microsoft references

The **only** place in this plugin that names Microsoft plugin commands, MCP
servers, or file layouts. Skills state methodology; when they need Microsoft
mechanics, they point here.

**Verified 2026-07-25.**

---

## Generative-page modal dialog mechanics (conventions entry 4)

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

## Marketplace registration

Inside a Claude Code or GitHub Copilot CLI session:

```
/plugin marketplace add Powercademy/powercademy-skills
/plugin install conventions@powercademy-skills
```

The bootstrapper at `scripts/install.js` in this repo handles both
marketplaces in one pass.
