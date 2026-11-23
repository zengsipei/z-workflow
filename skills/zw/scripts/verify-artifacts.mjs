#!/usr/bin/env node
/**
 * verify-artifacts.mjs - zero-dependency draft artifact checker.
 *
 * Usage:
 *   node <zw-skill>/scripts/verify-artifacts.mjs <repoRoot>
 *   node <zw-skill>/scripts/verify-artifacts.mjs --test
 *
 * Exit 0 on pass. On failure every problem prints as "<file>: <problem>"
 * and the exit code is non-zero.
 *
 * Known limitations:
 * - Only .scratch/<feature>/spec.md and .scratch/<feature>/tickets/NN-<slug>.md
 *   are checked; other .scratch entries are ignored.
 * - Path detection is line based. URLs are removed first, and common
 *   tracker routes are allowed; a bare word with a slash and a file
 *   extension counts as a path. An HTTP route passes when its method comes
 *   first, as in GET /items, in the same code span, the one before it, or the
 *   table cell before it. A vendor media type such as
 *   application/vnd.api+json is not a path.
 * - A bare :3000 reads as a line number. Write the host with it, as in
 *   localhost:3000, or the word port.
 * - Spec-to-ticket links are checked only when a feature has both a spec.md
 *   and local ticket files; a spec may reference a ticket by its NN-<slug>
 *   token or by a relative Markdown link. Every sibling ticket counts,
 *   decision tickets included.
 * - Ticket numbers are unique, not contiguous. A deleted ticket leaves a
 *   gap, and dependency order is what the Blocked by check proves.
 * - A local Blocked by line lists ticket numbers or NN-<slug> tokens, with
 *   optional titles. Every blocker must exist and have a lower number. The
 *   line may be a list item, bulleted, numbered or a task box, and its label
 *   may be bold or in backticks. A "## Blocked by" section, the tracker issue
 *   shape, is not read: a local ticket states its blockers on one line.
 *   Older drafts with no Blocked by line remain valid.
 * - Features and tickets are read in name order, so the output is the same
 *   on every filesystem.
 */
import { spawnSync } from "node:child_process";
import { existsSync, statSync, readdirSync, readFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SPEC_HEADINGS = ["Problem Statement", "Solution", "User Stories", "Implementation Decisions", "Testing Decisions", "Out of Scope", "Further Notes"];

function maskSource(raw) {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const fenced = new Array(lines.length).fill(false);
  const commented = new Array(lines.length).fill(false);
  let inFence = false;
  let inComment = false;
  const fenceRe = new RegExp("^\\s{0,3}\x60\x60\x60");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    fenced[i] = inFence;
    commented[i] = inComment;
    if (!inComment && fenceRe.test(line)) {
      fenced[i] = true;
      inFence = !inFence;
    } else if (inFence) {
      fenced[i] = true;
    }
    if (inFence) continue;
    const openIdx = inComment ? -1 : line.indexOf("<!--");
    const closeIdx = line.indexOf("-->");
    if (inComment) {
      commented[i] = true;
      if (closeIdx !== -1) inComment = false;
    } else if (openIdx !== -1) {
      commented[i] = true;
      if (closeIdx === -1 || closeIdx < openIdx) inComment = true;
    }
  }
  return { lines, fenced, commented };
}

function isProseLine(src, i) {
  return !(src.fenced[i] || src.commented[i]);
}

function headingBase(heading) {
  return heading.replace(/[（(].*$/, "").trimEnd();
}

const TRAILING_DOTS = /\.+$/;
const HTTP_METHOD_BEFORE = /\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)[\x60"']?(?:\s+|\s*\|\s*)[\x60"']?$/;
const VENDOR_MEDIA_TYPE = /^(?:application|audio|font|image|message|model|multipart|text|video)\/vnd\./;

function blankHtmlCommentsInPlace(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, " "));
}

function isTrackerPath(token) {
  return /^\/[\w.-]+\/[\w.-]+\/(?:issues|pull|pulls|milestones|projects|merge_requests)\/\d+$/i.test(token);
}

function describeViolation(v) {
  const hint = v.kind === "path" && v.token.startsWith("/") ? " (an HTTP route is written with its method, as in GET /items)" : "";
  return v.token + " looks like a " + v.kind + hint;
}

