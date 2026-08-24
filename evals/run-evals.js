#!/usr/bin/env node
/**
 * Powercademy Skills — trigger eval harness
 *
 * Answers the question no documentation can: does each skill actually FIRE on
 * a natural phrasing, in each runtime, right now? Runs each scenario prompt
 * headlessly, watches the event stream for a skill invocation, and kills the
 * session the moment a verdict is decidable — so a full sweep stays cheap.
 *
 * Verdicts:
 *   PASS        the expected skill was invoked
 *   COMPETITOR  a different skill fired first (named) — trigger competition
 *   NONE        the turn completed with no skill invocation
 *   TIMEOUT     no verdict within the per-run timeout
 *   ERROR       the runtime failed to run (auth, missing CLI, ...)
 *
 * Usage:
 *   node evals/run-evals.js                       # all scenarios, all available runtimes
 *   node evals/run-evals.js --runtime copilot     # one runtime (copilot | claude)
 *   node evals/run-evals.js --skill build-flow-spec
 *   node evals/run-evals.js --alternates          # also run alternate phrasings
 *   node evals/run-evals.js --timeout 180
 *
 * Notes:
 *   - Runs against the INSTALLED plugins (user scope). Update installs first
 *     so you're testing what you think you're testing.
 *   - Claude runtime must be run from a normal terminal (it needs an
 *     authenticated `claude`); inside an agent session it may fail with an
 *     OAuth error — that reports as ERROR, not a trigger failure.
 *   - Deliberately NOT wired into CI: each run drives real agent sessions
 *     (tokens + minutes). This is a pre-release gate, run by a human.
 */

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getFlag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const RUNTIME = getFlag("--runtime"); // copilot | claude | null=all
const ONLY_SKILL = getFlag("--skill");
const RUN_ALTERNATES = args.includes("--alternates");
const TIMEOUT_S = parseInt(getFlag("--timeout") || "150", 10);

const scenariosPath = path.join(__dirname, "scenarios.json");
const { scenarios } = JSON.parse(fs.readFileSync(scenariosPath, "utf8"));

const hasCommand = (cmd) => {
  try {
    execSync(`${process.platform === "win32" ? "where" : "which"} ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

const killTree = (pid) => {
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${pid} /T /F`, { stdio: "pipe" });
    else process.kill(-pid, "SIGKILL");
  } catch {}
};

// ── per-runtime command + event parsing ───────────────────────
// Each runtime def returns: how to launch, and a line-classifier that yields
// {kind: "skill", name} | {kind: "turn_end"} | {kind: "error", msg} | null.
const RUNTIMES = {
  copilot: {
    available: () => hasCommand("copilot"),
    command: (prompt, cwd) =>
      `copilot -p ${JSON.stringify(prompt)} --output-format json --log-level none --no-color`,
    mkClassifier: () => {
      // The skill invocation arrives as a `skill` tool call. Arguments stream
      // as deltas, so accumulate input per toolCallId and decide on
      // tool.execution_start (which follows the completed deltas).
      const inputs = {};
      return (line) => {
        let ev;
        try { ev = JSON.parse(line); } catch { return null; }
        const t = ev.type || "";
        const d = ev.data || {};
        if (t === "assistant.tool_call_delta" && (d.toolName || "").toLowerCase() === "skill") {
          inputs[d.toolCallId] = (inputs[d.toolCallId] || "") + (d.inputDelta || "");
          return null;
        }
        if (t === "tool.execution_start") {
          const name = (d.toolName || d.name || "").toLowerCase();
          if (name === "skill") {
            const raw = inputs[d.toolCallId] || JSON.stringify(d.arguments || d.input || "");
            const m = raw.match(/"skill"\s*:\s*"([^"]+)"/) || raw.match(/([a-z0-9][a-z0-9-]{2,})/i);
            return { kind: "skill", name: m ? m[1] : "(unparsed)" };
          }
        }
        if (t === "result" || t === "session.completed") return { kind: "turn_end" };
        if (t === "error") return { kind: "error", msg: JSON.stringify(d).slice(0, 200) };
        return null;
      };
    },
  },
  claude: {
    available: () => hasCommand("claude"),
    command: (prompt, cwd) =>
      `claude -p ${JSON.stringify(prompt)} --output-format stream-json --verbose --max-turns 4 --allowedTools Skill`,
    mkClassifier: () => (line) => {
      let ev;
      try { ev = JSON.parse(line); } catch { return null; }
      if (ev.type === "assistant" && ev.message && Array.isArray(ev.message.content)) {
        for (const block of ev.message.content) {
          if (block.type === "tool_use" && block.name === "Skill") {
            const skill = (block.input && block.input.skill) || "(unparsed)";
            return { kind: "skill", name: String(skill).split(":").pop() };
          }
        }
      }
      if (ev.type === "result") {
        if (ev.is_error) return { kind: "error", msg: String(ev.result || "").slice(0, 200) };
        return { kind: "turn_end" };
      }
      return null;
    },
  },
};

