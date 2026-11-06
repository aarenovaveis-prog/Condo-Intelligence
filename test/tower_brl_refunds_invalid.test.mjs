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

test('non-enumerable money field is rejected rather than silently counted', () => {
  const hidden = { scope: 'tower', tower_id: 'TORRE-A' };
  Object.defineProperty(hidden, 'amount_brl', { value: '999.99', enumerable: false });
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
    hidden,
  ];
  assert.throws(() => total(rows, 'TORRE-A'), TowerScopeError);
});

test('inherited money field cannot satisfy the selected tower total', () => {
  const inherited = Object.create({ amount_brl: '999.99' });
  inherited.scope = 'tower';
  inherited.tower_id = 'TORRE-A';
  assert.throws(() => total([inherited], 'TORRE-A'), TowerScopeError);
});

test('common expense is included only when explicitly requested', () => {
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '0.10' },
    { scope: 'common', tower_id: null, amount_brl: '0.20' },
    { scope: 'tower', tower_id: 'TORRE-B', amount_brl: '999.99' },
  ];
  assert.equal(total(rows, 'TORRE-A'), '0.10');
  const selected = filterTowerRecords(rows, {
    towerId: 'TORRE-A', knownTowers, includeCommon: true,
  });
  assert.equal(formatBrlCents(sumBrlCents(selected)), '0.30');
});

test('invalid common amount fails closed only when common expenses are requested', () => {
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
    { scope: 'common', tower_id: null, amount_brl: '1,00' },
  ];
  assert.equal(total(rows, 'TORRE-A'), '1.00');
  assert.throws(() => sumBrlCents(filterTowerRecords(rows, {
    towerId: 'TORRE-A', knownTowers, includeCommon: true,
  })), TowerScopeError);
});


test('common records with another tower id cannot enter selected total', () => {
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
    { scope: 'common', tower_id: 'TORRE-B', amount_brl: '999.99' },
    { scope: 'common', tower_id: null, amount_brl: '0.25' },
  ];
  const selected = filterTowerRecords(rows, {
    towerId: 'TORRE-A', knownTowers, includeCommon: true,
  });
  assert.equal(formatBrlCents(sumBrlCents(selected)), '1.25');
});

test('legacy rows without explicit scope cannot enter tower totals', () => {
  const rows = [
    { tower_id: 'TORRE-A', amount_brl: '999.99' },
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '0.10' },
  ];
  const selected = filterTowerRecords(rows, {
    towerId: 'TORRE-A', knownTowers, includeCommon: true,
  });
  assert.equal(formatBrlCents(sumBrlCents(selected)), '0.10');
});

test('negative common refund is opt-in and cannot leak between towers', () => {
  const rows = [
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.00' },
    { scope: 'tower', tower_id: 'TORRE-B', amount_brl: '500.00' },
    { scope: 'common', tower_id: null, amount_brl: '-0.25' },
  ];
  assert.equal(total(rows, 'TORRE-A'), '1.00');
  assert.equal(total(rows, 'TORRE-B'), '500.00');
  for (const towerId of knownTowers) {
    const selected = filterTowerRecords(rows, { towerId, knownTowers, includeCommon: true });
    assert.equal(formatBrlCents(sumBrlCents(selected)),
      towerId === 'TORRE-A' ? '0.75' : '499.75');
  }
});
