/** Synthetic regression: common-area records require an explicit null or empty tower ID. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords } from '../src/tower_scope.mjs';

const knownTowers = Object.freeze(['A', 'B']);

test('common rows with undefined, whitespace, numeric or foreign tower IDs fail closed', () => {
  const valid = Object.freeze({ scope: 'common', tower_id: null, amount_brl: '1.00' });
  const malformed = [undefined, ' ', 0, false, 'B', 'C'].map(tower_id =>
    Object.freeze({ scope: 'common', tower_id, amount_brl: '999.00' }));
  const records = Object.freeze([valid, ...malformed]);
  for (const towerId of knownTowers) {
    const selected = filterTowerRecords(records, { towerId, knownTowers, includeCommon: true });
    assert.deepEqual(selected, [valid]);
    assert.notStrictEqual(selected[0], valid);
  }
  assert.equal(valid.amount_brl, '1.00');
});

test('valid empty-string common scope is opt-in only', () => {
  const common = Object.freeze({ scope: 'common', tower_id: '', amount_brl: '3.00' });
  const records = Object.freeze([common]);
  assert.deepEqual(filterTowerRecords(records, { towerId: 'A', knownTowers }), []);
  assert.deepEqual(filterTowerRecords(records, { towerId: 'A', knownTowers, includeCommon: true }), [common]);
});

test('malformed common IDs remain excluded when includeCommon is omitted', () => {
  const malformedIds = [undefined, ' ', 0, false, 'B', 'C'];
  const rows = Object.freeze([
    Object.freeze({ scope: 'tower', tower_id: 'A', amount_brl: '2.00' }),
    Object.freeze({ scope: 'common', tower_id: null, amount_brl: '3.00' }),
    ...malformedIds.map(tower_id =>
      Object.freeze({ scope: 'common', tower_id, amount_brl: '999.00' })),
  ]);
  const result = filterTowerRecords(rows, {
    towerId: 'A', knownTowers,
  });
  assert.deepEqual(result, [rows[0]]);
  assert.notStrictEqual(result[0], rows[0]);
  assert.equal(rows[0].amount_brl, '2.00');
});
