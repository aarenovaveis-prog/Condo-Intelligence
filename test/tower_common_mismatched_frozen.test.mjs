/** Synthetic regression: a common-area row bound to another tower must fail closed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords } from '../src/tower_scope.mjs';

test('frozen malformed common-area tower IDs never leak across towers', () => {
  const towerA = Object.freeze({ scope: 'tower', tower_id: 'A', amount_brl: '10.00' });
  const common = Object.freeze({ scope: 'common', tower_id: null, amount_brl: '2.50' });
  const malformed = Object.freeze({ scope: 'common', tower_id: 'B', amount_brl: '900.00' });
  const towerB = Object.freeze({ scope: 'tower', tower_id: 'B', amount_brl: '99.00' });
  const records = Object.freeze([towerA, common, malformed, towerB]);
  const knownTowers = Object.freeze(['A', 'B']);

  const selected = filterTowerRecords(records, Object.freeze({ towerId: 'A', knownTowers, includeCommon: true }));
  assert.deepEqual(selected, [towerA, common]);
  assert.notStrictEqual(selected[0], towerA);
  assert.notStrictEqual(selected[1], common);
  selected[1].amount_brl = '0.00';
  assert.equal(common.amount_brl, '2.50');
  assert.deepEqual(filterTowerRecords(records, { towerId: 'B', knownTowers, includeCommon: true }), [common, towerB]);
  assert.deepEqual(records, [towerA, common, malformed, towerB]);
});
