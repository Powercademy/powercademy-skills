/**
 * Powercademy doctor — shared, read-only toolchain checks.
 *
 * One implementation of "is this item ready?" for everything that asks:
 * the workstation health report (scripts/workstation-report.js) and the
 * fresh-machine smoke test (repo: scripts/test/workstation-smoke.js). Every
 * function here only reads; nothing installs or changes the machine.
 *
 * The toolchain manifest (../shared/toolchain-manifest.json) is the source of
 * truth for what is checked and how.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const OS = process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux";
const POSIX = OS !== "win";

function loadManifest(file = path.join(__dirname, "..", "shared", "toolchain-manifest.json")) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sh(cmd, { timeout = 120000 } = {}) {
  const r = spawnSync(cmd, { shell: OS === "win" ? "cmd.exe" : "/bin/bash", encoding: "utf8", timeout, env: process.env, windowsHide: true });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  return { ok: r.status === 0 && !r.error, code: r.error ? r.error.code : r.status, out };
}

// Pick the value for this OS from a manifest field that may be a string or a
// per-OS object ({ win, mac, linux, posix, all }).
const osPick = (v) => (v == null ? null : typeof v === "string" ? v : v[OS] ?? (POSIX ? v.posix : null) ?? v.all ?? null);
// Strip trailing human commentary: "cmd   (explanation)" → "cmd".
const cmdOf = (text) => (text ? text.split(/\s{2,}\(|\s+\(then /)[0].trim() : null);
const runnable = (c) => !!c && !/^https?:/.test(c) && !/^(Install|Use) /.test(c) && !c.includes("→") && !c.includes("{");

function versionOf(out) { const m = out.match(/(\d+\.\d+(?:\.\d+)?)/); return m ? m[1] : null; }
function cmpVer(a, b) {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
function regexOf(s) { const ci = s.startsWith("(?i)"); return new RegExp(ci ? s.slice(4) : s, ci ? "i" : ""); }

// Run a tool item's manifest check.
// → { state: ready | outdated | repair | missing | noversion | nocheck, version?, repair?, out? }
function checkTool(item) {
  const c = osPick(item.check?.cmd);
  if (!c) return { state: "nocheck" };
  const r = sh(c);
  for (const d of item.check.diagnose || []) if (r.out.includes(d.match)) return { state: "repair", repair: d.repair, out: r.out };
  if (item.check.failIfOutputMatches && r.out.includes(item.check.failIfOutputMatches)) return { state: "repair", repair: "shim", out: r.out };
  if (!r.ok) return { state: "missing", out: r.out };
  const expect = osPick(item.check.expectOutputMatches);
  if (expect && !regexOf(expect).test(r.out)) return { state: "missing", out: r.out };
  const v = versionOf(r.out);
  if (item.check.min && v && cmpVer(v, item.check.min) < 0) return { state: "outdated", version: v };
  if (item.check.min && !v) return { state: "noversion", out: r.out };
  return { state: "ready", version: v };
}

// ── agent runtimes ────────────────────────────────────────────
function detectRuntimes() {
  const out = {};
  for (const cli of ["claude", "copilot"]) {
    const r = sh(`${cli} --version`);
    if (r.ok) out[cli] = versionOf(r.out) || "present";
  }
  return out;
}

const cache = {};
const memo = (key, fn) => (key in cache ? cache[key] : (cache[key] = fn()));
const listPlugins = (cli) => memo(`plugins:${cli}`, () => sh(`${cli} plugin list`).out);
const listMarketplaces = (cli) => memo(`mkts:${cli}`, () => sh(`${cli} plugin marketplace list`).out);
// Everything the runtime knows about MCP servers, as text to match against.
// Claude Code: `claude mcp list` (user + local + project scope for this folder).
// Copilot CLI: its user-level config file.
function mcpText(cli) {
  return memo(`mcp:${cli}`, () => {
    if (cli === "claude") return sh("claude mcp list", { timeout: 180000 }).out;
    const f = path.join(os.homedir(), ".copilot", "mcp-config.json");
    try { return fs.readFileSync(f, "utf8"); } catch { return ""; }
  });
}
const hasPlugin = (cli, name) => new RegExp(`\\b${name.replace(/[-]/g, "\\-")}\\b`).test(listPlugins(cli));

// The server name a `claude mcp add …` command registers (skips flags and their values).
function mcpNameFromCmd(cmd) {
  const t = cmd.split(/\s+/);
  const valued = new Set(["--transport", "-t", "--scope", "-s", "--header", "-H", "--env", "-e", "--client-id", "--callback-port"]);
  for (let i = 3; i < t.length; i++) {
    if (t[i] === "--") break;
    if (t[i].startsWith("-")) { if (valued.has(t[i])) i++; continue; }
    return t[i];
  }
  return null;
}

module.exports = {
  OS, POSIX, loadManifest, sh, osPick, cmdOf, runnable, versionOf, cmpVer, regexOf,
  checkTool, detectRuntimes, listPlugins, listMarketplaces, mcpText, hasPlugin, mcpNameFromCmd,
};
