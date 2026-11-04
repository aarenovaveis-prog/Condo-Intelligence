import test from 'node:test';
import assert from 'node:assert/strict';
import { TowerScopeError, parseBrlCents, sumBrlCents, formatBrlCents } from '../src/tower_scope.mjs';

// Synthetic-only monetary boundary regression. No tenant data or database access.
test('maximum positive and negative amounts cancel exactly', () => {
  const rows = [{ amount_brl: '999999999999.99' }, { amount_brl: '-999999999999.99' }];
  assert.equal(sumBrlCents(rows), 0n);
  assert.equal(formatBrlCents(sumBrlCents(rows)), '0.00');
});

test('sum rejects intermediate positive overflow even if later entries cancel', () => {
  assert.throws(() => sumBrlCents([
    { amount_brl: '999999999999.99' },
    { amount_brl: '0.01' },
    { amount_brl: '-0.01' },
  ]), TowerScopeError);
});

test('sum rejects intermediate negative overflow even if later entries cancel', () => {
  assert.throws(() => sumBrlCents([
    { amount_brl: '-999999999999.99' },
    { amount_brl: '-0.01' },
    { amount_brl: '0.01' },
  ]), TowerScopeError);
});

test('cent-scale arithmetic remains exact across positive and negative entries', () => {
  const rows = [
    { amount_brl: '0.01' }, { amount_brl: '0.02' },
    { amount_brl: '-0.03' }, { amount_brl: '0.10' },
  ];
  assert.equal(sumBrlCents(rows), 10n);
  assert.equal(parseBrlCents(formatBrlCents(sumBrlCents(rows))), 10n);
});

test('rejects noncanonical money strings and out-of-range values', () => {
  for (const value of ['-0', '-0.00', '00.01', '+1.00', '1e3', '1,00', ' 1.00', '1.000', '999999999999.999', '1000000000000.00', '-1000000000000.00', '']) {
    assert.throws(() => parseBrlCents(value), TowerScopeError, `expected rejection: ${JSON.stringify(value)}`);
  }
  for (const value of [0, 1.2, null, undefined, 1n, {}, []]) {
    assert.throws(() => parseBrlCents(value), TowerScopeError);
  }
});

test('formats signed bounds exactly and rejects out-of-range bigint cents', () => {
  const max = 99_999_999_999_999n;
  assert.equal(formatBrlCents(max), '999999999999.99');
  assert.equal(formatBrlCents(-max), '-999999999999.99');
  assert.equal(parseBrlCents(formatBrlCents(-max)), -max);
  assert.throws(() => formatBrlCents(max + 1n), TowerScopeError);
  assert.throws(() => formatBrlCents(-max - 1n), TowerScopeError);
  assert.throws(() => formatBrlCents(Number(max)), TowerScopeError);
});
