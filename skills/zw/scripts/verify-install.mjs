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
 * What it enforces, per skill directory, including symlinked directories:
 * - SKILL.md exists at the skill root and starts with a --- delimited
 *   frontmatter block.
 * - No other SKILL.md sits anywhere below that root. An installer that treats
 *   every nested SKILL.md as a packaged skill rewrites them too, and a
 *   deliberately malformed fixture then fails the whole install.
 * - Frontmatter keys stay inside the portable subset: name, description,
 *   disable-model-invocation.
 * - name equals the directory name.
 * - name and description are non-empty single-line YAML strings, plain or
 *   quoted. Quotes and escapes must be valid, implicit non-string scalars
 *   must be quoted, and disable-model-invocation must be a boolean.
 * - Every references/ and scripts/ path named in the body exists inside the
 *   skill own directory, which is all an installer copies.
 * - A path named as a sibling, ../<skill>/references/..., ../<skill>/scripts/...,
 *   ../<skill>/vendor/... or ../<skill>/SKILL.md, resolves inside the skills root, so
 *   the shared harness adapter and a skill body read by path are checked rather than skipped.
 * - The body names no file that only exists at the repository root.
 * - A vendor/ tree carries a VENDOR.md whose table lists every file with a
 *   sha256 and a state. A vendored file must hash to its listed value, a file
 *   marked omitted must be absent, and an unlisted file is reported. A copy
 *   nobody can prove identical is a fork, so the tree is compared, not trusted.
 *
 * The self-test builds its fixtures in a temporary directory, because shipping
 * a malformed SKILL.md inside this skill is exactly the defect it checks for.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_KEYS = new Set(["name", "description", "disable-model-invocation"]);
