#!/usr/bin/env node
/**
 * Powercademy workstation — health report.
 *
 * Read-only. Checks every item in the toolchain manifest on this machine, in
 * every agent runtime present, scores the workstation's health and writes:
 *
 *   workstation-report.md    the source of truth
 *   workstation-report.html  the rendered page (offline, single file)
 *
 * The page leads with the score and a summary, then what's ready, what needs
 * fixing, and the workloads not set up yet — each with what it unlocks and
 * links to its docs.
 *
 * Usage:
 *   node <plugin>/scripts/workstation-report.js [--out-dir <dir>] [--workloads flows,canvas] [--json]
 *
 * Without --workloads, a workload counts as "yours" when any of its plugins is
 * installed. Nothing here installs or changes anything.
 */

const fs = require("fs");
const path = require("path");
const tc = require("./toolchain");

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const flag = (n) => args.includes(n);

const manifest = tc.loadManifest();
const byId = Object.fromEntries(manifest.items.map((i) => [i.id, i]));
const runtimes = tc.detectRuntimes();
const clis = Object.keys(runtimes);
const repoOf = (mkt) => manifest.items.find((i) => i.type === "marketplace" && i.marketplace === mkt)?.repo;
const docsOf = (item) => item.docs || (item.repo ? `https://github.com/${item.repo}` : repoOf(item.marketplace) ? `https://github.com/${repoOf(item.marketplace)}` : null);
const forRuntimes = (item) => clis.filter((c) => !item.runtimes || item.runtimes.includes(c));

// ── check every item once ─────────────────────────────────────
const CREDIT = { ready: 1, bundled: 1, partial: 0.5, outdated: 0.5, repair: 0.25, missing: 0 };
const results = {};

function perRuntime(item, test) {
  const rts = forRuntimes(item);
  if (!rts.length) return { status: "na", detail: "no agent runtime for this item" };
  const have = rts.filter(test);
  const detail = rts.map((c) => `${c === "claude" ? "Claude Code" : "Copilot CLI"} ${have.includes(c) ? "✓" : "✗"}`).join(" · ");
  return { status: have.length === rts.length ? "ready" : have.length ? "partial" : "missing", detail };
}

function check(item) {
  if (results[item.id]) return results[item.id];
  let r;
  if (item.platforms && !item.platforms.includes(tc.OS)) r = { status: "na", detail: `not used on ${tc.OS}` };
  else if (item.type === "marketplace") r = perRuntime(item, (c) => tc.listMarketplaces(c).includes(item.marketplace));
  else if (item.type === "plugin") {
    const names = item.plugins || [item.plugin];
    r = perRuntime(item, (c) => names.every((n) => tc.hasPlugin(c, n)));
  } else if (item.type === "mcp") {
    const bundled = (item.bundledIn || []).filter((p) => clis.some((c) => tc.hasPlugin(c, p)));
    if (bundled.length) r = { status: "bundled", detail: `provided by ${bundled.join(", ")}` };
    else if (!item.mcpMatch) r = { status: "missing", detail: "registered by hand" };
    else r = perRuntime(item, (c) => new RegExp(item.mcpMatch, "i").test(tc.mcpText(c)));
  } else {
    const alt = item.runtimeAlternative && byId[item.runtimeAlternative];
    const c = tc.checkTool(item);
    if (c.state === "ready") r = { status: "ready", detail: c.version ? `v${c.version}` : "" };
    else if (alt && clis.includes(alt.id === "claude-code" ? "claude" : "copilot")) r = { status: "na", detail: `${alt.name} covers this` };
    else if (c.state === "outdated") r = { status: "outdated", detail: `v${c.version}, needs ${item.check.min}+` };
    else if (c.state === "repair" || c.state === "noversion") r = { status: "repair", detail: c.repair === "shim" ? "on PATH but not working" : `needs repair (${c.repair || "check output unexpected"})` };
    else if (c.state === "nocheck") r = { status: "na", detail: "nothing to check on this platform" };
    else r = { status: "missing", detail: "" };
  }
  return (results[item.id] = { ...r, item });
}

// ── work out the sections ─────────────────────────────────────
const itemsOfWorkload = (w, variants) => {
  const ids = [...w.items];
  if (w.variants) for (const v of variants) ids.push(...w.variants.options[v].items);
  return [...new Set(ids)].map((id) => byId[id]);
};
const pluginItems = (items) => items.filter((i) => i.type === "plugin");

