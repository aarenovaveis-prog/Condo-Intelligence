import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, TowerScopeError } from '../src/tower_scope.mjs';

const options = { towerId: 'TORRE-A', knownTowers: ['TORRE-A', 'TORRE-B'], includeCommon: true };

test('hidden scope metadata never grants access to a tower record', () => {
  const row = { tower_id: 'TORRE-A', amount_brl: '12.00' };
  Object.defineProperty(row, 'scope', { value: 'tower', enumerable: false });
  assert.deepEqual(filterTowerRecords([row], options), []);
});

test('hidden tower metadata never grants access to common records', () => {
  const row = { scope: 'common', amount_brl: '12.00' };
  Object.defineProperty(row, 'tower_id', { value: null, enumerable: false });
  assert.deepEqual(filterTowerRecords([row], options), []);
});

test('accessor metadata is rejected without executing getters', () => {
  let invoked = 0;
  const row = { tower_id: 'TORRE-A', amount_brl: '12.00' };
  Object.defineProperty(row, 'scope', {
    enumerable: true,
    get() { invoked++; return 'tower'; },
  });
  assert.throws(() => filterTowerRecords([row], options), TowerScopeError);
  assert.equal(invoked, 0);
});

test('prototype-inherited scope cannot authorize a record', () => {
  const row = Object.create({ scope: 'tower' });
  Object.assign(row, { tower_id: 'TORRE-A', amount_brl: '12.00' });
  assert.throws(() => filterTowerRecords([row], options), TowerScopeError);
});

test('mismatched common record is excluded even when common areas enabled', () => {
  const rows = [
    { scope: 'common', tower_id: 'TORRE-B', amount_brl: '50.00' },
    { scope: 'common', tower_id: null, amount_brl: '10.00' },
  ];
  assert.deepEqual(filterTowerRecords(rows, options).map(r => r.amount_brl), ['10.00']);
});
