import test from 'node:test';
import assert from 'node:assert/strict';
import { TowerScopeError, filterTowerRecords, sumBrlCents } from '../src/tower_scope.mjs';

// v0.9.35: options are untrusted, including reflection traps.
// All inputs are synthetic and this contract is not tenant authorization.
const filter = options => filterTowerRecords(
  [{ id: 'a', scope: 'tower', tower_id: 'A', amount_brl: '1.00' }],
  options,
);
const sum = options => sumBrlCents([{ amount_brl: '1.00' }], options);

for (const [label, action, options] of [
  ['tower filter', filter, { towerId: 'A', knownTowers: ['A'] }],
  ['money sum', sum, { field: 'amount_brl' }],
]) {
  test(label + ' converts throwing ownKeys trap to domain error', () => {
    const proxy = new Proxy(options, {
      ownKeys() { throw new Error('untrusted ownKeys'); },
    });
    assert.throws(() => action(proxy), TowerScopeError);
  });

  test(label + ' converts throwing property-descriptor trap to domain error', () => {
    const proxy = new Proxy(options, {
      getOwnPropertyDescriptor() { throw new Error('untrusted descriptor'); },
    });
    assert.throws(() => action(proxy), TowerScopeError);
  });

  test(label + ' rejects an unexpected nonenumerable option', () => {
    const withHidden = { ...options };
    Object.defineProperty(withHidden, 'unrecognized', { value: true, enumerable: false });
    assert.throws(() => action(withHidden), TowerScopeError);
  });
}
