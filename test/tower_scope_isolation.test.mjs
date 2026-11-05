import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTowerRecords, TowerScopeError } from '../src/tower_scope.mjs';

const knownTowers = ['TORRE-A', 'TORRE-B'];
const rows = [
  { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '10.00' },
  { scope: 'tower', tower_id: 'TORRE-B', amount_brl: '20.00' },
  { scope: 'common', tower_id: null, amount_brl: '30.00' },
  { scope: 'common', tower_id: 'TORRE-B', amount_brl: '40.00' },
  { scope: 'legacy', tower_id: 'TORRE-A', amount_brl: '50.00' },
];

test('tower A never receives tower B or common records by default', () => {
  assert.deepEqual(filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers }).map(row => row.amount_brl), ['10.00']);
});

test('common opt-in includes only explicitly unassigned common records', () => {
  assert.deepEqual(filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers, includeCommon: true }).map(row => row.amount_brl), ['10.00', '30.00']);
});

test('unknown tower selection fails closed', () => {
  assert.throws(() => filterTowerRecords(rows, { towerId: 'TORRE-C', knownTowers }), TowerScopeError);
});

test('filtered rows are copies, not mutable aliases of input', () => {
  const selected = filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers });
  selected[0].amount_brl = '999.00';
  assert.equal(rows[0].amount_brl, '10.00');
});

test('sparse record arrays cannot inherit a record from their prototype', () => {
  const records = [{ scope: 'tower', tower_id: 'TORRE-A', amount_brl: '10.00' }];
  records.length = 2; // index 1 is intentionally absent
  const inherited = Object.create(Array.prototype);
  Object.defineProperty(inherited, '1', {
    value: { scope: 'tower', tower_id: 'TORRE-A', amount_brl: '999.00' },
  });
  Object.setPrototypeOf(records, inherited);
  assert.throws(() => filterTowerRecords(records, { towerId: 'TORRE-A', knownTowers }), TowerScopeError);
});

test('array record accessors are rejected without invoking the getter', () => {
  const records = [{ scope: 'tower', tower_id: 'TORRE-A', amount_brl: '10.00' }];
  let invoked = false;
  Object.defineProperty(records, '0', {
    configurable: true,
    get() { invoked = true; throw new Error('untrusted getter executed'); },
  });
  assert.throws(() => filterTowerRecords(records, { towerId: 'TORRE-A', knownTowers }), TowerScopeError);
  assert.equal(invoked, false);
});

test('tower filter does not invoke a caller-controlled array iterator', () => {
  const records = [{ scope: 'tower', tower_id: 'TORRE-A', amount_brl: '10.00' }];
  let invoked = false;
  Object.defineProperty(records, Symbol.iterator, {
    value() { invoked = true; throw new Error('untrusted iterator executed'); },
  });
  assert.deepEqual(
    filterTowerRecords(records, { towerId: 'TORRE-A', knownTowers }).map(row => row.amount_brl),
    ['10.00'],
  );
  assert.equal(invoked, false);
});

test('tower filter rejects revoked array proxies with a domain error', () => {
  const { proxy, revoke } = Proxy.revocable(
    [{ scope: 'tower', tower_id: 'TORRE-A', amount_brl: '10.00' }], {},
  );
  revoke();
  assert.throws(
    () => filterTowerRecords(proxy, { towerId: 'TORRE-A', knownTowers }),
    TowerScopeError,
  );
});

test('tower catalog accessor is rejected without executing its getter', () => {
  const catalog = ['TORRE-A', 'TORRE-B'];
  let invoked = false;
  Object.defineProperty(catalog, '1', {
    configurable: true,
    get() { invoked = true; throw new Error('untrusted catalog getter'); },
  });
  assert.throws(
    () => filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers: catalog }),
    TowerScopeError,
  );
  assert.equal(invoked, false);
});

test('sparse tower catalog cannot inherit an authorized ID', () => {
  const catalog = ['TORRE-A'];
  catalog.length = 2;
  const inherited = Object.create(Array.prototype);
  Object.defineProperty(inherited, '1', { value: 'TORRE-B' });
  Object.setPrototypeOf(catalog, inherited);
  assert.throws(
    () => filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers: catalog }),
    TowerScopeError,
  );
});

test('tower catalog ignores caller-controlled array iterator', () => {
  const catalog = ['TORRE-A', 'TORRE-B'];
  let invoked = false;
  Object.defineProperty(catalog, Symbol.iterator, {
    value() { invoked = true; throw new Error('untrusted catalog iterator'); },
  });
  assert.deepEqual(
    filterTowerRecords(rows, { towerId: 'TORRE-A', knownTowers: catalog }).map(row => row.amount_brl),
    ['10.00'],
  );
  assert.equal(invoked, false);
});
