/** Synthetic regression: frozen inputs remain immutable and filter results are detached. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords } from '../src/tower_scope.mjs';

test('common-area opt-in accepts frozen input without mutating it', () => {
  const tower = Object.freeze({ scope: 'tower', tower_id: 'A', amount_brl: '10.00' });
  const common = Object.freeze({ scope: 'common', tower_id: null, amount_brl: '2.50' });
  const other = Object.freeze({ scope: 'tower', tower_id: 'B', amount_brl: '99.00' });
  const records = Object.freeze([tower, common, other]);
  const knownTowers = Object.freeze(['A', 'B']);
  const options = Object.freeze({ towerId: 'A', knownTowers, includeCommon: true });

  const selected = filterTowerRecords(records, options);
  assert.deepEqual(selected, [tower, common]);
  assert.notStrictEqual(selected[0], tower);
  assert.notStrictEqual(selected[1], common);
  selected[0].amount_brl = '0.00';
  selected[1].tower_id = 'B';

  assert.equal(tower.amount_brl, '10.00');
  assert.equal(common.tower_id, null);
  assert.deepEqual(filterTowerRecords(records, options), [tower, common]);
});
