import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, sumBrlCents, formatBrlCents, TowerScopeError } from '../src/tower_scope.mjs';

const knownTowers = ['TORRE-A', 'TORRE-B'];
const total = (rows, towerId) => formatBrlCents(sumBrlCents(
  filterTowerRecords(rows, { towerId, knownTowers }),
));

test('tower refunds are signed and exact without leaking another tower', () => {
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '0.30' },
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '-0.10' },
    { scope: 'tower', tower_id: 'TORRE-B', amount_brl: '800.00' },
    { scope: 'common', tower_id: null, amount_brl: '5.00' },
  ];
  assert.equal(total(rows, 'TORRE-A'), '0.20');
  assert.equal(total(rows, 'TORRE-B'), '800.00');
});

test('invalid amount in selected tower fails closed, not silently skipped', () => {
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1,00' },
  ];
  assert.throws(() => total(rows, 'TORRE-A'), TowerScopeError);
});

test('invalid amount in another tower cannot contaminate selected total', () => {
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
    { scope: 'tower', tower_id: 'TORRE-B', amount_brl: 'not-money' },
  ];
  assert.equal(total(rows, 'TORRE-A'), '1.00');
  assert.throws(() => total(rows, 'TORRE-B'), TowerScopeError);
});
