import test from 'node:test';
import assert from 'node:assert/strict';
import { TowerScopeError, filterTowerRecords, parseBrlCents, sumBrlCents, formatBrlCents } from '../src/tower_scope.mjs';

const records = Object.freeze([
  Object.freeze({ id: 'a1', scope: 'tower', tower_id: 'A', amount_brl: '0.10' }),
  Object.freeze({ id: 'a2', scope: 'tower', tower_id: 'A', amount_brl: '0.20' }),
  Object.freeze({ id: 'b1', scope: 'tower', tower_id: 'B', amount_brl: '999.99' }),
  Object.freeze({ id: 'common', scope: 'common', tower_id: null, amount_brl: '1.25' }),
  Object.freeze({ id: 'wrong-common', scope: 'common', tower_id: 'B', amount_brl: '700.00' }),
  Object.freeze({ id: 'legacy', scope: null, tower_id: null, amount_brl: '800.00' }),
  Object.freeze({ id: 'unknown', scope: 'unknown', tower_id: 'A', amount_brl: '900.00' }),
]);
const filter = (towerId = 'A', includeCommon = false, rows = records) =>
  filterTowerRecords(rows, { towerId, knownTowers: ['A', 'B', 'C'], includeCommon });

for (const [label, towerId, common, expected] of [
  ['A only', 'A', false, ['a1', 'a2']],
  ['B only', 'B', false, ['b1']],
  ['empty C', 'C', false, []],
  ['common explicit', 'A', true, ['a1', 'a2', 'common']],
  ['common not assigned to B', 'B', true, ['b1', 'common']],
]) {
  test(label, () => assert.deepEqual(filter(towerId, common).map(r => r.id), expected));
}

test('other tower, legacy, unknown and misclassified common excluded', () => {
  assert.deepEqual(filter('A', true).map(r => r.id), ['a1', 'a2', 'common']);
});
test('copies do not mutate source records', () => {
  const result = filter();
  result[0].amount_brl = '99.00';
  assert.equal(records[0].amount_brl, '0.10');
});
test('accepts Set catalog and null-prototype data record', () => {
  const row = Object.assign(Object.create(null), { scope: 'tower', tower_id: 'A', amount_brl: '1.00' });
  assert.equal(filterTowerRecords([row], { towerId: 'A', knownTowers: new Set(['A']) }).length, 1);
});
for (const [label, opts] of [
  ['unknown tower', { towerId: 'X', knownTowers: ['A'] }],
  ['empty tower', { towerId: '', knownTowers: ['A'] }],
  ['noncanonical tower', { towerId: ' A ', knownTowers: ['A'] }],
  ['string catalog', { towerId: 'A', knownTowers: 'ABC' }],
  ['duplicate catalog', { towerId: 'A', knownTowers: ['A', 'A'] }],
  ['noncanonical catalog', { towerId: 'A', knownTowers: ['A', ' B'] }],
  ['empty catalog', { towerId: 'A', knownTowers: [] }],
  ['string common flag', { towerId: 'A', knownTowers: ['A'], includeCommon: 'true' }],
]) {
  test('reject ' + label, () => assert.throws(() => filterTowerRecords(records, opts), TowerScopeError));
}
test('reject non-array records', () => {
  assert.throws(() => filterTowerRecords(new Set(records), { towerId: 'A', knownTowers: ['A'] }), TowerScopeError);
});
test('reject non-object record', () => assert.throws(() => filter('A', false, [null]), TowerScopeError));
test('reject accessor records without invoking getter', () => {
  let invoked = false;
  const row = { scope: 'tower', tower_id: 'A', get amount_brl() { invoked = true; return '1.00'; } };
  assert.throws(() => filter('A', false, [row]), TowerScopeError);
  assert.equal(invoked, false);
});

