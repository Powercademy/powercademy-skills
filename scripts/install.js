#!/usr/bin/env node
/**
 * Powercademy Skills — bootstrap installer
 *
 * The one step that has to happen before any skill can run: checks the
 * bootstrap tier (Node, git, an agent runtime), registers the Powercademy
 * marketplace, and installs the `doctor` plugin. Everything else — SDKs, CLIs,
 * Microsoft's plugins, workloads, MCP servers — is done conversationally by the
 * setup-workstation skill, which this installer hands over to.
 *
 * Version floors come from the toolchain manifest (single source of truth):
 * local copy when run from a clone, fetched from GitHub when piped via curl,
 * built-in fallbacks if neither is reachable.
 *
 * Usage:
 *   node scripts/install.js                       (from a local clone)
 *   curl -fsSL https://raw.githubusercontent.com/Powercademy/powercademy-skills/main/scripts/install.js | node
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

const REPO = "Powercademy/powercademy-skills";
const MARKETPLACE = "powercademy-skills";
const BOOTSTRAP_PLUGINS = ["doctor"];
const MANIFEST_REL = "plugins/doctor/shared/toolchain-manifest.json";
const FALLBACK_MIN = { node: "22.0.0", "copilot-cli": "1.0.71" };

// ── output ────────────────────────────────────────────────────
const tty = process.stdout.isTTY;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = c(1), green = c(32), yellow = c(33), red = c(31);
const ok = (m) => console.log(`  ${green("✓")} ${m}`);
const warn = (m) => console.log(`  ${yellow("!")} ${m}`);
const fail = (m) => console.log(`  ${red("✗")} ${m}`);
const header = (m) => console.log(`\n${bold(m)}`);
const info = (m) => console.log(`  ${m}`);

// ── helpers ───────────────────────────────────────────────────
function hasCommand(cmd) {
  try {
    execSync(`${process.platform === "win32" ? "where" : "which"} ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd) {
  try {
    return { ok: true, output: execSync(cmd, { stdio: "pipe", timeout: 120_000, shell: true }).toString().trim() };
  } catch (err) {
    return { ok: false, output: err.stderr ? err.stderr.toString().trim() : err.message };
  }
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

const extractVersion = (s) => (s && s.match(/(\d+\.\d+\.\d+)/) || [])[1] || null;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "powercademy-installer" } }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let d = "";
      res.on("data", (x) => (d += x));
      res.on("end", () => resolve(d));
    }).on("error", reject);
  });
}

async function loadMinimums() {
  const local = path.resolve(__dirname, "..", MANIFEST_REL);
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(local, "utf8"));
  } catch {
    try {
      manifest = JSON.parse(await fetchText(`https://raw.githubusercontent.com/${REPO}/main/${MANIFEST_REL}`));
    } catch {}
  }
  if (!manifest) return { ...FALLBACK_MIN, source: "built-in defaults" };
  const min = (id) => (manifest.items.find((i) => i.id === id) || {}).check?.min;
  return {
    node: min("node") || FALLBACK_MIN.node,
    "copilot-cli": min("copilot-cli") || FALLBACK_MIN["copilot-cli"],
    source: `toolchain manifest (verified ${manifest.lastVerified})`,
  };
}

function installFor(cli, results) {
  header(cli === "claude" ? "Claude Code" : "GitHub Copilot CLI");
  info(`Registering marketplace ${MARKETPLACE}...`);
  const add = run(`${cli} plugin marketplace add "${REPO}"`);
  if (add.ok || add.output.includes("already")) {
    ok(`${MARKETPLACE} registered`);
  } else if (/differs from the one declared/i.test(add.output)) {
    // Claude Code: a declaration in ~/.claude/settings.json (extraKnownMarketplaces)
    // still points at an older source — e.g. the pre-transfer HowdangPowercademy slug.
    warn(`${MARKETPLACE} is declared in your Claude Code settings with an older source.`);
    info(`Fix: in ~/.claude/settings.json set extraKnownMarketplaces.${MARKETPLACE}.source.repo to "${REPO}",`);
    info(`then run: claude plugin marketplace add ${REPO}   (or ask the doctor: "check my setup")`);
    return;
  } else {
    return fail(`Could not register ${MARKETPLACE}: ${add.output}`);
  }

  for (const plugin of BOOTSTRAP_PLUGINS) {
    const cmd = cli === "claude"
      ? `claude plugin install "${plugin}@${MARKETPLACE}" --scope user`
      : `copilot plugin install "${plugin}@${MARKETPLACE}"`;
    const r = run(cmd);
    if (r.ok || r.output.includes("already installed")) {
      ok(`${plugin} installed`);
      results.push(`${plugin} → ${cli}`);
    } else {
      fail(`Could not install ${plugin}: ${r.output}`);
    }
  }
}

// ── main ──────────────────────────────────────────────────────
(async () => {
  console.log("");
  console.log(bold("Powercademy Skills — Bootstrap"));
  console.log("──────────────────────────────");

  const min = await loadMinimums();
  header("Checking the bootstrap tier");
  info(`Minimums from ${min.source}`);

  const nodeV = process.version.replace(/^v/, "");
  if (compareVersions(nodeV, min.node) < 0) {
    warn(`Node.js ${nodeV} is below ${min.node} — several Power Platform plugins need it. setup-workstation will offer the upgrade.`);
  } else {
    ok(`Node.js ${nodeV}`);
  }

  if (!hasCommand("git")) {
    fail("git not found — plugin marketplaces are cloned with git, so nothing else can install without it.");
    info("Windows: winget install -e --id Git.Git    macOS: xcode-select --install    Linux: your package manager");
    info("Then open a new terminal and run this installer again.");
    process.exit(1);
  }
  ok("git");

  const tools = [];
  if (hasCommand("claude")) {
    const v = run("claude --version");
    tools.push("claude");
    ok(`Claude Code ${v.ok ? v.output : ""}`);
  }
  if (hasCommand("copilot")) {
    const v = run("copilot --version");
    tools.push("copilot");
    ok(`GitHub Copilot CLI ${v.ok ? v.output : ""}`);
    const cv = v.ok ? extractVersion(v.output) : null;
    if (cv && compareVersions(cv, min["copilot-cli"]) < 0) {
      warn(`Copilot CLI ${cv} is below ${min["copilot-cli"]} — plugin commands may fail. Run 'copilot update' first.`);
    }
  }
  if (tools.length === 0) {
    fail("No agent runtime found. Install at least one, then re-run:");
    info("GitHub Copilot CLI   npm install -g @github/copilot   (then run `copilot` once to sign in)");
    info("Claude Code          https://docs.anthropic.com/en/docs/claude-code");
    process.exit(1);
  }

  const results = [];
  for (const cli of tools) installFor(cli, results);

  header("Bootstrap complete");
  console.log("");
  if (results.length) for (const r of results) console.log(`    - ${r}`);
  else warn("Nothing was installed — see errors above.");
  console.log("");
  console.log(bold("  Next: start your agent and say  \"set up my workstation\""));
  console.log("  It installs everything else you need — SDKs, CLIs, Microsoft's plugins,");
  console.log("  the workloads you choose — signs you in, and checks it all works.");
  console.log("");
})().catch((err) => {
  fail(`Bootstrap failed: ${err.message}`);
  process.exit(1);
});
