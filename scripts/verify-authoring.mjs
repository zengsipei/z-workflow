#!/usr/bin/env node
/**
 * verify-authoring.mjs - the skill authoring rules a script can read.
 *
 * Usage:
 *   node scripts/verify-authoring.mjs [<skillsDir>]
 *   node scripts/verify-authoring.mjs --test
 *
 * AGENTS.md numbers the rules; this checks the mechanical ones, per skill:
 * - Rule 3: a model-invoked description starts "Use when", and a human-invoked one does not.
 * - Rule 4: the body opens with "# <name>"; Fires when, Steps, Done, Harness and Provenance are
 *   present; those and Artifacts keep that order; Harness names DSH, Claude Code and Codex.
 * - Rule 5: Steps holds no CLI flag.
 * - Rule 6: SKILL.md stays under 120 lines.
 * - Rule 8: no em dash in SKILL.md or in a Markdown resource the skill wrote itself.
 *
 * verify-install.mjs owns the install contract and rules 1 and 2; scripts/upstream-drift.mjs owns
 * the Upstream lines under Provenance. A vendor tree and a script's fixtures are not this repo's
 * prose and are skipped.
 *
 * Exit 0 on pass. On failure every problem prints as "<skill>: <problem>" and the exit code is 1.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ORDERED = ["Fires when", "Steps", "Artifacts", "Done", "Harness", "Provenance"];
const REQUIRED = ["Fires when", "Steps", "Done", "Harness", "Provenance"];
const HARNESSES = ["DSH", "Claude Code", "Codex"];
const MAX_LINES = 120;
const EM_DASH = "—";
const CLI_FLAG = /(?:^|[\s\x60"'(\[])(--[a-z][a-z0-9-]*)/;

function markdownFiles(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.name.startsWith(".") || rel === "vendor" || rel === "scripts/fixtures") continue;
    if (entry.isDirectory()) out.push(...markdownFiles(join(dir, entry.name), rel));
    else if (entry.name.toLowerCase().endsWith(".md")) out.push(rel);
  }
  return out;
}

function checkSkill(skillDir, name, push) {
  const lines = readFileSync(join(skillDir, "SKILL.md"), "utf8").replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
  if (lines.length >= MAX_LINES) push("SKILL.md has " + lines.length + " lines; rule 6 keeps it under " + MAX_LINES + ", so move detail into references/");

  const close = lines[0] === "---" ? lines.indexOf("---", 1) : -1;
  const front = close === -1 ? [] : lines.slice(1, close);
  const body = lines.slice(close + 1);
  const description = (front.find((line) => line.startsWith("description:")) || "").slice("description:".length).trim().replace(/^["']/, "");
  const human = front.some((line) => /^disable-model-invocation:\s*true\s*$/.test(line));
  const triggers = /^Use when\b/.test(description);
  if (human && triggers) push("a human-invoked description is one plain line, not \"Use when\" trigger phrasing (rule 3)");
  if (!human && !triggers) push("a model-invoked description starts \"Use when\", because it is what the model matches a request against (rule 3)");

  const first = body.find((line) => line.trim() !== "");
  if (first !== "# " + name) push("the body opens with \"# " + name + "\", found " + JSON.stringify(first ?? "") + " (rule 4)");

  const headings = [];
  let fenced = false;
  body.forEach((line, index) => {
    if (/^\s{0,3}\x60\x60\x60/.test(line)) fenced = !fenced;
    else if (!fenced && line.startsWith("## ")) headings.push({ title: line.slice(3).trim(), index });
  });
  for (const title of REQUIRED) if (!headings.some((h) => h.title === title)) push("no \"## " + title + "\" section (rule 4)");
  const present = headings.filter((h) => ORDERED.includes(h.title));
  for (let i = 1; i < present.length; i++) {
    if (ORDERED.indexOf(present[i].title) < ORDERED.indexOf(present[i - 1].title)) {
      push("\"## " + present[i].title + "\" comes after \"## " + present[i - 1].title + "\"; rule 4 fixes the order " + ORDERED.join(", "));
    }
  }
  const section = (title) => {
    const at = headings.findIndex((h) => h.title === title);
    if (at === -1) return null;
    return body.slice(headings[at].index + 1, at + 1 < headings.length ? headings[at + 1].index : body.length);
  };
  const harness = section("Harness");
  if (harness) for (const host of HARNESSES) if (!harness.join("\n").includes(host)) push("\"## Harness\" does not say what happens in " + host + " (rule 4)");
  const steps = section("Steps");
  if (steps) {
    steps.forEach((line) => {
      const flag = CLI_FLAG.exec(line);
      if (flag) push("\"## Steps\" names the CLI flag " + flag[1] + "; rule 5 puts flags under \"## Harness\"");
    });
  }

  for (const rel of markdownFiles(skillDir)) {
    readFileSync(join(skillDir, rel), "utf8").split("\n").forEach((line, index) => {
      if (line.includes(EM_DASH)) push(rel + ":" + (index + 1) + ": an em dash; rule 8 bans it");
    });
  }
}

function runOnSkills(skillsDir) {
  const errors = [];
  let count = 0;
  for (const name of readdirSync(skillsDir).sort()) {
    const skillDir = join(skillsDir, name);
    if (name.startsWith(".") || !existsSync(join(skillDir, "SKILL.md"))) continue;
    count += 1;
    checkSkill(skillDir, name, (problem) => errors.push(name + ": " + problem));
  }
  return { errors, count };
}

function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), "verify-authoring-"));
  const failures = [];
  const parts = (overrides = {}) => ({
    front: "name: zw-alpha\ndescription: Explain one thing plainly.\ndisable-model-invocation: true",
    title: "# zw-alpha",
    intro: "One sentence on the job.",
    sections: [
      ["Fires when", "The user asks."],
      ["Steps", "1. Run scripts/check.mjs against the target repo.\n2. Compare a value like -1 or a range 3--4 written badly, which is not a flag."],
      ["Artifacts", "None."],
      ["Done", "- It ran."],
      ["Harness", "- DSH: pass --verbose here.\n- Claude Code: the same.\n- Codex: sequential."],
      ["Provenance", "- Upstream: none"],
    ],
    ...overrides,
  });
  const render = (p) => "---\n" + p.front + "\n---\n\n" + p.title + "\n\n" + p.intro + "\n\n" + p.sections.map(([title, text]) => "## " + title + "\n\n" + text + "\n").join("\n");
  const without = (title) => parts().sections.filter(([t]) => t !== title);
  const withText = (title, text) => parts().sections.map(([t, body]) => (t === title ? [t, text] : [t, body]));
  const swapped = () => { const s = parts().sections; return [s[0], s[1], s[3], s[2], s[4], s[5]]; };
  const cases = [
    ["a well formed skill", { "zw-alpha/SKILL.md": render(parts()) }, 0, "ok: 1 skills"],
    ["a model-invoked skill", { "zw-alpha/SKILL.md": render(parts({ front: "name: zw-alpha\ndescription: Use when the user asks for one thing." })) }, 0, "ok: 1 skills"],
    ["extra sections and an omitted Artifacts", { "zw-alpha/SKILL.md": render(parts({ sections: [...without("Artifacts").slice(0, 2), ["Posture", "Stay calm."], ...without("Artifacts").slice(2)] })) }, 0, "ok: 1 skills"],
    ["a fenced heading is not a section", { "zw-alpha/SKILL.md": render(parts({ sections: withText("Steps", "1. Write this block:\n\n\x60\x60\x60markdown\n## Done\n\x60\x60\x60") })) }, 0, "ok: 1 skills"],
    ["vendored and fixture prose is not judged", {
      "zw-alpha/SKILL.md": render(parts()),
      "zw-alpha/vendor/upstream/notes.md": "Upstream wrote this " + EM_DASH + " verbatim.\n",
      "zw-alpha/scripts/fixtures/bad/case.md": "A fixture " + EM_DASH + " on purpose.\n",
    }, 0, "ok: 1 skills"],
    ["human-invoked with trigger phrasing", { "zw-alpha/SKILL.md": render(parts({ front: "name: zw-alpha\ndescription: Use when the user asks.\ndisable-model-invocation: true" })) }, 1, "zw-alpha: a human-invoked description is one plain line"],
    ["model-invoked without trigger phrasing", { "zw-alpha/SKILL.md": render(parts({ front: "name: zw-alpha\ndescription: Explain one thing plainly." })) }, 1, "zw-alpha: a model-invoked description starts \"Use when\""],
    ["quoted trigger phrasing still counts", { "zw-alpha/SKILL.md": render(parts({ front: "name: zw-alpha\ndescription: \"Use when: the user asks.\"\ndisable-model-invocation: true" })) }, 1, "zw-alpha: a human-invoked description is one plain line"],
    ["wrong title", { "zw-alpha/SKILL.md": render(parts({ title: "# Alpha" })) }, 1, "zw-alpha: the body opens with \"# zw-alpha\", found \"# Alpha\""],
    ...REQUIRED.map((title) => ["missing " + title, { "zw-alpha/SKILL.md": render(parts({ sections: without(title) })) }, 1, "zw-alpha: no \"## " + title + "\" section"]),
    ["sections out of order", { "zw-alpha/SKILL.md": render(parts({ sections: swapped() })) }, 1, "zw-alpha: \"## Artifacts\" comes after \"## Done\""],
    ...HARNESSES.map((host) => ["Harness without " + host, { "zw-alpha/SKILL.md": render(parts({ sections: withText("Harness", HARNESSES.filter((h) => h !== host).map((h) => "- " + h + ": fine.").join("\n")) })) }, 1, "zw-alpha: \"## Harness\" does not say what happens in " + host]),
    ["a flag in Steps", { "zw-alpha/SKILL.md": render(parts({ sections: withText("Steps", "1. Run \x60scripts/check.mjs --list\x60 first.") })) }, 1, "zw-alpha: \"## Steps\" names the CLI flag --list"],
    ["a flag in a Steps subsection", { "zw-alpha/SKILL.md": render(parts({ sections: withText("Steps", "### First pass\n\n1. Pass --force to it.") })) }, 1, "zw-alpha: \"## Steps\" names the CLI flag --force"],
    ["too long", { "zw-alpha/SKILL.md": render(parts({ intro: Array.from({ length: 110 }, (_, i) => "Line " + i + ".").join("\n") })) }, 1, "zw-alpha: SKILL.md has"],
    ["an em dash in the body", { "zw-alpha/SKILL.md": render(parts({ intro: "One sentence " + EM_DASH + " with a dash." })) }, 1, "zw-alpha: SKILL.md:9: an em dash"],
    ["an em dash in a reference", { "zw-alpha/SKILL.md": render(parts()), "zw-alpha/references/detail.md": "Fine.\nNot fine " + EM_DASH + " here.\n" }, 1, "zw-alpha: references/detail.md:2: an em dash"],
  ];
  for (const [label, files, status, output] of cases) {
    const root = join(tmp, label.replace(/[^a-z0-9]+/gi, "-"));
    for (const [rel, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), content, "utf8");
    }
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), root], { encoding: "utf8" });
    const actual = result.stdout + result.stderr;
    if (result.status !== status || !actual.includes(output)) {
      failures.push(label + ": expected exit " + status + " and " + JSON.stringify(output) + ", got exit " + result.status + " and " + JSON.stringify(actual));
    }
  }
  const lineCount = (text) => text.replace(/\n$/, "").split("\n").length;
  const sized = (total) => {
    const padding = total - lineCount(render(parts({ intro: "x" }))) + 1;
    return render(parts({ intro: Array.from({ length: padding }, (_, i) => "Line " + i + ".").join("\n") }));
  };
  const edge = join(tmp, "edge");
  mkdirSync(join(edge, "zw-alpha"), { recursive: true });
  for (const [total, passes] of [[MAX_LINES - 1, true], [MAX_LINES, false]]) {
    const text = sized(total);
    if (lineCount(text) !== total) failures.push("the line-limit fixture should have " + total + " lines, got " + lineCount(text));
    writeFileSync(join(edge, "zw-alpha", "SKILL.md"), text, "utf8");
    const found = runOnSkills(edge).errors;
    if (passes && found.length !== 0) failures.push("a file of " + total + " lines passes, got " + found.join(" | "));
    if (!passes && !found.some((e) => e.includes("SKILL.md has " + total + " lines"))) failures.push("a file of " + total + " lines fails, got " + found.join(" | "));
  }

  rmSync(tmp, { recursive: true, force: true });
  if (failures.length) {
    for (const failure of failures) console.error("authoring --test FAIL: " + failure);
    return false;
  }
  console.log("authoring --test: all ok");
  return true;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--test") process.exit(selfTest() ? 0 : 1);
  if (args.length > 1 || (args[0] || "").startsWith("-")) {
    console.error("Usage: node scripts/verify-authoring.mjs [<skillsDir>]");
    console.error("       node scripts/verify-authoring.mjs --test");
    process.exit(2);
  }
  const skillsDir = resolve(args[0] ?? join(HERE, "..", "skills"));
  if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) {
    console.error(skillsDir + ": not a directory");
    process.exit(2);
  }
  const { errors, count } = runOnSkills(skillsDir);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  console.log("ok: " + count + " skills");
}

main();
