#!/usr/bin/env node
/**
 * Powercademy Skills — portability & convention lint
 *
 * Enforces the hard constraints from CLAUDE.md mechanically, so a skill can
 * never silently couple itself to one runtime or leak Microsoft mechanics out
 * of the one file that is allowed to hold them.
 *
 * Checks, per plugin under plugins/*:
 *   1. Every skills/<name>/SKILL.md frontmatter has ONLY `name` and
 *      `description` — nothing else (allowed-tools, user-invocable, etc. are
 *      runtime-specific and break dual-runtime portability).
 *   2. No SKILL.md exceeds 500 lines.
 *   3. Microsoft plugin mechanics (command/tool/server names) appear ONLY in
 *      shared/microsoft-refs.md — never in a SKILL.md or other shared file.
 *   4. Each plugin has a .claude-plugin/plugin.json that parses.
 *
 * Usage: node scripts/lint/lint-skills.js
 * Exit 0 = clean, 1 = violations (prints them).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PLUGINS_DIR = path.join(ROOT, "plugins");

// Tokens that denote Microsoft plugin mechanics. Their presence anywhere
// except microsoft-refs.md is a leak. Kept deliberately specific to avoid
// false positives on ordinary prose ("Microsoft Learn", "Power Automate").
const MECHANICS_TOKENS = [
  "FlowAgent",
  "/plugin install",
  "/plugin marketplace",
  "plugin marketplace add",
  "pac copilot mcp",
  "claude mcp add-json",
  "microsoft_docs_search",
  "microsoft_docs_fetch",
  "microsoft_code_sample_search",
  "@power-platform-skills",
  "power-cat-skills",
];

const ALLOWED_FRONTMATTER_KEYS = new Set(["name", "description"]);
const MAX_SKILL_LINES = 500;
// GitHub Copilot CLI rejects any skill whose description exceeds 1024 chars.
// Claude Code does not enforce this, so it only surfaces in one runtime —
// exactly the drift this lint exists to catch. Keep a margin below the cap.
const MAX_DESCRIPTION_CHARS = 1024;

const violations = [];
const v = (file, msg) => violations.push({ file: path.relative(ROOT, file), msg });

function parseFrontmatterKeys(content, file) {
  if (!content.startsWith("---")) {
    v(file, "SKILL.md has no YAML frontmatter block");
    return [];
  }
  const end = content.indexOf("\n---", 3);
  if (end === -1) {
    v(file, "SKILL.md frontmatter is not closed with ---");
    return [];
  }
  const block = content.slice(3, end);
  // Top-level keys only: lines matching `key:` at column 0 (ignore folded/
  // indented continuation lines, e.g. a multi-line description under `>`).
  return block
    .split("\n")
    .filter((line) => /^[A-Za-z_][A-Za-z0-9_-]*:/.test(line))
    .map((line) => line.split(":")[0].trim());
}

// Extract the description value and return its length as the runtime sees it.
// Handles a folded scalar (`description: >`) by joining wrapped lines with a
// single space, and an inline `description: text` on one line.
function descriptionLength(content) {
  const end = content.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = content.slice(3, end);
  const folded = block.match(/description:\s*[>|][-+]?\s*\n([\s\S]*?)(?=\n[A-Za-z_][A-Za-z0-9_-]*:|$)/);
  if (folded) {
    return folded[1].split("\n").map((l) => l.trim()).filter(Boolean).join(" ").length;
  }
  const inline = block.match(/description:\s*(.+)/);
  return inline ? inline[1].trim().replace(/^["']|["']$/g, "").length : null;
}

function lintSkill(skillMd) {
  const content = fs.readFileSync(skillMd, "utf8");

  // 1. frontmatter keys
  const keys = parseFrontmatterKeys(content, skillMd);
  for (const key of keys) {
    if (!ALLOWED_FRONTMATTER_KEYS.has(key)) {
      v(
        skillMd,
        `frontmatter key "${key}" not allowed — only name+description are portable across both runtimes`
      );
    }
  }
  for (const required of ["name", "description"]) {
    if (!keys.includes(required)) v(skillMd, `frontmatter missing required key "${required}"`);
  }

  // description length (Copilot CLI hard limit)
  const descLen = descriptionLength(content);
  if (descLen !== null && descLen > MAX_DESCRIPTION_CHARS) {
    v(
      skillMd,
      `description is ${descLen} chars — exceeds the ${MAX_DESCRIPTION_CHARS}-char limit GitHub Copilot CLI enforces (Claude Code does not, so it only fails in one runtime)`
    );
  }

  // 2. line count
  const lines = content.split("\n").length;
  if (lines > MAX_SKILL_LINES) {
    v(skillMd, `${lines} lines exceeds the ${MAX_SKILL_LINES}-line cap — move detail into shared/`);
  }

  // 3. mechanics leak
  for (const token of MECHANICS_TOKENS) {
    if (content.includes(token)) {
      v(skillMd, `Microsoft mechanics token "${token}" must live only in shared/microsoft-refs.md`);
    }
  }

  // 4. bare shared/ reference paths
  for (const ref of bareSharedRefs(content)) {
    v(skillMd, sharedRefMessage(ref));
  }
}

// A file-read reference to shared/<file>.md must be written
// ${PLUGIN_ROOT}/shared/<file>.md. A bare "shared/x.md" resolves relative to
// the skill folder and fails to load — the shared files live at the plugin
// root, not under the skill. This is the exact bug that broke a real load.
function bareSharedRefs(content) {
  const matches = content.match(/(?<!\}\/)shared\/[\w-]+\.md/g) || [];
  return [...new Set(matches)];
}

function sharedRefMessage(ref) {
  return `reference "${ref}" must be written "\${PLUGIN_ROOT}/${ref}" — a bare shared/ path resolves relative to the skill folder and fails to load (shared files live at the plugin root)`;
}

function lintSharedFile(file) {
  // Any shared/*.md that is NOT microsoft-refs.md must also be clean of
  // mechanics tokens — the quarantine is a single file, not the whole dir.
  const content = fs.readFileSync(file, "utf8");
  for (const token of MECHANICS_TOKENS) {
    if (content.includes(token)) {
      v(file, `Microsoft mechanics token "${token}" must live only in shared/microsoft-refs.md`);
    }
  }
}

function walk(dir, ext) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

function main() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error("No plugins/ directory found.");
    process.exit(1);
  }

  const plugins = fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(PLUGINS_DIR, d.name));

  let skillCount = 0;

  for (const plugin of plugins) {
    // 4. plugin.json parses
    const manifest = path.join(plugin, ".claude-plugin", "plugin.json");
    if (!fs.existsSync(manifest)) {
      v(plugin, "missing .claude-plugin/plugin.json");
    } else {
      try {
        JSON.parse(fs.readFileSync(manifest, "utf8"));
      } catch (err) {
        v(manifest, `plugin.json does not parse: ${err.message}`);
      }
    }

    // skills
    for (const skillMd of walk(path.join(plugin, "skills"), "SKILL.md")) {
      skillCount++;
      lintSkill(skillMd);
    }

    // shared files
    const sharedDir = path.join(plugin, "shared");
    for (const md of walk(sharedDir, ".md")) {
      // mechanics quarantine: everything except microsoft-refs.md
      if (path.basename(md) !== "microsoft-refs.md") lintSharedFile(md);
      // bare shared/ references: every shared file, microsoft-refs included
      for (const ref of bareSharedRefs(fs.readFileSync(md, "utf8"))) {
        v(md, sharedRefMessage(ref));
      }
    }
  }

  if (violations.length === 0) {
    console.log(`✓ lint clean — ${plugins.length} plugin(s), ${skillCount} skill(s)`);
    process.exit(0);
  }

  console.error(`✗ ${violations.length} violation(s):\n`);
  for (const { file, msg } of violations) console.error(`  ${file}\n    ${msg}\n`);
  process.exit(1);
}

main();
