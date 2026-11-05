import test from 'node:test';
import assert from 'node:assert/strict';
import { sumBrlCents, TowerScopeError } from '../src/tower_scope.mjs';

const rows = [{ amount_brl: '10.25', alternate_brl: '99.99' }];

test('monetary field accessor is rejected without invocation', () => {
  let invoked = false;
  const options = {};
  Object.defineProperty(options, 'field', {
    enumerable: true,
    get() { invoked = true; throw new Error('untrusted field getter'); },
  });
  assert.throws(() => sumBrlCents(rows, options), TowerScopeError);
  assert.equal(invoked, false);
});

test('revoked monetary options proxy fails with a domain error', () => {
  const { proxy, revoke } = Proxy.revocable({ field: 'amount_brl' }, {});
  revoke();
  assert.throws(() => sumBrlCents(rows, proxy), TowerScopeError);
});

test('inherited monetary field selector does not override the default', () => {
  const options = Object.create({ field: 'alternate_brl' });
  assert.equal(sumBrlCents(rows, options), 1025n);
});
