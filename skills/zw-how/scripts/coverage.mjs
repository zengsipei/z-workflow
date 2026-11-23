#!/usr/bin/env node
/**
 * coverage.mjs: print which subsystem units an implemented Agent Note claims.
 *
 * Usage:
 *   node <zw-how>/scripts/coverage.mjs <repoRoot> [--units <glob>]...
 *   node <zw-how>/scripts/coverage.mjs --test
 *
 * Prints four blocks plus one adoption hint, and exits 0 whatever they say.
 * It is a hint, not a gate: a note written with the upstream skill directly
 * carries no Scope section, and that is not a failure. Nothing is stored, so
 * no shared index file exists for two branches to edit at once.
 *
 * A unit pattern is matched segment by segment, and * matches one directory
 * level. Only directories that exist today count as units.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_UNITS = ["packages/*", "apps/*", "services/*"];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "target", "vendor"]);
const NOTES_ROOT = join(".agents", "notes");
const ID_RE = /^[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)*$/;

function parseArgs(argv) {
  const out = { repoRoot: null, units: [], test: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--test") { out.test = true; continue; }
    if (arg === "--units") { const value = argv[++i]; if (value) out.units.push(value); continue; }
    if (arg.startsWith("--units=")) { out.units.push(arg.slice(8)); continue; }
    if (arg.startsWith("-")) throw new Error("unknown flag: " + arg);
    if (out.repoRoot) throw new Error("unexpected argument: " + arg);
    out.repoRoot = arg;
  }
  return out;
}

function usage() {
  console.error("Usage: node <zw-how>/scripts/coverage.mjs <repoRoot> [--units <glob>]...");
  console.error("       node <zw-how>/scripts/coverage.mjs --test");
}

/** Mask fenced code and HTML comments the way the notes checkers do. */
function maskLines(raw) {
  const lines = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const prose = new Array(lines.length).fill(true);
  let fence = false;
  let comment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (comment) {
      prose[i] = false;
      if (line.includes("-->")) comment = false;
      continue;
    }
    if (fence) {
      prose[i] = false;
      if (/^\s{0,3}\x60\x60\x60/.test(line)) fence = false;
      continue;
    }
    if (/^\s{0,3}\x60\x60\x60/.test(line)) { prose[i] = false; fence = true; continue; }
    if (line.includes("<!--")) {
      prose[i] = false;
      if (!line.includes("-->")) comment = true;
    }
  }
  return { lines, prose };
}

function scopeEntries(raw) {
  const { lines, prose } = maskLines(raw);
  const entries = [];
  let inScope = false;
  for (let i = 0; i < lines.length; i++) {
    if (!prose[i]) continue;
    const line = lines[i];
    if (/^##\s/.test(line)) { inScope = /^##\s+scope\s*$/i.test(line.trim()); continue; }
    if (!inScope) continue;
    let text = line.trim().replace(/^[-*]\s+/, "").replace(/^`|`$/g, "").trim();
    if (!text) continue;
    entries.push({ text, valid: ID_RE.test(text) });
  }
  return entries;
}

function listUnits(repoRoot, patterns) {
  const found = new Set();
  for (const pattern of patterns) {
    let level = [""];
    for (const segment of pattern.split("/").filter(Boolean)) {
      const next = [];
      for (const rel of level) {
        let entries;
        try { entries = readdirSync(join(repoRoot, rel), { withFileTypes: true }); } catch { continue; }
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
          if (segment !== "*" && segment !== entry.name) continue;
          next.push(rel ? rel + "/" + entry.name : entry.name);
        }
      }
      level = next;
    }
    for (const rel of level) found.add(rel);
  }
  return [...found].sort();
}

function walkNotes(dir, prefix, out) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const rel = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isDirectory()) walkNotes(join(dir, entry.name), rel, out);
    else if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.endsWith(".zh.md")) out.push(rel);
  }
  return out;
}

