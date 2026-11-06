import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, sumBrlCents } from '../src/tower_scope.mjs';

const knownTowers = ['TORRE-A', 'TORRE-B'];

test('non-enumerable tower scope metadata never enters selected totals', () => {
  const hiddenScope = { tower_id: 'TORRE-A', amount_brl: '999.99' };
  Object.defineProperty(hiddenScope, 'scope', { value: 'tower', enumerable: false });
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '0.10' },
    hiddenScope,
    { scope: 'tower', tower_id: 'TORRE-B', amount_brl: '500.00' },
  ];
  assert.equal(sumBrlCents(filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers })), 10n);
});

test('non-enumerable common tower metadata never enters opt-in common totals', () => {
  const hiddenTower = { scope: 'common', amount_brl: '999.99' };
  Object.defineProperty(hiddenTower, 'tower_id', { value: null, enumerable: false });
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
    { scope: 'common', tower_id: null, amount_brl: '0.25' },
    hiddenTower,
  ];
  const selected = filterTowerRecords(rows, {
    towerId: 'TORRE-A', knownTowers, includeCommon: true,
  });
  assert.equal(sumBrlCents(selected), 125n);
  assert.equal(selected.length, 2);
});
