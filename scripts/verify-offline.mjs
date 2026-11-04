/** Bounded, dependency-free offline verification for synthetic tower data. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  ['syntax: source', ['--check', 'src/tower_scope.mjs']],
  ['syntax: tests', ['--check', 'test/tower_scope.test.mjs']],
  ['syntax: hostile option proxies', ['--check', 'test/options_proxy_reflection.test.mjs']],
  ['syntax: option getters', ['--check', 'test/options_inherited_getters.test.mjs']],
  ['syntax: tower isolation', ['--check', 'test/tower_scope_isolation.test.mjs']],
  ['syntax: tower metadata fail-closed', ['--check', 'test/tower_metadata_failclosed.test.mjs']],
  ['syntax: BRL boundaries', ['--check', 'test/brl_boundary_cancellation.test.mjs']],
  ['regression: tower filters and BRL totals', ['--test', 'test/tower_scope.test.mjs']],
  ['regression: hostile option proxies', ['--test', 'test/options_proxy_reflection.test.mjs']],
  ['regression: inherited and own getters', ['--test', 'test/options_inherited_getters.test.mjs']],
  ['regression: tower isolation', ['--test', 'test/tower_scope_isolation.test.mjs']],
  ['regression: tower metadata fail-closed', ['--test', 'test/tower_metadata_failclosed.test.mjs']],
  ['regression: BRL boundaries', ['--test', 'test/brl_boundary_cancellation.test.mjs']],
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
  // A partially skipped or TODO-marked suite must not be reported as fully verified.
  const skipped = label.startsWith('regression:')
    ? [...(result.stdout || '').matchAll(/^# skipped (\d+)\s*$/gm)].map(match => Number(match[1])).at(-1)
    : null;
  const todo = label.startsWith('regression:')
    ? [...(result.stdout || '').matchAll(/^# todo (\d+)\s*$/gm)].map(match => Number(match[1])).at(-1)
    : null;
  // Require a complete, internally consistent TAP summary; a zero exit alone
  // cannot establish that every reported test passed.
  const failed = label.startsWith('regression:')
    ? [...(result.stdout || '').matchAll(/^# fail (\d+)\s*$/gm)].map(match => Number(match[1])).at(-1)
    : null;
  // Node 22 can count an empty test file as one passing file-level subtest.
  // Require at least one named assertion/subtest beyond the fallback file entry.
  const testFile = args.at(-1).split(/[\\/]/).at(-1);
  const hasNamedSubtest = label.startsWith('regression:')
    ? [...(result.stdout || '').matchAll(/^# Subtest: (.+)$/gm)]
      .some(([, name]) => name.trim() !== testFile && !name.trim().endsWith('/' + testFile) && !name.trim().endsWith('\\\\' + testFile))
    : true;
  if (result.error || result.signal || result.status !== 0 || (label.startsWith('regression:') && (!(count > 0) || passed !== count || failed !== 0 || !hasNamedSubtest || skipped !== 0 || todo !== 0))) {
    console.error(`FAILED: ${label}${result.error ? ` (${result.error.message})` : ''}${result.signal ? ` (signal ${result.signal})` : ''}`);
    process.exit(1);
  }
}
console.log('\nPASS: all offline checks');
