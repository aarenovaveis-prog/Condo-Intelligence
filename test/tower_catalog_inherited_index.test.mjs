import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, TowerScopeError } from '../src/tower_scope.mjs';

const records = [{ scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' }];

test('catalog rejects inherited array index instead of accepting prototype pollution', () => {
  const inherited = Object.create(Array.prototype);
  Object.defineProperty(inherited, '1', { value: 'TORRE-B', configurable: true });
  const catalog = ['TORRE-A', ,];
  Object.setPrototypeOf(catalog, inherited);
  assert.throws(
    () => filterTowerRecords(records, { towerId: 'TORRE-A', knownTowers: catalog }),
    TowerScopeError,
  );
});

test('catalog rejects inherited indexed getter without executing it', () => {
  let reads = 0;
  const inherited = Object.create(Array.prototype);
  Object.defineProperty(inherited, '1', {
    configurable: true,
    get() { reads++; throw new Error('must not execute'); },
  });
  const catalog = ['TORRE-A', ,];
  Object.setPrototypeOf(catalog, inherited);
  assert.throws(
    () => filterTowerRecords(records, { towerId: 'TORRE-A', knownTowers: catalog }),
    TowerScopeError,
  );
  assert.equal(reads, 0);
});
