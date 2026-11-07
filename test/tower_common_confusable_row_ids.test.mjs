/** Synthetic regression: lookalike common-area tower IDs must never bypass scope. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, sumBrlCents } from '../src/tower_scope.mjs';

test('confusable common-area tower IDs stay excluded with explicit opt-in', () => {
  const knownTowers = Object.freeze(['A', 'B']);
  const records = Object.freeze([
    Object.freeze({ scope: 'tower', tower_id: 'A', amount_brl: '10.01' }),
    Object.freeze({ scope: 'common', tower_id: null, amount_brl: '20.02' }),
    ...['Ａ', 'Α', 'А', 'A\u200b', 'a', 'B'].map(tower_id =>
      Object.freeze({ scope: 'common', tower_id, amount_brl: '999.99' })),
  ]);
  const result = filterTowerRecords(records, { towerId: 'A', knownTowers, includeCommon: true });
  assert.deepEqual(result.map(row => row.amount_brl), ['10.01', '20.02']);
  assert.equal(sumBrlCents(result), 3003n);
  assert.notStrictEqual(result[0], records[0]);
  assert.notStrictEqual(result[1], records[1]);
  assert.equal(records.length, 8);
});
