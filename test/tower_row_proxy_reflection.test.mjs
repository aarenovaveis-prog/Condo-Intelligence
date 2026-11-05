import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, TowerScopeError } from '../src/tower_scope.mjs';

const options = { towerId: 'TORRE-A', knownTowers: ['TORRE-A', 'TORRE-B'] };
const row = { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '10.00' };

test('row Proxy reflection failure is normalized to TowerScopeError', () => {
  const hostile = new Proxy(row, {
    ownKeys() { throw new Error('untrusted ownKeys trap'); },
  });
  assert.throws(
    () => filterTowerRecords([hostile], options),
    error => error instanceof TowerScopeError &&
      error.message === 'record must be a plain data object',
  );
});

test('revoked row Proxy fails closed without leaking native TypeError', () => {
  const { proxy, revoke } = Proxy.revocable(row, {});
  revoke();
  assert.throws(
    () => filterTowerRecords([proxy], options),
    error => error instanceof TowerScopeError &&
      error.message === 'record must be a plain data object',
  );
});