test('exact 0.10 + 0.20 = 0.30', () => assert.equal(formatBrlCents(sumBrlCents(filter())), '0.30'));
test('exact total including common', () => assert.equal(formatBrlCents(sumBrlCents(filter('A', true))), '1.55'));
test('empty total', () => assert.equal(formatBrlCents(sumBrlCents([])), '0.00'));
test('negative credit', () => assert.equal(formatBrlCents(sumBrlCents([{ amount_brl: '-1.25' }, { amount_brl: '2.00' }])), '0.75'));
test('parse integer and one-decimal values', () => {
  assert.equal(parseBrlCents('2'), 200n);
  assert.equal(parseBrlCents('2.5'), 250n);
  assert.equal(parseBrlCents('-0.05'), -5n);
});
test('maximum bounded amount', () => assert.equal(formatBrlCents(parseBrlCents('999999999999.99')), '999999999999.99'));
for (const value of [0.1, NaN, Infinity, true, null, undefined, 'NaN', 'Infinity', '0.001', '1.234,56', '1e2', ' 1.00', '01.00', '+1.00', '1000000000000.00']) {
  test('reject invalid money ' + String(value), () => assert.throws(() => parseBrlCents(value), TowerScopeError));
}
test('reject missing money field', () => assert.throws(() => sumBrlCents([{ foo: '1.00' }]), TowerScopeError));
test('reject inherited money field', () => assert.throws(() => sumBrlCents([Object.create({ amount_brl: '1.00' })]), TowerScopeError));
test('reject unsafe total overflow', () => assert.throws(() => sumBrlCents([{ amount_brl: '900000000000.00' }, { amount_brl: '900000000000.00' }]), TowerScopeError));
test('reject accessor amount without invoking getter', () => {
  let invoked = false;
  const row = { get amount_brl() { invoked = true; return '1.00'; } };
  assert.throws(() => sumBrlCents([row]), TowerScopeError);
  assert.equal(invoked, false);
});
test('reject invalid field names', () => assert.throws(() => sumBrlCents([], { field: '__proto__' }), TowerScopeError));
test('reject number formatting to avoid float conversion', () => assert.throws(() => formatBrlCents(1), TowerScopeError));

// Prevent unbounded numeric text from reaching BigInt, which could consume
// disproportionate CPU and memory for untrusted demonstration imports.
test('reject oversized numeric text before BigInt conversion', () => {
  const originalBigInt = globalThis.BigInt;
  let calls = 0;
  try {
    globalThis.BigInt = (...args) => { calls++; return originalBigInt(...args); };
    for (const value of ['9'.repeat(100_000), '-' + '9'.repeat(100_000), '9'.repeat(100_000) + '.99']) {
      assert.throws(() => parseBrlCents(value), TowerScopeError);
    }
  } finally {
    globalThis.BigInt = originalBigInt;
  }
  assert.equal(calls, 0, 'oversized text must be rejected before BigInt');
});

test('negative maximum amount remains accepted', () => {
  assert.equal(parseBrlCents('-999999999999.99'), -99_999_999_999_999n);
});

test('over-limit canonical length rejected with supported range error', () => {
  assert.throws(() => parseBrlCents('99999999999999999'),
    { name: 'TowerScopeError', message: 'Money exceeds supported range' });
});

// Regression: legacy objects must never be classified by polluted prototypes.
// Restore the prototype even if an assertion fails; no real tenant data is used.
function withPrototypeFields(fields, action) {
  const saved = Object.fromEntries(Object.keys(fields).map(key => [key, Object.getOwnPropertyDescriptor(Object.prototype, key)]));
  try {
    for (const [key, value] of Object.entries(fields)) {
      Object.defineProperty(Object.prototype, key, { configurable: true, value, writable: true });
    }
    action();
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(Object.prototype, key, descriptor);
      else delete Object.prototype[key];
    }
  }
}

test('exclude legacy record when scope and tower ID are inherited', () => {
  withPrototypeFields({ scope: 'tower', tower_id: 'A' }, () => {
    assert.deepEqual(filter('A', false, [{ id: 'legacy', amount_brl: '999.99' }]), []);
  });
});

test('exclude record with own tower scope but inherited tower ID', () => {
  withPrototypeFields({ tower_id: 'A' }, () => {
    assert.deepEqual(filter('A', false, [{ id: 'legacy', scope: 'tower', amount_brl: '999.99' }]), []);
  });
});

test('exclude common record with inherited common classification', () => {
  withPrototypeFields({ scope: 'common', tower_id: null }, () => {
    assert.deepEqual(filter('A', true, [{ id: 'legacy', amount_brl: '999.99' }]), []);
  });
});

test('exclude metadata hidden from returned copy', () => {
  const row = { id: 'hidden', amount_brl: '99.99' };
  Object.defineProperty(row, 'scope', { value: 'tower', enumerable: false });
  Object.defineProperty(row, 'tower_id', { value: 'A', enumerable: false });
  assert.deepEqual(filter('A', false, [row]), []);
});