function pathViolations(text, allowedTargets, baseDir) {
  const out = [];
  const lines = blankHtmlCommentsInPlace(text).split(/\r\n?|\n/);
  const seen = new Set();
  const push = (line, token, kind) => {
    const key = line + "|" + token + "|" + kind;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ line, token, kind });
  };
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    let cleaned = lines[i].replace(/https?:\/\/[^\s"'<>()]+/g, " ");
    if (allowedTargets && allowedTargets.size > 0 && baseDir) {
      cleaned = cleaned.replace(/\[[^\]]*\]\(([^)]+)\)/g, (whole, targetRaw) => {
        let target = targetRaw.trim().split("#")[0];
        if (!target) return whole;
        if (/^(?:https?:|mailto:)/i.test(target)) return whole;
        if (allowedTargets.has(resolve(baseDir, target))) return whole.replace(targetRaw, "");
        return whole;
      });
    }
    for (const m of cleaned.matchAll(/(?:^|[\s"'(\[\x60])(\/[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)+)/g)) {
      const token = m[1].replace(TRAILING_DOTS, "");
      const before = cleaned.slice(0, m.index + m[0].length - m[1].length);
      if (isTrackerPath(token) || HTTP_METHOD_BEFORE.test(before)) continue;
      push(lineNo, token, "path");
    }
    for (const m of cleaned.matchAll(/(?:^|[\s"'(\[\x60])([A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)+\.\w{1,8})/g)) {
      if (!VENDOR_MEDIA_TYPE.test(m[1])) push(lineNo, m[1], "path");
    }
    for (const m of cleaned.matchAll(/(?:^|[\s"'(\[\x60])(\.{1,2}\/[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)*)/g)) {
      push(lineNo, m[1].replace(TRAILING_DOTS, ""), "path");
    }
    for (const m of cleaned.matchAll(/(?:^|[\s"'(\[\x60]):\d+\b/g)) {
      push(lineNo, m[0].trim(), "line number");
    }
  }
  return out;
}

function referencesTicket(specRaw, specPath, ticket) {
  const token = ticket.prefix + "-" + ticket.slug;
  if (specRaw.includes(token)) return true;
  const specDir = dirname(specPath);
  for (const m of specRaw.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = m[1].trim();
    if (!target) continue;
    if (/^(?:https?:|mailto:)/i.test(target)) continue;
    target = target.split("#")[0];
    if (!target) continue;
    if (resolve(specDir, target) === ticket.path) return true;
  }
  return false;
}

function readDraft(rel, absPath, errors) {
  try {
    return readFileSync(absPath, "utf8");
  } catch (err) {
    errors.push(rel + ": unreadable (" + (err.code || err.message) + ")");
    return null;
  }
}

function checkSpec(rel, absPath, tickets, errors) {
  const raw = readDraft(rel, absPath, errors);
  if (raw === null) return;
  const src = maskSource(raw);
  const proseIdx = [];
  for (let i = 0; i < src.lines.length; i++) if (isProseLine(src, i)) proseIdx.push(i);
  const bases = proseIdx
    .map((i) => src.lines[i])
    .filter((l) => l.startsWith("## "))
    .map((l) => headingBase(l.trimEnd()));
  for (const heading of SPEC_HEADINGS) {
    if (!bases.includes("## " + heading)) errors.push(rel + ": missing required section ## " + heading);
  }
  const allowed = new Set(tickets.map((t) => t.path));
  for (const v of pathViolations(raw, allowed, dirname(absPath))) {
    errors.push(rel + ":" + v.line + ": " + describeViolation(v));
  }
  for (const t of tickets) {
    if (!referencesTicket(raw, absPath, t)) {
      errors.push(rel + ": does not reference ticket " + t.prefix + "-" + t.slug + " (name it on the spec's Tickets line by its NN-<slug> token, or link it)");
    }
  }
}

function ticketBlockers(raw, ticket, errors) {
  const src = maskSource(raw);
  const blockers = [];
  let fieldSeen = false;
  for (let i = 0; i < src.lines.length; i++) {
    if (!isProseLine(src, i)) continue;
    const field = /^\s*(?:(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)?`?Blocked by:`?\s*(.*)$/i.exec(src.lines[i].replaceAll("**", ""));
    if (!field) continue;
    const where = ticket.rel + ":" + (i + 1);
    if (fieldSeen) { errors.push(where + ": duplicate Blocked by line"); continue; }
    fieldSeen = true;
    const value = field[1].trim();
    if (/^None(?:\s*\([^)]*\))?[.]?$/i.test(value)) continue;
    const entries = [];
    let depth = 0;
    let start = 0;
    for (let j = 0; j < value.length; j++) {
      if (value[j] === "(") depth++;
      else if (value[j] === ")") depth--;
      if (depth < 0) break;
      if (depth !== 0) continue;
      const separator = /^(?:[,;]|\s+and\s+(?=[`#]?\d))/i.exec(value.slice(j));
      if (!separator) continue;
      entries.push(value.slice(start, j));
      j += separator[0].length - 1;
      start = j + 1;
    }
    if (depth !== 0) { errors.push(where + ": invalid Blocked by entry: unbalanced title parentheses"); continue; }
    entries.push(value.slice(start));
    for (const entry of entries) {
      const prefix = /^(?:`([^`]+)`|([^\s(]+))(?=$|\s|\()/.exec(entry.trim());
      const token = (prefix?.[1] ?? prefix?.[2] ?? "").replace(/[:.]$/, "");
      const ref = /^#?(\d+)(?:-(.+))?$/.exec(token);
      if (!ref || !Number.isSafeInteger(Number(ref[1])) || Number(ref[1]) < 1) {
        errors.push(where + ": invalid Blocked by entry " + JSON.stringify(entry.trim()) + "; expected a ticket number or NN-<slug>");
        continue;
      }
      blockers.push({ num: Number(ref[1]), slug: ref[2], token, line: i + 1 });
    }
  }
  return blockers;
}

function sortedEntries(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function checkTickets(featureRel, ticketsDir, errors) {
  const tickets = [];
  for (const entry of sortedEntries(ticketsDir)) {
    if (entry.name.startsWith(".")) continue;
    const rel = featureRel + "/tickets/" + entry.name;
    if (entry.isDirectory()) {
      errors.push(rel + ": unexpected directory inside tickets");
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const m = /^(\d+)-(.+)\.md$/.exec(entry.name);
    if (!m || !m[2]) {
      errors.push(rel + ": ticket filename must be NN-<slug>.md");
      continue;
    }
    const num = Number(m[1]);
    if (!Number.isSafeInteger(num) || num < 1) {
      errors.push(rel + ": ticket number must be a positive integer");
      continue;
    }
    tickets.push({ num, prefix: m[1], slug: m[2], rel, path: join(ticketsDir, entry.name) });
  }

  const seen = new Set();
  for (const t of tickets) {
    if (seen.has(t.num)) errors.push(t.rel + ": duplicate ticket number " + t.num);
    seen.add(t.num);
  }
  const byNum = new Map();
  for (const t of tickets) byNum.set(t.num, t);

  for (const t of tickets) {
    const raw = readDraft(t.rel, t.path, errors);
    if (raw === null) continue;
    for (const v of pathViolations(raw)) {
      errors.push(t.rel + ":" + v.line + ": " + describeViolation(v));
    }
    for (const blocker of ticketBlockers(raw, t, errors)) {
      const dependency = byNum.get(blocker.num);
      const where = t.rel + ":" + blocker.line;
      if (!dependency) {
        errors.push(where + ": Blocked by references missing ticket " + blocker.token);
      } else if (blocker.slug && blocker.slug !== dependency.slug) {
        errors.push(where + ": Blocked by names " + blocker.token + ", but ticket " + dependency.prefix + " is " + dependency.prefix + "-" + dependency.slug);
      } else if (blocker.num === t.num) {
        errors.push(where + ": a ticket cannot block itself (" + blocker.token + ")");
      } else if (blocker.num > t.num) {
        errors.push(where + ": blocker " + blocker.token + " must have a lower ticket number than " + t.prefix + "-" + t.slug);
      }
    }
  }
  return tickets;
}

function runOnRepo(repoRoot) {
  repoRoot = resolve(repoRoot);
  const errors = [];
  let count = 0;
  const scratchRoot = join(repoRoot, ".scratch");
  if (!existsSync(scratchRoot)) return { errors, count };
  if (!statSync(scratchRoot).isDirectory()) {
    errors.push(".scratch: not a directory");
    return { errors, count };
  }
  for (const entry of sortedEntries(scratchRoot)) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const featureDir = join(scratchRoot, entry.name);
    const featureRel = ".scratch/" + entry.name;
    const ticketsDir = join(featureDir, "tickets");
    let tickets = [];
    if (existsSync(ticketsDir) && !statSync(ticketsDir).isDirectory()) {
      errors.push(featureRel + "/tickets: not a directory");
    } else if (existsSync(ticketsDir)) {
      for (const e of readdirSync(ticketsDir, { withFileTypes: true })) {
        if (e.isFile() && e.name.endsWith(".md") && !e.name.startsWith(".")) count += 1;
      }
      tickets = checkTickets(featureRel, ticketsDir, errors);
    }
    const specPath = join(featureDir, "spec.md");
    if (existsSync(specPath)) {
      count += 1;
      checkSpec(featureRel + "/spec.md", specPath, tickets, errors);
    }
  }
  return { errors, count };
}

function templateBlock(file, heading) {
  const lines = readFileSync(file, "utf8").replace(/\r\n?/g, "\n").split("\n");
  const at = lines.findIndex((line) => line.trim() === heading);
  if (at === -1) return null;
  const open = lines.findIndex((line, i) => i > at && /^\x60\x60\x60markdown\s*$/.test(line));
  const close = lines.findIndex((line, i) => i > open && /^\x60\x60\x60\s*$/.test(line));
  if (open === -1 || close === -1) return null;
  return lines.slice(open + 1, close).join("\n") + "\n";
}

function checkShippedTemplates(here) {
  const skills = join(here, "..", "..");
  const specFile = join(skills, "zw-to-spec", "references", "spec-template.md");
  const ticketFile = join(skills, "zw-to-tickets", "references", "ticket-template.md");
  for (const file of [specFile, ticketFile]) {
    if (!existsSync(file)) return [file + " is not installed beside this skill"];
  }
  const spec = templateBlock(specFile, "## The spec body");
  const ticket = templateBlock(ticketFile, "## Local ticket file");
  if (spec === null) return ["spec-template.md has no markdown block under ## The spec body"];
  if (ticket === null) return ["ticket-template.md has no markdown block under ## Local ticket file"];
  const token = /^Tickets:.*?\b(\d+-[a-z0-9][a-z0-9-]*)/m.exec(spec);
  if (!token) return ["the spec template has no Tickets: line naming a ticket by its NN-<slug> token"];
  const tmp = mkdtempSync(join(tmpdir(), "verify-artifacts-templates-"));
  try {
    const feature = join(tmp, ".scratch", "template");
    mkdirSync(join(feature, "tickets"), { recursive: true });
    writeFileSync(join(feature, "spec.md"), spec, "utf8");
    writeFileSync(join(feature, "tickets", token[1] + ".md"), ticket, "utf8");
    const result = runOnRepo(tmp);
    const problems = result.errors.map((error) => "a draft written from the templates fails: " + error);
    if (result.count !== 2) problems.push("expected the template spec and ticket to count as 2 artifacts, got " + result.count);
    return problems;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function selfTest() {
  const here = dirname(fileURLToPath(import.meta.url));
  const fixturesRoot = join(here, "fixtures", "artifacts");
  const failures = [];
  const cli = (...args) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { encoding: "utf8" });

  const passing = [["good", 4], ["dependencies/good", 4], ["shapes/good", 2], ["numbering/good", 2]];
  for (const [tree, count] of passing) {
    const result = cli(join(fixturesRoot, tree));
    if (result.status !== 0 || result.stdout !== "ok: " + count + " artifacts\n" || result.stderr !== "") {
      failures.push(tree + ": expected exit 0 and " + count + " artifacts, got " + result.status + " " + JSON.stringify(result.stdout + result.stderr));
    }
  }

  const failing = {
    "bad": [
      ".scratch/other/tickets/01-b.md: duplicate ticket number 1",
      ".scratch/sync/tickets/01-contract.md:3: :42 looks like a line number",
      ".scratch/sync/spec.md: missing required section ## Further Notes",
      ".scratch/sync/spec.md:27: src/x.ts looks like a path",
      ".scratch/sync/spec.md: does not reference ticket 03-adapter (name it on the spec's Tickets line by its NN-<slug> token, or link it)",
    ],
    "dependencies/bad": [
      ".scratch/bullet/tickets/01-first.md:5: blocker 02-second must have a lower ticket number than 01-first",
      ".scratch/cycle/tickets/01-consumer.md:5: blocker 02-provider must have a lower ticket number than 01-consumer",
      ".scratch/malformed/tickets/01-provider.md:5: invalid Blocked by entry \"Upstream provider.\"; expected a ticket number or NN-<slug>",
      ".scratch/markers/tickets/01-first.md:3: blocker 02-second must have a lower ticket number than 01-first",
      ".scratch/markers/tickets/02-second.md:3: Blocked by references missing ticket 03-ghost",
      ".scratch/missing/tickets/01-consumer.md:5: Blocked by references missing ticket 02-provider",
      ".scratch/ordered/tickets/01-first.md:3: blocker 02-second must have a lower ticket number than 01-first",
      ".scratch/ordered/tickets/02-second.md:3: Blocked by references missing ticket 07-ghost",
      ".scratch/ordered/tickets/03-third.md:3: Blocked by references missing ticket 04-nowhere",
      ".scratch/pair/tickets/02-consumer.md:3: Blocked by references missing ticket 09-ghost",
      ".scratch/self/tickets/01-self.md:5: a ticket cannot block itself (01-self)",
      ".scratch/slug/tickets/02-consumer.md:5: Blocked by names 01-ghost, but ticket 01 is 01-provider",
    ],
    "shapes/bad": [
      ".scratch/duplicate/tickets/01-twice.md:7: duplicate Blocked by line",
      ".scratch/layout/tickets/00-zero.md: ticket number must be a positive integer",
      ".scratch/layout/tickets/drafts: unexpected directory inside tickets",
      ".scratch/layout/tickets/notes.md: ticket filename must be NN-<slug>.md",
      ".scratch/lines/tickets/01-lines.md:9: /usr/local/bin looks like a path (an HTTP route is written with its method, as in GET /items)",
      ".scratch/lines/tickets/01-lines.md:9: src/feed/load.ts looks like a path",
      ".scratch/lines/tickets/01-lines.md:11: model/user.ts looks like a path",
      ".scratch/notdir/tickets: not a directory",
      ".scratch/parens/tickets/02-consumer.md:5: invalid Blocked by entry: unbalanced title parentheses",
      ".scratch/paths/tickets/01-paths.md:3: /usr/local/bin looks like a path (an HTTP route is written with its method, as in GET /items)",
      ".scratch/paths/tickets/01-paths.md:3: ./scripts/setup looks like a path",
      ".scratch/paths/tickets/01-paths.md:3: ../shared/config looks like a path",
      ".scratch/specdir/spec.md: unreadable (EISDIR)",
    ],
  };
  for (const [tree, expected] of Object.entries(failing)) {
    const result = cli(join(fixturesRoot, tree));
    const actual = result.stderr.split("\n").filter(Boolean);
    if (result.status !== 1) failures.push(tree + ": expected exit 1, got " + result.status);
    for (const line of expected) if (!actual.includes(line)) failures.push(tree + ": missing " + JSON.stringify(line));
    for (const line of actual) if (!expected.includes(line)) failures.push(tree + ": unexpected " + JSON.stringify(line));
  }

  const tmp = mkdtempSync(join(tmpdir(), "verify-artifacts-"));
  const empty = cli(tmp);
  if (empty.status !== 0 || empty.stdout !== "ok: 0 artifacts\n") failures.push("a repo with no .scratch: expected exit 0 and 0 artifacts, got " + empty.status + " " + JSON.stringify(empty.stdout + empty.stderr));
  writeFileSync(join(tmp, ".scratch"), "A file where the drafts directory belongs.\n", "utf8");
  const notDir = cli(tmp);
  if (notDir.status !== 1 || notDir.stderr !== ".scratch: not a directory\n") failures.push("a .scratch that is a file: expected exit 1 and one line, got " + notDir.status + " " + JSON.stringify(notDir.stderr));
  rmSync(tmp, { recursive: true, force: true });

  for (const args of [[], ["--bogus"], [fixturesRoot, fixturesRoot]]) {
    const usage = cli(...args);
    if (usage.status !== 2 || !usage.stderr.startsWith("Usage: ")) failures.push("usage error for " + JSON.stringify(args) + ": expected exit 2 and the usage text, got " + usage.status + " " + JSON.stringify(usage.stderr));
  }

  for (const problem of checkShippedTemplates(here)) failures.push("shipped templates: " + problem);

  if (failures.length) {
    for (const f of failures) console.error("artifacts --test FAIL: " + f);
    return false;
  }
  console.log("artifacts --test: all ok");
  return true;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--test") {
    process.exit(selfTest() ? 0 : 1);
  }
  if (args.length !== 1 || args[0].startsWith("-")) {
    console.error("Usage: node <zw-skill>/scripts/verify-artifacts.mjs <repoRoot>");
    console.error("       node <zw-skill>/scripts/verify-artifacts.mjs --test");
    process.exit(2);
  }
  const { errors, count } = runOnRepo(args[0]);
  if (errors.length) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log("ok: " + count + " artifacts");
}

main();
