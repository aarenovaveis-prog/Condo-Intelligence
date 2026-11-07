/** Synthetic regression: common-area records require explicit opt-in. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords } from '../src/tower_scope.mjs';

const rows = [
  { scope: 'tower', tower_id: 'A', amount_brl: '1.00' },
  { scope: 'tower', tower_id: 'B', amount_brl: '2.00' },
  { scope: 'common', tower_id: null, amount_brl: '3.00' },
  { scope: 'common', tower_id: '', amount_brl: '4.00' },
  { scope: 'common', tower_id: 'B', amount_brl: '5.00' },
  { scope: 'legacy', tower_id: null, amount_brl: '6.00' },
];

test('common-area expenses are excluded unless explicitly requested', () => {
  const snapshot = structuredClone(rows);
  assert.deepEqual(filterTowerRecords(rows, { towerId: 'A', knownTowers: ['A', 'B'] }), [rows[0]]);
  assert.deepEqual(rows, snapshot);
});

test('opt-in includes only valid common rows and never leaks another tower', () => {
  const result = filterTowerRecords(rows, { towerId: 'A', knownTowers: ['A', 'B'], includeCommon: true });
  assert.deepEqual(result, [rows[0], rows[2], rows[3]]);
  assert.notStrictEqual(result[0], rows[0], 'output must be a copy');
  assert.notStrictEqual(result[1], rows[2], 'common output must be a copy');
});

test('common-area opt-in must be boolean, not a truthy string', () => {
  assert.throws(() => filterTowerRecords(rows, { towerId: 'A', knownTowers: ['A', 'B'], includeCommon: 'true' }), /includeCommon must be boolean/);
});