// Regression: catalog membership must come from indexed own data slots,
// never a caller-supplied iterator or getter.
test('array iterator cannot replace the declared tower catalog', () => {
  const catalog = ['A'];
  catalog[Symbol.iterator] = function* () { yield 'B'; };
  assert.throws(() => filterTowerRecords([], { towerId: 'B', knownTowers: catalog }), TowerScopeError);
  assert.deepEqual(filterTowerRecords(records, { towerId: 'A', knownTowers: catalog }).map(r => r.id), ['a1', 'a2']);
});

test('array iterator cannot append an unauthorized tower', () => {
  const catalog = ['A'];
  catalog[Symbol.iterator] = function* () { yield 'A'; yield 'B'; };
  assert.throws(() => filterTowerRecords([], { towerId: 'B', knownTowers: catalog }), TowerScopeError);
});

test('sparse catalog cannot be filled by a forged iterator', () => {
  const catalog = ['A', , 'C'];
  catalog[Symbol.iterator] = function* () { yield 'A'; yield 'B'; yield 'C'; };
  assert.throws(() => filterTowerRecords([], { towerId: 'B', knownTowers: catalog }), TowerScopeError);
});

test('catalog accessor slots are rejected without executing getters', () => {
  const catalog = ['A'];
  let reads = 0;
  Object.defineProperty(catalog, '0', { configurable: true, get() { reads++; return 'A'; } });
  assert.throws(() => filterTowerRecords([], { towerId: 'A', knownTowers: catalog }), TowerScopeError);
  assert.equal(reads, 0);
});

test('Set instance iterator cannot forge tower membership', () => {
  const catalog = new Set(['A']);
  catalog[Symbol.iterator] = function* () { yield 'B'; };
  assert.throws(() => filterTowerRecords([], { towerId: 'B', knownTowers: catalog }), TowerScopeError);
  assert.deepEqual(filterTowerRecords(records, { towerId: 'A', knownTowers: catalog }).map(r => r.id), ['a1', 'a2']);
});

test('throwing array iterator is ignored when own slots are valid', () => {
  const catalog = ['A'];
  catalog[Symbol.iterator] = function* () { throw new Error('iterator trap'); };
  assert.deepEqual(filterTowerRecords(records, { towerId: 'A', knownTowers: catalog }).map(r => r.id), ['a1', 'a2']);
});

test('revoked Proxy catalog produces domain error instead of native exception', () => {
  const { proxy, revoke } = Proxy.revocable(['A'], {});
  revoke();
  assert.throws(() => filterTowerRecords([], { towerId: 'A', knownTowers: proxy }), TowerScopeError);
});

// v0.9.08: never trust the iterator of a records array when scoping rows.
test('records iterator cannot inject a foreign row into tower results', () => {
  const rows = [{ id: 'b', scope: 'tower', tower_id: 'B' }];
  rows[Symbol.iterator] = function* () { yield { id: 'injected', scope: 'tower', tower_id: 'A' }; };
  assert.deepEqual(filter('A', false, rows), []);
});

test('records iterator cannot suppress a declared row', () => {
  const rows = [{ id: 'a', scope: 'tower', tower_id: 'A' }];
  rows[Symbol.iterator] = function* () { yield { id: 'b', scope: 'tower', tower_id: 'B' }; };
  assert.deepEqual(filter('A', false, rows).map(r => r.id), ['a']);
});

test('sparse records array is rejected rather than silently skipped', () => {
  const rows = [, { id: 'a', scope: 'tower', tower_id: 'A' }];
  assert.throws(() => filter('A', false, rows), TowerScopeError);
});

test('accessor array slot rejected without invoking its getter', () => {
  const rows = [];
  let calls = 0;
  Object.defineProperty(rows, '0', { configurable: true, get() { calls++; return { scope: 'tower', tower_id: 'A' }; } });
  assert.throws(() => filter('A', false, rows), TowerScopeError);
  assert.equal(calls, 0);
});

test('throwing records iterator is ignored when own slots are valid', () => {
  const rows = [{ id: 'a', scope: 'tower', tower_id: 'A' }];
  rows[Symbol.iterator] = function* () { throw new Error('untrusted iterator'); };
  assert.deepEqual(filter('A', false, rows).map(r => r.id), ['a']);
});