const wlArg = opt("--workloads", null);
const workloads = manifest.workloads.map((w) => {
  let variants = w.variants ? w.variants.default : [];
  if (w.variants) {
    const installed = Object.entries(w.variants.options).filter(([, o]) => pluginItems(o.items.map((id) => byId[id])).some((p) => ["ready", "partial"].includes(check(p).status))).map(([k]) => k);
    if (installed.length) variants = installed;
  }
  const items = itemsOfWorkload(w, variants);
  const mine = wlArg ? wlArg.split(",").includes(w.id) : pluginItems(items).some((p) => ["ready", "partial"].includes(check(p).status));
  return { w, items, mine };
});

const core = manifest.items.filter((i) => i.tier === "bootstrap" || i.tier === "required");
const recommended = manifest.items.filter((i) => i.tier === "recommended");
const integrations = (manifest.integrations || []).flatMap((g) => Object.values(g.options).flatMap((o) => o.items)).map((id) => byId[id]);
const myWorkloadItems = [...new Set(workloads.filter((x) => x.mine).flatMap((x) => x.items))];

[...core, ...recommended, ...integrations, ...workloads.flatMap((x) => x.items)].forEach(check);

function sectionScore(items) {
  const scored = items.map((i) => results[i.id]).filter((r) => r.status !== "na");
  if (!scored.length) return null;
  return scored.reduce((s, r) => s + (CREDIT[r.status] ?? 0), 0) / scored.length;
}
const sections = [
  { key: "core", label: "Core toolchain", weight: 60, score: sectionScore(core) },
  { key: "workloads", label: "Your workloads", weight: 30, score: sectionScore(myWorkloadItems) },
  { key: "recommended", label: "Recommended extras", weight: 10, score: sectionScore(recommended) },
].filter((s) => s.score !== null);
const totalWeight = sections.reduce((s, x) => s + x.weight, 0);
const score = Math.round(sections.reduce((s, x) => s + x.score * x.weight, 0) / totalWeight * 100);
const band = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Needs attention" : "Not ready";

const ICON = { ready: "✅", bundled: "🔁", partial: "◐", outdated: "⬆", repair: "🧩", missing: "⬜", na: "➖" };
const LABEL = { ready: "Ready", bundled: "Ready (bundled)", partial: "In one runtime only", outdated: "Outdated", repair: "Needs repair", missing: "Not installed", na: "Not applicable" };
const FIXABLE = ["repair", "outdated", "partial", "missing"];
const phraseFor = (status) => (status === "missing" ? "set up my workstation" : "check my setup");

// Core before workloads before recommended; within each, worst first.
const fixes = [core, myWorkloadItems, recommended]
  .flatMap((items, rank) => items.map((i) => ({ ...results[i.id], rank })))
  .filter((r) => FIXABLE.includes(r.status))
  .sort((a, b) => a.rank - b.rank || FIXABLE.indexOf(a.status) - FIXABLE.indexOf(b.status));
const uniqueFixes = [...new Map(fixes.map((f) => [f.item.id, f])).values()];

const mine = workloads.filter((x) => x.mine);
const toAdd = workloads.filter((x) => !x.mine);
const readyFor = mine.filter((x) => x.items.every((i) => ["ready", "bundled", "na"].includes(results[i.id].status))).map((x) => x.w.label);
const verdict = [
  readyFor.length ? `Ready for ${readyFor.join(", ")}.` : mine.length ? "Your workloads need attention." : "No workloads set up yet.",
  uniqueFixes.length ? `${uniqueFixes.length} thing${uniqueFixes.length === 1 ? "" : "s"} to fix.` : "Nothing to fix.",
].join(" ");

const today = new Date().toISOString().slice(0, 10);
const osName = { win: "Windows", mac: "macOS", linux: "Linux" }[tc.OS];
const rtLine = clis.length ? clis.map((c) => `${c === "claude" ? "Claude Code" : "GitHub Copilot CLI"} ${runtimes[c]}`).join(" · ") : "none found";

