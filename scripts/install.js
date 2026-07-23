#!/usr/bin/env node
/**
 * Powercademy Skills — Installer
 *
 * Registers BOTH marketplaces (microsoft/power-platform-skills and this repo)
 * and installs their plugins for whichever CLIs are present: Claude Code
 * and/or GitHub Copilot CLI. Installs the pac CLI if missing.
 *
 * Usage:
 *   node scripts/install.js                       (from a local clone)
 *   curl -fsSL https://raw.githubusercontent.com/HowdangPowercademy/powercademy-skills/main/scripts/install.js | node
 */

const { execSync } = require("child_process");
const path = require("path");
const os = require("os");
const https = require("https");
const fs = require("fs");

// ── Config ────────────────────────────────────────────────────
// Microsoft's marketplace first: this repo layers on top of it.
const MARKETPLACES = [
  {
    repo: "microsoft/power-platform-skills",
    name: "power-platform-skills",
    plugins: ["power-automate"],
  },
  {
    repo: "HowdangPowercademy/powercademy-skills",
    name: "powercademy-skills",
    plugins: ["flow-builder"],
  },
];

// ── Colours (disabled when output is piped) ───────────────────
const tty = process.stdout.isTTY;
const bold = (s) => (tty ? `\x1b[1m${s}\x1b[0m` : s);
const green = (s) => (tty ? `\x1b[32m${s}\x1b[0m` : s);
const yellow = (s) => (tty ? `\x1b[33m${s}\x1b[0m` : s);
const red = (s) => (tty ? `\x1b[31m${s}\x1b[0m` : s);

const ok = (msg) => console.log(`  ${green("✓")} ${msg}`);
const warn = (msg) => console.log(`  ${yellow("!")} ${msg}`);
const fail = (msg) => console.log(`  ${red("✗")} ${msg}`);
const header = (msg) => console.log(`\n${bold(msg)}`);
const info = (msg) => console.log(`  ${msg}`);

// ── Helpers ───────────────────────────────────────────────────
function hasCommand(cmd) {
  try {
    const which = process.platform === "win32" ? "where" : "which";
    execSync(`${which} ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd) {
  try {
    const output = execSync(cmd, { stdio: "pipe", timeout: 120_000, shell: true });
    return { ok: true, output: output.toString().trim() };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    return { ok: false, output: stderr };
  }
}

// ── Marketplace + plugin install for one CLI ──────────────────
function installFor(cli, results) {
  header(cli === "claude" ? "Claude Code" : "GitHub Copilot CLI");

  for (const mp of MARKETPLACES) {
    info(`Registering marketplace ${mp.name}...`);
    const add = run(`${cli} plugin marketplace add "${mp.repo}"`);
    if (add.ok || add.output.includes("already")) {
      ok(`${mp.name} registered`);
    } else {
      fail(`Could not register ${mp.name}: ${add.output}`);
      continue;
    }

    for (const plugin of mp.plugins) {
      info(`Installing ${plugin}...`);
      const installCmd =
        cli === "claude"
          ? `claude plugin install "${plugin}@${mp.name}" --scope user`
          : `copilot plugin install "${plugin}@${mp.name}"`;
      const install = run(installCmd);
      if (install.ok || install.output.includes("already installed")) {
        ok(`${plugin} installed`);
        results.push(`${plugin}@${mp.name} → ${cli}`);
      } else {
        fail(`Could not install ${plugin}: ${install.output}`);
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log("");
  console.log(bold("Powercademy Skills — Installer"));
  console.log("──────────────────────────────");

  // ── Detect CLIs ────────────────────────────────────────────
  header("Checking prerequisites");
  ok(`Node.js ${process.version}`);

  const tools = [];
  if (hasCommand("claude")) {
    const ver = run("claude --version");
    tools.push("claude");
    ok(`Claude Code ${ver.ok ? ver.output : "(version unknown)"}`);
  }
  if (hasCommand("copilot")) {
    const ver = run("copilot --version");
    tools.push("copilot");
    ok(`GitHub Copilot CLI ${ver.ok ? ver.output : "(version unknown)"}`);
  }

  if (tools.length === 0) {
    fail("Neither Claude Code nor GitHub Copilot CLI found in PATH.");
    console.log("");
    console.log("  Install at least one and ensure it is on your PATH:");
    console.log("    Claude Code     https://docs.anthropic.com/en/docs/claude-code");
    console.log("    GitHub Copilot  https://docs.github.com/en/copilot");
    process.exit(1);
  }

  // ── pac CLI ────────────────────────────────────────────────
  header("Power Platform CLI (pac)");

  if (hasCommand("pac")) {
    const ver = run("pac help");
    const versionMatch = ver.ok && ver.output.match(/Version:\s*(.+)/i);
    ok(`pac CLI ${versionMatch ? versionMatch[1].trim() : "(installed)"}`);
  } else if (hasCommand("dotnet")) {
    info("pac CLI not found — installing via dotnet tool...");
    const install = run("dotnet tool install --global Microsoft.PowerApps.CLI.Tool");
    if (install.ok) {
      ok("pac CLI installed (restart your terminal if 'pac' is not found)");
    } else if (install.output.includes("already installed")) {
      ok("pac CLI already installed (not on PATH — restart your terminal)");
    } else {
      fail(`Could not install pac CLI: ${install.output}`);
      info("Install manually: https://aka.ms/PowerPlatformCLI");
    }
  } else {
    warn("pac CLI not found and dotnet SDK unavailable — cannot auto-install.");
    info("Install manually: https://aka.ms/PowerPlatformCLI");
  }

  // ── Install marketplaces + plugins ─────────────────────────
  const results = [];
  for (const cli of tools) installFor(cli, results);

  // ── Summary ────────────────────────────────────────────────
  header("Done!");
  console.log("");
  if (results.length > 0) {
    console.log("  Installed:");
    for (const r of results) console.log(`    - ${r}`);
  } else {
    warn("Nothing was installed — see errors above.");
  }
  console.log("");
  console.log("  Powercademy's flow-builder layers on top of Microsoft's plugins:");
  console.log("  their tools do the mechanics, these skills carry the methodology.");
  console.log("");
  console.log("  Try it: start a session and describe a flow you need to build —");
  console.log('  e.g. "spec a flow that syncs new Dataverse contacts to SharePoint".');
  console.log("");
}

main().catch((err) => {
  fail(`Installation failed: ${err.message}`);
  process.exit(1);
});
