# Rendered artifacts — the build-along page

<!-- CANONICAL COPY: this file is duplicated byte-identically into every
     deliverable-producing plugin's shared/ folder; the lint enforces sync.
     Edit all copies together. -->

Every major deliverable this skill produces (a build spec, an edit spec, a
plan, a readiness card) gets a **rendered HTML companion** alongside the
markdown: same folder, same basename, `.html` extension. Offer it by default;
produce it when the deliverable is first complete and regenerate it whenever
the markdown changes.

**The markdown is the source of truth. The HTML is a rendered view.** Never
hand-edit the HTML; never let it drift — regenerate from the markdown. Tell
the user both paths.

## Hard rules

1. **One self-contained file.** All CSS and JS inline. **No CDN links, no
   external fonts, no fetches** — customer machines are offline, proxied, or
   locked down, and the page must open from disk (`file://`) untouched.
2. **Verdict first.** The top of the page answers "where are we?" before any
   detail: a status strip with the deliverable name, version, date, target
   environment, and overall state (e.g. checkpoints passed / total).
3. **Act-on vs investigate.** Split content the reader must *do something
   about* from content that is *reference*. Never make them hunt.
4. **The page is a work surface, not a poster.** Checkpoints are tickable;
   expressions are copyable; progress survives a browser restart.

## Design tokens (inline in a `<style>` block)

```css
:root {
  --bg: #faf9f7;          /* warm paper */
  --ink: #1a1a1a;
  --muted: #6b6b6b;
  --accent: #b45309;      /* single amber accent — used sparingly */
  --card: #ffffff;
  --line: #e5e2dc;
  --pass: #15803d; --warn: #b45309; --fail: #b91c1c;
  --mono: ui-monospace, "Cascadia Code", Consolas, monospace;
  --sans: "Segoe UI", system-ui, -apple-system, sans-serif;
}
```

Light only, generous whitespace, max-width ~860px centred, cards with 1px
`--line` borders — no shadows, no gradients, no images. Risk tiers render as
small badges: 🟢 `--pass` · 🟡 `--warn` · 🔴 `--fail`.

## Components

**Status strip** (top): deliverable name · version (from the markdown change
log) · date · environment/tenant it targets · progress summary.

**Nesting tree**: render the ASCII tree in a `<pre>` with `--mono` — do not
convert to a graphic; the tree's fidelity to the spec matters more than
prettiness.

**Action cards**: one card per action/step — name as the heading, placement
line, fields table, description. Every expression or command sits in a
`<code>` block with a **copy button**:

```html
<button class="copy" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">Copy</button>
```

**Checkpoint blocks**: each ⏸ checkpoint is a card with its tier badge, the
Prepare/Run/Check/Pass-when/Send-me structure, and a **checkbox in the
heading**. Persist ticks:

```html
<script>
document.querySelectorAll(".cp input[type=checkbox]").forEach(cb => {
  const key = "pcs-" + document.title + "-" + cb.id;
  cb.checked = localStorage.getItem(key) === "1";
  cb.addEventListener("change", () =>
    localStorage.setItem(key, cb.checked ? "1" : "0"));
});
</script>
```

The status strip's progress counter reads from the same checkboxes. The
**📋 Send me** block inside each checkpoint gets its own copy button so the
user can paste the results template straight back into the chat.

**Open questions / worth raising**: an act-on card near the top, never buried
at the bottom.

**Change log**: footer table mirroring the markdown change log, newest first.

## Scope discipline

Render only what the markdown says — no invented content, no summaries that
drift from the source. If a section is empty in the markdown, omit it in the
HTML rather than padding it. State both file paths when done, e.g.:
*"Spec: `./case-escalation-spec.md` · build-along page:
`./case-escalation-spec.html` — open it in a browser and tick checkpoints as
you go; ticks persist."*
