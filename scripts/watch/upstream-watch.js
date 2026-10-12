#!/usr/bin/env node
/**
 * Powercademy Skills — upstream watch
 *
 * Keeps an ear to the wall on the Microsoft repos this marketplace depends on.
 * Shallow-clones each, fingerprints what our skills rely on, diffs against the
 * committed baseline (watch/upstream-snapshot.json), and reports changes that
 * need a human to update the toolchain manifest or a skill.
 *
 * Three kinds of upstream:
 *   - marketplaces (UPSTREAMS) — plugin repos we install from or route to
 *   - galleries (GALLERIES) — community skill galleries we don't install from
 *     but must watch for skills entering our lanes
 *   - packages — every installable ID in the toolchain manifest (winget, Homebrew,
 *     npm, NuGet, PyPI, VS Code Marketplace) plus every URL it links, parsed
 *     straight from the install commands so we check exactly what gets run
 *
 * Actionable (opens an issue in CI):
 *   - a plugin added to / removed from an upstream marketplace
 *   - a plugin our toolchain manifest names no longer exists upstream
 *   - an upstream plugin's MCP server launcher changed
 *   - an upstream plugin's runtime prerequisites changed (Node/.NET/Python/JDK/pac…)
 *   - an upstream plugin we install states a higher version floor than the
 *     manifest's check.min (or one the manifest doesn't enforce at all)
 *   - a new gallery submission that touches our lanes
 *   - a manifest package ID or URL that no longer resolves (renamed/pulled)
 *   - our toolchain manifest's lastVerified is older than the staleness limit
 * Informational (listed, never alone triggers an issue):
 *   - plugin version bumps, upstream HEAD movement, latest package versions,
 *     gallery submissions outside our lanes, registries that couldn't be reached
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
  // Plugin for GitHub Copilot harness agents (successor to skills-for-copilot-studio,
  // which remains the plugin for standard agents).
  "microsoft/copilot-studio-plugin",
];

const GALLERIES = [
  { repo: "microsoft/cat-agent-skills", dir: "submissions" },
];

// Gallery submissions whose name, description or tags match this enter our lanes.
const LANES = /power ?automate|cloud flow|dataverse|\bpcf\b|component framework|canvas app|model-driven|power ?pages|power ?apps|power platform|\bpac\b|\balm\b|environment strateg|solution (import|export|layer)|licens/i;

// Upstream prereq signal → manifest item whose check.min must be at least as high.
const FLOOR_ITEMS = { node: "node", ".net": "dotnet-sdk", python: "python", jdk: "jdk17", pac: "pac" };

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
  for (const m of t.matchAll(/(?:\bpac\b|power platform cli)[^\n]{0,80}?(\d+\.\d+\.\d+)\s*(?:or higher|or later|or newer|\+)/g)) s.add(`pac ${m[1]}+`);
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

function fingerprintGallery({ repo, dir: sub }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcs-watch-"));
  try {
    execSync(`git clone --depth 1 --quiet https://github.com/${repo}.git "${dir}"`, { stdio: "pipe" });
    const head = execSync(`git -C "${dir}" log -1 --format=%h~%cs`, { stdio: "pipe" }).toString().trim();
    const submissions = {};
    const root = path.join(dir, sub);
    for (const e of fs.readdirSync(root, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith("_")) continue;
      const meta = readJson(path.join(root, e.name, "metadata.json"));
      if (!meta) continue;
      const text = [meta.name, meta.description, ...(meta.tags || [])].join(" ");
      submissions[e.name] = { name: meta.name || e.name, version: meta.version || null, lanes: LANES.test(text) };
    }
    return { head, submissions };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── packages: parsed from the manifest's own install commands ──
function manifestPackages(manifest) {
  const pk = new Map();
  const add = (registry, id, item) => {
    const key = `${registry}:${id}`;
    if (!pk.has(key)) pk.set(key, { registry, id, items: new Set() });
    pk.get(key).items.add(item);
  };
  for (const item of manifest.items) {
    const texts = [...Object.values(item.install || {}), ...Object.values(item.repair || {})].filter((x) => typeof x === "string");
    if (item.endpoint) add("endpoint", item.endpoint, item.id);
    for (const t of texts) {
      for (const m of t.matchAll(/winget install[^\n]*?--id\s+(\S+)/g)) add("winget", m[1], item.id);
      for (const m of t.matchAll(/brew install\s+(--cask\s+)?([\w@.+-]+)/g)) add(m[1] ? "cask" : "brew", m[2], item.id);
      for (const m of t.matchAll(/npm install -g\s+(\S+)/g)) add("npm", m[1], item.id);
      for (const m of t.matchAll(/npx\s+(@?[\w.-]+(?:\/[\w.-]+)?)/g)) add("npm", m[1].replace(/@latest$/, ""), item.id);
      for (const m of t.matchAll(/(?:dotnet tool install --global|dnx)\s+(\S+)/g)) add("nuget", m[1], item.id);
      for (const m of t.matchAll(/pip install((?:\s+[^\s(]+)+)/g)) m[1].trim().split(/\s+/).filter((x) => !x.startsWith("-")).forEach((p) => add("pypi", p, item.id));
      for (const m of t.matchAll(/code --install-extension\s+(\S+)/g)) add("vscode", m[1], item.id);
      for (const m of t.matchAll(/https?:\/\/[^\s)`'"]+/g)) { const u = m[0].replace(/[.,]$/, ""); if (u !== item.endpoint) add("url", u, item.id); }
    }
  }
  return [...pk.values()].map((p) => ({ ...p, items: [...p.items] }));
}

const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function http(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal, headers: { "User-Agent": "powercademy-upstream-watch", ...(opts.headers || {}) } });
    let body = null;
    try { body = await r.json(); } catch {}
    return { status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

// → { state: "ok" | "missing" | "unknown", latest?, note? }
async function resolvePackage({ registry, id }) {
  try {
    if (registry === "nuget") {
      const r = await http(`https://api.nuget.org/v3-flatcontainer/${id.toLowerCase()}/index.json`);
      if (r.status === 404) return { state: "missing" };
      if (r.status === 200) return { state: "ok", latest: r.body.versions.filter((v) => !v.includes("-")).at(-1) };
    } else if (registry === "npm") {
      const r = await http(`https://registry.npmjs.org/${id.replace("/", "%2f")}`);
      if (r.status === 404) return { state: "missing" };
      if (r.status === 200) return { state: "ok", latest: r.body["dist-tags"]?.latest };
    } else if (registry === "pypi") {
      const r = await http(`https://pypi.org/pypi/${id}/json`);
      if (r.status === 404) return { state: "missing" };
      if (r.status === 200) return { state: "ok", latest: r.body.info.version };
    } else if (registry === "brew" || registry === "cask") {
      const r = await http(`https://formulae.brew.sh/api/${registry === "brew" ? "formula" : "cask"}/${id}.json`);
      if (r.status === 404) return { state: "missing" };
      if (r.status === 200) return { state: "ok", latest: registry === "brew" ? r.body.versions?.stable : r.body.version };
    } else if (registry === "vscode") {
      const r = await http("https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json;api-version=3.0-preview.1" },
        body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: id }] }], flags: 1 }),
      });
      if (r.status === 200) {
        const ext = r.body.results?.[0]?.extensions || [];
        return ext.length ? { state: "ok", latest: ext[0].versions?.[0]?.version } : { state: "missing" };
      }
    } else if (registry === "winget") {
      // winget-pkgs layout: manifests/<first letter>/<Publisher>/<Name parts…>/<version>/
      const [pub, ...rest] = id.split(".");
      const r = await http(`https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/${pub[0].toLowerCase()}/${pub}/${rest.join("/")}`,
        GH_TOKEN ? { headers: { Authorization: `Bearer ${GH_TOKEN}` } } : {});
      if (r.status === 404) return { state: "missing" };
      if (r.status === 200 && Array.isArray(r.body)) {
        const vs = r.body.filter((e) => e.type === "dir" && /^\d/.test(e.name)).map((e) => e.name);
        return { state: "ok", latest: vs.sort(compareVersions).at(-1) };
      }
    } else if (registry === "url" || registry === "endpoint") {
      const r = await http(id, { redirect: "follow" });
      if (r.status === 404 || r.status === 410) return { state: "missing" };
      // An MCP endpoint answers a plain GET with 405 — that means alive.
      if (r.status < 400 || r.status === 405) return { state: "ok" };
      return { state: "unknown", note: `HTTP ${r.status}` };
    }
    return { state: "unknown", note: "unexpected response" };
  } catch (e) {
    return { state: "unknown", note: e.name === "AbortError" ? "timeout" : e.message };
  }
}

function compareVersions(a, b) {
  const pa = String(a).split(/[.,]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split(/[.,]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

// Upstream plugins the manifest installs: their stated floors must not exceed ours.
function floorFindings(cur, manifest) {
  const out = [];
  const installed = new Set();
  for (const item of manifest.items) {
    if (item.marketplace === "powercademy-skills") continue;
    (item.plugins || (item.plugin ? [item.plugin] : [])).forEach((n) => installed.add(n));
  }
  const byId = Object.fromEntries(manifest.items.map((i) => [i.id, i]));
  for (const [repo, r] of Object.entries(cur.repos)) {
    for (const [name, p] of Object.entries(r.plugins || {})) {
      if (!installed.has(name)) continue;
      for (const sig of p.prereqs) {
        const m = sig.match(/^(node|\.net|python|jdk|pac) ([\d.]+)\+?$/);
        if (!m) continue;
        const item = byId[FLOOR_ITEMS[m[1]]];
        if (!item) continue;
        const ours = item.check?.min;
        if (!ours) out.push(`**${repo}** · \`${name}\` states \`${sig}\`, but manifest item \`${item.id}\` enforces no \`check.min\`. Add a floor?`);
        else if (compareVersions(m[2], ours) > 0) out.push(`**${repo}** · \`${name}\` states \`${sig}\`, above manifest \`${item.id}\` floor ${ours}. Raise \`check.min\`.`);
      }
    }
  }
  return [...new Set(out)];
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

  for (const g of GALLERIES) {
    const p = prev?.galleries?.[g.repo];
    const c = cur.galleries[g.repo];
    if (!c) continue;
    if (!p) { info.push(`**${g.repo}** — first time watched (baseline only, ${Object.keys(c.submissions).length} submissions).`); continue; }
    if (p.head !== c.head) info.push(`**${g.repo}** — HEAD ${p.head} → ${c.head}`);
    for (const [k, sub] of Object.entries(c.submissions)) {
      if (p.submissions[k]) continue;
      const line = `**${g.repo}** — new submission \`${k}\` (${sub.name})`;
      if (sub.lanes) actionable.push(`${line} touches our lanes. Duplicate, complement or route-to? Update the landscape doc.`);
      else info.push(line);
    }
    for (const k of Object.keys(p.submissions)) if (!c.submissions[k]) info.push(`**${g.repo}** — submission removed: \`${k}\``);
  }

  for (const [key, c] of Object.entries(cur.packages || {})) {
    const where = c.items.join(", ");
    if (c.state === "missing") actionable.push(`Package \`${key}\` (manifest: ${where}) no longer resolves — renamed or pulled? Fix the install command.`);
    else if (c.state === "unknown") info.push(`Could not check \`${key}\` (${c.note}).`);
    else {
      const pl = prev?.packages?.[key]?.latest;
      if (pl && c.latest && pl !== c.latest) info.push(`\`${key}\` latest ${pl} → ${c.latest}`);
    }
  }

  // Our manifest names plugins by upstream name — catch renames/removals.
  if (manifest) {
    actionable.push(...floorFindings(cur, manifest));
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
(async () => {
const cur = { takenAt: new Date().toISOString().slice(0, 10), repos: {}, galleries: {}, packages: {} };
for (const repo of UPSTREAMS) {
  process.stderr.write(`… ${repo}\n`);
  try { cur.repos[repo] = fingerprintRepo(repo); }
  catch (e) { process.stderr.write(`  ! could not fingerprint ${repo}: ${e.message.split("\n")[0]}\n`); }
}

for (const g of GALLERIES) {
  process.stderr.write(`… ${g.repo} (gallery)\n`);
  try { cur.galleries[g.repo] = fingerprintGallery(g); }
  catch (e) { process.stderr.write(`  ! could not fingerprint ${g.repo}: ${e.message.split("\n")[0]}\n`); }
}
const manifest = readJson(MANIFEST);
if (manifest) {
  const pkgs = manifestPackages(manifest);
  process.stderr.write(`… ${pkgs.length} manifest packages and links\n`);
  const results = await Promise.all(pkgs.map(resolvePackage));
  pkgs.forEach((p, i) => { cur.packages[`${p.registry}:${p.id}`] = { items: p.items, ...results[i] }; });
}

if (flag("--update-snapshot")) {
  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, JSON.stringify(cur, null, 2) + "\n");
  console.log(`Baseline updated: ${path.relative(ROOT, SNAPSHOT)} (${Object.keys(cur.repos).length} repos, ${Object.keys(cur.galleries).length} galleries, ${Object.keys(cur.packages).length} packages)`);
  return;
}

const { actionable, info } = diff(readJson(SNAPSHOT), cur, manifest);
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
})().catch((e) => { console.error(`upstream watch failed: ${e.message}`); process.exit(1); });