test('revoked Proxy records array produces TowerScopeError', () => {
  const { proxy, revoke } = Proxy.revocable([], {});
  revoke();
  assert.throws(() => filter('A', false, proxy), TowerScopeError);
});

test('monetary sum uses declared array slots, not a forged iterator', () => {
  const rows = [{ amount_brl: '1.00' }];
  rows[Symbol.iterator] = function* () { yield { amount_brl: '999.00' }; };
  assert.equal(sumBrlCents(rows), 100n);
});

test('monetary sum ignores throwing array iterator', () => {
  const rows = [{ amount_brl: '1.00' }];
  rows[Symbol.iterator] = function* () { throw new Error('untrusted iterator'); };
  assert.equal(sumBrlCents(rows), 100n);
});

test('monetary sum rejects sparse arrays', () => {
  assert.throws(() => sumBrlCents([, { amount_brl: '1.00' }]), TowerScopeError);
});

// v0.9.09: never invoke row get traps after validating own data descriptors.
test('money sum uses own data descriptor instead of Proxy get trap', () => {
  const row = new Proxy({ amount_brl: '1.00' }, {
    get(target, key) { return key === 'amount_brl' ? '999.00' : Reflect.get(target, key); },
  });
  assert.equal(sumBrlCents([row]), 100n);
});

test('money sum does not invoke a throwing Proxy get trap', () => {
  let reads = 0;
  const row = new Proxy({ amount_brl: '1.00' }, {
    get() { reads++; throw new Error('untrusted get'); },
  });
  assert.equal(sumBrlCents([row]), 100n);
  assert.equal(reads, 0);
});

test('filter copies own data descriptors without invoking Proxy get trap', () => {
  let reads = 0;
  const row = new Proxy({ id: 'original', scope: 'tower', tower_id: 'A', amount_brl: '1.00' }, {
    get(target, key) { reads++; return key === 'id' ? 'forged' : Reflect.get(target, key); },
  });
  assert.deepEqual(filter('A', false, [row]).map(r => r.id), ['original']);
  assert.equal(reads, 0);
});

test('revoked Proxy record raises domain error in both paths', () => {
  const { proxy, revoke } = Proxy.revocable({ scope: 'tower', tower_id: 'A', amount_brl: '1.00' }, {});
  revoke();
  assert.throws(() => filter('A', false, [proxy]), TowerScopeError);
  assert.throws(() => sumBrlCents([proxy]), TowerScopeError);
});

test('throwing reflection trap raises domain error in both paths', () => {
  const row = new Proxy({ scope: 'tower', tower_id: 'A', amount_brl: '1.00' }, {
    ownKeys() { throw new Error('untrusted reflection'); },
  });
  assert.throws(() => filter('A', false, [row]), TowerScopeError);
  assert.throws(() => sumBrlCents([row]), TowerScopeError);
});

// v0.9.10: reject oversized sparse arrays before scanning slots.
test('filter rejects oversized synthetic array without visiting rows', () => {
  const rows = new Array(10_001);
  assert.throws(() => filter('A', false, rows), TowerScopeError);
});
test('sum rejects oversized synthetic array before reading money', () => {
  assert.throws(() => sumBrlCents(new Array(10_001)), TowerScopeError);
});
test('boundary of 10000 synthetic rows remains supported', () => {
  const rows = Array.from({ length: 10_000 }, () => ({ scope: 'tower', tower_id: 'A', amount_brl: '0.01' }));
  assert.equal(filter('A', false, rows).length, 10_000);
  assert.equal(sumBrlCents(rows), 10_000n);
});

// Hidden monetary data would disappear when a scoped record is copied.
// Reject it consistently in the standalone sum contract as well.
test('reject non-enumerable monetary field rather than silently counting hidden data', () => {
  const row = {};
  Object.defineProperty(row, 'amount_brl', { value: '123.45', enumerable: false });
  assert.throws(() => sumBrlCents([row]), TowerScopeError);
});

test('accept enumerable own monetary field in a null-prototype record', () => {
  const row = Object.assign(Object.create(null), { amount_brl: '0.25' });
  assert.equal(sumBrlCents([row]), 25n);
});


