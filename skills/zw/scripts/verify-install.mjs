#!/usr/bin/env node
/**
 * verify-install.mjs - install-contract checker.
 *
 * Usage:
 *   node <zw-skill>/scripts/verify-install.mjs <skillsRoot>
 *   node <zw-skill>/scripts/verify-install.mjs <skillsRoot> --all
 *   node <zw-skill>/scripts/verify-install.mjs --test
 *
 * Exit 0 on pass. On failure every problem prints as "<skill>: <problem>"
 * and the exit code is non-zero.
 *
 * Scope: a skills root is usually shared with other skill sets, whose
 * frontmatter and resources follow their own rules. By default only this
 * workflow's entries are judged, the ones named zw or zw-*, and the rest are
 * counted and left alone. --all judges every entry, for a root that holds this
 * workflow and nothing else: this repo's own skills/ tree.
 *
 * What it enforces, per skill directory, including symlinked directories:
 * - The directory name is zw or zw-<kebab-case>. A skill outside that
 *   namespace would be skipped by the default scope once installed.
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
 * - Optional Codex metadata has the same invocation policy as the frontmatter.
 * - Named references/, scripts/, vendor/, playbooks/ and templates/ resources
 *   exist in the installed skill set. First-party Markdown resources are
 *   followed transitively; target-repo paths and Provenance citations are not
 *   install dependencies. Vendor contents are checked by their manifests.
 * - A path named as a sibling, ../<skill>/references/..., ../<skill>/scripts/...,
 *   ../<skill>/vendor/... or ../<skill>/SKILL.md, resolves inside the skills root, so
 *   the shared harness adapter and a skill body read by path are checked rather than skipped.
 * - The body names no file that only exists at the repository root.
 * - Every file a skill ships is named by an installed document: the converse
 *   of the rule above, so a reference whose only pointer sits under
 *   ## Provenance, or a helper no step mentions, fails instead of shipping
 *   unprotected. SKILL.md, agents/ metadata, vendor/ (its manifest is the
 *   authority), scripts/fixtures/ (proven by the script's --test) and
 *   dot-entries need no name.
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
import { existsSync, readdirSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync, symlinkSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_KEYS = new Set(["name", "description", "disable-model-invocation"]);
const ROOT_ONLY = [
  { re: /DESIGN[.]md/, label: "DESIGN.md" },
  { re: /link-skills[.]sh/, label: "link-skills.sh" },
  { re: /samples\//, label: "samples/" },
];
const RELATIVE = /(?:^|[\s`"'(\[])(?:<(?:skill-dir|zw-skill)>\/)?((?:references|scripts|vendor|playbooks|templates)\/[A-Za-z0-9_.\/-]+|(?:playbooks|templates)\/)/g;
const DOCUMENT_RESOURCE = /(?:^|[\s`"'(\[])((?:\.{1,2}\/)+(?:references|scripts|vendor|playbooks|templates)\/[A-Za-z0-9_.\/-]+)/g;
const SIBLING = /(?:^|[\s`"'(\[])(?:\.\.\/)+([A-Za-z0-9_-]+)\/((?:references|scripts|vendor|playbooks|templates)\/[A-Za-z0-9_.\/-]+|SKILL[.]md)/g;
const INSTALLED_RESOURCE = /(?:^|[\s`"'(\[])<skills-root>\/([A-Za-z0-9_-]+)\/((?:references|scripts|vendor|playbooks|templates)\/[A-Za-z0-9_.\/-]+|SKILL[.]md)/g;
const SKILL_NAME = /^zw(?:-[a-z0-9]+)*$/;
const inNamespace = (name) => name === "zw" || name.startsWith("zw-");
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
  const visited = new Set([realpathSync(join(skillDir, "SKILL.md"))]);
  const checked = new Set();
  const trimPath = (value) => value.replace(/[.,;:]+$/, "");

  function inspect(target, owner, origin, token, sibling = false) {
    const rel = relative(owner, target);
    if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) {
      push(origin + " names " + token + " outside its installed skill; use an explicit sibling resource path");
      return;
    }
    if (checked.has(target)) return;
    checked.add(target);
    let info;
    try { info = statSync(target); }
    catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        push(origin + " names " + token + (sibling ? ", which the installed skill set does not ship" : " but the skill does not ship it"));
      } else push(origin + " cannot inspect " + token + " (" + error.code + ")");
      return;
    }
    if (rel === VENDOR_ROOT || rel.startsWith(VENDOR_ROOT + sep)) return;
    const real = realpathSync(target);
    if (visited.has(real)) return;
    visited.add(real);
    if (info.isDirectory()) {
      for (const entry of readdirSync(target, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue;
        inspect(join(target, entry.name), owner, relative(owner, target), entry.name);
      }
    } else if (info.isFile() && extname(target).toLowerCase() === ".md") {
      scan(readFileSync(target, "utf8"), target, owner);
    }
  }

  function scan(raw, source, owner) {
    const text = raw.split(/^## Provenance\s*$/m)[0];
    const origin = source === join(owner, "SKILL.md") ? "body" : relative(owner, source);
    if (origin === "body") {
      for (const { re, label } of ROOT_ONLY) {
        if (re.test(text)) push("body names " + label + ", which exists only at the repository root and is not installed");
      }
    }
    for (const m of text.matchAll(RELATIVE)) {
      const token = trimPath(m[1]);
      inspect(resolve(owner, token), owner, origin, token);
    }
    for (const m of text.matchAll(DOCUMENT_RESOURCE)) {
      const token = trimPath(m[1]);
      inspect(resolve(dirname(source), token), owner, origin, token);
    }
    for (const re of [SIBLING, INSTALLED_RESOURCE]) {
      for (const m of text.matchAll(re)) {
        const token = trimPath(m[2]);
        const siblingDir = join(skillsRoot, m[1]);
        inspect(resolve(siblingDir, token), siblingDir, origin, "../" + m[1] + "/" + token, true);
      }
    }
    for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const token = m[1].split("#")[0];
      if (!token || /^(?:[a-z][a-z\d+.-]*:|<|(?:\.{1,2}\/)*(?:references|scripts|vendor|playbooks|templates)\/|(?:\.\.\/)+[\w-]+\/(?:(?:references|scripts|vendor|playbooks|templates)\/|SKILL[.]md))/i.test(token)) continue;
      if (!/\.(?:md|mjs|js|ts|sh|tsv|yaml|yml|json)$/i.test(token)) continue;
      inspect(resolve(dirname(source), token), owner, origin, token);
    }
  }

  scan(body, join(skillDir, "SKILL.md"), skillDir);
  return checked;
}

function needsNoName(rel) {
  return rel === "SKILL.md" || rel.startsWith("agents/") || rel.startsWith(VENDOR_ROOT + "/") ||
    rel.startsWith("scripts/fixtures/") || rel.split("/").some((part) => part.startsWith("."));
}

function checkCodexInvocation(skillDir, disabled, push) {
  const metadata = join(skillDir, "agents", "openai.yaml");
  if (!existsSync(metadata)) return;
  const lines = readFileSync(metadata, "utf8").replace(/\r\n?/g, "\n").split("\n");
  let inPolicy = false;
  let policySeen = false;
  let childIndent;
  let flagSeen = false;
  let implicit = true;
  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\S/.test(line)) {
      inPolicy = /^policy:/.test(line);
      if (!inPolicy) continue;
      if (policySeen) { push("agents/openai.yaml has a duplicate policy key"); return; }
      policySeen = true;
      if (!/^policy:\s*(?:#.*)?$/.test(line)) { push("agents/openai.yaml policy must be a block mapping"); return; }
      continue;
    }
    if (!inPolicy) continue;
    const field = /^( +)([A-Za-z][A-Za-z0-9_-]*):(?:\s(.*))?$/.exec(line);
    if (!field) { push("agents/openai.yaml policy has an invalid field"); return; }
    childIndent ??= field[1].length;
    if (field[1].length !== childIndent || field[2] !== "allow_implicit_invocation") continue;
    if (flagSeen) { push("agents/openai.yaml has a duplicate allow_implicit_invocation key"); return; }
    flagSeen = true;
    const value = (field[3] ?? "").replace(/\s+#.*$/, "").trim();
    if (value !== "true" && value !== "false") { push("agents/openai.yaml allow_implicit_invocation must be a boolean"); return; }
    implicit = value === "true";
  }
  if (implicit !== !disabled) {
    push("agents/openai.yaml allow_implicit_invocation must be " + !disabled + " to match disable-model-invocation");
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

function runOnSkills(skillsRoot, { all = false } = {}) {
  skillsRoot = resolve(skillsRoot);
  const errors = [];
  if (!existsSync(skillsRoot) || !statSync(skillsRoot).isDirectory()) {
    return { errors: [skillsRoot + ": not a directory"], count: 0, others: 0 };
  }
  let count = 0;
  let others = 0;
  const named = new Set();
  const shipped = [];
  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || (!entry.isDirectory() && !entry.isSymbolicLink())) continue;
    if (!all && !inNamespace(entry.name)) { others += 1; continue; }
    const skillDir = join(skillsRoot, entry.name);
    const push = (msg) => errors.push(entry.name + ": " + msg);
    if (!SKILL_NAME.test(entry.name)) push("directory name is outside the zw namespace; a skill here is named zw or zw-<kebab-case>");
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
    checkCodexInvocation(skillDir, parsed.fields["disable-model-invocation"] === true, push);
    for (const target of checkBody(parsed.body, skillDir, skillsRoot, push)) named.add(target);
    shipped.push({ skillDir, push });
    checkVendor(skillDir, push);
    for (const nested of findNestedSkillFiles(skillDir, skillDir, [])) {
      push("ships a nested SKILL.md at " + nested.slice(skillDir.length + 1) + ", which an installer rewrites as a packaged skill");
    }
  }
  for (const { skillDir, push } of shipped) {
    for (const rel of listFiles(skillDir)) {
      if (needsNoName(rel) || named.has(join(skillDir, rel))) continue;
      push("ships " + rel + ", which no installed document names; name it in the step that uses it, or delete it");
    }
  }
  return { errors, count, others };
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
  const checkCli = (label, root, status, output, flags = [], flagsFirst = false) => {
    const args = flagsFirst ? [...flags, root] : [root, ...flags];
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { encoding: "utf8" });
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
    "zw-alpha/SKILL.md": FENCE + "\nname: zw-alpha\ndescription: A well formed skill.\ndisable-model-invocation: true\n" + FENCE + "\n\n# zw-alpha\n\nRead references/detail.md, run scripts/check.mjs, and load vendor/lib/tool.ts.\n",
    "zw-alpha/references/detail.md": "detail\n",
    "zw-alpha/scripts/check.mjs": "console.log(1);\n",
    "zw-alpha/vendor/lib/tool.ts": vendorSource,
    "zw-alpha/vendor/VENDOR.md": vendorManifest,
    "zw-beta/SKILL.md": FENCE + "\nname: zw-beta\ndescription: \"Quoted: because the value holds a colon.\"\n" + FENCE + "\n\n# zw-beta\n\nNo helpers of its own, but it points at ../zw-alpha/references/detail.md and is read by ../zw-alpha/SKILL.md.\n",
  });
  const good = runOnSkills(goodRoot);
  if (good.errors.length !== 0) failures.push("good fixture: expected 0 errors, got " + good.errors.join(" | "));
  if (good.count !== 2) failures.push("good fixture: expected 2 skills, got " + good.count);

  const badRoot = join(tmp, "bad");
  writeTree(badRoot, {
    "zw-alpha-name/SKILL.md": FENCE + "\nname: not-alpha-name\ndescription: Name disagrees with the directory.\n" + FENCE + "\n\n# zw-alpha-name\n",
    "zw-beta-yaml/SKILL.md": FENCE + "\nname: zw-beta-yaml\ndescription: Unquoted: value with a colon.\n" + FENCE + "\n\n# zw-beta-yaml\n",
    "zw-gamma-missing/SKILL.md": FENCE + "\nname: zw-gamma-missing\ndescription: Names a file it does not ship.\n" + FENCE + "\n\n# zw-gamma-missing\n\nSee references/absent.md.\n",
    "zw-delta-root/SKILL.md": FENCE + "\nname: zw-delta-root\ndescription: Names a repository root file.\n" + FENCE + "\n\n# zw-delta-root\n\nPaths come from DESIGN.md, which only exists in the source repo.\n",
    "zw-epsilon-key/SKILL.md": FENCE + "\nname: zw-epsilon-key\ndescription: Carries a harness specific key.\nallowed-tools: bash\n" + FENCE + "\n\n# zw-epsilon-key\n",
    "zw-zeta-nested/SKILL.md": FENCE + "\nname: zw-zeta-nested\ndescription: Ships a nested fixture skill.\n" + FENCE + "\n\n# zw-zeta-nested\n",
    "zw-zeta-nested/scripts/fixtures/bad/inner/SKILL.md": FENCE + "\nname: inner\ndescription: Unquoted: value with a colon.\n" + FENCE + "\n",
    "zw-eta-nofile/README.md": "no SKILL.md here\n",
    "zw-kappa-sibling/SKILL.md": FENCE + "\nname: zw-kappa-sibling\ndescription: Reads a skill body that is not installed.\n" + FENCE + "\n\n# zw-kappa-sibling\n\nRead ../zw-ghost/SKILL.md for the rules.\n",
    "zw-theta-dangling/SKILL.md": FENCE + "\nname: zw-theta-dangling\ndescription: Points at a skill that is not installed.\n" + FENCE + "\n\n# zw-theta-dangling\n\nRead ../zw-ghost/references/absent.md.\n",
    "zw-theta-vendor/SKILL.md": FENCE + "\nname: zw-theta-vendor\ndescription: Ships an edited vendor copy.\n" + FENCE + "\n\n# zw-theta-vendor\n\nLoad vendor/lib/tool.ts.\n",
    "zw-theta-vendor/vendor/lib/tool.ts": "export const tool = 2;\n",
    "zw-theta-vendor/vendor/lib/extra.ts": "export const extra = 1;\n",
    "zw-theta-vendor/vendor/VENDOR.md": "# VENDOR sample\n\n| file | sha256 | state |\n| --- | --- | --- |\n| lib/tool.ts | " + "a".repeat(64) + " | vendored |\n",
    "zw-iota-vendor/SKILL.md": FENCE + "\nname: zw-iota-vendor\ndescription: Ships a vendor tree with no manifest.\n" + FENCE + "\n\n# zw-iota-vendor\n",
    "zw-iota-vendor/vendor/lib/x.ts": "export const x = 1;\n",
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
    "../zw-ghost/SKILL.md",
    "does not match its VENDOR.md sha256",
    "is not listed in VENDOR.md",
    "but no vendor/VENDOR.md",
  ];
  for (const needle of needles) {
    if (!bad.errors.some((e) => e.includes(needle))) failures.push("bad fixture: expected an error containing " + JSON.stringify(needle));
  }

  const linkedRoot = join(tmp, "linked");
  mkdirSync(linkedRoot);
  symlinkSync(join(goodRoot, "zw-alpha"), join(linkedRoot, "zw-alpha"), "dir");
  symlinkSync(join(goodRoot, "zw-beta"), join(linkedRoot, "zw-beta"), "dir");
  checkCli("linked skills", linkedRoot, 0, "ok: 2 skills");

  const invalidLinkRoot = join(tmp, "invalid-link");
  mkdirSync(invalidLinkRoot);
  symlinkSync(join(badRoot, "zw-beta-yaml"), join(invalidLinkRoot, "zw-beta-yaml"), "dir");
  checkCli("invalid linked skill", invalidLinkRoot, 1, "zw-beta-yaml: description is an unquoted value");

  const brokenLinkRoot = join(tmp, "broken-link");
  mkdirSync(brokenLinkRoot);
  symlinkSync(join(tmp, "absent"), join(brokenLinkRoot, "zw-ghost"), "dir");
  checkCli("broken skill symlink", brokenLinkRoot, 1, "zw-ghost: broken skill symlink");

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
      "zw-alpha/SKILL.md": FENCE + "\nname: zw-alpha\ndescription: " + value + "\n" + FENCE + "\n\n# zw-alpha\n",
    });
    checkCli(label, root, status, output);
  }
  const typedRoot = join(tmp, "typed-fields");
  writeTree(typedRoot, {
    "zw-alpha/SKILL.md": FENCE + '\nname: "zw-alpha"\ndescription: A quoted name is still a string.\ndisable-model-invocation: false\n' + FENCE + "\n\n# zw-alpha\n",
  });
  checkCli("quoted name", typedRoot, 0, "ok: 1 skills");
  writeTree(typedRoot, {
    "zw-alpha/SKILL.md": FENCE + '\nname: zw-alpha\ndescription: A flag must be a boolean.\ndisable-model-invocation: "true"\n' + FENCE + "\n\n# zw-alpha\n",
  });
  checkCli("quoted flag", typedRoot, 1, "disable-model-invocation must be true or false");
  writeTree(typedRoot, {
    "zw-alpha/SKILL.md": FENCE + "\nname: zw-alpha\ndescription: First value.\ndescription: Second value.\n" + FENCE + "\n\n# zw-alpha\n",
  });
  checkCli("duplicate key", typedRoot, 1, "duplicate frontmatter key description");

  const invocationCases = [
    ["implicit human skill", "disable-model-invocation: true\n", "", 1, "allow_implicit_invocation must be false"],
    ["disabled model skill", "", "policy:\n  allow_implicit_invocation: false\n", 1, "allow_implicit_invocation must be true"],
    ["explicit human skill", "disable-model-invocation: true\n", "policy:\n  allow_implicit_invocation: false\n", 0, "ok: 1 skills"],
    ["default model skill", "", "", 0, "ok: 1 skills"],
    ["enabled model skill", "", "policy:\n  allow_implicit_invocation: true\n", 0, "ok: 1 skills"],
    ["string policy flag", "", 'policy:\n  allow_implicit_invocation: "true"\n', 1, "allow_implicit_invocation must be a boolean"],
  ];
  for (const [label, flag, policy, status, output] of invocationCases) {
    const root = join(tmp, label.replaceAll(" ", "-"));
    writeTree(root, {
      "zw-alpha/SKILL.md": FENCE + "\nname: zw-alpha\ndescription: A skill with Codex metadata.\n" + flag + FENCE + "\n\n# zw-alpha\n",
      "zw-alpha/agents/openai.yaml": 'interface:\n  display_name: "Alpha"\n' + policy,
    });
    checkCli(label, root, status, output);
  }

  const resourceSkill = (name, body) => FENCE + "\nname: " + name + "\ndescription: A resource fixture.\n" + FENCE + "\n\n# " + name + "\n\n" + body + "\n";
  const resourceCases = [
    ["missing playbooks", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Choose a route under playbooks/."),
    }, 1, "playbooks/"],
    ["missing template", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Choose playbooks/investigation.md."),
      "zw-alpha/playbooks/investigation.md": "Copy ../templates/decision.tsv before the first attempt.\n",
    }, 1, "../templates/decision.tsv"],
    ["indirect helper", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Read references/guide.md."),
      "zw-alpha/references/guide.md": "Run scripts/missing.mjs.\n",
    }, 1, "references/guide.md names scripts/missing.mjs"],
    ["indirect sibling helper", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Read ../zw-beta/references/guide.md."),
      "zw-beta/SKILL.md": resourceSkill("zw-beta", "No direct helper."),
      "zw-beta/references/guide.md": "Run scripts/missing.mjs.\n",
    }, 1, "references/guide.md names scripts/missing.mjs"],
    ["missing local link", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Read references/guide.md."),
      "zw-alpha/references/guide.md": "Read [the detail](detail.md).\n",
    }, 1, "references/guide.md names detail.md"],
    ["missing parent link", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Read references/guide.md."),
      "zw-alpha/references/guide.md": "Read [the detail](../detail.md).\n",
    }, 1, "references/guide.md names ../detail.md"],
    ["missing dotted resource", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Read ./references/guide.md."),
    }, 1, "./references/guide.md"],
    ["resource cycle", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Read references/a.md and choose playbooks/feature.md."),
      "zw-alpha/references/a.md": "Read [the detail](b.md).\n",
      "zw-alpha/references/b.md": "Read [the entry](a.md), then run scripts/check.mjs.\n",
      "zw-alpha/playbooks/feature.md": "Read ../references/a.md and copy ../templates/decision.tsv.\n",
      "zw-alpha/templates/decision.tsv": "id\tnote\n",
      "zw-alpha/scripts/check.mjs": "console.log(1);\n",
    }, 0, "ok: 1 skills"],
    ["resource escapes skill", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Run scripts/../../zw-beta/scripts/check.mjs."),
      "zw-beta/SKILL.md": resourceSkill("zw-beta", "No direct helper."),
      "zw-beta/scripts/check.mjs": "console.log(1);\n",
    }, 1, "outside its installed skill"],
    ["target and provenance paths", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Run <repo>/scripts/verify.mjs.\n\n## Provenance\n\nCopied from `skills/poteto-mode/playbooks/hillclimb.md` upstream; its DESIGN.md and references/upstream.md record the source."),
    }, 0, "ok: 1 skills"],
    ["installed skill command", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Run node <skill-dir>/scripts/check.mjs."),
    }, 1, "scripts/check.mjs"],
    ["quoted installed command", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", 'Run node "<skill-dir>/scripts/check.mjs".'),
    }, 1, "scripts/check.mjs"],
    ["unnamed resource", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Read references/guide.md."),
      "zw-alpha/references/guide.md": "The guide.\n",
      "zw-alpha/references/stray.md": "Nothing points here.\n",
    }, 1, "zw-alpha: ships references/stray.md, which no installed document names"],
    ["resource named only under Provenance", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Write the draft.\n\n## Provenance\n\nTemplate: `references/template.md`."),
      "zw-alpha/references/template.md": "The template.\n",
    }, 1, "zw-alpha: ships references/template.md, which no installed document names"],
    ["unnamed file at the skill root", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "No resources."),
      "zw-alpha/NOTES.md": "Left behind.\n",
    }, 1, "zw-alpha: ships NOTES.md, which no installed document names"],
    ["resource named by a sibling", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Read ../zw-beta/references/shared.md."),
      "zw-beta/SKILL.md": resourceSkill("zw-beta", "No direct resource."),
      "zw-beta/references/shared.md": "Shared.\n",
    }, 0, "ok: 2 skills"],
    ["resources named by their directory", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Choose a route under playbooks/."),
      "zw-alpha/playbooks/feature.md": "One.\n",
      "zw-alpha/playbooks/ship.md": "Two.\n",
    }, 0, "ok: 1 skills"],
    ["fixtures, metadata and dotfiles need no name", {
      "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "Run scripts/check.mjs."),
      "zw-alpha/scripts/check.mjs": "console.log(1);\n",
      "zw-alpha/scripts/fixtures/good/.scratch/case/spec.md": "A fixture.\n",
      "zw-alpha/scripts/fixtures/bad/case.md": "Another fixture.\n",
      "zw-alpha/agents/openai.yaml": 'interface:\n  display_name: "Alpha"\n',
      "zw-alpha/.DS_Store": "x",
    }, 0, "ok: 1 skills"],
  ];
  for (const [label, files, status, output] of resourceCases) {
    const root = join(tmp, label.replaceAll(" ", "-"));
    writeTree(root, files);
    checkCli(label, root, status, output);
  }

  const sharedRoot = join(tmp, "shared-root");
  writeTree(sharedRoot, {
    "zw-alpha/SKILL.md": resourceSkill("zw-alpha", "No resources."),
    "other-skill/SKILL.md": FENCE + "\nname: other-skill\ndescription: Another skill set ships this.\nmetadata:\n  author: someone\n" + FENCE + "\n\n# other-skill\n",
    "other-skill/references/unnamed.md": "Theirs, not ours.\n",
  });
  symlinkSync(join(tmp, "absent"), join(sharedRoot, "stale-foreign-link"), "dir");
  checkCli("shared root, default scope", sharedRoot, 0, "ok: 1 skills, 2 other entries not checked");
  checkCli("shared root, every directory", sharedRoot, 1, "other-skill: frontmatter key metadata is outside the portable subset", ["--all"]);
  checkCli("every directory names the namespace", sharedRoot, 1, "other-skill: directory name is outside the zw namespace", ["--all"]);
  checkCli("every directory reports a foreign broken link", sharedRoot, 1, "stale-foreign-link: broken skill symlink", ["--all"]);
  checkCli("flag before the root", sharedRoot, 1, "other-skill: directory name is outside the zw namespace", ["--all"], true);

  const namedRoot = join(tmp, "name-shape");
  writeTree(namedRoot, {
    "zw-Bad_Name/SKILL.md": FENCE + "\nname: zw-Bad_Name\ndescription: In the namespace, wrong shape.\n" + FENCE + "\n\n# zw-Bad_Name\n",
  });
  checkCli("name shape", namedRoot, 1, "zw-Bad_Name: directory name is outside the zw namespace");

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
  if (args.length === 1 && args[0] === "--test") process.exit(selfTest() ? 0 : 1);
  const roots = args.filter((arg) => !arg.startsWith("-"));
  const flags = args.filter((arg) => arg.startsWith("-"));
  if (roots.length !== 1 || flags.some((flag) => flag !== "--all") || flags.length > 1) {
    console.error("Usage: node <zw-skill>/scripts/verify-install.mjs <skillsRoot> [--all]");
    console.error("       node <zw-skill>/scripts/verify-install.mjs --test");
    console.error("Without --all only zw and zw-* entries are checked; --all checks every entry in the root.");
    process.exit(2);
  }
  const { errors, count, others } = runOnSkills(roots[0], { all: flags.length === 1 });
  if (errors.length) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  const skipped = others === 0 ? "" : ", " + others + " other " + (others === 1 ? "entry" : "entries") + " not checked (--all checks every entry)";
  console.log("ok: " + count + " skills" + skipped);
}

main();
