#!/usr/bin/env node
// Prepare a freshly-created git worktree for llm-intro development.
//
// Adapted from Draiver.Application's harness. This repo is smaller: it has no
// required submodules, but new linked worktrees still need dependencies and
// gitignored local env files such as demos/.env.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const here = process.cwd();

function git(args, opts = {}) {
  return execFileSync("git", args, { encoding: "utf8", ...opts }).trim();
}

function gitOut(args, opts = {}) {
  try {
    return execFileSync("git", args, { encoding: "utf8", ...opts }).trim();
  } catch {
    return "";
  }
}

function gitOk(args, opts = {}) {
  try {
    execFileSync("git", args, { stdio: "pipe", ...opts });
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", shell: true });
}

function mainWorktreePath() {
  const out = git(["worktree", "list", "--porcelain"]);
  const first = out.split("\n").find((line) => line.startsWith("worktree "));
  if (!first) throw new Error("could not parse `git worktree list`");
  return first.slice("worktree ".length).trim();
}

function envContractFiles() {
  const patterns = ["*.env.example", "*.env.template"];
  const files = new Set();
  for (const pattern of patterns) {
    const out = gitOut(["ls-files", pattern]);
    for (const file of out ? out.split("\n") : []) {
      if (file) files.add(file);
    }
  }
  return [...files];
}

console.log("== llm-intro worktree setup ==");
console.log(`worktree: ${here}`);

console.log("\n[1/3] submodules");
if (gitOk(["config", "-f", ".gitmodules", "--get-regexp", "\\.path$"])) {
  run("git", ["submodule", "update", "--init", "--recursive"]);
} else {
  console.log("  none");
}

console.log("\n[2/3] pnpm install");
run("pnpm", ["install"]);

console.log("\n[3/3] env files");
const main = mainWorktreePath();
if (main === here) {
  console.log("  already in main worktree - nothing to copy");
} else {
  const envDirs = [...new Set(envContractFiles().map((file) => dirname(file)))];
  let copied = 0;

  for (const dir of envDirs) {
    const listed = gitOut(
      ["ls-files", "-oi", "--exclude-standard", "--", `${dir}/.env*`],
      { cwd: main },
    );
    for (const rel of listed ? listed.split("\n") : []) {
      const src = join(main, rel);
      const dest = join(here, rel);
      if (existsSync(dest)) {
        console.log(`  keep (exists):    ${rel}`);
        continue;
      }
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      console.log(`  copied:           ${rel}  <- ${relative(here, src)}`);
      copied++;
    }
  }

  if (copied === 0) {
    console.log("  no local env files in main worktree to copy");
  }
}

console.log("\nDone. Run `pnpm dev` to start.");