// ── one eval run ──────────────────────────────────────────────
function runOne(runtimeName, prompt, expectedSkill, cwd) {
  const rt = RUNTIMES[runtimeName];
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(rt.command(prompt, cwd), {
      shell: true,
      cwd,
      detached: process.platform !== "win32",
    });
    const classify = rt.mkClassifier();
    let settled = false;
    let buf = "";
    let errTail = "";

    const settle = (verdict, detail) => {
      if (settled) return;
      settled = true;
      killTree(child.pid);
      resolve({ verdict, detail, seconds: Math.round((Date.now() - started) / 1000) });
    };

    const timer = setTimeout(() => settle("TIMEOUT", `no verdict in ${TIMEOUT_S}s`), TIMEOUT_S * 1000);

    const onLine = (line) => {
      const sig = classify(line);
      if (!sig) return;
      if (sig.kind === "skill") {
        clearTimeout(timer);
        if (sig.name === expectedSkill) settle("PASS", `invoked ${sig.name}`);
        else settle("COMPETITOR", `invoked ${sig.name} instead`);
      } else if (sig.kind === "turn_end") {
        clearTimeout(timer);
        settle("NONE", "turn completed without a skill invocation");
      } else if (sig.kind === "error") {
        clearTimeout(timer);
        settle("ERROR", sig.msg);
      }
    };

    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) onLine(line);
      }
    });
    child.stderr.on("data", (c) => { errTail = (errTail + c.toString()).slice(-300); });
    child.on("close", () => {
      clearTimeout(timer);
      if (!settled) settle("ERROR", (errTail || "process exited with no events").trim().slice(0, 200));
    });
  });
}

// ── main ──────────────────────────────────────────────────────
(async () => {
  const runtimes = (RUNTIME ? [RUNTIME] : ["copilot", "claude"]).filter((r) => {
    if (!RUNTIMES[r]) { console.error(`Unknown runtime: ${r}`); process.exit(2); }
    if (!RUNTIMES[r].available()) { console.log(`~ ${r}: CLI not found — skipping runtime`); return false; }
    return true;
  });
  if (runtimes.length === 0) process.exit(2);

  const list = scenarios.filter((s) => !ONLY_SKILL || s.skill === ONLY_SKILL);
  if (list.length === 0) { console.error(`No scenario for --skill ${ONLY_SKILL}`); process.exit(2); }

  // isolated empty cwd so sessions can't wander into a real project
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "pcs-evals-"));
  const results = [];
  let failures = 0;

  for (const rt of runtimes) {
    for (const s of list) {
      const prompts = [s.prompt, ...(RUN_ALTERNATES ? s.alternates || [] : [])];
      for (const [i, prompt] of prompts.entries()) {
        const label = `${rt} · ${s.skill}${i > 0 ? ` (alt ${i})` : ""}`;
        process.stdout.write(`… ${label} `);
        const r = await runOne(rt, prompt, s.skill, cwd);
        const icon = r.verdict === "PASS" ? "✓" : r.verdict === "ERROR" ? "~" : "✗";
        console.log(`\r${icon} ${label} — ${r.verdict} (${r.detail}) [${r.seconds}s]`);
        results.push({ runtime: rt, skill: s.skill, alt: i, ...r, prompt });
        if (r.verdict === "COMPETITOR" || r.verdict === "NONE") failures++;
      }
    }
  }

  // summary
  console.log("\n== summary ==");
  for (const v of ["PASS", "COMPETITOR", "NONE", "TIMEOUT", "ERROR"]) {
    const n = results.filter((r) => r.verdict === v).length;
    if (n) console.log(`  ${v}: ${n}`);
  }
  const out = path.join(__dirname, "last-run.json");
  fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + "\n");
  console.log(`  details: ${out}`);
  // ERROR/TIMEOUT are environment problems, not trigger failures — nonzero exit
  // only for genuine trigger failures so a flaky runtime doesn't mask results.
  process.exit(failures ? 1 : 0);
})();
