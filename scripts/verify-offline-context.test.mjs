import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const runner = join(dirname(fileURLToPath(import.meta.url)), 'verify-offline.mjs');

test('runner executes failing assertions even when parent NODE_TEST_CONTEXT is set', () => {
  const root = mkdtempSync(join(tmpdir(), 'condo-context-'));
  try {
    for (const dir of ['scripts', 'src', 'test']) mkdirSync(join(root, dir));
    copyFileSync(runner, join(root, 'scripts', 'verify-offline.mjs'));
    writeFileSync(join(root, 'src', 'tower_scope.mjs'), 'export const value = 1;\n');
    writeFileSync(join(root, 'test', 'tower_scope.test.mjs'),
      'import test from "node:test"; import assert from "node:assert/strict"; test("must fail", () => assert.equal(1, 2));\n');
    const env = { ...process.env, NODE_OPTIONS: '', NODE_TEST_CONTEXT: 'child-v8' };
    const result = spawnSync(process.execPath, [join(root, 'scripts', 'verify-offline.mjs')], {
      cwd: tmpdir(), env, encoding: 'utf8', timeout: 15000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /not ok 1 - must fail/);
    assert.match(result.stderr, /FAILED: regression/);
    assert.doesNotMatch(result.stdout, /PASS: all offline checks/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
