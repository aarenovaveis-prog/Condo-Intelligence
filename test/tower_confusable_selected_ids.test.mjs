/** Synthetic security regression: lookalike tower IDs must not widen a filter. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords } from '../src/tower_scope.mjs';

test('confusable selected tower IDs are rejected even with common-area opt-in', () => {
  const knownTowers = Object.freeze(['A', 'B']);
  const records = Object.freeze([
    Object.freeze({ scope: 'tower', tower_id: 'A', amount_brl: '10.00' }),
    Object.freeze({ scope: 'common', tower_id: null, amount_brl: '20.00' }),
  ]);
  for (const towerId of ['Ａ', 'Α', 'А', 'A\u0301', 'a', 'A\u200b']) {
    assert.throws(
      () => filterTowerRecords(records, { towerId, knownTowers, includeCommon: true }),
      { name: 'TowerScopeError' },
      `confusable tower ID ${JSON.stringify(towerId)} must fail closed`,
    );
  }
  const selected = filterTowerRecords(records, {
    towerId: 'A', knownTowers, includeCommon: true,
  });
  assert.deepEqual(selected, records);
  assert.notStrictEqual(selected[0], records[0]);
  assert.notStrictEqual(selected[1], records[1]);
});
