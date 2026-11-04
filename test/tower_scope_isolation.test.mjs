import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, TowerScopeError } from '../src/tower_scope.mjs';

const knownTowers = ['TORRE-A', 'TORRE-B'];
const rows = [
  { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '10.00' },
  { scope: 'tower', tower_id: 'TORRE-B', amount_brl: '20.00' },
  { scope: 'common', tower_id: null, amount_brl: '30.00' },
  { scope: 'common', tower_id: 'TORRE-B', amount_brl: '40.00' },
  { scope: 'legacy', tower_id: 'TORRE-A', amount_brl: '50.00' },
];

test('tower A never receives tower B or common records by default', () => {
  assert.deepEqual(filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers }).map(row => row.amount_brl), ['10.00']);
});

test('common opt-in includes only explicitly unassigned common records', () => {
  assert.deepEqual(filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers, includeCommon: true }).map(row => row.amount_brl), ['10.00', '30.00']);
});

test('unknown tower selection fails closed', () => {
  assert.throws(() => filterTowerRecords(rows, { towerId: 'TORRE-C', knownTowers }), TowerScopeError);
});

test('filtered rows are copies, not mutable aliases of input', () => {
  const selected = filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers });
  selected[0].amount_brl = '999.00';
  assert.equal(rows[0].amount_brl, '10.00');
});
