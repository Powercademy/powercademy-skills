---
name: model-driven-ux
description: >
  Apply Powercademy's UX conventions to model-driven apps, forms, command bars, dialogs and custom or generative pages, so apps feel finished and users can act without guessing. Holds the rules for command bar buttons built in the command designer - every button has an icon that says what it does, paired actions get paired icons, no icon reused for different actions on one bar, label, tooltip and accessibility text set - and for focused-task dialogs being modal. Trigger whenever the user is designing or reviewing a model-driven app's look and behaviour: "add a button", "command bar", "command designer", "ribbon", "button icon", "which icon", "Icon is required", "new command", "custom page", "generative page", "dialog", "popup", "modal", "form layout", "make the app look better", "review my app's UX". Also trigger when building commands or pages with Microsoft's tooling, and when a new UX lesson is learned, so it gets recorded. When in doubt, trigger.
---

# Model-driven UX Conventions

The details that decide whether a model-driven app feels finished or
half-built. Users read a command bar in a glance and judge the whole app by
it. Like the other conventions, this list grows from real builds:

1. **Apply** — before adding or reviewing a command, dialog or page, skim the
   entries and apply what's relevant without being asked.
2. **Grow** — when a new UX lesson surfaces, offer to record it once, at a
   natural pause. Working in the marketplace repo, append it directly; from an
   installed copy, draft it for the user to contribute back.

**Never add client-identifying detail to an entry** — phrase every lesson for
any project.

## How to add an entry

```
### N. <Short imperative title>
**Rule:** <what to do / not do>
**Why:** <what breaks or degrades for the user without this>
**How:** <optional: the concrete mechanism or setting>
```

---

## The conventions

### 1. Every command button has an icon that says what it does

**Rule:** No command bar button ships without an icon, and the icon must
describe the action, not just decorate it:

- **Meaning first.** Pick the icon a user would draw for the verb: a padlock
  to lock, a tick to complete, a send arrow to submit, a bin to delete.
- **Paired actions get paired icons.** An action and its undo share a family —
  *Fix* with a closed padlock means *Unfix* gets the open padlock; *Mark
  complete* with a tick means *Reopen* gets an undo or reopen arrow, not a
  pencil.
- **One icon, one meaning per command bar.** Don't give three different
  "Mark … final" buttons the same tick as *Mark Complete*, or two *New*
  buttons the same plus. If the actions differ, the icons differ; if they
  can't, the labels must carry the difference clearly.
- **System icon first, SVG second.** Use the designer's built-in icon set when
  one fits; when none does, upload an **SVG** web resource that takes its
  colour from the theme rather than a hard-coded fill.
- **Icon, label, tooltip and accessibility text together.** The icon is the
  glance; the label is the confirmation; the tooltip explains anything
  non-obvious; accessibility text serves screen readers.

**Why:** Users scan icons before they read labels. A missing icon looks
unfinished (and the designer refuses to save a command with "Use Icon"
selected and nothing chosen). A wrong or duplicated icon is worse than none:
it teaches users that the icons can't be trusted, so they stop scanning and
start reading every label — slower, and more mis-clicks on the destructive
ones.

**How:** In the command designer, set **Icon** for every command. To audit a
whole app, don't click through each command bar: every modern command is a
row in Dataverse, so one query lists the buttons with no icon (concrete table
and columns in `${PLUGIN_ROOT}/shared/microsoft-refs.md`). Fix them in the
designer, or through the API after reading the icon value from a button that
already has the right one.

### 2. Focused-task dialogs are modal

**Rule:** When a dialog is a focused task the user must complete or dismiss —
a create/edit form, a record-detail view — make it **modal**: dimmed backdrop,
focus trapped inside, background inert until closed. Reserve non-modal panels
for side-panel patterns where the background is *meant* to stay interactive.

**Why:** A non-modal dialog leaves the page behind it fully clickable, so
users trigger colliding actions underneath the popup, lose track of which
surface has focus, and land in inconsistent state. A blocking scrim + focus
trap is the expected, accessible pattern.

**How:** On generative/custom pages the default is often non-modal, and making
it modal safely needs the host-specific overlay pattern — see
`${PLUGIN_ROOT}/shared/microsoft-refs.md` for the mechanics on Microsoft's
generative-page tooling.

---

## Calibration

**About to add a command button** → entry 1. Choose the icon with the label,
not afterwards, and check the rest of that command bar for clashes.

**Reviewing an app's command bars** → entry 1, via the one-query audit rather
than clicking through every bar. Report missing icons, duplicated icons for
different actions, and broken pairs.

**Building a dialog or a custom page** → entry 2.

**A new UX lesson surfaces mid-build** → offer to record it, once.

## Reference files

- `${PLUGIN_ROOT}/shared/microsoft-refs.md` — command-bar table and columns,
  SVG icon guidance, generative-page dialog mechanics.
