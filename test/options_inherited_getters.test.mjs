import test from 'node:test';
import assert from 'node:assert/strict';
import { TowerScopeError, filterTowerRecords, sumBrlCents } from '../src/tower_scope.mjs';

// v0.9.36: untrusted options must never execute inherited or own getters.
// Synthetic offline fixtures only; these tests do not establish tenant authorization.
const rows = [{ id: 'one', scope: 'tower', tower_id: 'A', amount_brl: '1.25' }];
const cases = [
  ['tower filter', options => filterTowerRecords(rows, options),
    { towerId: 'A', knownTowers: ['A'] }],
  ['money sum', options => sumBrlCents(rows, options),
    { field: 'amount_brl' }],
];

for (const [name, run, valid] of cases) {
  test(name + ' ignores inherited throwing getters', () => {
    let called = 0;
    const proto = Object.create(null);
    Object.defineProperty(proto, 'unrecognized', {
      get() { called++; throw new Error('inherited getter executed'); },
    });
    const options = Object.assign(Object.create(proto), valid);
    assert.doesNotThrow(() => run(options));
    assert.equal(called, 0);
  });

  test(name + ' rejects own throwing getter without invoking it', () => {
    let called = 0;
    const options = { ...valid };
    Object.defineProperty(options, 'unrecognized', {
      enumerable: true,
      get() { called++; throw new Error('own getter executed'); },
    });
    assert.throws(() => run(options), TowerScopeError);
    assert.equal(called, 0);
  });
}
