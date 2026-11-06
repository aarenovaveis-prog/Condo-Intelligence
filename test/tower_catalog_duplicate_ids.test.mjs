/** Synthetic regression: duplicate and noncanonical tower IDs fail closed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, TowerScopeError } from '../src/tower_scope.mjs';

const records = [{ scope: 'tower', tower_id: 'A', amount_brl: '1.00' }];

for (const knownTowers of [
  ['A', 'A'],
  ['A', ' A'],
  ['A', ''],
  new Set(['A', ' A']),
]) {
  test(`rejects invalid tower catalog ${JSON.stringify([...knownTowers])}`, () => {
    assert.throws(
      () => filterTowerRecords(records, { towerId: 'A', knownTowers }),
      TowerScopeError,
    );
  });
}

test('accepts unique canonical tower IDs and isolates selected tower', () => {
  assert.deepEqual(
    filterTowerRecords(records, { towerId: 'A', knownTowers: ['A', 'B'] }),
    records,
  );
});
