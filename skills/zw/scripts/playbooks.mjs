#!/usr/bin/env node
/**
 * playbooks.mjs - resolve which playbook wins for one repo.
 *
 * Usage:
 *   node playbooks.mjs --list [--repo <path>] [--user <path>]
 *   node playbooks.mjs <name> [--repo <path>] [--user <path>]
 *   node playbooks.mjs --test
 *
 * A playbook is a markdown file, and whatever it says is the route. There is no
 * schema to satisfy: a step that names a zw- skill hands off to that skill, and a
 * step that names none is carried out directly.
 *
 * Three layers, nearest wins, matched by file name:
 *   <repo>/.agents/zw-playbooks/<name>.md
 *   ~/.agents/zw-playbooks/<name>.md
 *   <zw-skill>/playbooks/<name>.md    the routes z-workflow recommends
 *
 * Exit 0 on success, 2 when no route matches the name, 1 when a directory cannot
 * be read.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILTIN_DIR = join(HERE, "..", "playbooks");
const PROJECT_DIR = join(".agents", "zw-playbooks");
const USER_DIR = join(homedir(), ".agents", "zw-playbooks");

function readLayer(dir, source) {
  const found = new Map();
  if (!existsSync(dir)) return found;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    throw new Error("cannot read " + dir + ": " + error.message);
  }
  if (!statSync(dir).isDirectory()) return found;
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".md")) continue;
    const file = join(dir, entry);
    if (!statSync(file).isFile()) continue;
    found.set(entry.slice(0, -3), { name: entry.slice(0, -3), source, file });
  }
  return found;
}

function layers(repoRoot, userDir) {
  return [
    { source: "project", dir: join(repoRoot, PROJECT_DIR) },
    { source: "user", dir: userDir },
    { source: "builtin", dir: BUILTIN_DIR },
  ];
}

function resolveRoutes(repoRoot, userDir) {
  const order = layers(repoRoot, userDir);
  const byName = new Map();
  const shadowed = new Map();
  for (const layer of order) {
    for (const [name, entry] of readLayer(layer.dir, layer.source)) {
      if (byName.has(name)) {
        const covered = shadowed.get(name) === undefined ? [] : shadowed.get(name);
        covered.push(layer.source);
        shadowed.set(name, covered);
        continue;
      }
      byName.set(name, entry);
    }
  }
  const list = [...byName.values()]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((entry) => ({ ...entry, shadows: shadowed.get(entry.name) === undefined ? [] : shadowed.get(entry.name) }));
  return { list, order };
}

function parseArgs(argv) {
  const options = { mode: "list", name: null, repo: process.cwd(), user: USER_DIR };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--test") options.mode = "test";
    else if (arg === "--list") options.mode = "list";
    else if (arg === "--repo" || arg === "--user") {
      const value = argv[++i];
      if (value === undefined || value.startsWith("-")) return { error: arg + " needs a path" };
      if (arg === "--repo") options.repo = value;
      else options.user = value;
    } else if (arg.startsWith("-")) return { error: "unknown flag " + arg };
    else if (options.name === null) { options.name = arg; options.mode = "route"; }
    else return { error: "unexpected argument " + arg };
  }
  return options;
}

function selfTest() {
  const failures = [];
  const check = (label, ok) => { if (!ok) failures.push(label); };

  const builtin = resolveRoutes(join(tmpdir(), "no-such-repo"), join(tmpdir(), "no-such-user"));
  check("the shipped routes are the five shapes", ["bug-fix", "feature", "investigation", "refactor", "ship"].every((name) => builtin.list.some((entry) => entry.name === name)));
  check("a route that matches nothing is not invented", builtin.list.every((entry) => entry.source === "builtin"));

  const tmp = mkdtempSync(join(tmpdir(), "playbooks-"));
  const repo = join(tmp, "repo");
  const user = join(tmp, "user");
  const put = (dir, name, body) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), body, "utf8");
  };
  put(join(repo, PROJECT_DIR), "spike.md", "# Spike\n\n1. do the thing\n");
  put(join(repo, PROJECT_DIR), "feature.md", "# Feature, this repo's way\n\n1. do it our way\n");
  put(join(repo, PROJECT_DIR), "notes.txt", "not a playbook\n");
  put(user, "feature.md", "# Feature, my way\n\n1. do it my way\n");
  put(user, "release.md", "# Release\n\n1. cut it\n");

  const routes = resolveRoutes(repo, user);
  const at = (name) => routes.list.filter((entry) => entry.name === name)[0];
  check("a project route wins over the user layer", at("feature").source === "project");
  check("the shadowed layers are reported", at("feature").shadows.includes("user") && at("feature").shadows.includes("builtin"));
  check("a user route wins over the built-in", at("release").source === "user");
  check("a new project route is added", at("spike").source === "project");
  check("a built-in with nothing over it stays builtin", at("ship").source === "builtin");
  check("non markdown files are ignored", routes.list.every((entry) => entry.name !== "notes"));
  check("the winning file is the one read", /our way/.test(readFileSync(at("feature").file, "utf8")));
  check("the built-in is still readable underneath", existsSync(join(BUILTIN_DIR, "feature.md")));

  for (const entry of routes.list) check("every route resolves to a file: " + entry.name, existsSync(entry.file));
  check("the order is nearest first", JSON.stringify(routes.order.map((layer) => layer.source)) === JSON.stringify(["project", "user", "builtin"]));

  rmSync(tmp, { recursive: true, force: true });
  console.log("playbooks --test: builtin=" + builtin.list.length + " fixtures=" + (failures.length === 0 ? "ok" : "FAIL"));
  if (failures.length) {
    for (const failure of failures) console.error("playbooks --test FAIL: " + failure);
    return false;
  }
  console.log("playbooks --test: all ok");
  return true;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.error !== undefined) {
    console.error("playbooks: " + options.error);
    process.exit(2);
  }
  if (options.mode === "test") process.exit(selfTest() ? 0 : 1);

  let routes;
  try {
    routes = resolveRoutes(resolve(options.repo), resolve(options.user));
  } catch (error) {
    console.error("playbooks: " + error.message);
    process.exit(1);
  }
  if (options.mode === "list") {
    console.log(JSON.stringify(routes.list.map((entry) => ({ name: entry.name, source: entry.source, shadows: entry.shadows, file: entry.file })), null, 2));
    return;
  }
  const found = routes.list.filter((entry) => entry.name === options.name);
  if (found.length === 0) {
    console.error("playbooks: no route named " + options.name + "; in effect: " + routes.list.map((entry) => entry.name).join(", "));
    process.exit(2);
  }
  console.log(JSON.stringify({ name: found[0].name, source: found[0].source, shadows: found[0].shadows, file: found[0].file, content: readFileSync(found[0].file, "utf8") }, null, 2));
}

main();
