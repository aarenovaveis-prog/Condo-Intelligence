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

test('accepts unique canonical tower IDs and excludes other-tower and common records by default', () => {
  const mixedRecords = [
    { scope: 'tower', tower_id: 'A', amount_brl: '1.00' },
    { scope: 'tower', tower_id: 'B', amount_brl: '999.00' },
    { scope: 'common', tower_id: null, amount_brl: '10.00' },
  ];
  const snapshot = structuredClone(mixedRecords);
  assert.deepEqual(
    filterTowerRecords(mixedRecords, { towerId: 'A', knownTowers: ['A', 'B'] }),
    [mixedRecords[0]],
  );
  assert.deepEqual(
    filterTowerRecords(mixedRecords, { towerId: 'B', knownTowers: ['A', 'B'] }),
    [mixedRecords[1]],
  );
  assert.deepEqual(mixedRecords, snapshot, 'filter must not mutate source records');
});
