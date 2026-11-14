#!/usr/bin/env node
/**
 * verify-install.mjs - install-contract checker.
 *
 * Usage:
 *   node <zw-skill>/scripts/verify-install.mjs <skillsRoot>
 *   node <zw-skill>/scripts/verify-install.mjs --test
 *
 * Exit 0 on pass. On failure every problem prints as "<skill>: <problem>"
 * and the exit code is non-zero.
 *
 * What it enforces, per skill directory:
 * - SKILL.md exists and starts with a --- delimited frontmatter block.
 * - Frontmatter keys stay inside the portable subset: name, description,
 *   disable-model-invocation.
 * - name equals the directory name.
 * - description is a plain one-line scalar a YAML parser reads back as that
 *   exact string. An unquoted value holding a colon-space or a space-hash is
 *   reported, because the skills CLI skips such a skill as invalid YAML.
 * - Every references/ and scripts/ path named in the body exists inside the
 *   skill's own directory, which is all an installer copies.
 * - The body names no file that only exists at the repository root.
 */
import { existsSync, readdirSync, readFileSync, mkdtempSync, mkdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_KEYS = new Set(["name", "description", "disable-model-invocation"]);
const ROOT_ONLY = [
  { re: /DESIGN[.]md/, label: "DESIGN.md" },
  { re: /link-skills[.]sh/, label: "link-skills.sh" },
  { re: /samples\//, label: "samples/" },
];
const RELATIVE = /(?:^|[\s\x60(\[])((?:references|scripts)\/[A-Za-z0-9_.\/-]+)/g;

function parseFrontmatter(raw, push) {
  const lines = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  if (lines[0].trim() !== "---") {
    push("SKILL.md does not start with a --- frontmatter block");
    return null;
  }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end === -1) {
    push("frontmatter block is never closed with ---");
    return null;
  }
  const fields = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const m = /^([A-Za-z][A-Za-z0-9_-]*):(?:\s(.*))?$/.exec(line);
    if (!m) {
      push("frontmatter line " + (i + 1) + " is not a key: value pair");
      continue;
    }
    const key = m[1];
    const value = (m[2] ?? "").trim();
    if (!ALLOWED_KEYS.has(key)) push("frontmatter key " + key + " is outside the portable subset");
    fields[key] = value;
  }
  return { fields, body: lines.slice(end + 1).join("\n") };
}

function checkDescription(value, push) {
  if (!value) {
    push("frontmatter has no description");
    return;
  }
  const quoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
  if (!quoted && /:\s|\s#/.test(value)) {
    push('description is an unquoted value holding a colon-space or a space-hash, which a YAML parser reads as a nested mapping; quote it');
  }
}

function checkBody(body, skillDir, push) {
  for (const m of body.matchAll(RELATIVE)) {
    const target = m[1].replace(/[.,;:]+$/, "");
    if (!existsSync(join(skillDir, target))) push("body names " + target + " but the skill does not ship it");
  }
  for (const { re, label } of ROOT_ONLY) {
    if (re.test(body)) push("body names " + label + ", which exists only at the repository root and is not installed");
  }
}

function runOnSkills(skillsRoot) {
  skillsRoot = resolve(skillsRoot);
  const errors = [];
  if (!existsSync(skillsRoot) || !statSync(skillsRoot).isDirectory()) {
    return { errors: [skillsRoot + ": not a directory"], count: 0 };
  }
  let count = 0;
  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const skillDir = join(skillsRoot, entry.name);
    const skillMd = join(skillDir, "SKILL.md");
    const push = (msg) => errors.push(entry.name + ": " + msg);
    if (!existsSync(skillMd)) {
      push("no SKILL.md, so an installer cannot see this skill");
      continue;
    }
    count += 1;
    const parsed = parseFrontmatter(readFileSync(skillMd, "utf8"), push);
    if (!parsed) continue;
    if (parsed.fields.name !== entry.name) push("frontmatter name " + JSON.stringify(parsed.fields.name || "") + " does not match the directory name");
    checkDescription(parsed.fields.description, push);
    checkBody(parsed.body, skillDir, push);
  }
  return { errors, count };
}

function selfTest() {
  const here = dirname(fileURLToPath(import.meta.url));
  const fixtures = join(here, "fixtures", "install");
  const failures = [];

  const good = runOnSkills(join(fixtures, "good"));
  if (good.errors.length !== 0) failures.push("good fixture: expected 0 errors, got " + good.errors.join(" | "));
  if (good.count !== 2) failures.push("good fixture: expected 2 skills, got " + good.count);

  const bad = runOnSkills(join(fixtures, "bad"));
  if (bad.errors.length === 0) failures.push("bad fixture: expected errors, got none");
  const needles = [
    "does not match the directory name",
    "nested mapping",
    "but the skill does not ship it",
    "repository root",
    "outside the portable subset",
    "no SKILL.md",
  ];
  for (const needle of needles) {
    if (!bad.errors.some((e) => e.includes(needle))) failures.push("bad fixture: expected an error containing " + JSON.stringify(needle));
  }

  const tmp = mkdtempSync(join(tmpdir(), "verify-install-empty-"));
  mkdirSync(join(tmp, "skills"));
  const empty = runOnSkills(join(tmp, "skills"));
  if (empty.errors.length !== 0 || empty.count !== 0) failures.push("empty fixture: expected 0 skills and 0 errors");
  rmSync(tmp, { recursive: true, force: true });

  console.log("install --test: good=" + (good.errors.length === 0 ? "ok" : "FAIL") + " skills=" + good.count);
  console.log("install --test: bad=" + (bad.errors.length > 0 ? "ok" : "FAIL") + " errors=" + bad.errors.length);
  console.log("install --test: empty=" + (empty.count === 0 && empty.errors.length === 0 ? "ok" : "FAIL"));
  if (failures.length) {
    for (const f of failures) console.error("install --test FAIL: " + f);
    return false;
  }
  console.log("install --test: all ok");
  return true;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--test") process.exit(selfTest() ? 0 : 1);
  if (args.length !== 1 || args[0].startsWith("-")) {
    console.error("Usage: node <zw-skill>/scripts/verify-install.mjs <skillsRoot>");
    console.error("       node <zw-skill>/scripts/verify-install.mjs --test");
    process.exit(2);
  }
  const { errors, count } = runOnSkills(args[0]);
  if (errors.length) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log("ok: " + count + " skills");
}

main();
