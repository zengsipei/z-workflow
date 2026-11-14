#!/usr/bin/env node
/**
 * verify-notes.mjs - zero-dependency decision note checker.
 *
 * Usage:
 *   node <zw-skill>/scripts/verify-notes.mjs <repoRoot>
 *   node <zw-skill>/scripts/verify-notes.mjs --test
 *
 * Exit 0 on pass. On failure every problem prints as "<file>: <problem>"
 * and the exit code is non-zero.
 *
 * Known limitations:
 * - Archived notes use the archived head layout (Status: implemented plus
 *   Archived: YYYY-MM-DD) and the same body checks as implemented notes.
 * - Present tense in prose is not scanned lexically; only proposal-era H2
 *   headings are rejected in implemented and archived notes.
 * - The closed class set lives in CLASSES below; adding a class means
 *   changing this script first.
 */
import { existsSync, statSync, readdirSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LIFECYCLES = ["proposed", "implemented", "rejected", "archived"];
const CLASSES = ["feature", "bug-fix", "simplification", "architecture", "process", "testing"];

const STATUS = {
  proposed: /^Status: proposed$|^状态[:：] ?(?:proposed|已提议)$/,
  implemented: /^Status: implemented$|^状态[:：] ?(?:implemented|已实现)$/,
  rejected: /^Status: rejected (?:-|—) .+$|^状态[:：] ?(?:rejected|已否决) (?:-|—) .+$/,
  archived: /^Status: implemented$|^状态[:：] ?(?:implemented|已实现)$/,
};

const PROBLEM_FIRST = new Set(["## Problem", "## 问题"]);

const REQUIRED = {
  proposed: [
    ["## Proposal", "## 提议", "## 方案", "## 提案"],
    ["## Acceptance criteria", "## 验收标准", "## 验收条件", "## 接受标准"],
    ["## Risks", "## 风险"],
  ],
  implemented: [
    ["## Decision", "## 决定", "## 决策"],
    ["## Consequences", "## 后果", "## 影响", "## 结果", "## 结果与代价", "## 影响与验证", "## 后果与边界"],
  ],
  rejected: [
    ["## Proposal", "## 提议", "## 方案", "## 提案"],
  ],
  archived: [
    ["## Decision", "## 决定", "## 决策"],
    ["## Consequences", "## 后果", "## 影响", "## 结果", "## 结果与代价", "## 影响与验证", "## 后果与边界"],
  ],
};

const BANNED_IN_IMPLEMENTED = new Set([
  "proposal", "plan", "migration plan", "acceptance criteria",
  "提议", "方案", "提案", "计划", "规划", "迁移计划",
  "验收标准", "验收条件", "接受标准",
]);

const ALTERNATIVES = new Set(["## Alternatives considered", "## 替代方案", "## 备选方案", "## 其他做法"]);
const REVISIT_EN = new Set(["## revisit signal"]);
const REVISIT_ZH = new Set(["## 触发重访的信号", "## 重访信号", "## 重访触发"]);

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
  if (src.fenced[i] || src.commented[i]) return false;
  return !/^\s*>/.test(src.lines[i]);
}

function headingBase(heading) {
  return heading.replace(/[（(].*$/, "").trimEnd();
}

function validDate(yyyymmdd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

function listMd(dir, prefix) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const rel = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...listMd(join(dir, entry.name), rel));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(rel);
  }
  return out;
}

function collectNotes(repoRoot) {
  const notes = [];
  const errors = [];
  const notesRoot = join(repoRoot, ".agents", "notes");
  if (!existsSync(notesRoot)) return { notes, errors };
  if (!statSync(notesRoot).isDirectory()) {
    errors.push(".agents/notes: not a directory");
    return { notes, errors };
  }

  for (const entry of readdirSync(notesRoot, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      if (!LIFECYCLES.includes(entry.name)) {
        errors.push(".agents/notes/" + entry.name + "/: unknown lifecycle directory (allowed: " + LIFECYCLES.join(", ") + ")");
      }
    } else {
      errors.push(".agents/notes/" + entry.name + ": unexpected file at notes root");
    }
  }

  for (const lifecycle of LIFECYCLES) {
    const dir = join(notesRoot, lifecycle);
    if (!existsSync(dir)) continue;
    for (const rel of listMd(dir, lifecycle).sort()) {
      const segs = rel.split("/");
      if (segs.length === 2 && (segs[1] === "AGENTS.md" || segs[1] === "CLAUDE.md")) continue;
      if (segs.length !== 3 || !segs[1] || !segs[2]) {
        errors.push(".agents/notes/" + rel + ": expected " + lifecycle + "/<class>/yyyy-mm-dd-topic.md (got depth " + segs.length + ")");
        continue;
      }
      const cls = segs[1];
      const file = segs[2];
      if (!CLASSES.includes(cls)) {
        errors.push(".agents/notes/" + rel + ': unknown class folder "' + cls + '" (allowed: ' + CLASSES.join(", ") + ")");
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(file)) {
        errors.push(".agents/notes/" + rel + ": filename must be yyyy-mm-dd-topic.md");
        continue;
      }
      if (!validDate(file.slice(0, 10))) {
        errors.push(".agents/notes/" + rel + ": " + file.slice(0, 10) + " is not a valid calendar date");
        continue;
      }
      notes.push({ lifecycle, rel, path: join(notesRoot, rel) });
    }
  }
  notes.sort((a, b) => a.rel.localeCompare(b.rel));
  return { notes, errors };
}

