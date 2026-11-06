import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, sumBrlCents } from '../src/tower_scope.mjs';

const knownTowers = ['TORRE-A', 'TORRE-B'];

test('selected records are independent shallow snapshots of tower rows', () => {
  const original = { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '1.25' };
  const selected = filterTowerRecords([original], { towerId: 'TORRE-A', knownTowers });
  assert.equal(selected.length, 1);
  assert.notStrictEqual(selected[0], original);
  original.amount_brl = '999.99';
  assert.equal(sumBrlCents(selected), 125n);
  selected[0].amount_brl = '0.25';
  assert.equal(original.amount_brl, '999.99');
});

test('a tower filter cannot change another tower record', () => {
  const other = { scope: 'tower', tower_id: 'TORRE-B', amount_brl: '999.99' };
  const selected = filterTowerRecords([
    { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '0.10' }, other,
  ], { towerId: 'TORRE-A', knownTowers });
  assert.equal(sumBrlCents(selected), 10n);
  assert.equal(other.amount_brl, '999.99');
});