const ROOT_ONLY = [
  { re: /DESIGN[.]md/, label: "DESIGN.md" },
  { re: /link-skills[.]sh/, label: "link-skills.sh" },
  { re: /samples\//, label: "samples/" },
];
const RELATIVE = /(?:^|[\s`(\[])((?:references|scripts|vendor)\/[A-Za-z0-9_.\/-]+)/g;
const SIBLING = /(?:^|[\s`(\[])(?:\.\.\/)+([A-Za-z0-9_-]+)\/((?:references|scripts|vendor)\/[A-Za-z0-9_.\/-]+|SKILL[.]md)/g;
const VENDOR_ROOT = "vendor";
const VENDOR_MANIFEST = "VENDOR.md";
const YAML_ESCAPES = {
  "0": "\0", a: "\x07", b: "\b", t: "\t", "\t": "\t", n: "\n", v: "\x0b", f: "\f", r: "\r", e: "\x1b",
  " ": " ", '"': '"', "/": "/", "\\": "\\", N: "\u0085", _: "\u00a0", L: "\u2028", P: "\u2029",
};
const NON_STRING_SCALAR = /^(?:null|true|false|yes|no|on|off|~|[-+]?(?:0x[\da-f_]+|0b[01_]+|0o[0-7_]+|\d[\d_]*(?::[0-5]?\d)+(?:\.\d*)?|\d[\d_]*(?:\.\d[\d_]*|\.)?(?:e[-+]?\d+)?|\.\d[\d_]*(?:e[-+]?\d+)?|\.(?:inf|nan))|\d{4}-\d{1,2}-\d{1,2}(?:[t ].*)?)$/i;

function parseStringScalar(value, key) {
  let decoded = value;
  const quote = value[0];
  if (quote === '"' || quote === "'") {
    decoded = "";
    let closed = false;
    for (let i = 1; i < value.length; i++) {
      const char = value[i];
      if (char === quote) {
        if (quote === "'" && value[i + 1] === "'") { decoded += "'"; i++; continue; }
        if (i !== value.length - 1) throw new Error(key + " has text after the closing quote");
        closed = true;
        break;
      }
      if (quote === '"' && char === "\\") {
        const escape = value[++i];
        if (Object.hasOwn(YAML_ESCAPES, escape)) decoded += YAML_ESCAPES[escape];
        else if (escape === "x" || escape === "u" || escape === "U") {
          const width = { x: 2, u: 4, U: 8 }[escape];
          const hex = value.slice(i + 1, i + 1 + width);
          if (hex.length !== width || !/^[\da-f]+$/i.test(hex)) throw new Error(key + " has an invalid YAML escape");
          const code = Number.parseInt(hex, 16);
          if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) throw new Error(key + " has an invalid YAML Unicode escape");
          decoded += String.fromCodePoint(code);
          i += width;
        } else throw new Error(key + " has an invalid YAML escape");
      } else decoded += char;
    }
    if (!closed) throw new Error(key + " has an unterminated quoted scalar");
  } else {
    if (!value || /^(?:[-?:](?:\s|$)|[,\[\]{}#&*!|>%@`])/.test(value) || NON_STRING_SCALAR.test(value)) {
      throw new Error(key + " must be a single-line string");
    }
    if (/:(?:\s|$)|\s#/.test(value)) {
      throw new Error(key + " is an unquoted value holding a colon-space or a space-hash, which a YAML parser does not read back intact (nested mapping or comment); quote it");
    }
  }
  if (!decoded.trim() || /[\r\n\u0085\u2028\u2029\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\ufffe\uffff]/.test(decoded)) {
    throw new Error(key + " must be a single-line string");
  }
  return decoded;
}

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
  const seen = new Set();
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
    if (!ALLOWED_KEYS.has(key)) { push("frontmatter key " + key + " is outside the portable subset"); continue; }
    if (seen.has(key)) { push("duplicate frontmatter key " + key); continue; }
    seen.add(key);
    try {
      if (key === "disable-model-invocation") {
        if (value !== "true" && value !== "false") throw new Error(key + " must be true or false");
        fields[key] = value === "true";
      } else fields[key] = parseStringScalar(value, key);
    } catch (error) {
      push(error.message + " at frontmatter line " + (i + 1));
    }
  }
  return { fields, body: lines.slice(end + 1).join("\n") };
}

function checkBody(body, skillDir, skillsRoot, push) {
  for (const m of body.matchAll(RELATIVE)) {
    const target = m[1].replace(/[.,;:]+$/, "");
    if (!existsSync(join(skillDir, target))) push("body names " + target + " but the skill does not ship it");
  }
  for (const m of body.matchAll(SIBLING)) {
    const target = m[2].replace(/[.,;:]+$/, "");
    if (!existsSync(join(skillsRoot, m[1], target))) push("body names ../" + m[1] + "/" + target + ", which the installed skill set does not ship");
  }
  for (const { re, label } of ROOT_ONLY) {
    if (re.test(body)) push("body names " + label + ", which exists only at the repository root and is not installed");
  }
}

function findNestedSkillFiles(dir, root, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findNestedSkillFiles(full, root, out);
    else if (entry.name.toLowerCase() === "skill.md" && full !== join(root, "SKILL.md")) out.push(full);
  }
  return out;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function listFiles(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

function parseVendorManifest(raw, push) {
  const entries = [];
  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cols = trimmed.split("|").map((c) => c.trim());
    const rel = cols[1];
    const digest = cols[2];
    const state = cols[3] || "";
    if (!rel || rel === "file" || /^-+$/.test(rel)) continue;
    if (!/^[0-9a-f]{64}$/.test(digest || "")) {
      push(VENDOR_MANIFEST + " row for " + rel + " needs a 64 character hex sha256");
      continue;
    }
    if (!/^(?:vendored|omitted)/.test(state)) {
      push(VENDOR_MANIFEST + " row for " + rel + " must say vendored or omitted");
      continue;
    }
    entries.push({ rel, digest, omitted: state.startsWith("omitted") });
  }
  return entries;
}

function checkVendor(skillDir, push) {
  const vendorDir = join(skillDir, VENDOR_ROOT);
  if (!existsSync(vendorDir)) return;
  const manifestPath = join(vendorDir, VENDOR_MANIFEST);
  if (!existsSync(manifestPath)) {
    push("ships a " + VENDOR_ROOT + "/ tree but no " + VENDOR_ROOT + "/" + VENDOR_MANIFEST);
    return;
  }
  const entries = parseVendorManifest(readFileSync(manifestPath, "utf8"), push);
  const listed = new Set();
  for (const entry of entries) {
    listed.add(entry.rel);
    const full = join(vendorDir, entry.rel);
    if (entry.omitted) {
      if (existsSync(full)) push(VENDOR_MANIFEST + " marks " + entry.rel + " omitted but the file is present");
      continue;
    }
    if (!existsSync(full)) {
      push(VENDOR_MANIFEST + " lists " + entry.rel + " but vendor/ does not ship it");
      continue;
    }
    if (sha256(readFileSync(full)) !== entry.digest) {
      push("vendor/" + entry.rel + " does not match its " + VENDOR_MANIFEST + " sha256, so the copy was edited");
    }
  }
  for (const rel of listFiles(vendorDir)) {
    if (rel === VENDOR_MANIFEST) continue;
    if (!listed.has(rel)) push("vendor/" + rel + " is not listed in " + VENDOR_MANIFEST);
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
    if (entry.name.startsWith(".") || (!entry.isDirectory() && !entry.isSymbolicLink())) continue;
    const skillDir = join(skillsRoot, entry.name);
    const push = (msg) => errors.push(entry.name + ": " + msg);
    if (entry.isSymbolicLink()) {
      try {
        if (!statSync(skillDir).isDirectory()) continue;
      } catch (error) {
        push("broken skill symlink (" + error.code + ")");
        continue;
      }
    }
    const skillMd = join(skillDir, "SKILL.md");
    if (!existsSync(skillMd)) {
      push("no SKILL.md, so an installer cannot see this skill");
      continue;
    }
    count += 1;
    const parsed = parseFrontmatter(readFileSync(skillMd, "utf8"), push);
    if (!parsed) continue;
    if (parsed.fields.name !== entry.name) push("frontmatter name " + JSON.stringify(parsed.fields.name || "") + " does not match the directory name");
    if (typeof parsed.fields.description !== "string") push("frontmatter has no valid string description");
    checkBody(parsed.body, skillDir, skillsRoot, push);
    checkVendor(skillDir, push);
    for (const nested of findNestedSkillFiles(skillDir, skillDir, [])) {
      push("ships a nested SKILL.md at " + nested.slice(skillDir.length + 1) + ", which an installer rewrites as a packaged skill");
    }
  }
  return { errors, count };
}

function writeTree(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, "utf8");
  }
}

