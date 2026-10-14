---
name: pcf-conventions
description: >
  Apply Powercademy's PCF judgement before building, deploying or debugging a Power Apps component framework (PCF) code component - whichever tool builds it - starting with whether PCF is even the right tool. Holds the decision gate (out-of-the-box, canvas component or generative page first), the control-type choice (field, dataset, virtual React) and the PCF gotchas log: version bump or the cached bundle keeps rendering, dev push is not ALM, manifest binding, lifecycle traps, the harness is not the real host, the premium-licensing trap, bundle weight. Trigger alongside any PCF work: "build a PCF control", "code component", "custom control", "dataset control", "ControlManifest", "pac pcf push", "my control won't update", "works in the harness but not on the form", "does this make my app premium". It does not build controls - apply it, then carry on with the build tool. Also trigger when a PCF lesson is learned, so it gets recorded. When in doubt, trigger.
---

# PCF Conventions

The judgement layer for Power Apps component framework (PCF) code components.
Building is done by other tools — Microsoft's pcf plugin, or a developer with
the pac CLI. This skill makes sure the build is the right one, and that it
doesn't walk into a trap that has already cost someone an afternoon. Its job
is twofold:

1. **Apply** — before building, deploying or debugging a control, run the
   decision gate below, then read the relevant sections of
   `${PLUGIN_ROOT}/shared/pcf-gotchas.md` (the contents list makes that quick)
   and apply what fits. Then hand back to the build tool and carry on.
2. **Grow** — when a session teaches something new, or a mistake is
   corrected, offer to record it — once, at a natural pause. Working in the
   marketplace repo, append it directly; running from an installed copy, draft
   the entry for the user to contribute back, because installed copies are
   overwritten on update.

## The decision gate: is PCF the right tool?

PCF carries real cost — a build toolchain, a bundle that loads on every form, a
deployment story and an upgrade story. Before anyone writes a manifest, rule
out the cheaper options honestly:

- **Out-of-the-box** column formatting, a modern control, or a view already
  does it → no code.
- **A canvas component** or a **generative page** fits the need and is easier
  to maintain → prefer it.
- **PCF is right when** you need a bespoke interactive UI bound to a column or
  dataset, reused across forms or tables, rendering *in the same context* as
  the rest of the form (unlike a web resource in an iframe).

Say which you'd choose and why. If PCF is overkill, say so — talking someone
out of unnecessary work earns the right to build the necessary work.

Then pin the **control type**, because it determines everything downstream:

| Type | Binds to | Use for |
|---|---|---|
| **Field** | a single column of a specific data type | replacing one column's UI (slider, dial, colour picker) |
| **Dataset** | a view / subgrid | transforming a list (calendar, map, gallery) |
| **Virtual (React)** | either, using the platform's React + Fluent | complex interactive UI without bundling your own React |

## The non-negotiables

These come up on almost every control. The gotchas file has the detail.

- **Bump the manifest version on every redeploy.** Otherwise the platform
  serves the cached old bundle and nothing you changed appears.
- **Dev push is not deployment.** Iterate with a dev push; ship a **managed
  solution** through the normal ALM path.
- **Check licensing before building, not after.** A component that calls an
  external service from the browser makes the app premium — confirm the
  customer is licensed. A hard stop before production.
- **The harness is not the real host.** "Works in the harness" is a render
  check, not proof. The real test is on a real form or view.
- **Choose the namespace, constructor and publisher prefix once.** Renaming
  after deployment orphans every form binding.

## How to add an entry

Add it under the right section of `${PLUGIN_ROOT}/shared/pcf-gotchas.md`:

```
**<Symptom, as the developer would describe it>.**
<Cause — what's actually going on.>
→ <Fix — the concrete thing to do instead.>
```

Then add a one-line entry to the file's session log. Keep it lean, and **never
add client-identifying detail** — phrase every lesson for any project.

## Verify, don't recall

Manifest schema, `feature-usage` availability per host and licensing rules
change. Before relying on one, check it against Microsoft Learn — see
`${PLUGIN_ROOT}/shared/microsoft-refs.md` for how.
