/** Bounded, dependency-free offline verification for synthetic tower data. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  ['syntax: source', ['--check', 'src/tower_scope.mjs']],
  ['syntax: tests', ['--check', 'test/tower_scope.test.mjs']],
  ['regression: tower filters and BRL totals', ['--test', 'test/tower_scope.test.mjs']],
];
const timeoutMs = 60_000;
// An empty NODE_TEST_CONTEXT still activates Node's internal test child mode.
// Remove it entirely so --test executes assertions rather than skipping them.
const childEnv = { ...process.env, NODE_OPTIONS: '' };
delete childEnv.NODE_TEST_CONTEXT;
for (const [label, args] of checks) {
  process.stdout.write(`\n== ${label} ==\n`);
  const result = spawnSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024, env: childEnv,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  // Node can exit successfully after skipping all test files; never accept zero assertions.
  const count = label.startsWith('regression:')
    ? [...(result.stdout || '').matchAll(/^# tests (\d+)\s*$/gm)].map(match => Number(match[1])).at(-1)
    : null;
  const passed = label.startsWith('regression:')
    ? [...(result.stdout || '').matchAll(/^# pass (\d+)\s*$/gm)].map(match => Number(match[1])).at(-1)
    : null;
  if (result.error || result.signal || result.status !== 0 || (count !== null && (!(count > 0) || !(passed > 0)))) {
    console.error(`FAILED: ${label}${result.error ? ` (${result.error.message})` : ''}${result.signal ? ` (signal ${result.signal})` : ''}`);
    process.exit(1);
  }
}
console.log('\nPASS: all offline checks');
