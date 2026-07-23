# PCF Build — Gotchas Log

Accumulated failures, each of which cost real time once. Read before building.
Append after any session that teaches something new.

Format per entry: **Symptom** → **Cause** → **Fix**. Short and mechanical.

---

## Contents

1. [Versioning & deployment](#versioning--deployment)
2. [Manifest](#manifest)
3. [Lifecycle](#lifecycle)
4. [Test harness vs real host](#test-harness-vs-real-host)
5. [Licensing](#licensing)
6. [Bundling & performance](#bundling--performance)
7. [Session log](#session-log)

---

## Versioning & deployment

**The control won't update after a redeploy — the old version keeps rendering.**
The platform caches the bundle by manifest version. Redeploying the same version number serves the cached old bundle.
→ Increment the version in `ControlManifest.Input.xml` **every** redeploy. Then republish/clear cache. This is the single biggest PCF time-waster; make it a checkpoint.

**`pac pcf push` used as the deployment method for production.**
`pac pcf push` creates a temporary publisher/solution for dev iteration. It is not an ALM path — it doesn't give you a clean managed solution and pollutes the environment with a scratch publisher.
→ Dev iteration: `pac pcf push`. Production: package into a proper solution and import a **managed** solution. Two different tools for two different jobs.

**Renaming the namespace or constructor after deployment breaks everything.**
The namespace + constructor is the control's identity; forms reference it. Renaming orphans every binding.
→ Choose the namespace and constructor before the first deploy and don't change them. Same for the publisher prefix.

---

## Manifest

**A field control won't bind on the form — it doesn't appear as an option.**
The manifest's bound property `of-type` doesn't match the target column's data type. The form editor silently filters it out.
→ Match the property type to the column exactly. Verify the valid `of-type` values against Learn.

**A CSS file or image isn't loading in the deployed control.**
Resources not declared in the manifest's `<resources>` aren't bundled.
→ Declare every `.css`, image, and `.resx` in `<resources>`. If it's not in the manifest, it doesn't ship.

**A platform API (Web API, device) throws at runtime though it compiled.**
The `feature-usage` node for that API isn't declared, or the API isn't available in the host (canvas vs model-driven) or the harness.
→ Declare `feature-usage` for every platform API touched, and confirm availability for the target host against Learn.

---

## Lifecycle

**`getOutputs` never fires; the platform never sees the output.**
`getOutputs` is only called after you call `notifyOutputChanged`. Forgetting that call is the classic output bug.
→ Stash `notifyOutputChanged` in `init` and call it whenever an output changes.

**`updateView` runs when data didn't change, and re-does expensive work.**
`updateView` fires on *every* context change — data, container resize, mode switch — not only data updates.
→ Check what actually changed (`context.updatedProperties`) before doing work. Don't assume it's a data change.

**A virtual (React) control renders twice or fights the platform.**
Calling `ReactDOM.render` yourself in a virtual control duplicates what the platform does.
→ Return the React element from `updateView`; let the platform render it.

**Listeners/timers leak; state behaves oddly after the control reloads.**
The platform destroys and reloads controls for performance. Cleanup not done in `destroy` leaks.
→ Remove listeners and clear timers in `destroy`.

---

## Test harness vs real host

**"Works in the harness" but fails on the form.**
The test harness (`npm start watch`) is not the real host: Web API isn't available, context and data shapes differ, some `feature-usage` APIs are absent.
→ Treat the harness as a compile/render check only. The real test is on a real form/view in a dev environment. Say this explicitly; don't let "works in harness" be heard as "works".

---

## Licensing

**A component quietly makes the whole app premium.**
A code component that connects to an external service *directly from the browser* is premium. Used in an app, the app becomes premium and end users need Power Apps licences.
→ Know before you build whether the component reaches external data. If it does, declare `<external-service-usage>` in the manifest and confirm the customer is licensed for premium — a hard stop before production. Verify the current rule against Learn; licensing moves. (Components in model-driven apps connected to Dataverse already need Power Apps licences.)

**On-premises isn't supported at all.**
PCF is not supported for on-premises environments.
→ Confirm the target is online before promising a PCF solution.

---

## Bundling & performance

**Form load is slow after adding the control.**
The bundle loads on every form render. Bundling your own React/Fluent or heavy dependencies bloats it.
→ Use `<platform-library>` for React/Fluent instead of bundling them. Keep dependencies minimal. The control shares the form's load budget.

---

## Session log

Append a one-line entry per session that added a gotcha, so patterns across
builds become visible.

- **2026-07 — seeded.** Version-bump-or-cached-bundle, `pac pcf push` vs ALM, and the premium-licensing trap are the three that cost the most time on real builds.
