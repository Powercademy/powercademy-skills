#!/usr/bin/env node
/**
 * Powercademy Skills — upstream watch
 *
 * Keeps an ear to the wall on the Microsoft repos this marketplace depends on.
 * Shallow-clones each, fingerprints what our skills rely on, diffs against the
 * committed baseline (watch/upstream-snapshot.json), and reports changes that
 * need a human to update the toolchain manifest or a skill.
 *
 * Actionable (opens an issue in CI):
 *   - a plugin added to / removed from an upstream marketplace
 *   - a plugin our toolchain manifest names no longer exists upstream
 *   - an upstream plugin's MCP server launcher changed
 *   - an upstream plugin's runtime prerequisites changed (Node/.NET/Python/JDK…)
 *   - our toolchain manifest's lastVerified is older than the staleness limit
 * Informational (listed, never alone triggers an issue):
 *   - plugin version bumps, upstream HEAD movement
 *
 * Usage:
 *   node scripts/watch/upstream-watch.js                     # report to stdout
 *   node scripts/watch/upstream-watch.js --report-file r.md  # also write report
 *   node scripts/watch/upstream-watch.js --update-snapshot   # accept current state as baseline
 *
 * Exit code is 0 either way; in GitHub Actions it writes `actionable=true|false`
 * to $GITHUB_OUTPUT so the workflow decides whether to open an issue.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SNAPSHOT = path.join(ROOT, "watch", "upstream-snapshot.json");
const MANIFEST = path.join(ROOT, "plugins", "doctor", "shared", "toolchain-manifest.json");
const STALE_DAYS = 90;

const UPSTREAMS = [
  "microsoft/power-platform-skills",
  "microsoft/Dataverse-skills",
  "microsoft/skills-for-copilot-studio",
  "microsoft/power-cat-skills",
];

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };

// ── helpers ───────────────────────────────────────────────────
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

function walk(dir, pred, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, pred, out);
    else if (pred(full)) out.push(full);
  }
  return out;
}

// Normalised prerequisite signals extracted from a plugin's markdown. Each
// becomes a short token; we diff the *set*, so rewording doesn't cause noise
// but a changed version floor does.
function prereqSignals(text) {
  const t = text.toLowerCase();
  const s = new Set();
  for (const m of t.matchAll(/node(?:\.js)?\s*(?:v)?(\d{2})\s*(\+|or newer|or later|or higher|lts)?/g)) s.add(`node ${m[1]}${m[2] ? "+" : ""}`);
  for (const m of t.matchAll(/\.net\s*(?:sdk\s*)?(\d{1,2})(?![\d.])/g)) s.add(`.net ${m[1]}`);
  for (const m of t.matchAll(/python\s*(3\.\d{1,2})/g)) s.add(`python ${m[1]}`);
  for (const m of t.matchAll(/\b(?:jdk|java)\s*(\d{2})\b/g)) s.add(`jdk ${m[1]}`);
  if (/azure cli|\baz login\b/.test(t)) s.add("azure cli");
  if (/playwright/.test(t)) s.add("playwright");
  if (/copilot studio (vs ?code )?extension/.test(t)) s.add("copilot studio vscode extension");
  if (/powerplatform-dataverse-client/.test(t)) s.add("dataverse python sdk");
  return [...s].sort();
}

function mcpLaunchers(pluginDir) {
  const j = readJson(path.join(pluginDir, ".mcp.json"));
  if (!j || !j.mcpServers) return {};
  const out = {};
  for (const [name, v] of Object.entries(j.mcpServers)) {
    out[name] = v.url ? `${v.type || "http"} ${v.url}` : [v.command, ...(v.args || []).filter((a) => !a.startsWith("--"))].join(" ");
  }
  return out;
}

function fingerprintRepo(repo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcs-watch-"));
  try {
    execSync(`git clone --depth 1 --quiet https://github.com/${repo}.git "${dir}"`, { stdio: "pipe" });
    const head = execSync(`git -C "${dir}" log -1 --format=%h~%cs`, { stdio: "pipe" }).toString().trim();

    let marketplace = null;
    for (const p of [".claude-plugin/marketplace.json", "marketplace.json"]) {
      const j = readJson(path.join(dir, p));
      if (j && j.plugins) { marketplace = j; break; }
    }

    const plugins = {};
    for (const pj of walk(dir, (f) => f.replace(/\\/g, "/").endsWith(".claude-plugin/plugin.json"))) {
      const pluginDir = path.dirname(path.dirname(pj));
      const meta = readJson(pj);
      if (!meta || !meta.name) continue;
      const text = walk(pluginDir, (f) => f.endsWith(".md")).map((f) => fs.readFileSync(f, "utf8")).join("\n");
      plugins[meta.name] = {
        version: meta.version || null,
        mcp: mcpLaunchers(pluginDir),
        prereqs: prereqSignals(text),
      };
    }

    return {
      head,
      marketplacePlugins: marketplace ? marketplace.plugins.map((p) => p.name).sort() : [],
      plugins,
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── diff ──────────────────────────────────────────────────────
function diff(prev, cur, manifest) {
  const actionable = [];
  const info = [];
  const setDiff = (a = [], b = []) => ({ added: b.filter((x) => !a.includes(x)), removed: a.filter((x) => !b.includes(x)) });

  for (const repo of UPSTREAMS) {
    const p = prev?.repos?.[repo];
    const c = cur.repos[repo];
    if (!c) continue;
    if (!p) { info.push(`**${repo}** — first time watched (baseline only).`); continue; }
    if (p.head !== c.head) info.push(`**${repo}** — HEAD ${p.head} → ${c.head}`);

    const mk = setDiff(p.marketplacePlugins, c.marketplacePlugins);
    for (const a of mk.added) actionable.push(`**${repo}** — new plugin in marketplace: \`${a}\`. Decide: workload in the manifest? landscape impact?`);
    for (const r of mk.removed) actionable.push(`**${repo}** — plugin removed from marketplace: \`${r}\`. Check the manifest and any skill that routes to it.`);

    for (const [name, cp] of Object.entries(c.plugins)) {
      const pp = p.plugins?.[name];
      if (!pp) continue;
      if (pp.version !== cp.version) info.push(`\`${name}\` ${pp.version} → ${cp.version}`);
      const pk = setDiff(pp.prereqs, cp.prereqs);
      if (pk.added.length || pk.removed.length) {
        actionable.push(`**${repo}** · \`${name}\` — prerequisites changed: ${pk.added.map((x) => `+${x}`).concat(pk.removed.map((x) => `−${x}`)).join(", ")}. Check the manifest's version floors.`);
      }
      const keys = new Set([...Object.keys(pp.mcp || {}), ...Object.keys(cp.mcp || {})]);
      for (const k of keys) {
        if ((pp.mcp || {})[k] !== (cp.mcp || {})[k]) {
          actionable.push(`**${repo}** · \`${name}\` — MCP server \`${k}\` changed: \`${(pp.mcp || {})[k] || "(none)"}\` → \`${(cp.mcp || {})[k] || "(removed)"}\`.`);
        }
      }
    }
  }

  // Our manifest names plugins by upstream name — catch renames/removals.
  if (manifest) {
    const upstreamNames = new Set();
    for (const r of Object.values(cur.repos)) r.marketplacePlugins.forEach((n) => upstreamNames.add(n));
    const ours = new Set(readJson(path.join(ROOT, ".claude-plugin", "marketplace.json")).plugins.map((p) => p.name));
    for (const item of manifest.items) {
      const names = item.plugins || (item.plugin ? [item.plugin] : []);
      for (const n of names) {
        if (item.marketplace === "powercademy-skills") { if (!ours.has(n)) actionable.push(`Manifest item \`${item.id}\` names \`${n}\`, which isn't in our own marketplace.`); }
        else if (!upstreamNames.has(n)) actionable.push(`Manifest item \`${item.id}\` names upstream plugin \`${n}\`, which no longer exists in any watched marketplace — renamed or removed?`);
      }
    }
    const age = Math.floor((Date.now() - new Date(manifest.lastVerified).getTime()) / 86400000);
    if (age > STALE_DAYS) actionable.push(`Toolchain manifest last verified ${age} days ago (limit ${STALE_DAYS}). Re-verify install IDs and version floors, then bump \`lastVerified\`.`);
  }

  return { actionable, info };
}

// ── main ──────────────────────────────────────────────────────
const cur = { takenAt: new Date().toISOString().slice(0, 10), repos: {} };
for (const repo of UPSTREAMS) {
  process.stderr.write(`… ${repo}\n`);
  try { cur.repos[repo] = fingerprintRepo(repo); }
  catch (e) { process.stderr.write(`  ! could not fingerprint ${repo}: ${e.message.split("\n")[0]}\n`); }
}

if (flag("--update-snapshot")) {
  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, JSON.stringify(cur, null, 2) + "\n");
  console.log(`Baseline updated: ${path.relative(ROOT, SNAPSHOT)} (${Object.keys(cur.repos).length} repos)`);
  process.exit(0);
}

const { actionable, info } = diff(readJson(SNAPSHOT), cur, readJson(MANIFEST));
const lines = [
  `# Upstream watch — ${cur.takenAt}`,
  "",
  actionable.length
    ? `**${actionable.length} change(s) need attention.** Update \`plugins/doctor/shared/toolchain-manifest.json\` (and any affected skill), then accept the new baseline with \`node scripts/watch/upstream-watch.js --update-snapshot\` and close this issue.`
    : "No actionable changes.",
  "",
];
if (actionable.length) lines.push("## Needs attention", "", ...actionable.map((a) => `- ${a}`), "");
if (info.length) lines.push("<details><summary>Informational</summary>", "", ...info.map((a) => `- ${a}`), "", "</details>", "");
const report = lines.join("\n");

console.log(report);
const rf = opt("--report-file");
if (rf) fs.writeFileSync(rf, report);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `actionable=${actionable.length > 0}\n`);