// Bound untrusted catalogs before scanning slots or materializing a Set.
test('reject oversized array tower catalog before indexed slot inspection', () => {
  const catalog = new Array(10_001).fill('A');
  let indexedReads = 0;
  const proxy = new Proxy(catalog, {
    getOwnPropertyDescriptor(target, key) {
      if (key !== 'length') indexedReads++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  assert.throws(() => filterTowerRecords([], { towerId: 'A', knownTowers: proxy }), TowerScopeError);
  assert.equal(indexedReads, 0);
});

test('reject oversized Set tower catalog without invoking its values iterator', () => {
  const catalog = new Set(Array.from({ length: 10_001 }, (_, i) => `T${i}`));
  catalog.values = () => { throw new Error('untrusted iterator'); };
  assert.throws(() => filterTowerRecords([], { towerId: 'T0', knownTowers: catalog }), TowerScopeError);
});

test('accept bounded catalog of unique canonical tower IDs', () => {
  const catalog = Array.from({ length: 10_000 }, (_, i) => `T${i}`);
  assert.deepEqual(filterTowerRecords([], { towerId: 'T9999', knownTowers: catalog }), []);
});


test('tower catalog uses own length descriptor without invoking proxy length getter', () => {
  let lengthReads = 0;
  const catalog = new Proxy(['A'], {
    get(target, key, receiver) {
      if (key === 'length') {
        lengthReads++;
        throw new Error('unexpected length access');
      }
      return Reflect.get(target, key, receiver);
    },
  });
  assert.deepEqual(filterTowerRecords(records, { towerId: 'A', knownTowers: catalog }).map(row => row.id), ['a1', 'a2']);
  assert.equal(lengthReads, 0);
});

// v0.9.27: canonical BRL text must not silently normalize negative zero.
test('reject negative zero monetary text in all supported precisions', () => {
  for (const value of ['-0', '-0.0', '-0.00']) {
    assert.throws(() => parseBrlCents(value), TowerScopeError, value);
    assert.throws(() => sumBrlCents([{ amount_brl: value }]), TowerScopeError, value);
  }
});

test('retain positive zero and negative nonzero cents', () => {
  for (const value of ['0', '0.0', '0.00']) assert.equal(parseBrlCents(value), 0n);
  assert.equal(parseBrlCents('-0.01'), -1n);
  assert.equal(formatBrlCents(parseBrlCents('0.00')), '0.00');
});


// v0.9.28: malformed options must fail with a stable domain error.
test('filter rejects null and primitive options with TowerScopeError', () => {
  for (const options of [null, 0, false, 'A']) {
    assert.throws(() => filterTowerRecords(records, options),
      { name: 'TowerScopeError', message: 'Invalid filter options' });
  }
});

test('monetary sum rejects null and primitive options with TowerScopeError', () => {
  for (const options of [null, 0, false, 'amount_brl']) {
    assert.throws(() => sumBrlCents(records, options),
      { name: 'TowerScopeError', message: 'Invalid monetary options' });
  }
});

test('omitted options retain existing monetary defaults', () => {
  assert.equal(sumBrlCents([{ amount_brl: '0.10' }]), 10n);
  assert.deepEqual(filterTowerRecords(records, { towerId: 'A', knownTowers: ['A'] }).map(row => row.id), ['a1', 'a2']);
});

 
// v0.9.29: options must not execute caller-controlled getters.
test('filter rejects accessor options without running getters', () => {
  let reads = 0;
  const options = { knownTowers: ['A'] };
  Object.defineProperty(options, 'towerId', { get() { reads++; throw new Error('untrusted getter'); } });
  assert.throws(() => filterTowerRecords(records, options),
    { name: 'TowerScopeError', message: 'Invalid filter options' });
  assert.equal(reads, 0);
});

test('money sum rejects accessor options without running getters', () => {
  let reads = 0;
  const options = {};
  Object.defineProperty(options, 'field', { get() { reads++; return 'amount_brl'; } });
  assert.throws(() => sumBrlCents([{ amount_brl: '1.00' }], options),
    { name: 'TowerScopeError', message: 'Invalid monetary options' });
  assert.equal(reads, 0);
});

test('revoked options proxies raise domain errors', () => {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  assert.throws(() => filterTowerRecords(records, proxy), TowerScopeError);
  assert.throws(() => sumBrlCents([{ amount_brl: '1.00' }], proxy), TowerScopeError);
});

test('option Proxy get traps cannot forge tower or money fields', () => {
  let reads = 0;
  const filterOptions = new Proxy({ towerId: 'A', knownTowers: ['A'] }, {
    get() { reads++; throw new Error('untrusted get'); },
  });
  assert.deepEqual(filterTowerRecords(records, filterOptions).map(row => row.id), ['a1', 'a2']);
  const sumOptions = new Proxy({ field: 'amount_brl' }, {
    get() { reads++; throw new Error('untrusted get'); },
  });
  assert.equal(sumBrlCents([{ amount_brl: '1.00' }], sumOptions), 100n);
  assert.equal(reads, 0);
});


// v0.9.30: silently ignored option typos can select unintended monetary fields.
test('filter rejects unknown option names instead of silently ignoring typos', () => {
  assert.throws(() => filterTowerRecords(records, {
    towerId: 'A', knownTowers: ['A'], includeComon: true,
  }), { name: 'TowerScopeError', message: 'Invalid filter options' });
});

test('money sum rejects unknown field-selection options', () => {
  assert.throws(() => sumBrlCents([{ amount_brl: '1.00', other_brl: '9.00' }], {
    moneyField: 'other_brl',
  }), { name: 'TowerScopeError', message: 'Invalid monetary options' });
});

test('filter and money sum reject symbol option keys', () => {
  const unexpected = Symbol('unexpected');
  assert.throws(() => filterTowerRecords([], {
    towerId: 'A', knownTowers: ['A'], [unexpected]: true,
  }), TowerScopeError);
  assert.throws(() => sumBrlCents([{ amount_brl: '1.00' }], {
    field: 'amount_brl', [unexpected]: true,
  }), TowerScopeError);
});

test('supported explicit options preserve scoping and monetary totals', () => {
  const selected = filterTowerRecords(records, { towerId: 'A', knownTowers: ['A', 'B'], includeCommon: true });
  assert.equal(sumBrlCents(selected, { field: 'amount_brl' }), 155n);
});


// v0.9.31: regression for misplaced allowlist check (PR #35).
test('normal tower and monetary records remain accepted after option validation', () => {
  const selected = filterTowerRecords(
    [{ id: 'r1', scope: 'tower', tower_id: 'A', amount_brl: '0.10' }],
    { towerId: 'A', knownTowers: ['A'] },
  );
  assert.equal(selected.length, 1);
  assert.equal(sumBrlCents(selected), 10n);
});

test('unknown option names and Symbol keys are rejected in both contracts', () => {
  assert.throws(() => filterTowerRecords([], {
    towerId: 'A', knownTowers: ['A'], includeComon: true,
  }), TowerScopeError);
  assert.throws(() => sumBrlCents([], { moneyField: 'amount_brl' }), TowerScopeError);
  assert.throws(() => sumBrlCents([], { [Symbol('field')]: 'amount_brl' }), TowerScopeError);
});

test('option accessors are rejected without invoking getters', () => {
  let calls = 0;
  const opts = { get field() { calls++; return 'amount_brl'; } };
  assert.throws(() => sumBrlCents([], opts), TowerScopeError);
  assert.equal(calls, 0);
});


// v0.9.32: enforce workload bounds at the exact 10,000-record boundary.
// Synthetic records only; these checks do not establish tenant authorization.
test('filter accepts exactly 10,000 declared records', () => {
  const rows = Array.from({ length: 10_000 }, (_, i) => ({
    id: String(i), scope: 'tower', tower_id: 'A',
  }));
  assert.equal(filterTowerRecords(rows, { towerId: 'A', knownTowers: ['A'] }).length, 10_000);
});

test('filter rejects 10,001 records before reading row getters', () => {
  const rows = Array.from({ length: 10_001 }, () => null);
  let invoked = false;
  Object.defineProperty(rows, '0', { get() { invoked = true; throw Error('getter'); } });
  assert.throws(() => filterTowerRecords(rows, { towerId: 'A', knownTowers: ['A'] }), TowerScopeError);
  assert.equal(invoked, false);
});

test('money sum accepts 10,000 exact cent values', () => {
  const rows = Array.from({ length: 10_000 }, () => ({ amount_brl: '0.01' }));
  assert.equal(sumBrlCents(rows), 10_000n);
});

test('money sum rejects 10,001 records without evaluating row values', () => {
  const rows = Array.from({ length: 10_001 }, () => null);
  let invoked = false;
  Object.defineProperty(rows, '0', { get() { invoked = true; throw Error('getter'); } });
  assert.throws(() => sumBrlCents(rows), TowerScopeError);
  assert.equal(invoked, false);
});
