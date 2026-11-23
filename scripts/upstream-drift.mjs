#!/usr/bin/env node
/**
 * upstream-drift.mjs - say which pinned upstream sources have moved.
 *
 * Usage:
 *   node scripts/upstream-drift.mjs [--skills <dir>] [--cache <dir>] [--remote <base>] [--verbose]
 *   node scripts/upstream-drift.mjs --records [--skills <dir>]
 *   node scripts/upstream-drift.mjs --test
 *
 * A skill records where it came from as one line per source, under ## Provenance in its SKILL.md
 * or in its vendor/VENDOR.md:
 *
 *   - Upstream: `owner/repo` at commit `sha`, path `dir/or/file`.
 *
 * A skill written here with no source says `- Upstream: none`. For every line this script compares
 * the path at the pinned commit with the same path at the head of the upstream's default branch and
 * prints same, moved with what changed, or gone. It also proves the record: a commit the upstream
 * does not have, or a path the pinned commit does not hold, is a problem and not a status.
 *
 * It reads the network, so it is a report and not part of the gate. The gate runs --test, and
 * --records, which checks the form of every line and that no skill lacks one, and reads no remote.
 * Each upstream is mirrored without file contents under --cache, by default refs/.upstream-cache
 * in this repo, which .gitignore already covers. --remote replaces https://github.com/.
 *
 * Exit 0 when every record was read and compared, whatever moved. Exit 1 when a record is wrong or
 * unreadable, or a remote could not be reached. Exit 2 on a usage error.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const UPSTREAM = /^- Upstream: `([\w.-]+\/[\w.-]+)` at commit `([0-9a-f]{7,40})`, path `([^`\s]+)`/;
const NO_UPSTREAM = /^- Upstream: none\b/;

function git(args, gitDir) {
  const full = gitDir ? ["--git-dir=" + gitDir, ...args] : args;
  const result = spawnSync("git", full, { encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  return { ok: result.status === 0, out: (result.stdout || "").trim(), err: (result.stderr || "").trim() };
}

function recordsIn(skill, where, text, firstLine) {
  const found = { records: [], problems: [], none: false };
  text.split("\n").forEach((line, index) => {
    if (!line.startsWith("- Upstream:")) return;
    const at = skill + "/" + where + ":" + (firstLine + index);
    if (NO_UPSTREAM.test(line)) { found.none = true; return; }
    const match = UPSTREAM.exec(line);
    if (!match) {
      found.problems.push(at + ": an Upstream line reads `owner/repo` at commit `sha`, path `dir/or/file`");
      return;
    }
    found.records.push({ skill, where, at, repo: match[1], commit: match[2], path: match[3] });
  });
  return found;
}

function collect(skillsDir) {
  const records = [];
  const problems = [];
  for (const name of readdirSync(skillsDir).sort()) {
    const skillFile = join(skillsDir, name, "SKILL.md");
    if (name.startsWith(".") || !existsSync(skillFile)) continue;
    const lines = readFileSync(skillFile, "utf8").replace(/\r\n?/g, "\n").split("\n");
    const heading = lines.findIndex((line) => /^## Provenance\s*$/.test(line));
    const parts = [];
    if (heading !== -1) parts.push(recordsIn(name, "SKILL.md", lines.slice(heading + 1).join("\n"), heading + 2));
    const manifest = join(skillsDir, name, "vendor", "VENDOR.md");
    if (existsSync(manifest)) parts.push(recordsIn(name, "vendor/VENDOR.md", readFileSync(manifest, "utf8").replace(/\r\n?/g, "\n"), 1));
    let count = 0;
    let none = false;
    for (const part of parts) {
      records.push(...part.records);
      problems.push(...part.problems);
      count += part.records.length + part.problems.length;
      none = none || part.none;
    }
    if (count === 0 && !none) problems.push(name + "/SKILL.md: no Upstream line under ## Provenance; a skill with no source says `- Upstream: none`");
  }
  return { records, problems };
}

function mirror(repo, cacheDir, remoteBase) {
  const dir = join(cacheDir, repo.replace("/", "__") + ".git");
  const url = remoteBase + repo + ".git";
  if (!existsSync(dir)) {
    mkdirSync(cacheDir, { recursive: true });
    const cloned = git(["clone", "--quiet", "--mirror", "--filter=blob:none", url, dir]);
    if (!cloned.ok) return { error: "cannot clone " + url + ": " + cloned.err.split("\n").pop() };
  } else {
    const fetched = git(["fetch", "--quiet", "--prune", "origin"], dir);
    if (!fetched.ok) return { error: "cannot fetch " + url + ": " + fetched.err.split("\n").pop() };
  }
  const head = git(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], dir);
  if (!head.ok) return { error: url + " has no default branch head" };
  return { dir, head: head.out };
}

function compare(record, dir) {
  const pin = git(["rev-parse", "--verify", "--quiet", record.commit + "^{commit}"], dir);
  if (!pin.ok) return { status: "problem", detail: "commit " + record.commit + " is not in " + record.repo + ", or the short id is ambiguous" };
  const then = git(["rev-parse", "--verify", "--quiet", pin.out + ":" + record.path], dir);
  if (!then.ok) return { status: "problem", detail: record.path + " does not exist at " + record.commit };
  const now = git(["rev-parse", "--verify", "--quiet", "HEAD:" + record.path], dir);
  if (!now.ok) return { status: "gone", detail: "the path no longer exists upstream", files: [] };
  if (then.out === now.out) return { status: "same", detail: "", files: [] };
  const diff = git(["diff", "--name-status", "--no-renames", pin.out, "HEAD", "--", record.path], dir);
  const files = diff.out.split("\n").filter(Boolean).map((line) => { const [kind, file] = line.split("\t"); return { kind, file }; });
  const count = (kind) => files.filter((entry) => entry.kind === kind).length;
  const parts = [[count("M"), "changed"], [count("A"), "added"], [count("D"), "removed"]].filter(([n]) => n > 0).map(([n, word]) => n + " " + word);
  return { status: "moved", detail: parts.join(", "), files };
}

function report({ skills, cache, remote }) {
  const { records, problems } = collect(skills);
  const byRepo = new Map();
  for (const record of records) byRepo.set(record.repo, [...(byRepo.get(record.repo) || []), record]);
  const repos = [];
  for (const [repo, list] of [...byRepo].sort((a, b) => a[0].localeCompare(b[0]))) {
    const source = mirror(repo, cache, remote);
    if (source.error) {
      problems.push(repo + ": " + source.error);
      continue;
    }
    const date = (rev) => git(["log", "-1", "--format=%cs", rev], source.dir).out;
    const rows = list.map((record) => ({ ...record, ...compare(record, source.dir) }));
    for (const row of rows) if (row.status === "problem") problems.push(row.at + ": " + row.detail);
    repos.push({ repo, head: source.head.slice(0, 7), headDate: date(source.head), rows: rows.filter((row) => row.status !== "problem") });
  }
  return { repos, problems, total: records.length };
}

const ORDER = { gone: 0, moved: 1, same: 2 };
const counted = (n, noun) => n + " " + noun + (n === 1 ? "" : "s");

function print(result, verbose) {
  const tally = { same: 0, moved: 0, gone: 0 };
  for (const { repo, head, headDate, rows } of result.repos) {
    console.log(repo + "  head " + head + " " + headDate);
    const sorted = [...rows].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.path.localeCompare(b.path) || a.skill.localeCompare(b.skill));
    for (const row of sorted) {
      tally[row.status] += 1;
      const owner = row.where === "SKILL.md" ? row.skill : row.skill + " vendor";
      console.log("  " + row.status.padEnd(5) + "  " + row.commit.slice(0, 7) + "  " + row.path + "  [" + owner + "]" + (row.detail ? "  " + row.detail : ""));
      if (verbose) for (const file of row.files) console.log("           " + file.kind + " " + file.file);
    }
    console.log("");
  }
  for (const problem of result.problems) console.error("problem: " + problem);
  console.log("upstream drift: " + counted(result.total, "recorded source") + ", " + tally.moved + " moved, " + tally.gone + " gone, " + tally.same + " same, " + counted(result.problems.length, "problem"));
}

function selfTest() {
  const failures = [];
  const check = (label, ok) => { if (!ok) failures.push(label); };
  const tmp = mkdtempSync(join(tmpdir(), "upstream-drift-"));
  try {
    const work = join(tmp, "work");
    const put = (root, rel, body) => { const full = join(root, rel); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, body, "utf8"); };
    const inWork = (...args) => {
      const result = spawnSync("git", ["-C", work, "-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", ...args], { encoding: "utf8" });
      if (result.status !== 0) throw new Error("git " + args.join(" ") + ": " + result.stderr);
      return result.stdout.trim();
    };
    mkdirSync(work);
    inWork("init", "--quiet", "--initial-branch=main");
    put(work, "skills/alpha/SKILL.md", "alpha one\n");
    put(work, "skills/beta/SKILL.md", "beta one\n");
    put(work, "skills/gone/notes.md", "soon deleted\n");
    put(work, "skills/alpha/old-name.md", "a file that upstream renames without editing it\n");
    put(work, "agents/helper.md", "helper one\n");
    put(work, "skills/still/SKILL.md", "never edited\n");
    inWork("add", "-A"); inWork("commit", "--quiet", "-m", "first");
    const pinned = inWork("rev-parse", "HEAD");
    put(work, "skills/alpha/SKILL.md", "alpha two\n");
    put(work, "skills/alpha/extra.md", "new file\n");
    inWork("mv", "skills/alpha/old-name.md", "skills/alpha/new-name.md");
    rmSync(join(work, "skills", "gone"), { recursive: true });
    put(work, "agents/helper.md", "helper two\n");
    inWork("add", "-A"); inWork("commit", "--quiet", "-m", "second");
    const bare = join(tmp, "remotes", "acme", "tools.git");
    mkdirSync(dirname(bare), { recursive: true });
    spawnSync("git", ["clone", "--quiet", "--bare", work, bare]);

    const line = (path, commit = pinned, repo = "acme/tools") => "- Upstream: `" + repo + "` at commit `" + commit + "`, path `" + path + "`.";
    const skill = (name, provenance) => "---\nname: " + name + "\ndescription: A fixture.\n---\n\n# " + name + "\n\n## Steps\n\n- Upstream: `not/provenance` at commit `0000000`, path `ignored/outside/the/section`.\n" + (provenance === null ? "" : "\n## Provenance\n\n" + provenance + "\n");
    const skills = join(tmp, "skills");
    put(skills, "zw-alpha/SKILL.md", skill("zw-alpha", line("skills/alpha") + " Kept the loop.\n- Changed: the names."));
    put(skills, "zw-beta/SKILL.md", skill("zw-beta", line("skills/beta/", pinned.slice(0, 7))));
    put(skills, "zw-gone/SKILL.md", skill("zw-gone", line("skills/gone")));
    put(skills, "zw-self/SKILL.md", skill("zw-self", "- Upstream: none, written here."));
    put(skills, "zw-vendor/SKILL.md", skill("zw-vendor", "- Upstream: none, it only drives a vendored file."));
    put(skills, "zw-vendor/vendor/VENDOR.md", "# Vendor\n\n" + line("agents/helper.md") + "\n\n| file | sha256 | state |\n| --- | --- | --- |\n");
    put(skills, "zw-still/SKILL.md", skill("zw-still", line("skills/still")));
    put(skills, ".hidden/SKILL.md", skill(".hidden", null));
    const options = { skills, cache: join(tmp, "cache"), remote: "file://" + join(tmp, "remotes") + "/" };

    const first = report(options);
    const row = (owner) => first.repos.flatMap((entry) => entry.rows).find((entry) => entry.skill === owner);
    check("a clean fixture has no problems: " + first.problems.join(" | "), first.problems.length === 0);
    check("a changed path is moved, and a rename counts as one added and one removed", row("zw-alpha").status === "moved" && row("zw-alpha").detail === "1 changed, 2 added, 1 removed");
    check("an unchanged path is same, by short id and with a trailing slash", row("zw-beta").status === "same");
    check("a deleted path is gone", row("zw-gone").status === "gone");
    check("a vendor manifest line is read", row("zw-vendor").status === "moved" && row("zw-vendor").where === "vendor/VENDOR.md");
    check("a line outside Provenance is not a record, and a dot directory is not a skill", first.total === 5);
    check("the head is the default branch tip", first.repos[0].head === inWork("rev-parse", "HEAD").slice(0, 7));

    put(work, "skills/beta/SKILL.md", "beta two\n");
    inWork("add", "-A"); inWork("commit", "--quiet", "-m", "third");
    spawnSync("git", ["-C", work, "push", "--quiet", bare, "main"]);
    const second = report(options);
    check("a second run fetches the mirror", second.repos.flatMap((entry) => entry.rows).find((entry) => entry.skill === "zw-beta").status === "moved");

    const later = join(tmp, "remotes", "acme", "later.git");
    spawnSync("git", ["clone", "--quiet", "--bare", work, later]);
    put(skills, "zw-later/SKILL.md", skill("zw-later", line("skills/alpha", pinned, "acme/later")));
    check("a second remote is mirrored", report(options).problems.length === 0);
    rmSync(later, { recursive: true });
    spawnSync("git", ["init", "--quiet", "--bare", join(tmp, "remotes", "acme", "empty.git")]);
    put(skills, "zw-empty/SKILL.md", skill("zw-empty", line("skills/alpha", pinned, "acme/empty")));
    put(skills, "zw-shortpin/SKILL.md", skill("zw-shortpin", line("skills/alpha", pinned.slice(0, 6))));
    put(skills, "zw-badpath/SKILL.md", skill("zw-badpath", line("skills/never-existed")));
    put(skills, "zw-badpin/SKILL.md", skill("zw-badpin", line("skills/alpha", "abcdef0123")));
    put(skills, "zw-malformed/SKILL.md", skill("zw-malformed", "- Upstream: acme tools at 1234567."));
    put(skills, "zw-silent/SKILL.md", skill("zw-silent", "Copied from somewhere."));
    put(skills, "zw-headless/SKILL.md", skill("zw-headless", null));
    put(skills, "zw-offline/SKILL.md", skill("zw-offline", line("skills/alpha", pinned, "acme/missing")));
    const bad = report(options);
    const has = (needle) => bad.problems.some((problem) => problem.includes(needle));
    check("a path the pin never held is a problem", has("zw-badpath/SKILL.md:14: skills/never-existed does not exist at"));
    check("a commit the upstream lacks is a problem", has("zw-badpin/SKILL.md:14: commit abcdef0123 is not in acme/tools"));
    check("a malformed line is a problem", has("zw-malformed/SKILL.md:14: an Upstream line reads"));
    check("a skill with no line is a problem", has("zw-silent/SKILL.md: no Upstream line") && has("zw-headless/SKILL.md: no Upstream line"));
    check("a commit id shorter than seven characters is a malformed line", has("zw-shortpin/SKILL.md:14: an Upstream line reads"));
    check("a remote that cannot be read is a problem", has("acme/missing: cannot clone"));
    check("a mirror whose remote is gone is a problem", has("acme/later: cannot fetch"));
    check("a remote with no commits is a problem", has("acme/empty: ") && has("empty.git has no default branch head"));
    check("the readable records are still compared", bad.repos.length === 1 && bad.repos[0].repo === "acme/tools" && bad.repos[0].rows.length === 5);

    const cli = (dir) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--skills", dir, "--cache", options.cache, "--remote", options.remote, "--verbose"], { encoding: "utf8" });
    const failing = cli(skills);
    check("problems exit 1 and print on stderr", failing.status === 1 && failing.stderr.includes("problem: zw-malformed/SKILL.md:14"));
    const offline = (dir) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--skills", dir, "--records", "--remote", "file:///nowhere/"], { encoding: "utf8" });
    const badRecords = offline(skills);
    check("--records fails a malformed or missing line", badRecords.status === 1 && badRecords.stderr.includes("problem: zw-malformed/SKILL.md:14") && badRecords.stderr.includes("problem: zw-silent/SKILL.md: no Upstream line"));
    check("--records reads no remote", !badRecords.stderr.includes("cannot clone"));
    for (const name of ["zw-badpath", "zw-badpin", "zw-malformed", "zw-silent", "zw-headless", "zw-offline", "zw-later", "zw-empty", "zw-shortpin"]) rmSync(join(skills, name), { recursive: true });
    const goodRecords = offline(skills);
    check("--records passes well formed lines without a network", goodRecords.status === 0 && goodRecords.stdout === "ok: 5 recorded sources in 5 skills\n");
    const passing = cli(skills);
    check("drift alone exits 0", passing.status === 0 && passing.stdout.includes("upstream drift: 5 recorded sources, 3 moved, 1 gone, 1 same, 0 problems\n"));
    const at = (text) => passing.stdout.indexOf(text);
    check("gone rows print first, then moved, then same", at("  gone ") !== -1 && at("  gone ") < at("  moved ") && passing.stdout.lastIndexOf("  moved ") < at("  same "));
    put(skills, "zw-one/SKILL.md", skill("zw-one", line("skills/still")));
    for (const name of ["zw-alpha", "zw-beta", "zw-gone", "zw-vendor", "zw-still", "zw-self"]) rmSync(join(skills, name), { recursive: true });
    check("one source in one skill is singular", offline(skills).stdout === "ok: 1 recorded source in 1 skill\n");
    const run = (...args) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { encoding: "utf8" });
    const refused = [[["--skills"], "--skills needs a value"], [["--cache", "--verbose"], "--cache needs a value"], [["--nope"], "unknown argument --nope"], [["--skills", join(tmp, "absent")], join(tmp, "absent") + " is not a directory"]];
    for (const [args, reason] of refused) {
      const result = run(...args);
      check("exit 2 with a reason for: " + args[0] + (args[1] ? " " + args[1].replace(tmp, "<tmp>") : ""), result.status === 2 && result.stderr.includes("upstream-drift: " + reason) && result.stdout === "");
    }
    check("--verbose lists the files", passing.stdout.includes("A skills/alpha/extra.md"));
    check("a row names its skill and its pin", passing.stdout.includes("  moved  " + pinned.slice(0, 7) + "  agents/helper.md  [zw-vendor vendor]  1 changed"));
  } catch (error) {
    failures.push("the self-test could not run: " + error.message);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (failures.length) {
    for (const failure of failures) console.error("upstream-drift --test FAIL: " + failure);
    return false;
  }
  console.log("upstream-drift --test: all ok");
  return true;
}

function main() {
  const options = { skills: join(REPO, "skills"), cache: join(REPO, "refs", ".upstream-cache"), remote: "https://github.com/", verbose: false, records: false };
  const argv = process.argv.slice(2);
  if (argv.length === 1 && argv[0] === "--test") process.exit(selfTest() ? 0 : 1);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--verbose") options.verbose = true;
    else if (arg === "--records") options.records = true;
    else if (arg === "--skills" || arg === "--cache" || arg === "--remote") {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) { console.error("upstream-drift: " + arg + " needs a value"); process.exit(2); }
      options[arg.slice(2)] = arg === "--remote" ? value : resolve(value);
    } else {
      console.error("upstream-drift: unknown argument " + arg);
      console.error("Usage: node scripts/upstream-drift.mjs [--skills <dir>] [--cache <dir>] [--remote <base>] [--verbose]");
      console.error("       node scripts/upstream-drift.mjs --records [--skills <dir>]");
      process.exit(2);
    }
  }
  if (!existsSync(options.skills) || !statSync(options.skills).isDirectory()) {
    console.error("upstream-drift: " + options.skills + " is not a directory");
    process.exit(2);
  }
  if (options.records) {
    const { records, problems } = collect(options.skills);
    for (const problem of problems) console.error("problem: " + problem);
    if (problems.length) process.exit(1);
    console.log("ok: " + counted(records.length, "recorded source") + " in " + counted(new Set(records.map((record) => record.skill)).size, "skill"));
    return;
  }
  const result = report(options);
  print(result, options.verbose);
  process.exit(result.problems.length === 0 ? 0 : 1);
}

main();