// ── markdown (source of truth) ────────────────────────────────
const row = (i) => { const r = results[i.id]; const d = docsOf(i); return `| ${ICON[r.status]} | ${d ? `[${i.name}](${d})` : i.name} | ${LABEL[r.status]} | ${r.detail || ""} |`; };
const table = (items) => ["| | Item | Status | Detail |", "|---|---|---|---|", ...items.map(row)].join("\n");
const md = [
  `# Workstation health report`,
  "",
  `**${score}/100 — ${band}.** ${verdict}`,
  "",
  `${osName} · ${today} · Runtimes: ${rtLine} · Manifest verified ${manifest.lastVerified}`,
  "",
  ...sections.map((s) => `- ${s.label}: ${Math.round(s.score * 100)}% (weight ${s.weight})`),
  "",
  "## Fix first",
  "",
  ...(uniqueFixes.length ? uniqueFixes.slice(0, 3).map((f) => `- ${ICON[f.status]} **${f.item.name}** — ${LABEL[f.status]}${f.detail ? ` (${f.detail})` : ""}. Say *"${phraseFor(f.status)}"*.`) : ["Nothing — everything you use is healthy."]),
  "",
  "## Core toolchain",
  "",
  table(core),
  "",
  "## Your workloads",
  "",
  ...(mine.length ? mine.flatMap((x) => [`### ${x.w.label}`, "", x.w.unlocks, "", table(x.items), "", `Try first: *"${x.w.tryFirst}"*`, ""]) : ["None yet. Pick one below.", ""]),
  "## Available to add",
  "",
  ...toAdd.flatMap((x) => [`- **${x.w.label}** — ${x.w.unlocks} Say *"add ${x.w.label.toLowerCase()} to my setup"*. ${pluginItems(x.items).map((p) => docsOf(p)).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((d) => `[docs](${d})`).join(" ")}`]),
  "",
  "## Recommended extras",
  "",
  table(recommended),
  "",
  "## Integrations",
  "",
  table(integrations),
  "",
  `_Scored over: core 60, your workloads 30, recommended 10. Ready = full credit; outdated or one runtime only = half; needs repair = a quarter. Read-only check by the Powercademy workstation plugin._`,
  "",
].join("\n");

// ── HTML (rendered view, per shared/artifact-style.md) ────────
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cls = { ready: "pass", bundled: "pass", partial: "warn", outdated: "warn", repair: "fail", missing: "muted", na: "muted" };
const link = (i) => { const d = docsOf(i); return d ? `<a href="${esc(d)}" target="_blank" rel="noopener">${esc(i.name)}</a>` : esc(i.name); };
const htable = (items) => `<table><thead><tr><th></th><th>Item</th><th>Status</th><th>Detail</th></tr></thead><tbody>${items.map((i) => {
  const r = results[i.id];
  return `<tr><td>${ICON[r.status]}</td><td>${link(i)}${i.why ? `<div class="why">${esc(i.why)}</div>` : ""}</td><td><span class="chip ${cls[r.status]}">${LABEL[r.status]}</span></td><td>${esc(r.detail)}</td></tr>`;
}).join("")}</tbody></table>`;
const say = (p) => `<span class="say"><code>${esc(p)}</code><button class="copy" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">Copy</button></span>`;
const scoreCls = score >= 75 ? "pass" : score >= 50 ? "warn" : "fail";

