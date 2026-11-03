/** Reproducible, dependency-free offline checks for the synthetic tower contract. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  ['syntax: source', ['--check', 'src/tower_scope.mjs']],
  ['syntax: tests', ['--check', 'test/tower_scope.test.mjs']],
  ['regression: tower filters and BRL totals', ['--test', 'test/tower_scope.test.mjs']],
];
for (const [label, args] of checks) {
  process.stdout.write(`\n== ${label} ==\n`);
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(`FAILED: ${label}${result.error ? ` (${result.error.message})` : ''}`);
    process.exit(1);
  }
}
console.log('\nPASS: all offline checks');
