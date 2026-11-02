import test from 'node:test';
import assert from 'node:assert/strict';
import { TowerScopeError, filterTowerRecords, parseBrlCents, sumBrlCents, formatBrlCents } from '../src/tower_scope.mjs';

const records = Object.freeze([
  Object.freeze({ id: 'a1', scope: 'tower', tower_id: 'A', amount_brl: '0.10' }),
  Object.freeze({ id: 'a2', scope: 'tower', tower_id: 'A', amount_brl: '0.20' }),
  Object.freeze({ id: 'b1', scope: 'tower', tower_id: 'B', amount_brl: '999.99' }),
  Object.freeze({ id: 'common', scope: 'common', tower_id: null, amount_brl: '1.25' }),
  Object.freeze({ id: 'wrong-common', scope: 'common', tower_id: 'B', amount_brl: '700.00' }),
  Object.freeze({ id: 'legacy', scope: null, tower_id: null, amount_brl: '800.00' }),
  Object.freeze({ id: 'unknown', scope: 'unknown', tower_id: 'A', amount_brl: '900.00' }),
]);
const filter = (towerId = 'A', includeCommon = false, rows = records) =>
  filterTowerRecords(rows, { towerId, knownTowers: ['A', 'B', 'C'], includeCommon });

for (const [label, towerId, common, expected] of [
  ['A only', 'A', false, ['a1', 'a2']],
  ['B only', 'B', false, ['b1']],
  ['empty C', 'C', false, []],
  ['common explicit', 'A', true, ['a1', 'a2', 'common']],
  ['common not assigned to B', 'B', true, ['b1', 'common']],
]) {
  test(label, () => assert.deepEqual(filter(towerId, common).map(r => r.id), expected));
}

test('other tower, legacy, unknown and misclassified common excluded', () => {
  assert.deepEqual(filter('A', true).map(r => r.id), ['a1', 'a2', 'common']);
});
test('copies do not mutate source records', () => {
  const result = filter();
  result[0].amount_brl = '99.00';
  assert.equal(records[0].amount_brl, '0.10');
});
test('accepts Set catalog and null-prototype data record', () => {
  const row = Object.assign(Object.create(null), { scope: 'tower', tower_id: 'A', amount_brl: '1.00' });
  assert.equal(filterTowerRecords([row], { towerId: 'A', knownTowers: new Set(['A']) }).length, 1);
});
for (const [label, opts] of [
  ['unknown tower', { towerId: 'X', knownTowers: ['A'] }],
  ['empty tower', { towerId: '', knownTowers: ['A'] }],
  ['noncanonical tower', { towerId: ' A ', knownTowers: ['A'] }],
  ['string catalog', { towerId: 'A', knownTowers: 'ABC' }],
  ['duplicate catalog', { towerId: 'A', knownTowers: ['A', 'A'] }],
  ['noncanonical catalog', { towerId: 'A', knownTowers: ['A', ' B'] }],
  ['empty catalog', { towerId: 'A', knownTowers: [] }],
  ['string common flag', { towerId: 'A', knownTowers: ['A'], includeCommon: 'true' }],
]) {
  test('reject ' + label, () => assert.throws(() => filterTowerRecords(records, opts), TowerScopeError));
}
test('reject non-array records', () => {
  assert.throws(() => filterTowerRecords(new Set(records), { towerId: 'A', knownTowers: ['A'] }), TowerScopeError);
});
test('reject non-object record', () => assert.throws(() => filter('A', false, [null]), TowerScopeError));
test('reject accessor records without invoking getter', () => {
  let invoked = false;
  const row = { scope: 'tower', tower_id: 'A', get amount_brl() { invoked = true; return '1.00'; } };
  assert.throws(() => filter('A', false, [row]), TowerScopeError);
  assert.equal(invoked, false);
});

test('exact 0.10 + 0.20 = 0.30', () => assert.equal(formatBrlCents(sumBrlCents(filter())), '0.30'));
test('exact total including common', () => assert.equal(formatBrlCents(sumBrlCents(filter('A', true))), '1.55'));
test('empty total', () => assert.equal(formatBrlCents(sumBrlCents([])), '0.00'));
test('negative credit', () => assert.equal(formatBrlCents(sumBrlCents([{ amount_brl: '-1.25' }, { amount_brl: '2.00' }])), '0.75'));
test('parse integer and one-decimal values', () => {
  assert.equal(parseBrlCents('2'), 200n);
  assert.equal(parseBrlCents('2.5'), 250n);
  assert.equal(parseBrlCents('-0.05'), -5n);
});
test('maximum bounded amount', () => assert.equal(formatBrlCents(parseBrlCents('999999999999.99')), '999999999999.99'));
for (const value of [0.1, NaN, Infinity, true, null, undefined, 'NaN', 'Infinity', '0.001', '1.234,56', '1e2', ' 1.00', '01.00', '+1.00', '1000000000000.00']) {
  test('reject invalid money ' + String(value), () => assert.throws(() => parseBrlCents(value), TowerScopeError));
}
test('reject missing money field', () => assert.throws(() => sumBrlCents([{ foo: '1.00' }]), TowerScopeError));
test('reject inherited money field', () => assert.throws(() => sumBrlCents([Object.create({ amount_brl: '1.00' })]), TowerScopeError));
test('reject unsafe total overflow', () => assert.throws(() => sumBrlCents([{ amount_brl: '900000000000.00' }, { amount_brl: '900000000000.00' }]), TowerScopeError));
test('reject accessor amount without invoking getter', () => {
  let invoked = false;
  const row = { get amount_brl() { invoked = true; return '1.00'; } };
  assert.throws(() => sumBrlCents([row]), TowerScopeError);
  assert.equal(invoked, false);
});
test('reject invalid field names', () => assert.throws(() => sumBrlCents([], { field: '__proto__' }), TowerScopeError));
test('reject number formatting to avoid float conversion', () => assert.throws(() => formatBrlCents(1), TowerScopeError));
