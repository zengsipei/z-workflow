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
 *   first, as in GET /items, and a vendor media type such as
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
 *   line may be a list item and its label may be bold or in backticks.
 *   Older drafts with no Blocked by line remain valid.
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

const SENTENCE_END = /[.,;:!?]+$/;
const HTTP_METHOD_BEFORE = /\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+[\x60"']?$/;
const VENDOR_MEDIA_TYPE = /^(?:application|audio|font|image|message|model|multipart|text|video)\/(?:vnd|prs)\./;

/** Blank a comment and keep its line breaks, so a line number after it is still the file's. */
function blankHtmlComments(text) {
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
  const lines = blankHtmlComments(text).split(/\r\n?|\n/);
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
      const token = m[1].replace(SENTENCE_END, "");
      const before = cleaned.slice(0, m.index + m[0].length - m[1].length);
      if (isTrackerPath(token) || HTTP_METHOD_BEFORE.test(before)) continue;
      push(lineNo, token, "path");
    }
    for (const m of cleaned.matchAll(/(?:^|[\s"'(\[\x60])([A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)+\.\w{1,8})/g)) {
      if (!VENDOR_MEDIA_TYPE.test(m[1])) push(lineNo, m[1], "path");
    }
    for (const m of cleaned.matchAll(/(?:^|[\s"'(\[\x60])(\.{1,2}\/[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)*)/g)) {
      push(lineNo, m[1].replace(SENTENCE_END, ""), "path");
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

function checkSpec(rel, absPath, tickets, errors) {
  let raw;
  try {
    raw = readFileSync(absPath, "utf8");
  } catch (err) {
    errors.push(rel + ": unreadable (" + (err.code || err.message) + ")");
    return;
  }
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
    const field = /^\s*(?:[-*+]\s+)?`?Blocked by:`?\s*(.*)$/i.exec(src.lines[i].replaceAll("**", ""));
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

function checkTickets(featureRel, ticketsDir, errors) {
  const tickets = [];
  for (const entry of readdirSync(ticketsDir, { withFileTypes: true })) {
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
    let raw;
    try {
      raw = readFileSync(t.path, "utf8");
    } catch (err) {
      errors.push(t.rel + ": unreadable (" + (err.code || err.message) + ")");
      continue;
    }
    for (const v of pathViolations(raw)) {
      errors.push(t.rel + ":" + v.line + ": " + describeViolation(v));
    }
    for (const blocker of ticketBlockers(raw, t, errors)) {
      const dependency = byNum.get(blocker.num);
      const where = t.rel + ":" + blocker.line;
      if (!dependency || (blocker.slug && blocker.slug !== dependency.slug)) {
        errors.push(where + ": Blocked by references missing ticket " + blocker.token);
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
  for (const entry of readdirSync(scratchRoot, { withFileTypes: true })) {
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

/**
 * The spec and ticket templates are sibling resources this checker judges.
 * Written out unchanged, they must pass: a template the gate rejects teaches
 * every run to fail.
 */
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

  const good = runOnRepo(join(fixturesRoot, "good"));
  if (good.errors.length !== 0) failures.push("good fixture: expected 0 errors, got " + good.errors.join(" | "));
  if (good.count !== 4) failures.push("good fixture: expected 4 artifacts, got " + good.count);

  const bad = runOnRepo(join(fixturesRoot, "bad"));
  if (bad.errors.length === 0) failures.push("bad fixture: expected errors, got none");
  const needles = [
    "missing required section ## Further Notes",
    "src/x.ts",
    ":42",
    "duplicate ticket number 1",
    "does not reference ticket 03-adapter",
  ];
  for (const needle of needles) {
    if (!bad.errors.some((e) => e.includes(needle))) failures.push("bad fixture: expected an error containing " + JSON.stringify(needle));
  }

  const dependencyGood = spawnSync(process.execPath, [fileURLToPath(import.meta.url), join(fixturesRoot, "dependencies", "good")], { encoding: "utf8" });
  if (dependencyGood.status !== 0 || dependencyGood.stdout !== "ok: 4 artifacts\n") {
    failures.push("valid blockers: expected exit 0 and 4 artifacts, got " + dependencyGood.status + " " + dependencyGood.stdout + dependencyGood.stderr);
  }
  const dependencyBad = spawnSync(process.execPath, [fileURLToPath(import.meta.url), join(fixturesRoot, "dependencies", "bad")], { encoding: "utf8" });
  if (dependencyBad.status !== 1) failures.push("invalid blockers: expected exit 1, got " + dependencyBad.status);
  for (const needle of [
    "must have a lower ticket number",
    "cannot block itself",
    "missing ticket 02-provider",
    "missing ticket 01-ghost",
    "invalid Blocked by entry",
    ".scratch/bullet/tickets/01-first.md:5: blocker 02-second must have a lower ticket number",
  ]) {
    if (!dependencyBad.stderr.includes(needle)) failures.push("invalid blockers: expected " + JSON.stringify(needle) + ", got " + JSON.stringify(dependencyBad.stderr));
  }

  const cli = (root) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), root], { encoding: "utf8" });
  const shapesGood = cli(join(fixturesRoot, "shapes", "good"));
  if (shapesGood.status !== 0 || shapesGood.stdout !== "ok: 2 artifacts\n") {
    failures.push("allowed shapes: tracker routes, URLs, a commented path, method routes and a vendor media type must pass, got " + shapesGood.status + " " + shapesGood.stdout + shapesGood.stderr);
  }
  const shapesBad = cli(join(fixturesRoot, "shapes", "bad"));
  if (shapesBad.status !== 1) failures.push("refused shapes: expected exit 1, got " + shapesBad.status);
  if (/\n\s+at /.test(shapesBad.stderr)) failures.push("refused shapes: a bad tree must print problems, not a stack trace");
  for (const needle of [
    ".scratch/duplicate/tickets/01-twice.md:7: duplicate Blocked by line",
    ".scratch/parens/tickets/02-consumer.md:5: invalid Blocked by entry: unbalanced title parentheses",
    ".scratch/layout/tickets/drafts: unexpected directory inside tickets",
    ".scratch/layout/tickets/notes.md: ticket filename must be NN-<slug>.md",
    ".scratch/paths/tickets/01-paths.md:3: ./scripts/setup looks like a path",
    ".scratch/paths/tickets/01-paths.md:3: ../shared/config looks like a path",
    ".scratch/paths/tickets/01-paths.md:3: /usr/local/bin looks like a path",
    ".scratch/lines/tickets/01-lines.md:9: src/feed/load.ts looks like a path",
    ".scratch/lines/tickets/01-lines.md:9: /usr/local/bin looks like a path",
    ".scratch/lines/tickets/01-lines.md:11: model/user.ts looks like a path",
    ".scratch/notdir/tickets: not a directory",
  ]) {
    if (!shapesBad.stderr.includes(needle)) failures.push("refused shapes: expected " + JSON.stringify(needle) + ", got " + JSON.stringify(shapesBad.stderr));
  }

  const gap = runOnRepo(join(fixturesRoot, "numbering", "good"));
  if (gap.errors.length !== 0) failures.push("numbering gap: a deleted ticket leaves a legal gap, got " + gap.errors.join(" | "));
  if (gap.count !== 2) failures.push("numbering gap: expected 2 artifacts, got " + gap.count);

  const templates = checkShippedTemplates(here);
  for (const problem of templates) failures.push("shipped templates: " + problem);

  const tmp = mkdtempSync(join(tmpdir(), "verify-artifacts-empty-"));
  const empty = runOnRepo(tmp);
  if (empty.errors.length !== 0) failures.push("empty repo: expected 0 errors, got " + empty.errors.join(" | "));
  if (empty.count !== 0) failures.push("empty repo: expected 0 artifacts, got " + empty.count);
  rmSync(tmp, { recursive: true, force: true });

  console.log("artifacts --test: good=" + (good.errors.length === 0 ? "ok" : "FAIL") + " artifacts=" + good.count);
  console.log("artifacts --test: bad=" + (bad.errors.length > 0 ? "ok" : "FAIL") + " errors=" + bad.errors.length);
  console.log("artifacts --test: empty=" + (empty.count === 0 && empty.errors.length === 0 ? "ok" : "FAIL") + " artifacts=" + empty.count);

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
