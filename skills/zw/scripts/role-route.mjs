#!/usr/bin/env node
/**
 * role-route.mjs - resolve the route for one z-workflow key.
 *
 * Usage:
 *   node role-route.mjs <key> [--harness <name>] [--route-index <n>] [--shift <n>] [--efforts <list>] [--file <path>]
 *   node role-route.mjs --list [--harness <name>] [--file <path>]
 *   node role-route.mjs --check [--file <path>]
 *   node role-route.mjs --init [--harness <name>] [--file <path>]
 *   node role-route.mjs --test
 *
 * The keys file lives outside the skills root, at ~/.agents/zw-roles.md by
 * default, so a skills upgrade never overwrites it.
 *
 * One namespace holds every key a step can name: the five playbooks, the
 * sub-workloads a skill fans out to, and the agent types. A key resolves to one
 * or more routes (a panel) plus a reasoning effort; a `budget:` line supplies
 * the effort a route leaves out.
 *
 * --shift moves the route's effort along the ladder the harness printed in
 * --efforts, which is how the spawner tiers one job harder or easier than its
 * key's line. The ladder is never guessed here: pass what the harness reported,
 * and a shift that runs past an end clamps and says so.
 *
 * A missing file is not an error: every key inherits the parent route, which is
 * the behaviour a fresh machine gets. Exit 0 for a resolved route or a
 * legitimate inherit, 1 when --check finds a malformed file, 2 on a usage error.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const KEYS = [
  "feature",
  "bug-fix",
  "investigation",
  "refactor",
  "ship",
  "how-explorer",
  "how-explainer",
  "why-investigator",
  "why-synthesizer",
  "review-standards",
  "review-spec",
  "verify-driver",
  "research",
  "prose",
  "poteto-agent",
  "comment-sicko",
  "independent-verifier",
];
const HARNESSES = ["dsh", "claude-code", "codex"];
const DEFAULT_HARNESS = "dsh";
const DEFAULT_FILE = join(homedir(), ".agents", "zw-roles.md");
const INHERIT_WORDS = new Set(["inherit", "inherit-parent", "auto"]);

const TEMPLATE = [
  "# z-workflow routes",
  "",
  "# One line per key, per harness: <key>: <route>[, <route>...] where a route is",
  "# <provider> <model> [effort], or inherit. A comma makes a panel; --route-index",
  "# picks one. A line starting with # is a comment, and a key with no line",
  "# inherits. The optional budget line supplies the effort a route leaves out.",
  "#",
  "# The keys are defined in ../references/harness/index.md. Resolve one with",
  "#   node scripts/role-route.mjs <key> --harness <name>",
  "# and validate this file with --check.",
  "",
  "budget: high",
  "",
  "## dsh",
  "",
  ...KEYS.map((key) => key + ": inherit"),
  "",
].join("\n");

function splitRoutes(value) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function parseRoute(text) {
  if (INHERIT_WORDS.has(text)) return { inherit: true };
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) {
    return 'a route must be inherit, "<provider> <model>", or "<provider> <model> <effort>"';
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
  let budget = null;
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
    const budgetLine = /^budget:(?:\s*(.*))?$/.exec(line);
    if (budgetLine) {
      const value = (budgetLine[1] ?? "").trim();
      if (!value || /\s/.test(value)) {
        errors.push({ line: at, message: "budget takes one effort token" });
        return;
      }
      budget = value;
      return;
    }
    const entry = /^([A-Za-z][A-Za-z-]*):(?:\s*(.*))?$/.exec(line);
    if (!entry) {
      errors.push({ line: at, message: "is not a key line" });
      return;
    }
    const key = entry[1];
    if (!KEYS.includes(key)) {
      errors.push({ line: at, message: 'unknown key "' + key + '"' });
      return;
    }
    if (current === null) {
      errors.push({ line: at, message: "key line before any harness section" });
      return;
    }
    const value = (entry[2] ?? "").trim();
    if (!value) {
      errors.push({ line: at, message: "has no route; write inherit, or delete the line" });
      return;
    }
    const routes = [];
    let failed = false;
    for (const part of splitRoutes(value)) {
      const route = parseRoute(part);
      if (typeof route === "string") {
        errors.push({ line: at, message: route });
        failed = true;
        break;
      }
      routes.push(route);
    }
    if (failed) return;
    if (routes.length > 1 && routes.some((route) => route.inherit)) {
      errors.push({ line: at, message: "inherit cannot sit in a panel" });
      return;
    }
    const section = sections.get(current);
    if (section.has(key)) {
      errors.push({ line: at, message: 'key "' + key + '" is listed twice in ' + current });
      return;
    }
    section.set(key, { routes, line: at });
  });
  return { sections, errors, budget };
}

function resolveRoute(sections, key, harness, file, routeIndex = 0, budget = null) {
  const section = sections.get(harness);
  const entry = section === undefined ? undefined : section.get(key);
  if (entry === undefined) {
    return { key, harness, inherit: true, reason: section === undefined ? "no " + harness + " section" : 'key "' + key + '" is not listed for ' + harness, file };
  }
  if (entry.routes.length === 1 && entry.routes[0].inherit) {
    return { key, harness, inherit: true, reason: "the routes file says inherit", line: entry.line, file };
  }
  if (!Number.isInteger(routeIndex) || routeIndex < 0 || routeIndex >= entry.routes.length) {
    return { key, harness, inherit: true, reason: "route index " + routeIndex + " is outside a panel of " + entry.routes.length, line: entry.line, file };
  }
  const chosen = entry.routes[routeIndex];
  const routes = entry.routes.map((route) => ({
    provider: route.provider,
    model: route.model,
    reasoningEffort: route.reasoningEffort ?? (budget === null ? undefined : budget),
  }));
  return {
    key,
    harness,
    inherit: false,
    routes,
    routeIndex,
    ...routes[routeIndex],
    line: entry.line,
    file,
  };
}

function shiftRoute(route, shift, ladder) {
  if (route.inherit) return { ...route, shifted: false, note: "inherits, so there is no effort to shift" };
  if (!ladder) return route;
  const current = route.reasoningEffort;
  if (current === undefined) return { ...route, shifted: false, note: "the route declares no effort, so there is nothing to shift" };
  const at = ladder.indexOf(current);
  if (at === -1) {
    return { ...route, shifted: false, error: "effort \"" + current + "\" is not on the ladder " + ladder.join(",") };
  }
  const target = Math.min(ladder.length - 1, Math.max(0, at + shift));
  const moved = target - at;
  return {
    ...route,
    reasoningEffort: ladder[target],
    shifted: moved !== 0,
    effortShift: { from: current, to: ladder[target], asked: shift, applied: moved, clamped: moved !== shift },
  };
}

function readRoles(file) {
  if (!existsSync(file)) return { text: null, sections: new Map(), errors: [], budget: null };
  const text = readFileSync(file, "utf8");
  const parsed = parseRoles(text);
  return { text, ...parsed };
}

function parseArgs(argv) {
  const options = { key: null, mode: "route", harness: DEFAULT_HARNESS, routeIndex: 0, shift: 0, efforts: null, file: process.env.ZW_ROLES ?? DEFAULT_FILE };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--test") options.mode = "test";
    else if (arg === "--check") options.mode = "check";
    else if (arg === "--init") options.mode = "init";
    else if (arg === "--list") options.mode = "list";
    else if (arg === "--harness") options.harness = argv[++i];
    else if (arg === "--file") options.file = argv[++i];
    else if (arg === "--efforts") options.efforts = argv[++i];
    else if (arg === "--shift") {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < -3 || parsed > 3) return { error: "--shift takes a whole number from -3 to 3" };
      options.shift = parsed;
    } else if (arg === "--route-index") {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 0) return { error: "--route-index takes a whole number" };
      options.routeIndex = parsed;
    } else if (arg.startsWith("-")) return { error: "unknown flag " + arg };
    else if (options.key === null) options.key = arg;
    else return { error: "unexpected argument " + arg };
  }
  if (options.mode === "route") {
    if (options.key === null) return { error: "a key is required" };
    if (!KEYS.includes(options.key)) return { error: 'unknown key "' + options.key + '"; expected one of ' + KEYS.join(", ") };
  }
  if (options.shift !== 0 && options.mode === "route") {
    if (!options.efforts) return { error: "--shift needs --efforts, the ladder the harness printed for this model" };
    options.effortLadder = options.efforts.split(",").map((part) => part.trim()).filter(Boolean);
    if (options.effortLadder.length < 2) return { error: "--efforts needs at least two effort ids, lowest first" };
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
    "budget: xhigh",
    "",
    "## dsh",
    "feature: magpie auto/deepseek-v4-pro",
    "review-standards: magpie auto/glm-5.3 high, magpie auto/grok-4.7 high",
    "comment-sicko: inherit",
    "",
    "## claude-code",
    "feature: other model-x",
  ].join("\n");
  const parsed = parseRoles(good);
  check("good fixture parses without errors", parsed.errors.length === 0);
  check("budget is read", parsed.budget === "xhigh");
  const feature = resolveRoute(parsed.sections, "feature", "dsh", "fixture", 0, parsed.budget);
  check("provider is split out", feature.routes[0].provider === "magpie");
  check("model is split out", feature.routes[0].model === "auto/deepseek-v4-pro");
  check("budget fills a missing effort", feature.routes[0].reasoningEffort === "xhigh");
  const panel = resolveRoute(parsed.sections, "review-standards", "dsh", "fixture", 1, parsed.budget);
  check("a panel exposes every route", panel.routes.length === 2);
  check("route index picks one", panel.routeIndex === 1 && panel.model === "auto/grok-4.7");
  check("an explicit effort beats the budget", panel.routes[0].reasoningEffort === "high");
  check("inherit line resolves to inherit", resolveRoute(parsed.sections, "comment-sicko", "dsh", "fixture").inherit === true);
  check("an unlisted key inherits", resolveRoute(parsed.sections, "ship", "dsh", "fixture").inherit === true);
  check("harness sections do not leak", resolveRoute(parsed.sections, "feature", "claude-code", "fixture").model === "model-x");
  check("a route index outside the panel inherits", resolveRoute(parsed.sections, "feature", "dsh", "fixture", 3).inherit === true);
  check("a missing file inherits", resolveRoute(new Map(), "feature", "dsh", "/nowhere").inherit === true);
  check("an auto line inherits", parseRoles("## dsh\nship: auto\n").sections.get("dsh").get("ship").routes[0].inherit === true);

  const bad = [
    "## nonsense",
    "prose: a b c",
    "## dsh",
    "feature: magpie",
    "bug-fix: one two three four",
    "wibble: magpie auto/x",
    "budget: two tokens",
    "how-explorer: inherit, magpie auto/x",
  ].join("\n");
  const broken = parseRoles(bad);
  const messages = broken.errors.map((e) => e.message).join(" | ");
  check("unknown section is reported", /unknown harness section/.test(messages));
  check("key before a section is reported", /before any harness section/.test(messages));
  check("unknown key is reported", /unknown key/.test(messages));
  check("a one token route is reported", /route must be inherit/.test(messages));
  check("a four token route is reported", /route must be inherit/.test(messages));
  check("a bad budget is reported", /budget takes one effort token/.test(messages));
  check("inherit inside a panel is reported", /cannot sit in a panel/.test(messages));
  const twice = parseRoles("## dsh\nfeature: a b\n## dsh\nship: c d\n");
  check("a section declared twice is reported", twice.errors.some((e) => /declared twice/.test(e.message) && e.line === 3));
  const routeless = parseRoles("## dsh\nfeature:\n");
  check("a key line with no route is reported", routeless.errors.some((e) => /has no route/.test(e.message) && e.line === 2));
  const duplicated = parseRoles("## dsh\nfeature: a b\nfeature: c d\n");
  check("a duplicate key is reported", duplicated.errors.some((e) => /listed twice/.test(e.message)));
  check("errors carry a line number", broken.errors.every((e) => typeof e.line === "number" && e.line > 0));

  const base = (key, index = 0) => resolveRoute(parsed.sections, key, "dsh", "fixture", index, parsed.budget);
  const ladder = ["low", "high", "xhigh"];
  const raised = shiftRoute(base("review-standards"), 1, ladder);
  check("a shift raises the effort", raised.reasoningEffort === "xhigh");
  check("a shift reports what it applied", raised.effortShift.applied === 1 && raised.effortShift.clamped === false);
  const lowered = shiftRoute(base("review-standards"), -1, ladder);
  check("a negative shift lowers the effort", lowered.reasoningEffort === "low");
  const clamped = shiftRoute(base("review-standards"), 3, ladder);
  check("a shift past the top clamps and says so", clamped.reasoningEffort === "xhigh" && clamped.effortShift.clamped === true);
  const offLadder = shiftRoute(base("feature"), 1, ["low", "medium"]);
  check("an effort off the ladder is refused", typeof offLadder.error === "string");
  const inherited = shiftRoute(resolveRoute(parsed.sections, "comment-sicko", "dsh", "fixture"), 1, ladder);
  check("shifting an inherited route says so", inherited.inherit === true && /inherits/.test(inherited.note));

  const fromTemplate = parseRoles(TEMPLATE);
  check("the template parses clean", fromTemplate.errors.length === 0);
  check("the template covers every key", KEYS.every((key) => fromTemplate.sections.get("dsh").has(key)));

  console.log("role-route --test: fixtures=" + (failures.length === 0 ? "ok" : "FAIL"));
  if (failures.length) {
    for (const failure of failures) console.error("role-route --test FAIL: " + failure);
    return false;
  }
  console.log("role-route --test: all ok");
  return true;
}

function sectionSummary(sections, budget) {
  const parts = [];
  for (const [harness, keys] of sections) parts.push(harness + "=" + keys.size);
  const head = parts.length ? "ok: " + parts.join(" ") : "ok: no routes file, every key inherits";
  return budget === null ? head : head + " budget=" + budget;
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

  const { sections, errors, budget } = readRoles(options.file);

  if (options.mode === "check") {
    for (const error of errors) console.error(options.file + ":" + error.line + ": " + error.message);
    if (errors.length) process.exit(1);
    console.log(sectionSummary(sections, budget) + " in " + options.file);
    return;
  }
  if (errors.length) {
    for (const error of errors) console.error(options.file + ":" + error.line + ": " + error.message);
    process.exit(1);
  }
  if (options.mode === "list") {
    console.log(JSON.stringify(KEYS.map((key) => resolveRoute(sections, key, options.harness, options.file, options.routeIndex, budget)), null, 2));
    return;
  }
  const resolved = resolveRoute(sections, options.key, options.harness, options.file, options.routeIndex, budget);
  if (resolved.error !== undefined) {
    console.error("role-route: " + resolved.error);
    process.exit(2);
  }
  const shifted = shiftRoute(resolved, options.shift, options.effortLadder);
  if (shifted.error !== undefined) {
    console.error("role-route: " + shifted.error);
    process.exit(2);
  }
  console.log(JSON.stringify(shifted, null, 2));
}

main();