const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Workstation health report</title>
<style>
:root{--bg:#faf9f7;--ink:#1a1a1a;--muted:#6b6b6b;--accent:#b45309;--card:#fff;--line:#e5e2dc;--pass:#15803d;--warn:#b45309;--fail:#b91c1c;--mono:ui-monospace,"Cascadia Code",Consolas,monospace;--sans:"Segoe UI",system-ui,-apple-system,sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 var(--sans)}
main{max-width:860px;margin:0 auto;padding:24px 16px 48px}
.strip{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline;padding:10px 14px;border:1px solid var(--line);background:var(--card);font-size:13px;color:var(--muted)}
.strip b{color:var(--ink)}
.summary{display:flex;gap:24px;align-items:center;margin:16px 0;padding:20px;border:1px solid var(--line);background:var(--card)}
.score{font-size:56px;font-weight:700;line-height:1;min-width:120px;text-align:center}.score small{display:block;font-size:13px;font-weight:600;letter-spacing:.02em}
.pass{color:var(--pass)}.warn{color:var(--warn)}.fail{color:var(--fail)}.muted{color:var(--muted)}
.verdict{font-size:17px;margin:0 0 10px}
.bars{display:grid;gap:6px;font-size:13px}.bar{display:grid;grid-template-columns:150px 1fr 44px;gap:8px;align-items:center}
.track{height:8px;border:1px solid var(--line);background:var(--bg)}.fill{height:100%;background:var(--accent)}
h2{font-size:18px;margin:28px 0 10px}h3{font-size:16px;margin:18px 0 6px}
.card{border:1px solid var(--line);background:var(--card);padding:14px 16px;margin:10px 0}
.act{border-left:3px solid var(--accent)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);font-size:14px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;color:var(--muted);font-weight:600}
td:first-child{width:28px}.why{font-size:12px;color:var(--muted)}
.chip{font-size:12px;font-weight:600;white-space:nowrap}
a{color:var(--accent)}code{font-family:var(--mono);font-size:13px;background:var(--bg);border:1px solid var(--line);padding:1px 6px}
.say{display:inline-flex;gap:6px;align-items:center}.copy{font:12px var(--sans);border:1px solid var(--line);background:var(--card);padding:2px 8px;cursor:pointer}
ul{padding-left:20px}li{margin:6px 0}.foot{font-size:12px;color:var(--muted);margin-top:28px}
@media (max-width:600px){.summary{flex-direction:column;align-items:flex-start}.bar{grid-template-columns:110px 1fr 40px}}
</style></head><body><main>
<div class="strip"><b>Workstation health report</b><span>${esc(osName)}</span><span>${today}</span><span>${esc(rtLine)}</span><span>Manifest verified ${esc(manifest.lastVerified)}</span></div>
<section class="summary">
  <div class="score ${scoreCls}">${score}<small>${esc(band)}</small></div>
  <div><p class="verdict">${esc(verdict)}</p><div class="bars">${sections.map((s) => `<div class="bar"><span>${esc(s.label)}</span><div class="track"><div class="fill" style="width:${Math.round(s.score * 100)}%"></div></div><span>${Math.round(s.score * 100)}%</span></div>`).join("")}</div></div>
</section>
<div class="card act"><h2 style="margin-top:0">Fix first</h2>${uniqueFixes.length ? `<ul>${uniqueFixes.slice(0, 3).map((f) => `<li>${ICON[f.status]} <b>${link(f.item)}</b> — ${esc(LABEL[f.status])}${f.detail ? ` (${esc(f.detail)})` : ""}. Say ${say(phraseFor(f.status))}</li>`).join("")}</ul>` : "<p>Nothing — everything you use is healthy.</p>"}</div>
<h2>Core toolchain</h2>${htable(core)}
<h2>Your workloads</h2>${mine.length ? mine.map((x) => `<div class="card"><h3>${esc(x.w.label)}</h3><p class="muted">${esc(x.w.unlocks)}</p>${htable(x.items)}<p>Try first: ${say(x.w.tryFirst)}</p></div>`).join("") : "<p class=\"muted\">None yet — pick one below.</p>"}
<h2>Available to add</h2><div class="card"><ul>${toAdd.map((x) => `<li><b>${esc(x.w.label)}</b> — ${esc(x.w.unlocks)}<br>Say ${say(`add ${x.w.label.toLowerCase()} to my setup`)} ${pluginItems(x.items).map((p) => docsOf(p)).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((d) => `<a href="${esc(d)}" target="_blank" rel="noopener">docs</a>`).join(" ")}</li>`).join("")}</ul></div>
<h2>Recommended extras</h2>${htable(recommended)}
<h2>Integrations</h2>${htable(integrations)}
<p class="foot">Scored over: core 60, your workloads 30, recommended 10. Ready earns full credit; outdated or installed in one runtime only earns half; needs repair earns a quarter. A read-only check by the Powercademy workstation plugin — it changed nothing on this machine.</p>
</main></body></html>
`;

const outDir = opt("--out-dir", process.cwd());
fs.mkdirSync(outDir, { recursive: true });
const mdPath = path.join(outDir, "workstation-report.md");
const htmlPath = path.join(outDir, "workstation-report.html");
fs.writeFileSync(mdPath, md);
fs.writeFileSync(htmlPath, html);

if (flag("--json")) {
  console.log(JSON.stringify({ score, band, verdict, sections, fixes: uniqueFixes.map((f) => ({ id: f.item.id, status: f.status, detail: f.detail })), workloads: mine.map((x) => x.w.id), results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { status: v.status, detail: v.detail }])) }, null, 2));
} else {
  console.log(`${score}/100 — ${band}. ${verdict}`);
  console.log(`Report: ${mdPath}`);
  console.log(`Page:   ${htmlPath}`);
}
