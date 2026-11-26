#!/usr/bin/env node
/**
 * role-route.mjs - resolve the route for one z-workflow key.
 *
 * Usage:
 *   node role-route.mjs <key> [--harness <name>] [--route-index <n>] [--shift <n>] [--efforts <list>] [--file <path>]
 *   node role-route.mjs --list [--harness <name>] [--file <path>]
 *   node role-route.mjs --check [--file <path>]
 *   node role-route.mjs --init [--harness <name>] [--file <path>]
 *   node role-route.mjs --preview-codex|--setup-codex [--file <path>] < codex-section.md
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
import { closeSync, constants, existsSync, fstatSync, linkSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, rmdirSync, rmSync, statSync, symlinkSync, writeFileSync, writeSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
const SKIPPED = Symbol("a section whose header was rejected");
const FIXED_PROVIDER = { "claude-code": "alias", codex: "model" };

function template(harness) {
  return [
    "# z-workflow routes",
    "",
    "# One line per key, per harness: <key>: <route>[, <route>...] where a route is",
    "# <provider> <model> [effort], or inherit. A comma makes a panel; --route-index",
    "# picks one. A line starting with # is a comment, and a key with no line",
    "# inherits. The optional budget line supplies the effort a route leaves out.",
    "# A claude-code route has no provider: write the fixed word alias in its place,",
    "# as in: alias sonnet low.",
    "# A codex route uses the fixed word model, then an exact id from the session.",
    "# In a Codex route, the effort word default omits the effort even with a budget.",
    "# A configured Codex route opts that workload into automatic selection, not delegation.",
    "#",
    "# The keys are defined in the zw skill, in references/harness/index.md. Resolve one with",
    "#   node <zw-skill>/scripts/role-route.mjs <key> --harness <name>",
    "# and validate this file with --check.",
    "",
    "budget: high",
    "",
    "## " + harness,
    "",
    ...KEYS.map((key) => key + ": inherit"),
    "",
  ].join("\n");
}

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
        current = SKIPPED;
        return;
      }
      if (sections.has(name)) errors.push({ line: at, message: 'harness section "' + name + '" is declared twice' });
      if (!sections.has(name)) sections.set(name, new Map());
      current = name;
      return;
    }
    if (line.startsWith("##")) {
      errors.push({ line: at, message: 'is not a section header; write "## <harness>" with nothing after the name' });
      current = SKIPPED;
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
    if (current === SKIPPED) return;
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
    if (routes.length === 0) {
      errors.push({ line: at, message: "has no route; write inherit, or delete the line" });
      return;
    }
    if (routes.length > 1 && routes.some((route) => route.inherit)) {
      errors.push({ line: at, message: "inherit cannot sit in a panel" });
      return;
    }
    const fixed = FIXED_PROVIDER[current];
    const stray = fixed === undefined ? undefined : routes.find((route) => !route.inherit && route.provider !== fixed);
    if (stray) {
      errors.push({
        line: at,
        message: 'a ' + current + ' route names no provider; write "' + fixed + ' <model>" instead of "' + stray.provider + ' ' + stray.model + '"',
        blockingHarness: current === "codex" ? current : undefined,
      });
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
  const routes = entry.routes.map((route) => ({
    provider: route.provider,
    model: route.model,
    reasoningEffort: harness === "codex" && route.reasoningEffort === "default"
      ? undefined
      : route.reasoningEffort ?? (budget === null ? undefined : budget),
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
  try {
    const contents = readFileSync(file);
    return { contents, ...parseRoles(contents.toString("utf8")) };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { contents: null, sections: new Map(), errors: [], budget: null };
  }
}

function prepareCodexSection(file, section) {
  const { contents, sections, errors } = readRoles(file);
  if (errors.length) throw new Error(errors.map(({ line, message }) => file + ":" + line + ": " + message).join("\n"));
  if (sections.has("codex")) return null;
  const parsed = parseRoles(section);
  if (parsed.errors.length) {
    throw new Error(parsed.errors.map(({ line, message }) => "proposal:" + line + ": " + message).join("\n"));
  }
  if (parsed.sections.size !== 1 || !parsed.sections.has("codex") || parsed.budget !== null) {
    throw new Error("proposal must contain only a Codex section, without a budget");
  }
  const routes = [...parsed.sections.get("codex").values()].flatMap((entry) => entry.routes).filter((route) => !route.inherit);
  if (!routes.length || routes.some((route) => !route.reasoningEffort)) {
    throw new Error("proposal needs at least one model route and an effort or default for every model route");
  }
  const previous = contents?.toString("utf8") ?? "";
  const newline = previous.match(/\r\n|\n|\r/)?.[0] ?? "\n";
  const separator = previous === "" || previous.endsWith(newline + newline) ? "" : previous.endsWith(newline) ? newline : newline + newline;
  return { contents, addition: Buffer.from(separator + section.replaceAll("\n", newline)) };
}

function appendCodexSection(file, configuredPath, current) {
  const changed = () => new Error(file + " changed during setup; run it again");
  const descriptor = openSync(file, constants.O_RDWR | constants.O_APPEND);
  try {
    const opened = fstatSync(descriptor);
    const selected = () => {
      const target = statSync(configuredPath);
      return opened.dev === target.dev && opened.ino === target.ino;
    };
    if (!readFileSync(descriptor).equals(current.contents)) throw changed();
    if (!selected()) throw changed();
    const appended = writeSync(descriptor, current.addition);
    if (appended !== current.addition.length) throw new Error(file + ": incomplete write; inspect the Codex section");
    const expected = Buffer.concat([current.contents, current.addition]);
    if (!readFileSync(file).equals(expected) || !selected()) {
      throw new Error(configuredPath + " changed during setup; inspect the Codex section");
    }
  } finally {
    closeSync(descriptor);
  }
}

function setupCodex(options) {
  const file = existsSync(options.file) ? realpathSync(options.file) : options.file;
  const section = readFileSync(0, "utf8").replace(/\r\n?/g, "\n").trim() + "\n";
  const prepared = prepareCodexSection(file, section);
  if (prepared === null) {
    console.error(file + " already has a Codex section; left untouched");
    return;
  }
  if (options.mode === "preview-codex") {
    process.stdout.write(section);
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  const lock = file + ".lock";
  mkdirSync(lock);
  try {
    const current = prepareCodexSection(file, section);
    if (current === null) {
      console.error(file + " already has a Codex section; left untouched");
      return;
    }
    if (current.contents !== null) appendCodexSection(file, options.file, current);
    else {
      const temporary = join(lock, "routes.md");
      try {
        writeFileSync(temporary, current.addition, { mode: 0o600, flag: "wx" });
        linkSync(temporary, file);
      } finally {
        rmSync(temporary, { force: true });
      }
    }
  } finally {
    rmdirSync(lock);
  }
  console.log("wrote Codex routes to " + file);
}

const MODE_FLAGS = {
  "--test": "test", "--check": "check", "--init": "init", "--list": "list",
  "--preview-codex": "preview-codex", "--setup-codex": "setup-codex",
};
const VALUE_FLAGS = {
  "--harness": (options, value) => { options.harness = value; },
  "--file": (options, value) => { options.file = value; },
  "--efforts": (options, value) => { options.efforts = value; },
  "--shift": (options, value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < -3 || parsed > 3) return "--shift takes a whole number from -3 to 3";
    options.shift = parsed;
  },
  "--route-index": (options, value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) return "--route-index takes a whole number";
    options.routeIndex = parsed;
  },
};

function parseArgs(argv) {
  const options = { key: null, mode: "route", harness: DEFAULT_HARNESS, routeIndex: 0, shift: 0, efforts: null, file: process.env.ZW_ROLES ?? DEFAULT_FILE };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (Object.hasOwn(MODE_FLAGS, arg)) {
      if (options.mode !== "route") return { error: "choose only one mode" };
      options.mode = MODE_FLAGS[arg];
    } else if (Object.hasOwn(VALUE_FLAGS, arg)) {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) return { error: arg + " needs a value" };
      const error = VALUE_FLAGS[arg](options, value);
      if (error) return { error };
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
  if (!HARNESSES.includes(options.harness)) {
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
    "feature: alias model-x",
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
    "prose: a b c",
    "## nonsense",
    "ship: skipped with its section",
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
  check("a key under an unknown section adds no second error", broken.errors.filter((e) => e.line === 3).length === 0);
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
  const strayProvider = parseRoles("## claude-code\nfeature: magpie model-x\nship: alias model-x, other model-y\nprose: inherit\n## dsh\nfeature: alias model-x\n");
  check("a claude-code route with another provider is reported", strayProvider.errors.length === 2 && strayProvider.errors[0].line === 2 && /write "alias <model>" instead of "magpie model-x"/.test(strayProvider.errors[0].message));
  check("a claude-code panel is checked route by route", strayProvider.errors[1].line === 3 && /other model-y/.test(strayProvider.errors[1].message));
  check("the fixed provider binds only its own harness", strayProvider.sections.get("dsh").has("feature") && strayProvider.sections.get("claude-code").has("prose"));
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

  for (const harness of HARNESSES) {
    const fromTemplate = parseRoles(template(harness));
    check("the " + harness + " template parses clean", fromTemplate.errors.length === 0);
    check("the " + harness + " template covers every key in its own section", fromTemplate.sections.size === 1 && KEYS.every((key) => fromTemplate.sections.get(harness).has(key)));
  }

  const merged = parseRoles("## dsh\nfeature: p1 m1\n\n## claude-code (wip)\nship: p2 m2\n\n## codex\nship: model m3\n");
  check("a malformed section header is reported once", merged.errors.length === 1 && /is not a section header/.test(merged.errors[0].message) && merged.errors[0].line === 4);
  check("keys under a malformed header join no section", !merged.sections.get("dsh").has("ship"));
  check("the next valid header resumes", merged.sections.get("codex").get("ship").routes[0].model === "m3");

  const tmp = mkdtempSync(join(tmpdir(), "role-route-"));
  const run = (...args) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { encoding: "utf8" });
  const made = join(tmp, "made.md");
  const codexFile = join(tmp, "codex.md");
  writeFileSync(codexFile, "## codex\nreview-spec: model reader, provider judge high\n\n## dsh\nfeature: primary writer high\n\n## claude-code\nfeature: alias worker low\n", "utf8");
  const invalidCodex = run("--check", "--file", codexFile);
  check("Codex refuses a separate provider even in the second panel slot", invalidCodex.status === 1 && invalidCodex.stderr.includes('codex.md:2: a codex route names no provider; write "model <model>"'));
  const legacyCodex = run("review-spec", "--harness", "codex", "--file", codexFile);
  check("a Codex lookup rejects the legacy provider with its line", legacyCodex.status === 1 && legacyCodex.stderr.includes("codex.md:2: a codex route names no provider"));
  const dshWithLegacyCodex = run("feature", "--harness", "dsh", "--file", codexFile);
  check("a legacy Codex provider does not block a DSH lookup", dshWithLegacyCodex.status === 0 && JSON.parse(dshWithLegacyCodex.stdout).model === "writer");
  const claudeWithLegacyCodex = run("--list", "--harness", "claude-code", "--file", codexFile);
  check("a legacy Codex provider does not block a Claude Code listing", claudeWithLegacyCodex.status === 0 && JSON.parse(claudeWithLegacyCodex.stdout).some((route) => route.key === "feature" && route.model === "worker"));
  writeFileSync(codexFile, "## codex\nreview-spec: model reader, model gateway/judge high\n", "utf8");
  const codexPanel = run("review-spec", "--harness", "codex", "--file", codexFile, "--route-index", "1");
  const selected = codexPanel.status === 0 && JSON.parse(codexPanel.stdout);
  check("a Codex panel keeps the full model id and selected effort", selected.model === "gateway/judge" && selected.reasoningEffort === "high" && selected.routes[0].reasoningEffort === undefined);
  check("--init writes the file", run("--init", "--harness", "claude-code", "--file", made).status === 0);
  check("--init writes the section it was asked for", /^## claude-code$/m.test(readFileSync(made, "utf8")) && !/^## dsh$/m.test(readFileSync(made, "utf8")));
  check("the file --init wrote passes --check", run("--check", "--file", made).status === 0);
  const setupFile = join(tmp, "bootstrap", "routes.md");
  const proposal = "## codex\nhow-explorer: model catalog/reader default\nreview-spec: model catalog/judge high\nindependent-verifier: inherit\n";
  const setup = (mode, file, input = proposal) => spawnSync(
    process.execPath, [fileURLToPath(import.meta.url), mode], { encoding: "utf8", input, env: { ...process.env, ZW_ROLES: file } },
  );
  const preview = setup("--preview-codex", setupFile);
  check("Codex setup previews without creating the directory", preview.status === 0 && preview.stdout === proposal && !existsSync(dirname(setupFile)));
  const saved = setup("--setup-codex", setupFile);
  const savedRoute = run("review-spec", "--harness", "codex", "--file", setupFile);
  check("a fresh setup writes the chosen model and effort", saved.status === 0 && savedRoute.status === 0 && JSON.parse(savedRoute.stdout).model === "catalog/judge" && JSON.parse(savedRoute.stdout).reasoningEffort === "high");
  const original = Buffer.from("# keep this \xe9\r\nbudget: xhigh\r\n## dsh\r\nfeature: p1 m1\r\n\r\n## claude-code\r\nfeature: alias m2", "latin1");
  const shared = join(tmp, "shared.md");
  writeFileSync(shared, original, { mode: 0o640 });
  const originalMode = statSync(shared).mode;
  const mergedSetup = setup("--setup-codex", shared);
  const combined = Buffer.concat([original, Buffer.from("\r\n\r\n" + proposal.replaceAll("\n", "\r\n"))]);
  check("setup adds only the Codex section and preserves non-UTF-8 comments and mode", mergedSetup.status === 0 && readFileSync(shared).equals(combined) && statSync(shared).mode === originalMode && run("--check", "--file", shared).status === 0);
  const modelOnly = run("how-explorer", "--harness", "codex", "--file", shared);
  check("default selects the Codex model without sending the shared effort", modelOnly.status === 0 && JSON.parse(modelOnly.stdout).model === "catalog/reader" && JSON.parse(modelOnly.stdout).reasoningEffort === undefined);
  check("repeating setup preserves the saved routes", setup("--setup-codex", shared, proposal.replace("catalog/judge", "catalog/other")).status === 0 && readFileSync(shared).equals(combined));
  const linked = join(tmp, "linked.md");
  writeFileSync(shared, original);
  symlinkSync(shared, linked, "file");
  check("setup keeps a symlink and updates its target", setup("--setup-codex", linked).status === 0 && realpathSync(linked) === realpathSync(shared) && readFileSync(shared).equals(combined));
  const unsafePreview = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--preview-codex", "--setup-codex", "--file", made], { encoding: "utf8", input: proposal });
  check("conflicting modes fail before writing", unsafePreview.status === 2 && unsafePreview.stderr.includes("choose only one mode") && !/^## codex$/m.test(readFileSync(made, "utf8")));
  for (const invalid of [proposal.replace(" high", ""), "budget: low\n" + proposal, proposal + "## dsh\nfeature: p1 m1\n", "## codex\nfeature: inherit\n"]) {
    check("setup rejects an unusable or non-Codex proposal", setup("--setup-codex", made, invalid).status === 1 && !/^## codex$/m.test(readFileSync(made, "utf8")));
  }
  writeFileSync(shared, "## codex\nreview-spec: inherit\n", "utf8");
  check("presence of an explicit inherit prevents first-run setup", setup("--setup-codex", shared).status === 0 && readFileSync(shared, "utf8") === "## codex\nreview-spec: inherit\n");
  writeFileSync(join(tmp, "merged.md"), "## dsh\nfeature: p1 m1\n\n## claude-code (wip)\nship: p2 m2\n", "utf8");
  const checked = run("--check", "--file", join(tmp, "merged.md"));
  check("--check fails a malformed header with its line", checked.status === 1 && checked.stderr.includes("merged.md:4: is not a section header"));
  for (const flag of ["--harness", "--file", "--efforts", "--shift", "--route-index"]) {
    const bare = run("feature", "--file", made, flag);
    check(flag + " with no value is a usage error", bare.status === 2 && bare.stderr.includes(flag + " needs a value") && !bare.stderr.includes("node:"));
  }
  const refused = [
    [["feature", "--shift", "9", "--efforts", "low,high"], "--shift takes a whole number from -3 to 3"],
    [["feature", "--route-index", "-1"], "--route-index takes a whole number"],
    [["feature", "--nope"], "unknown flag --nope"],
    [["feature", "ship"], "unexpected argument ship"],
    [[], "a key is required"],
    [["wibble"], 'unknown key "wibble"; expected one of feature, bug-fix, '],
    [["feature", "--shift", "1"], "--shift needs --efforts"],
    [["feature", "--shift", "1", "--efforts", "high"], "--efforts needs at least two effort ids"],
    [["feature", "--harness", "nonsense"], 'unknown harness "nonsense"; expected one of dsh, claude-code, codex'],
    [["feature", "--file", "--check"], "--file needs a value"],
  ];
  for (const [args, reason] of refused) {
    const result = run(...args, ...(args.includes("--file") ? [] : ["--file", made]));
    check("exit 2 with a reason for: " + args.join(" "), result.status === 2 && result.stderr.includes("role-route: " + reason) && result.stdout === "");
  }
  check("a line that is neither a key nor a section is reported", parseRoles("## dsh\n???\n").errors.some((e) => /is not a key line/.test(e.message) && e.line === 2));
  for (const mode of [["feature"], ["--list"]]) {
    const malformed = run(...mode, "--file", join(tmp, "merged.md"));
    check("a malformed table stops " + mode[0] + " with exit 1 and the line", malformed.status === 1 && malformed.stderr.includes("merged.md:4: is not a section header") && malformed.stdout === "");
  }
  const routed = join(tmp, "routed.md");
  writeFileSync(routed, "budget: high\n\n## dsh\nfeature: p1 m1\n", "utf8");
  const up = run("feature", "--file", routed, "--efforts", "low,high,xhigh", "--shift", "1");
  check("a shift along the ladder prints the moved effort", up.status === 0 && JSON.parse(up.stdout).reasoningEffort === "xhigh");
  const off = run("feature", "--file", routed, "--efforts", "low,medium", "--shift", "1");
  check("an effort off the ladder exits 2 with the ladder", off.status === 2 && off.stderr.includes('role-route: effort "high" is not on the ladder low,medium') && off.stdout === "");
  rmSync(tmp, { recursive: true, force: true });

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

  if (options.mode === "preview-codex" || options.mode === "setup-codex") {
    try {
      setupCodex(options);
    } catch (error) {
      console.error("role-route: " + error.message);
      process.exitCode = 1;
    }
    return;
  }

  if (options.mode === "init") {
    if (existsSync(options.file)) {
      console.log(options.file + " already exists; left untouched");
      return;
    }
    mkdirSync(dirname(options.file), { recursive: true });
    writeFileSync(options.file, template(options.harness), "utf8");
    console.log("wrote " + options.file);
    return;
  }

  const { sections, errors: tableErrors, budget } = readRoles(options.file);
  const errors = options.mode === "check"
    ? tableErrors
    : tableErrors.filter((error) => error.blockingHarness === undefined || error.blockingHarness === options.harness);

  for (const error of errors) console.error(options.file + ":" + error.line + ": " + error.message);
  if (errors.length) process.exit(1);
  if (options.mode === "check") {
    console.log(sectionSummary(sections, budget) + " in " + options.file);
    return;
  }
  if (options.mode === "list") {
    console.log(JSON.stringify(KEYS.map((key) => resolveRoute(sections, key, options.harness, options.file, options.routeIndex, budget)), null, 2));
    return;
  }
  const resolved = resolveRoute(sections, options.key, options.harness, options.file, options.routeIndex, budget);
  const shifted = shiftRoute(resolved, options.shift, options.effortLadder);
  if (shifted.error !== undefined) {
    console.error("role-route: " + shifted.error);
    process.exit(2);
  }
  console.log(JSON.stringify(shifted, null, 2));
}

main();
