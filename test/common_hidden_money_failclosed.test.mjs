import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, sumBrlCents, TowerScopeError } from '../src/tower_scope.mjs';

const knownTowers = ['TORRE-A', 'TORRE-B'];

test('hidden common monetary field is rejected only when explicitly included', () => {
  const common = { scope: 'common', tower_id: null };
  Object.defineProperty(common, 'amount_brl', {
    value: '999.99', enumerable: false, configurable: true,
  });
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
    { scope: 'tower', tower_id: 'TORRE-B', amount_brl: '8.00' },
    common,
  ];
  const options = { towerId: 'TORRE-A', knownTowers };
  assert.equal(sumBrlCents(filterTowerRecords(rows, options)), 100n);
  assert.throws(() => sumBrlCents(filterTowerRecords(rows, {
    ...options, includeCommon: true,
  })), TowerScopeError);
  assert.equal(sumBrlCents(filterTowerRecords(rows, {
    towerId: 'TORRE-B', knownTowers,
  })), 800n);
});
