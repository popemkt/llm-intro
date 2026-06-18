#!/usr/bin/env node
// One-time, per-machine Archon CLI install. Idempotent: re-running is a no-op
// when `archon` is already installed on PATH or at the canonical install path.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const isWin = platform() === "win32";
const canonicalPath = join(
  homedir(),
  ".archon",
  "bin",
  isWin ? "archon.exe" : "archon",
);

const onPath =
  spawnSync("archon", ["--version"], { stdio: "ignore", shell: true }).status ===
  0;
const atCanonical = existsSync(canonicalPath);

if (onPath || atCanonical) {
  console.log("[archon] already installed - skipping");
  if (!onPath && atCanonical) {
    console.log(
      `[archon] note: binary at ${canonicalPath} is not on this shell's PATH. Open a new terminal to pick it up.`,
    );
  }
  process.exit(0);
}

const cmd = isWin ? "powershell" : "bash";
const args = isWin
  ? [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "irm https://archon.diy/install.ps1 | iex",
    ]
  : ["-c", "curl -fsSL https://archon.diy/install | bash"];

console.log(`[archon] installing for ${platform()}...`);
const result = spawnSync(cmd, args, { stdio: "inherit" });
if (result.status !== 0) {
  console.error(`[archon] installer exited with status ${result.status}`);
  process.exit(result.status ?? 1);
}

console.log(
  "[archon] installed. Open a new terminal so PATH picks up ~/.archon/bin, then run `archon workflow list`.",
);