function gitOwner(repoRoot, rel) {
  try {
    const out = execFileSync("git", ["log", "-1", "--date=short", "--format=%an%x09%ad", "--", rel], {
      cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!out) return null;
    const [author, date] = out.split("\t");
    return { author: author || "unknown", date: date || "" };
  } catch {
    return null;
  }
}

function buildReport(repoRoot, patterns) {
  const units = listUnits(repoRoot, patterns);
  const notesRoot = join(repoRoot, NOTES_ROOT);
  const noteRels = walkNotes(join(notesRoot, "implemented"), "implemented", []);
  const claimed = [];
  const scopeAbsent = [];
  const problems = [];
  const byId = new Map();

  for (const rel of noteRels) {
    const entries = scopeEntries(readFileSync(join(notesRoot, rel), "utf8"));
    if (entries.length === 0) scopeAbsent.push(rel);
    const owner = gitOwner(repoRoot, join(NOTES_ROOT, rel));
    for (const entry of entries) {
      if (!entry.valid) { problems.push({ kind: "not a path", id: entry.text, note: rel }); continue; }
      const abs = join(repoRoot, entry.text);
      const exists = existsSync(abs) && statSync(abs).isDirectory();
      if (!exists) { problems.push({ kind: "no such directory", id: entry.text, note: rel }); continue; }
      claimed.push({ id: entry.text, note: rel, owner });
      byId.set(entry.text, (byId.get(entry.text) || 0) + 1);
    }
  }

  claimed.sort((a, b) => a.id.localeCompare(b.id) || a.note.localeCompare(b.note));
  problems.sort((a, b) => a.note.localeCompare(b.note) || a.id.localeCompare(b.id));
  const claimedIds = new Set(claimed.map((item) => item.id));
  const unclaimed = units.filter((unit) => !claimedIds.has(unit));
  return { repoRoot, patterns, units, noteCount: noteRels.length, unclaimed, claimed, scopeAbsent, problems, byId };
}

function adoptionHint(report) {
  const ids = report.claimed.length;
  if (report.noteCount === 0) return "no implemented notes yet: write 3 to 5 real ones before reading the unclaimed list as a gap";
  if (ids === 0) return report.noteCount + " implemented note(s) and no claimed id: add a Scope section to the ones that map to a directory";
  if (ids < 3) return ids + " claimed id(s): re-check that the unit patterns match this repo's real shape, and pin the ones that do";
  if (report.scopeAbsent.length > report.noteCount / 2) return "most notes have no Scope section, so unclaimed overstates the gap: treat it as a hint only";
  return "report is populated: re-run after a subsystem is explained twice, not on a schedule";
}

function printReport(repoRoot, patterns) {
  const report = buildReport(repoRoot, patterns);
  console.log("coverage: " + repoRoot);
  console.log("units: " + report.units.length + " candidate(s) from " + patterns.join(", "));
  console.log("notes: " + report.noteCount + " implemented note(s)");
  console.log("");

  console.log("Unclaimed (" + report.unclaimed.length + ")");
  for (const unit of report.unclaimed) console.log("  " + unit);
  if (report.unclaimed.length === 0) console.log("  (none)");
  console.log("");

  console.log("Claimed (" + report.claimed.length + ")");
  for (const item of report.claimed) {
    const owner = item.owner ? item.owner.author + " " + item.owner.date : "-";
    const shared = (report.byId.get(item.id) || 0) > 1 ? "  (shared id)" : "";
    console.log("  " + item.id + "  " + item.note + "  " + owner.trim() + shared);
  }
  if (report.claimed.length === 0) console.log("  (none)");
  console.log("");

  console.log("Scope absent (" + report.scopeAbsent.length + ")");
  for (const note of report.scopeAbsent) console.log("  " + note);
  if (report.scopeAbsent.length === 0) console.log("  (none)");
  console.log("");

  console.log("Scope problems (" + report.problems.length + ")");
  for (const problem of report.problems) console.log("  " + problem.id + "  (" + problem.kind + ")  " + problem.note);
  if (report.problems.length === 0) console.log("  (none)");
  console.log("");
  console.log("adoption: " + adoptionHint(report));
  return report;
}

const NOTE_HEAD = "# Agent Note: %TITLE%\n\nStatus: implemented\n\n## Problem\n\nP\n\n## Decision\n\nD\n";

function noteWith(title, scopeLines) {
  const scope = scopeLines.length ? "\n## Scope\n\n" + scopeLines.join("\n") + "\n" : "";
  return NOTE_HEAD.replace("%TITLE%", title) + scope + "\n## Alternatives considered\n\n- none\n";
}

function selfTest() {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const root = mkdtempSync(join(tmpdir(), "zw-how-coverage-"));
  const put = (rel, body) => {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body, "utf8");
  };
  try {
    for (const dir of ["packages/alpha", "packages/beta", "services/api", "packages/node_modules/dep", "apps/dist"]) put(dir + "/keep.txt", "x\n");
    put(".agents/notes/implemented/architecture/2026-01-01-alpha.md", noteWith("Alpha", [
      "packages/alpha",
      "packages/ghost",
      "the alpha thing",
      "packages/alpha/keep.txt",
      "\x60\x60\x60text",
      "packages/beta",
      "\x60\x60\x60",
      "<!--",
      "services/api",
      "-->",
      "<!-- a one-line comment -->",
    ]));
    put(".agents/notes/implemented/architecture/2026-01-03-alpha-followup.md", noteWith("Alpha followup", ["packages/alpha"]));
    put(".agents/notes/implemented/feature/2026-01-02-beta.md", noteWith("Beta", []));
    put(".agents/notes/implemented/feature/2026-01-02-beta.zh.md", "# Agent Note: Beta zh\n\nStatus: implemented\n");

    const report = buildReport(root, DEFAULT_UNITS);
    check(report.units.includes("packages/alpha") && report.units.includes("packages/beta"), "default patterns should find packages/*");
    check(report.units.includes("services/api"), "default patterns should find services/*");
    check(report.units.join(",") === "packages/alpha,packages/beta,services/api", "build output and dependency directories are not units, got " + report.units.join(","));
    check(report.problems.some((p) => p.kind === "no such directory" && p.id === "packages/alpha/keep.txt"), "a Scope id naming a file is a problem, not a claim");
    check(!report.claimed.some((item) => item.id === "packages/alpha/keep.txt"), "a file is never claimed");
    check(!report.problems.some((p) => p.id.includes("<!--")), "a comment inside Scope is skipped, not reported as a bad id");
    check(report.noteCount === 3, "a .zh.md note must be skipped, got " + report.noteCount + " note(s)");
    check(report.unclaimed.join(",") === "packages/beta,services/api", "unclaimed should be packages/beta then services/api, got " + report.unclaimed.join(","));
    check(report.claimed.some((item) => item.id === "packages/alpha"), "packages/alpha should be claimed");
    check(report.byId.get("packages/alpha") === 2, "a shared id should count twice, got " + report.byId.get("packages/alpha"));
    check(report.claimed.every((item) => item.owner === null), "a repo without git should report no owner");
    check(report.scopeAbsent.length === 1 && report.scopeAbsent[0].endsWith("2026-01-02-beta.md"), "one note should be scope absent, got " + report.scopeAbsent.join(","));
    check(report.problems.some((p) => p.kind === "no such directory" && p.id === "packages/ghost"), "a stale id should be a problem");
    check(report.problems.some((p) => p.kind === "not a path" && p.id === "the alpha thing"), "prose in Scope should be a problem");

    const override = buildReport(root, ["services/*"]);
    check(override.units.length === 1 && override.units[0] === "services/api", "--units should replace the defaults, got " + override.units.join(","));
    check(override.unclaimed.length === 1 && override.unclaimed[0] === "services/api", "services/api should be unclaimed under the override");

    const run = (...args) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { encoding: "utf8" });
    const spaced = run(root, "--units", "services/*");
    check(spaced.status === 0 && spaced.stdout.includes(" from services/*\n") && spaced.stdout.includes("\nUnclaimed (1)\n  services/api\n"), "--units <glob> should replace the default patterns on the command line");
    const joined = run(root, "--units=services/*", "--units", "packages/*");
    check(joined.status === 0 && joined.stdout.includes(" from services/*, packages/*\n"), "--units=<glob> and a repeated --units should both be read");
    const refused = [[[], "Usage: "], [[root, "--nope"], "unknown flag: --nope"], [[root, root], "unexpected argument: "], [[join(root, "absent")], "absent: not a directory"]];
    for (const [args, reason] of refused) {
      const result = run(...args);
      check(result.status === 2 && result.stderr.includes(reason) && result.stdout === "", "exit 2 with a reason for: " + JSON.stringify(args.map((arg) => arg.replace(root, "<root>"))));
    }

    const empty = mkdtempSync(join(tmpdir(), "zw-how-coverage-empty-"));
    try {
      const none = buildReport(empty, DEFAULT_UNITS);
      check(none.units.length === 0 && none.noteCount === 0, "an empty repo should report nothing");
      check(adoptionHint(none).startsWith("no implemented notes yet"), "an empty repo should get the first-note hint");
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  if (failures.length) {
    for (const failure of failures) console.error("coverage --test FAIL: " + failure);
    return false;
  }
  console.log("coverage --test: all ok");
  return true;
}

function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (error) {
    console.error(error.message);
    usage();
    process.exit(2);
  }
  if (args.test) process.exit(selfTest() ? 0 : 1);
  if (!args.repoRoot) { usage(); process.exit(2); }
  const repoRoot = resolve(args.repoRoot);
  if (!existsSync(repoRoot) || !statSync(repoRoot).isDirectory()) {
    console.error(repoRoot + ": not a directory");
    process.exit(2);
  }
  printReport(repoRoot, args.units.length ? args.units : DEFAULT_UNITS);
}

main();