const FENCE = "---";

function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), "verify-install-"));
  const failures = [];
  const checkCli = (label, root, status, output) => {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), root], { encoding: "utf8" });
    const actual = result.stdout + result.stderr;
    if (result.status !== status || !actual.includes(output)) {
      failures.push(label + ": expected exit " + status + " and " + JSON.stringify(output) +
        ", got exit " + result.status + " and " + JSON.stringify(actual));
    }
  };

  const vendorSource = "export const tool = 1;\n";
  const vendorManifest = "# VENDOR sample\n\n| file | sha256 | state |\n| --- | --- | --- |\n| lib/tool.ts | " +
    sha256(Buffer.from(vendorSource, "utf8")) +
    " | vendored |\n| SKILL.md | " + "0".repeat(64) + " | omitted: an installer rewrites a nested SKILL.md |\n";

  const goodRoot = join(tmp, "good");
  writeTree(goodRoot, {
    "alpha/SKILL.md": FENCE + "\nname: alpha\ndescription: A well formed skill.\ndisable-model-invocation: true\n" + FENCE + "\n\n# alpha\n\nRead references/detail.md, run scripts/check.mjs, and load vendor/lib/tool.ts.\n",
    "alpha/references/detail.md": "detail\n",
    "alpha/scripts/check.mjs": "console.log(1);\n",
    "alpha/vendor/lib/tool.ts": vendorSource,
    "alpha/vendor/VENDOR.md": vendorManifest,
    "beta/SKILL.md": FENCE + "\nname: beta\ndescription: \"Quoted: because the value holds a colon.\"\n" + FENCE + "\n\n# beta\n\nNo helpers of its own, but it points at ../alpha/references/detail.md and is read by ../alpha/SKILL.md.\n",
  });
  const good = runOnSkills(goodRoot);
  if (good.errors.length !== 0) failures.push("good fixture: expected 0 errors, got " + good.errors.join(" | "));
  if (good.count !== 2) failures.push("good fixture: expected 2 skills, got " + good.count);

  const badRoot = join(tmp, "bad");
  writeTree(badRoot, {
    "alpha-name/SKILL.md": FENCE + "\nname: not-alpha-name\ndescription: Name disagrees with the directory.\n" + FENCE + "\n\n# alpha-name\n",
    "beta-yaml/SKILL.md": FENCE + "\nname: beta-yaml\ndescription: Unquoted: value with a colon.\n" + FENCE + "\n\n# beta-yaml\n",
    "gamma-missing/SKILL.md": FENCE + "\nname: gamma-missing\ndescription: Names a file it does not ship.\n" + FENCE + "\n\n# gamma-missing\n\nSee references/absent.md.\n",
    "delta-root/SKILL.md": FENCE + "\nname: delta-root\ndescription: Names a repository root file.\n" + FENCE + "\n\n# delta-root\n\nPaths come from DESIGN.md, which only exists in the source repo.\n",
    "epsilon-key/SKILL.md": FENCE + "\nname: epsilon-key\ndescription: Carries a harness specific key.\nallowed-tools: bash\n" + FENCE + "\n\n# epsilon-key\n",
    "zeta-nested/SKILL.md": FENCE + "\nname: zeta-nested\ndescription: Ships a nested fixture skill.\n" + FENCE + "\n\n# zeta-nested\n",
    "zeta-nested/scripts/fixtures/bad/inner/SKILL.md": FENCE + "\nname: inner\ndescription: Unquoted: value with a colon.\n" + FENCE + "\n",
    "eta-nofile/README.md": "no SKILL.md here\n",
    "kappa-sibling/SKILL.md": FENCE + "\nname: kappa-sibling\ndescription: Reads a skill body that is not installed.\n" + FENCE + "\n\n# kappa-sibling\n\nRead ../ghost/SKILL.md for the rules.\n",
    "theta-dangling/SKILL.md": FENCE + "\nname: theta-dangling\ndescription: Points at a skill that is not installed.\n" + FENCE + "\n\n# theta-dangling\n\nRead ../ghost/references/absent.md.\n",
    "theta-vendor/SKILL.md": FENCE + "\nname: theta-vendor\ndescription: Ships an edited vendor copy.\n" + FENCE + "\n\n# theta-vendor\n\nLoad vendor/lib/tool.ts.\n",
    "theta-vendor/vendor/lib/tool.ts": "export const tool = 2;\n",
    "theta-vendor/vendor/lib/extra.ts": "export const extra = 1;\n",
    "theta-vendor/vendor/VENDOR.md": "# VENDOR sample\n\n| file | sha256 | state |\n| --- | --- | --- |\n| lib/tool.ts | " + "a".repeat(64) + " | vendored |\n",
    "iota-vendor/SKILL.md": FENCE + "\nname: iota-vendor\ndescription: Ships a vendor tree with no manifest.\n" + FENCE + "\n\n# iota-vendor\n",
    "iota-vendor/vendor/lib/x.ts": "export const x = 1;\n",
  });
  const bad = runOnSkills(badRoot);
  if (bad.errors.length === 0) failures.push("bad fixture: expected errors, got none");
  const needles = [
    "does not match the directory name",
    "nested mapping",
    "but the skill does not ship it",
    "repository root",
    "outside the portable subset",
    "nested SKILL.md",
    "no SKILL.md",
    "which the installed skill set does not ship",
    "../ghost/SKILL.md",
    "does not match its VENDOR.md sha256",
    "is not listed in VENDOR.md",
    "but no vendor/VENDOR.md",
  ];
  for (const needle of needles) {
    if (!bad.errors.some((e) => e.includes(needle))) failures.push("bad fixture: expected an error containing " + JSON.stringify(needle));
  }

  const linkedRoot = join(tmp, "linked");
  mkdirSync(linkedRoot);
  symlinkSync(join(goodRoot, "alpha"), join(linkedRoot, "alpha"), "dir");
  symlinkSync(join(goodRoot, "beta"), join(linkedRoot, "beta"), "dir");
  checkCli("linked skills", linkedRoot, 0, "ok: 2 skills");

  const invalidLinkRoot = join(tmp, "invalid-link");
  mkdirSync(invalidLinkRoot);
  symlinkSync(join(badRoot, "beta-yaml"), join(invalidLinkRoot, "beta-yaml"), "dir");
  checkCli("invalid linked skill", invalidLinkRoot, 1, "beta-yaml: description is an unquoted value");

  const brokenLinkRoot = join(tmp, "broken-link");
  mkdirSync(brokenLinkRoot);
  symlinkSync(join(tmp, "absent"), join(brokenLinkRoot, "ghost"), "dir");
  checkCli("broken skill symlink", brokenLinkRoot, 1, "ghost: broken skill symlink");

  const emptyRoot = join(tmp, "empty");
  mkdirSync(emptyRoot);
  const empty = runOnSkills(emptyRoot);
  if (empty.errors.length !== 0 || empty.count !== 0) failures.push("empty fixture: expected 0 skills and 0 errors");

  const scalarCases = [
    ["unterminated quote", '"Use when the user asks for review', 1, "unterminated"],
    ["invalid escape", '"Use when \\q appears"', 1, "invalid YAML escape"],
    ["description sequence", "[Use when the user asks for review]", 1, "description must be a single-line string"],
    ["description mapping", "{trigger: review}", 1, "description must be a single-line string"],
    ["description boolean", "true", 1, "description must be a single-line string"],
    ["description number", "123", 1, "description must be a single-line string"],
    ["trailing colon", "Use when reviewing:", 1, "description is an unquoted value"],
    ["invalid Unicode escape", '"Use when \\U00110000 appears."', 1, "invalid YAML Unicode escape"],
    ["quoted suffix", '"Use when reviewing" extra', 1, "after the closing quote"],
    ["quoted newline", '"Use when reviewing\\nchanges"', 1, "description must be a single-line string"],
    ["single quote", "'Use when the user''s change needs review.'", 0, "ok: 1 skills"],
    ["double quote escapes", '"Use when \\"review\\" or \\u0063heck appears."', 0, "ok: 1 skills"],
    ["YAML escapes", '"Use when \\x63heck or \\U0001F600 appears."', 0, "ok: 1 skills"],
  ];
  for (const [label, value, status, output] of scalarCases) {
    const root = join(tmp, "scalar-" + label.replaceAll(" ", "-"));
    writeTree(root, {
      "alpha/SKILL.md": FENCE + "\nname: alpha\ndescription: " + value + "\n" + FENCE + "\n\n# alpha\n",
    });
    checkCli(label, root, status, output);
  }
  const typedRoot = join(tmp, "typed-fields");
  writeTree(typedRoot, {
    "alpha/SKILL.md": FENCE + '\nname: "alpha"\ndescription: A quoted name is still a string.\ndisable-model-invocation: false\n' + FENCE + "\n\n# alpha\n",
  });
  checkCli("quoted name", typedRoot, 0, "ok: 1 skills");
  writeTree(typedRoot, {
    "alpha/SKILL.md": FENCE + '\nname: alpha\ndescription: A flag must be a boolean.\ndisable-model-invocation: "true"\n' + FENCE + "\n\n# alpha\n",
  });
  checkCli("quoted flag", typedRoot, 1, "disable-model-invocation must be true or false");
  writeTree(typedRoot, {
    "alpha/SKILL.md": FENCE + "\nname: alpha\ndescription: First value.\ndescription: Second value.\n" + FENCE + "\n\n# alpha\n",
  });
  checkCli("duplicate key", typedRoot, 1, "duplicate frontmatter key description");

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
