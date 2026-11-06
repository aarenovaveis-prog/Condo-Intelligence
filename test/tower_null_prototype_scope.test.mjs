import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, sumBrlCents } from '../src/tower_scope.mjs';

const knownTowers = ['TORRE-A', 'TORRE-B'];

test('null-prototype records with explicit scope remain eligible only for their tower', () => {
  const row = Object.assign(Object.create(null), {
    scope: 'tower', tower_id: 'TORRE-A', amount_brl: '0.10',
  });
  const selected = filterTowerRecords([
    row,
    { scope: 'tower', tower_id: 'TORRE-B', amount_brl: '999.99' },
  ], { towerId: 'TORRE-A', knownTowers });
  assert.equal(selected.length, 1);
  assert.equal(sumBrlCents(selected), 10n);
});

test('null-prototype records without own scope cannot enter common totals', () => {
  const legacy = Object.assign(Object.create(null), {
    tower_id: null, amount_brl: '999.99',
  });
  const selected = filterTowerRecords([
    legacy,
    { scope: 'common', tower_id: null, amount_brl: '0.25' },
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
  ], { towerId: 'TORRE-A', knownTowers, includeCommon: true });
  assert.equal(selected.length, 2);
  assert.equal(sumBrlCents(selected), 125n);
});
