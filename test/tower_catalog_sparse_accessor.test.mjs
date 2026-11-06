import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, TowerScopeError } from '../src/tower_scope.mjs';

const records = [
  { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
];

test('sparse tower catalog fails closed instead of silently skipping a hole', () => {
  const sparse = new Array(2);
  sparse[0] = 'TORRE-A';
  assert.throws(
    () => filterTowerRecords(records, { towerId: 'TORRE-A', knownTowers: sparse }),
    TowerScopeError,
  );
});

test('catalog indexed getter is rejected without executing its side effect', () => {
  let reads = 0;
  const catalog = ['TORRE-A'];
  Object.defineProperty(catalog, '0', {
    enumerable: true,
    configurable: true,
    get() { reads++; throw new Error('must not execute'); },
  });
  assert.throws(
    () => filterTowerRecords(records, { towerId: 'TORRE-A', knownTowers: catalog }),
    TowerScopeError,
  );
  assert.equal(reads, 0);
});