function checkNote(note, errors) {
  const fail = (msg) => errors.push(".agents/notes/" + note.rel + ": " + msg);
  let raw;
  try {
    raw = readFileSync(note.path, "utf8");
  } catch (err) {
    fail("unreadable (" + (err.code || err.message) + ")");
    return;
  }
  const src = maskSource(raw);
  const lines = src.lines;

  if (!/^# Agent Note[:：] ?\S/.test(lines[0] || "")) fail("line 1 must be # Agent Note: <title>");
  if (lines[1] !== "") fail("line 2 must be blank");

  if (note.lifecycle === "archived") {
    if (!STATUS.archived.test(lines[2] || "")) fail("line 3 must match archived status grammar (Status: implemented)");
    if (!/^Archived: \d{4}-\d{2}-\d{2}$/.test(lines[3] || "")) fail("line 4 must be Archived: YYYY-MM-DD immediately below Status");
    if (lines[4] !== "") fail("line 5 must be blank");
  } else {
    if (!STATUS[note.lifecycle].test(lines[2] || "")) fail("line 3 must match " + note.lifecycle + " status grammar (" + String(STATUS[note.lifecycle]) + ")");
    if (lines[3] !== "") fail("line 4 must be blank");
  }

  const proseIdx = [];
  for (let i = 0; i < lines.length; i++) if (isProseLine(src, i)) proseIdx.push(i);
  const prose = proseIdx.map((i) => lines[i]);

  const looksLikeStatusLine = (l) => {
    const t = l.trim();
    return Object.values(STATUS).some((re) => re.test(t));
  };
  const statusCount = prose.filter(looksLikeStatusLine).length;
  if (statusCount !== 1) fail("Status: line must appear exactly once (got " + statusCount + ")");

  const h2s = prose.filter((l) => l.startsWith("## ")).map((l) => l.trimEnd());
  const bases = h2s.map(headingBase);
  const first = headingBase(h2s[0] || "");
  if (!PROBLEM_FIRST.has(first)) {
    fail("first section must be ## Problem or ## 问题 (got " + JSON.stringify(h2s[0] || "<none>") + ")");
  }

  for (const group of REQUIRED[note.lifecycle] || []) {
    if (!group.some((h) => bases.includes(h))) fail("missing one of " + JSON.stringify(group));
  }

  if (note.lifecycle === "implemented" || note.lifecycle === "archived") {
    for (const base of bases) {
      const bare = base.replace(/^##\s+/, "").toLowerCase();
      if (BANNED_IN_IMPLEMENTED.has(bare)) {
        fail("banned in " + note.lifecycle + ": " + base);
      }
    }
  }

  if (!bases.some((b) => ALTERNATIVES.has(b))) fail("missing ## Alternatives considered");

  const hasRevisit = bases.some((b) => REVISIT_EN.has(b.toLowerCase()) || REVISIT_ZH.has(b));
  if (!hasRevisit) fail("missing ## Revisit signal");
}

function runOnRepo(repoRoot) {
  const { notes, errors } = collectNotes(resolve(repoRoot));
  for (const note of notes) checkNote(note, errors);
  return { errors, count: notes.length };
}

function selfTest() {
  const here = dirname(fileURLToPath(import.meta.url));
  const fixturesRoot = join(here, "fixtures", "notes");
  const failures = [];

  const good = runOnRepo(join(fixturesRoot, "good"));
  if (good.errors.length !== 0) failures.push("good fixture: expected 0 errors, got " + good.errors.join(" | "));
  if (good.count !== 4) failures.push("good fixture: expected 4 notes, got " + good.count);

  const bad = runOnRepo(join(fixturesRoot, "bad"));
  if (bad.errors.length === 0) failures.push("bad fixture: expected errors, got none");
  const needles = [
    "line 3 must match implemented status grammar",
    "first section must be ## Problem",
    "banned in implemented",
    "missing ## Alternatives considered",
    "missing ## Revisit signal",
    "line 3 must match rejected status grammar",
    "unknown lifecycle directory",
    "unknown class folder",
    "bad-name.md",
  ];
  for (const needle of needles) {
    if (!bad.errors.some((e) => e.includes(needle))) failures.push("bad fixture: expected an error containing " + JSON.stringify(needle));
  }

  const tmp = mkdtempSync(join(tmpdir(), "verify-notes-empty-"));
  const empty = runOnRepo(tmp);
  if (empty.errors.length !== 0) failures.push("empty repo: expected 0 errors, got " + empty.errors.join(" | "));
  if (empty.count !== 0) failures.push("empty repo: expected 0 notes, got " + empty.count);
  rmSync(tmp, { recursive: true, force: true });

  console.log("notes --test: good=" + (good.errors.length === 0 ? "ok" : "FAIL") + " notes=" + good.count);
  console.log("notes --test: bad=" + (bad.errors.length > 0 ? "ok" : "FAIL") + " errors=" + bad.errors.length);
  console.log("notes --test: empty=" + (empty.count === 0 && empty.errors.length === 0 ? "ok" : "FAIL") + " notes=" + empty.count);

  if (failures.length) {
    for (const f of failures) console.error("notes --test FAIL: " + f);
    return false;
  }
  console.log("notes --test: all ok");
  return true;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--test") {
    process.exit(selfTest() ? 0 : 1);
  }
  if (args.length !== 1 || args[0].startsWith("-")) {
    console.error("Usage: node <zw-skill>/scripts/verify-notes.mjs <repoRoot>");
    console.error("       node <zw-skill>/scripts/verify-notes.mjs --test");
    process.exit(2);
  }
  const { errors, count } = runOnRepo(args[0]);
  if (errors.length) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log("ok: " + count + " notes");
}

main();
