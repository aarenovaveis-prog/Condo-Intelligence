/** Behavioral smoke tests for the offline verifier. Uses only synthetic fixtures. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const runner = join(dirname(fileURLToPath(import.meta.url)), 'verify-offline.mjs');

function withFixture(fn) {
  const root = mkdtempSync(join(tmpdir(), 'condo-offline-test-'));
  try {
    for (const dir of ['scripts', 'src', 'test']) mkdirSync(join(root, dir));
    copyFileSync(runner, join(root, 'scripts', 'verify-offline.mjs'));
    writeFileSync(join(root, 'src', 'tower_scope.mjs'), 'export const tower = "A";\n');
    writeFileSync(join(root, 'test', 'tower_scope.test.mjs'),
      'import test from "node:test"; import assert from "node:assert/strict"; test("synthetic", () => assert.equal(1, 1));\n');
    // Keep the synthetic fixture aligned with every regression stage in the runner.
    // Each file must contain a named assertion, not just valid syntax.
    for (const name of [
      'options_proxy_reflection.test.mjs',
      'options_inherited_getters.test.mjs',
      'tower_scope_isolation.test.mjs',
      'tower_metadata_failclosed.test.mjs',
      'brl_boundary_cancellation.test.mjs',
    ]) {
      writeFileSync(join(root, 'test', name),
        'import test from "node:test"; import assert from "node:assert/strict"; test("fixture assertion", () => assert.equal(1, 1));\\n'.replace('\\n', '\n'));
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function run(root) {
  const env = { ...process.env, NODE_OPTIONS: '' };
  // Nested node --test otherwise inherits the parent test context and skips tests.
  delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, [join(root, 'scripts', 'verify-offline.mjs')], {
    cwd: tmpdir(), encoding: 'utf8', timeout: 15_000, env,
  });
}

test('passes syntax and regression checks from an unrelated working directory', () => {
  withFixture(root => {
    const result = run(root);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /PASS: all offline checks/);
  });
});

test('fails closed when the source file is missing', () => {
  withFixture(root => {
    rmSync(join(root, 'src', 'tower_scope.mjs'));
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /FAILED: syntax: source/);
    assert.doesNotMatch(result.stdout, /PASS: all offline checks/);
  });
});

test('fails closed when a regression assertion fails', () => {
  withFixture(root => {
    writeFileSync(join(root, 'test', 'tower_scope.test.mjs'),
      'import test from "node:test"; import assert from "node:assert/strict"; test("synthetic failure", () => assert.equal(1, 2));\n');
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /FAILED: regression/);
    assert.doesNotMatch(result.stdout, /PASS: all offline checks/);
  });
});

test('fails closed when the regression test file is missing', () => {
  withFixture(root => {
    rmSync(join(root, 'test', 'tower_scope.test.mjs'));
    const result = run(root);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /FAILED: syntax: tests/);
    assert.doesNotMatch(result.stdout, /PASS: all offline checks/);
  });
});

test('fails closed when regression file contains zero tests', () => {
  withFixture(root => {
    writeFileSync(join(root, 'test', 'tower_scope.test.mjs'), '// valid syntax but no tests\n');
    const result = run(root);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    // Node 22 may report an empty file as one passing file-level test.
    // The runner must still reject it because no named subtest executed.
    assert.doesNotMatch(result.stdout, /^# Subtest: (?!.*(?:^|[\\/])tower_scope\.test\.mjs\s*$).+/m);
    assert.match(result.stderr, /FAILED: regression/);
    assert.doesNotMatch(result.stdout, /PASS: all offline checks/);
  });
});


test('fails closed when all regression tests are skipped', () => {
  withFixture(root => {
    writeFileSync(join(root, 'test', 'tower_scope.test.mjs'),
      'import test from "node:test"; test("skipped synthetic", { skip: true }, () => {});\n');
    const result = run(root);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /# tests 1/);
    assert.match(result.stdout, /# pass 0/);
    assert.match(result.stderr, /FAILED: regression/);
  });
});


test('accepts a synthetic regression with at least one passing assertion', () => {
  withFixture(root => {
    const result = run(root);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /^# pass 1$/m);
    assert.match(result.stdout, /PASS: all offline checks/);
  });
});
