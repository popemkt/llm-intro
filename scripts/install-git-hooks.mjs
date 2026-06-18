import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

function gitPath(name) {
  return execFileSync('git', ['rev-parse', '--git-path', name], { encoding: 'utf8' }).trim()
}

const hookPath = resolve(gitPath('hooks/pre-commit'))

mkdirSync(dirname(hookPath), { recursive: true })
writeFileSync(hookPath, `#!/bin/sh
set -eu

pnpm lint-staged
`)
chmodSync(hookPath, 0o755)

console.log(`Installed pre-commit hook at ${hookPath}`)
