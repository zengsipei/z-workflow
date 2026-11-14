#!/usr/bin/env node
/**
 * role-route.mjs - resolve the route for one z-workflow role.
 *
 * Usage:
 *   node role-route.mjs <role> [--harness <name>] [--file <path>]
 *   node role-route.mjs --list [--harness <name>] [--file <path>]
 *   node role-route.mjs --check [--file <path>]
 *   node role-route.mjs --init [--harness <name>] [--file <path>]
 *   node role-route.mjs --test
 *
 * The roles file lives outside the skills root, at ~/.agents/zw-roles.md by
 * default, so a skills upgrade never overwrites it.
 *
 * A missing file is not an error: every role inherits the parent route, which is
 * the behaviour a fresh machine gets. Exit 0 for a resolved route or a
 * legitimate inherit, 1 when --check finds a malformed file, 2 on a usage error.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const ROLES = ["impl", "explore", "judge", "verify", "prose"];
const HARNESSES = ["dsh", "claude-code", "codex"];
const DEFAULT_HARNESS = "dsh";
const DEFAULT_FILE = join(homedir(), ".agents", "zw-roles.md");

const TEMPLATE = [
  "# z-workflow roles",
  "",
  "# One line per role, per harness: <role>: <provider> <model> [effort], or inherit",
  "# to take the parent route. A line starting with # is a comment. A role with no",
  "# line, and a harness with no section, inherits everywhere.",
  "#",
  "# The five roles are defined in ../references/harness/index.md. Resolve one with",
  "#   node scripts/role-route.mjs <role> --harness <name>",
  "# and validate this file with --check.",
  "",
  "## dsh",
  "",
  "impl: inherit",
  "explore: inherit",
  "judge: inherit",
  "verify: inherit",
  "prose: inherit",
  "",
].join("\n");

function parseValue(value) {
  if (value === "inherit") return { inherit: true };
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) {
    return 'value must be inherit, "<provider> <model>", or "<provider> <model> <effort>"';
  }
  return {
    inherit: false,
    provider: parts[0],
    model: parts[1],
    ...(parts.length === 3 ? { reasoningEffort: parts[2] } : {}),
  };
}

function parseRoles(text) {
  const sections = new Map();
  const errors = [];
  let current = null;
  text.replace(/\r\n?/g, "\n").split("\n").forEach((raw, index) => {
    const line = raw.trim();
    const at = index + 1;
    if (!line) return;
    const header = /^##\s+(\S+)\s*$/.exec(line);
    if (header) {
      const name = header[1];
      if (!HARNESSES.includes(name)) {
        errors.push({ line: at, message: 'unknown harness section "' + name + '"' });
        current = null;
        return;
      }
      if (sections.has(name)) errors.push({ line: at, message: 'harness section "' + name + '" is declared twice' });
      if (!sections.has(name)) sections.set(name, new Map());
      current = name;
      return;
    }
    if (line.startsWith("#")) return;
    const entry = /^([A-Za-z][A-Za-z-]*):(?:\s*(.*))?$/.exec(line);
    if (!entry) {
      errors.push({ line: at, message: "is not a role line" });
      return;
    }
    const role = entry[1];
    if (!ROLES.includes(role)) {
      errors.push({ line: at, message: 'unknown role "' + role + '"' });
      return;
    }
    if (current === null) {
      errors.push({ line: at, message: "role line before any harness section" });
      return;
    }
    const route = parseValue((entry[2] ?? "").trim());
    if (typeof route === "string") {
      errors.push({ line: at, message: route });
      return;
    }
    const section = sections.get(current);
    if (section.has(role)) {
      errors.push({ line: at, message: 'role "' + role + '" is listed twice in ' + current });
      return;
    }
    section.set(role, { ...route, line: at });
  });
  return { sections, errors };
}

function resolveRoute(sections, role, harness, file) {
  const section = sections.get(harness);
  const entry = section === undefined ? undefined : section.get(role);
  if (entry === undefined) {
    return { role, harness, inherit: true, reason: section === undefined ? "no " + harness + " section" : 'role "' + role + '" is not listed for ' + harness, file };
  }
  if (entry.inherit) return { role, harness, inherit: true, reason: 'the roles file says inherit', line: entry.line, file };
  return {
    role,
    harness,
    inherit: false,
    ...(entry.provider === undefined ? {} : { provider: entry.provider }),
    ...(entry.model === undefined ? {} : { model: entry.model }),
    ...(entry.reasoningEffort === undefined ? {} : { reasoningEffort: entry.reasoningEffort }),
    line: entry.line,
    file,
  };
}

function readRoles(file) {
  if (!existsSync(file)) return { text: null, sections: new Map(), errors: [] };
  const text = readFileSync(file, "utf8");
  const parsed = parseRoles(text);
  return { text, ...parsed };
}

function parseArgs(argv) {
  const options = { role: null, mode: "route", harness: DEFAULT_HARNESS, file: process.env.ZW_ROLES ?? DEFAULT_FILE };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--test") options.mode = "test";
    else if (arg === "--check") options.mode = "check";
    else if (arg === "--init") options.mode = "init";
    else if (arg === "--list") options.mode = "list";
    else if (arg === "--harness") options.harness = argv[++i];
    else if (arg === "--file") options.file = argv[++i];
    else if (arg.startsWith("-")) return { error: "unknown flag " + arg };
    else if (options.role === null) options.role = arg;
    else return { error: "unexpected argument " + arg };
  }
  if (options.mode === "route") {
    if (options.role === null) return { error: "a role is required" };
    if (!ROLES.includes(options.role)) return { error: 'unknown role "' + options.role + '"; expected one of ' + ROLES.join(", ") };
  }
  if (options.harness !== undefined && !HARNESSES.includes(options.harness)) {
    return { error: 'unknown harness "' + options.harness + '"; expected one of ' + HARNESSES.join(", ") };
  }
  options.file = resolve(options.file);
  return options;
}

function selfTest() {
  const failures = [];
  const check = (name, ok) => { if (!ok) failures.push(name); };

  const good = [
    "# a comment",
    "",
    "## dsh",
    "impl: magpie auto/deepseek-v4-pro high",
    "explore: inherit",
    "judge: other model-x",
    "",
    "## claude-code",
    "impl: opus xhigh",
  ].join("\n");
  const parsed = parseRoles(good);
  check("good fixture parses without errors", parsed.errors.length === 0);
  const impl = resolveRoute(parsed.sections, "impl", "dsh", "fixture");
  check("provider is split out", impl.provider === "magpie");
  check("model is split out", impl.model === "auto/deepseek-v4-pro");
  check("effort is optional and split out", impl.reasoningEffort === "high");
  check("inherit line resolves to inherit", resolveRoute(parsed.sections, "explore", "dsh", "fixture").inherit === true);
  check("unlisted role inherits", resolveRoute(parsed.sections, "prose", "dsh", "fixture").inherit === true);
  check("harness sections do not leak", resolveRoute(parsed.sections, "impl", "claude-code", "fixture").model === "xhigh");
  check("a two token value has no effort", resolveRoute(parsed.sections, "judge", "dsh", "fixture").reasoningEffort === undefined);
  check("a missing file inherits", resolveRoute(new Map(), "impl", "dsh", "/nowhere").inherit === true);

  const bad = [
    "## nonsense",
    "prose: a b c",
    "## dsh",
    "impl: magpie",
    "explore: one two three four",
    "wibble: magpie auto/x",
  ].join("\n");
  const broken = parseRoles(bad);
  const messages = broken.errors.map((e) => e.message).join(" | ");
  check("unknown section is reported", /unknown harness section/.test(messages));
  check("role before a section is reported", /before any harness section/.test(messages));
  check("unknown role is reported", /unknown role/.test(messages));
  check("a one token value is reported", /value must be inherit/.test(messages));
  check("a four token value is reported", /value must be inherit/.test(messages));
  const duplicated = parseRoles("## dsh\nimpl: a b\nimpl: c d\n");
  check("a duplicate role is reported", duplicated.errors.some((e) => /listed twice/.test(e.message)));
  check("errors carry a line number", broken.errors.every((e) => typeof e.line === "number" && e.line > 0));

  const tmp = mkdtempSync(join(tmpdir(), "role-route-"));
  const file = join(tmp, "zw-roles.md");
  writeFileSync(file, TEMPLATE, "utf8");
  const fromTemplate = parseRoles(TEMPLATE);
  check("the template parses clean", fromTemplate.errors.length === 0);
  check("the template covers every role", ROLES.every((role) => fromTemplate.sections.get("dsh").has(role)));
  rmSync(tmp, { recursive: true, force: true });

  console.log("role-route --test: fixtures=" + (failures.length === 0 ? "ok" : "FAIL"));
  if (failures.length) {
    for (const failure of failures) console.error("role-route --test FAIL: " + failure);
    return false;
  }
  console.log("role-route --test: all ok");
  return true;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.error !== undefined) {
    console.error("role-route: " + options.error);
    process.exit(2);
  }
  if (options.mode === "test") process.exit(selfTest() ? 0 : 1);

  if (options.mode === "init") {
    if (existsSync(options.file)) {
      console.log(options.file + " already exists; left untouched");
      return;
    }
    mkdirSync(dirname(options.file), { recursive: true });
    writeFileSync(options.file, TEMPLATE, "utf8");
    console.log("wrote " + options.file);
    return;
  }

  const { sections, errors } = readRoles(options.file);

  if (options.mode === "check") {
    for (const error of errors) console.error(options.file + ":" + error.line + ": " + error.message);
    if (errors.length) process.exit(1);
    console.log(sectionSummary(sections) + " in " + options.file);
    return;
  }
  if (errors.length) {
    for (const error of errors) console.error(options.file + ":" + error.line + ": " + error.message);
    process.exit(1);
  }
  if (options.mode === "list") {
    console.log(JSON.stringify(ROLES.map((role) => resolveRoute(sections, role, options.harness, options.file)), null, 2));
    return;
  }
  console.log(JSON.stringify(resolveRoute(sections, options.role, options.harness, options.file), null, 2));
}

function sectionSummary(sections) {
  const parts = [];
  for (const [harness, roles] of sections) parts.push(harness + "=" + roles.size);
  return parts.length ? "ok: " + parts.join(" ") : "ok: no roles file, every role inherits";
}

main();
