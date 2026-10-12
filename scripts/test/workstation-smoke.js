#!/usr/bin/env node
/**
 * Powercademy Skills — workstation smoke test
 *
 * Executes the toolchain manifest the way setup-workstation does — check, then
 * install / upgrade / repair with the manifest's own command, refresh PATH,
 * re-check against the floor — and installs the marketplaces and plugins into
 * every runtime present. Proves the manifest's commands actually work on a real
 * machine, with no model in the loop. Built for throwaway CI VMs
 * (.github/workflows/fresh-machine.yml); it really installs things. On a real
 * machine, use --no-install (read-only) — or don't run it at all.
 *
 * Usage:
 *   node scripts/test/workstation-smoke.js [options]
 *     --workloads all | flows,canvas,…   (default: all)
 *     --variants copilot-studio=standard+harness   (default: each workload's default)
 *     --recommended                       include the recommended tier
 *     --no-install                        inventory and verify only
 *     --report <file>                     write the markdown report
 *
 * Exit 1 if any item ends neither ready nor legitimately skipped.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "plugins/doctor/shared/toolchain-manifest.json"), "utf8"));

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };

const OS = process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux";
const POSIX = OS !== "win";
const INSTALL = !flag("--no-install");
const CMD_TIMEOUT = 20 * 60 * 1000;

// ── shell ─────────────────────────────────────────────────────
function sh(cmd, { timeout = 120000 } = {}) {
  const r = spawnSync(cmd, { shell: OS === "win" ? "cmd.exe" : "/bin/bash", encoding: "utf8", timeout, env: process.env, windowsHide: true });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  return { ok: r.status === 0 && !r.error, code: r.error ? r.error.code : r.status, out };
}

// Merge newly registered PATH entries into this process — append what's
// missing, never replace (replacing drops session-only entries such as the
// npm global bin an agent runtime was launched from) and never duplicate
// (Windows refuses environment blocks past 32,767 characters).
function refreshPath() {
  const sep = OS === "win" ? ";" : ":";
  let add;
  if (OS === "win") {
    const r = sh(`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`);
    if (!r.ok) return;
    add = r.out.split(";");
  } else {
    add = [`${process.env.HOME}/.dotnet/tools`, "/opt/homebrew/bin", "/usr/local/bin", `${process.env.HOME}/.local/bin`];
  }
  const have = process.env.PATH.split(sep);
  const norm = (p) => p.replace(/[\\/]+$/, "").toLowerCase();
  const seen = new Set(have.map(norm));
  for (const p of add) if (p && !seen.has(norm(p))) { have.push(p); seen.add(norm(p)); }
  process.env.PATH = have.join(sep);
}

// ── manifest helpers ──────────────────────────────────────────
const byId = Object.fromEntries(manifest.items.map((i) => [i.id, i]));
const osPick = (v) => (v == null ? null : typeof v === "string" ? v : v[OS] ?? (POSIX ? v.posix : null) ?? v.all ?? null);
const cmdOf = (text) => (text ? text.split(/\s{2,}\(|\s+\(then /)[0].trim() : null);
const runnable = (c) => c && !/^https?:/.test(c) && !/^(Install|Use) /.test(c) && !c.includes("→");

function versionOf(out) { const m = out.match(/(\d+\.\d+(?:\.\d+)?)/); return m ? m[1] : null; }
function cmpVer(a, b) {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
function regexOf(s) { const ci = s.startsWith("(?i)"); return new RegExp(ci ? s.slice(4) : s, ci ? "i" : ""); }

// ── resolve the plan ──────────────────────────────────────────
function resolvePlan() {
  const wl = opt("--workloads", "all");
  const chosen = wl === "all" ? manifest.workloads.map((w) => w.id) : wl.split(",");
  const variantArg = Object.fromEntries((opt("--variants", "") || "").split(",").filter(Boolean).map((p) => { const [w, v] = p.split("="); return [w, v.split("+")]; }));
  const ids = new Set(manifest.items.filter((i) => i.tier === "bootstrap" || i.tier === "required").map((i) => i.id));
  for (const id of chosen) {
    const w = manifest.workloads.find((x) => x.id === id);
    if (!w) throw new Error(`unknown workload ${id}`);
    w.items.forEach((i) => ids.add(i));
    if (w.variants) for (const v of variantArg[id] || w.variants.default) w.variants.options[v].items.forEach((i) => ids.add(i));
  }
  if (flag("--recommended")) manifest.items.filter((i) => i.tier === "recommended").forEach((i) => ids.add(i.id));
  const add = (id) => { for (const d of byId[id]?.dependsOn || []) if (!ids.has(d)) { ids.add(d); add(d); } };
  [...ids].forEach(add);
  return { chosen, items: manifest.items.filter((i) => ids.has(i.id)) };
}

// ── tool items ────────────────────────────────────────────────
function checkTool(item) {
  const c = osPick(item.check?.cmd);
  if (!c) return { state: "nocheck" };
  const r = sh(c);
  if (item.check.failIfOutputMatches && r.out.includes(item.check.failIfOutputMatches)) return { state: "shim", out: r.out };
  if (!r.ok) return { state: "missing", out: r.out };
  if (item.check.expectOutputMatches && !regexOf(item.check.expectOutputMatches).test(r.out)) return { state: "missing", out: r.out };
  const v = versionOf(r.out);
  if (item.check.min && v && cmpVer(v, item.check.min) < 0) return { state: "outdated", version: v };
  if (item.check.min && !v) return { state: "noversion", out: r.out };
  return { state: "ready", version: v };
}

function doTool(item) {
  if (item.platforms && !item.platforms.includes(OS)) return { status: "skip", note: `not for ${OS}` };
  if (item.runtimeAlternative && checkTool(byId[item.runtimeAlternative]).state === "ready" && checkTool(item).state !== "ready") return { status: "skip", note: `${item.runtimeAlternative} present` };
  let c = checkTool(item);
  if (c.state === "ready") return { status: "ready", note: c.version || "" };
  if (c.state === "noversion") return { status: "fail", note: `check ran but no version in output: ${c.out.slice(0, 120)}` };
  if (!INSTALL) return { status: "fail", note: c.state };
  const text = c.state === "shim" ? osPick(item.repair?.shim) : c.state === "outdated" ? (item.update || osPick(item.install)) : osPick(item.install);
  const cmd = cmdOf(text);
  if (!runnable(cmd)) return { status: "manual", note: `${c.state}; install is manual on ${OS}: ${text || "(none)"}` };
  const before = c.state + (c.version ? ` ${c.version}` : "");
  const r = sh(cmd, { timeout: CMD_TIMEOUT });
  refreshPath();
  c = checkTool(item);
  if (c.state === "ready") return { status: "installed", note: `${before} → ${c.version || "ok"} via \`${cmd}\`` };
  return { status: "fail", note: `${before}; ran \`${cmd}\` (exit ${r.code}); still ${c.state}${c.version ? " " + c.version : ""}. Install said: ${r.out.split("\n").slice(-3).join(" ").slice(0, 300)} — check said: ${(c.out || "").split("\n").slice(0, 3).join(" ").slice(0, 300)}` };
}

// ── marketplaces, plugins, MCP per runtime ────────────────────
const runtimes = ["claude", "copilot"].filter((cli) => sh(`${cli} --version`).ok);
const pluginLists = {};
const listPlugins = (cli) => (pluginLists[cli] = sh(`${cli} plugin list`).out);
const forRuntimes = (item) => runtimes.filter((cli) => !item.runtimes || item.runtimes.includes(cli));

function doMarketplace(item) {
  const res = [];
  for (const cli of forRuntimes(item)) {
    if (!INSTALL) { res.push(sh(`${cli} plugin marketplace list`).out.includes(item.marketplace) ? `${cli} ✓` : `${cli} ✗ not registered`); continue; }
    const r = sh(`${cli} plugin marketplace add ${item.repo}`, { timeout: 300000 });
    res.push(r.ok || /already/i.test(r.out) ? `${cli} ✓` : `${cli} ✗ ${r.out.replace(/s+/g, " ").slice(0, 600)}`);
  }
  return { status: res.some((x) => x.includes("✗")) ? "fail" : runtimes.length ? "ready" : "skip", note: res.join(" · ") || "no runtime" };
}

function doPlugin(item) {
  const names = item.plugins || [item.plugin];
  const res = [];
  for (const cli of forRuntimes(item)) {
    for (const n of names) {
      const spec = `${n}@${item.marketplaceByRuntime?.[cli] || item.marketplace}`;
      if (INSTALL && !new RegExp(`\\b${n}\\b`).test(pluginLists[cli] ?? listPlugins(cli))) {
        const r = sh(cli === "claude" ? `claude plugin install ${spec} --scope user` : `copilot plugin install ${spec}`, { timeout: 300000 });
        if (!r.ok && !/already/i.test(r.out)) { res.push(`${cli} ✗ ${n}: ${r.out.replace(/s+/g, " ").slice(0, 600)}`); continue; }
        listPlugins(cli);
      }
      res.push(new RegExp(`\\b${n}\\b`).test(pluginLists[cli] ?? listPlugins(cli)) ? `${cli} ✓ ${n}` : `${cli} ✗ ${n} not listed after install`);
    }
  }
  return { status: res.some((x) => x.includes("✗")) ? "fail" : runtimes.length ? "ready" : "skip", note: res.join(" · ") || "no runtime" };
}

function doMcp(item, planPlugins) {
  const bundled = (item.bundledIn || []).filter((p) => planPlugins.has(p));
  if (bundled.length) return { status: "skip", note: `bundled by ${bundled.join(", ")}` };
  const cmd = cmdOf(item.install?.claude);
  if (!runtimes.includes("claude") || !runnable(cmd) || !cmd.startsWith("claude ")) return { status: "manual", note: "registration is interactive or not applicable here" };
  const name = cmd.split(/\s+/).find((t, i, a) => i > 2 && !t.startsWith("-") && !["http", "stdio", "sse"].includes(t) && a[i - 1] !== "--transport");
  if (INSTALL && !sh("claude mcp list").out.includes(name)) {
    const r = sh(cmd, { timeout: 300000 });
    if (!r.ok && !/already exists/i.test(r.out)) return { status: "fail", note: `\`${cmd}\`: ${r.out.slice(0, 160)}` };
  }
  return sh("claude mcp list").out.includes(name) ? { status: "ready", note: `claude: ${name}` } : { status: "fail", note: `${name} not listed after add` };
}

// ── main ──────────────────────────────────────────────────────
const plan = resolvePlan();
const planPlugins = new Set(plan.items.flatMap((i) => i.plugins || (i.plugin ? [i.plugin] : [])));
console.error(`OS ${OS} · runtimes: ${runtimes.join(", ") || "none"} · workloads: ${plan.chosen.join(", ")} · ${plan.items.length} items · install: ${INSTALL}`);

const order = (i) => (i.type === "marketplace" ? 1 : i.type === "plugin" ? 2 : i.type === "mcp" ? 3 : 0);
const rows = [];
for (const item of [...plan.items].sort((a, b) => order(a) - order(b))) {
  const t0 = Date.now();
  let r;
  const blockers = (item.dependsOn || []).filter((d) => ["manual", "fail", "blocked"].includes(rows.find((x) => x.id === d)?.status));
  try {
    r = blockers.length ? { status: "blocked", note: `needs ${blockers.join(", ")} first` }
      : item.type === "marketplace" ? doMarketplace(item)
      : item.type === "plugin" ? doPlugin(item)
      : item.type === "mcp" ? doMcp(item, planPlugins)
      : doTool(item);
  } catch (e) { r = { status: "fail", note: e.message }; }
  const secs = Math.round((Date.now() - t0) / 1000);
  rows.push({ id: item.id, tier: item.tier, ...r, secs });
  console.error(`${r.status.padEnd(9)} ${item.id} (${secs}s) ${r.note || ""}`);
}

const icon = { ready: "✅", installed: "🆕", skip: "➖", manual: "✋", blocked: "⏸", fail: "❌" };
const count = (s) => rows.filter((r) => r.status === s).length;
const report = [
  `## Workstation smoke — ${OS}`,
  "",
  `Runtimes: ${runtimes.join(", ") || "none"} · workloads: ${plan.chosen.join(", ")} · ${rows.length} items`,
  "",
  `✅ ready ${count("ready")} · 🆕 installed ${count("installed")} · ✋ manual ${count("manual")} · ⏸ blocked ${count("blocked")} · ➖ skipped ${count("skip")} · ❌ failed ${count("fail")}`,
  "",
  "| | Item | Tier | Detail | s |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${icon[r.status]} | \`${r.id}\` | ${r.tier} | ${(r.note || "").replace(/\|/g, "\\|").replace(/\n/g, " ")} | ${r.secs} |`),
  "",
].join("\n");
console.log(report);
const rf = opt("--report", null);
if (rf) fs.writeFileSync(rf, report);
process.exit(count("fail") ? 1 : 0);
