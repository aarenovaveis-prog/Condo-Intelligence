import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const runner = join(dirname(fileURLToPath(import.meta.url)), 'verify-offline.mjs');

for (const context of ['child-v8', '']) {
test(`runner executes failing assertions with NODE_TEST_CONTEXT=${JSON.stringify(context)}`, () => {
  const root = mkdtempSync(join(tmpdir(), 'condo-context-'));
  try {
    for (const dir of ['scripts', 'src', 'test']) mkdirSync(join(root, dir));
    copyFileSync(runner, join(root, 'scripts', 'verify-offline.mjs'));
    writeFileSync(join(root, 'src', 'tower_scope.mjs'), 'export const value = 1;\n');
    writeFileSync(join(root, 'test', 'tower_scope.test.mjs'),
      'import test from "node:test"; import assert from "node:assert/strict"; test("must fail", () => assert.equal(1, 2));\n');
    // The runner checks syntax for every registered regression file before executing
    // tower_scope.test.mjs. Provide valid synthetic siblings so this test reaches
    // the intended NODE_TEST_CONTEXT assertion rather than failing at MODULE_NOT_FOUND.
    for (const name of [
      'options_proxy_reflection.test.mjs',
      'options_inherited_getters.test.mjs',
      'tower_scope_isolation.test.mjs',
      'tower_row_proxy_reflection.test.mjs',
      'tower_metadata_failclosed.test.mjs',
      'brl_boundary_cancellation.test.mjs',
      'brl_option_accessors.test.mjs',
      'tower_brl_refunds_invalid.test.mjs',
      'tower_hidden_scope_exclusion.test.mjs',
      'common_hidden_money_failclosed.test.mjs',
    ]) {
      writeFileSync(join(root, 'test', name),
        'import test from "node:test"; import assert from "node:assert/strict"; test("fixture assertion", () => assert.equal(1, 1));\n');
    }
    const env = { ...process.env, NODE_OPTIONS: '', NODE_TEST_CONTEXT: context };
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
}
