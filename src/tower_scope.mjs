/**
 * Offline demonstration contract for tower filters and BRL totals.
 * NOT an authorization boundary, database policy, or substitute for Supabase RLS.
 * Uses only synthetic records; does not connect to the Condo application.
 */
const MAX_CENTS = 99_999_999_999_999n; // R$ 999,999,999,999.99
// Longest accepted representation: -999999999999.99 (16 UTF-16 code units).
const MAX_MONEY_TEXT_LENGTH = 16;
const MAX_DEMO_RECORDS = 10_000; // bounded offline workload
const MONEY = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u;

export class TowerScopeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TowerScopeError';
  }
}

function canonicalId(value) {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

/** Snapshot own data descriptors; do not invoke row getters or Proxy get traps. */
function recordDataDescriptors(row) {
  try {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new TowerScopeError('record must be a plain data object');
    }
    const proto = Object.getPrototypeOf(row);
    if (proto !== Object.prototype && proto !== null) {
      throw new TowerScopeError('record must be a plain data object');
    }
    const descriptors = Object.getOwnPropertyDescriptors(row);
    if (!Reflect.ownKeys(descriptors).every(key => Object.hasOwn(descriptors[key], 'value'))) {
      throw new TowerScopeError('record must be a plain data object');
    }
    return descriptors;
  } catch {
    // Normalize revoked Proxy and hostile reflection traps to domain errors.
    throw new TowerScopeError('record must be a plain data object');
  }
}

function copyEnumerableData(descriptors) {
  const copy = {};
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key];
    if (descriptor.enumerable) {
      Object.defineProperty(copy, key, {
        value: descriptor.value, enumerable: true, writable: true, configurable: true,
      });
    }
  }
  return copy;
}

function catalogIds(knownTowers) {
  const invalid = () => new TowerScopeError('knownTowers must contain unique canonical IDs');
  let ids;
  try {
    if (Array.isArray(knownTowers)) {
      // Never trust a caller-controlled iterator or accessor on an array catalog.
      // Inspect every indexed OWN data slot, including positions skipped by
      // Array#some, before constructing the canonical tower set.
      ids = [];
      for (let i = 0; i < knownTowers.length; i++) {
        const slot = Object.getOwnPropertyDescriptor(knownTowers, String(i));
        if (!slot || !Object.hasOwn(slot, 'value') || !canonicalId(slot.value)) {
          throw invalid();
        }
        ids.push(slot.value);
      }
    } else if (knownTowers instanceof Set) {
      // Bypass an overridden instance/subclass Symbol.iterator.
      ids = Array.from(Set.prototype.values.call(knownTowers));
    } else {
      throw invalid();
    }
  } catch (error) {
    // Revoked/hostile proxies must not leak native reflection exceptions.
    if (error instanceof TowerScopeError) throw error;
    throw invalid();
  }
  if (!ids.length || ids.some(id => !canonicalId(id)) || new Set(ids).size !== ids.length) {
    throw invalid();
  }
  return new Set(ids);
}

/** Read array length and indexed OWN data slots, not caller-controlled iterators. */
function recordArrayLength(records) {
  try {
    if (!Array.isArray(records)) throw new TowerScopeError('records must be an array');
    const length = Object.getOwnPropertyDescriptor(records, 'length');
    if (!length || !Object.hasOwn(length, 'value') ||
        !Number.isSafeInteger(length.value) || length.value < 0) {
      throw new TowerScopeError('records must be an array');
    }
    if (length.value > MAX_DEMO_RECORDS) {
      throw new TowerScopeError('Too many demonstration records');
    }
    return length.value;
  } catch {
    // Also normalize reflection errors from revoked Proxy arrays.
    throw new TowerScopeError('records must be an array');
  }
}

function recordAt(records, index) {
  let slot;
  try {
    slot = Object.getOwnPropertyDescriptor(records, String(index));
  } catch {
    throw new TowerScopeError('records must contain only own data slots');
  }
  if (!slot || !Object.hasOwn(slot, 'value')) {
    throw new TowerScopeError('records must contain only own data slots');
  }
  return slot.value;
}

/** Return shallow copies of records explicitly scoped to one tower. */
export function filterTowerRecords(records, { towerId, knownTowers, includeCommon = false } = {}) {
  if (!canonicalId(towerId)) throw new TowerScopeError('towerId must be canonical');
  const catalog = catalogIds(knownTowers);
  if (!catalog.has(towerId)) throw new TowerScopeError('Unknown towerId');
  if (typeof includeCommon !== 'boolean') throw new TowerScopeError('includeCommon must be boolean');
  const count = recordArrayLength(records);

  const selected = [];
  for (let i = 0; i < count; i++) {
    const row = recordAt(records, i);
    const descriptors = recordDataDescriptors(row);
    // Scope metadata must be OWN enumerable data fields. Inherited values can
    // originate from prototype pollution; hidden fields vanish on copy.
    const scope = Object.hasOwn(descriptors, 'scope') ? descriptors.scope : undefined;
    const tower = Object.hasOwn(descriptors, 'tower_id') ? descriptors.tower_id : undefined;
    if (!scope?.enumerable || !tower?.enumerable) continue;
    if (scope.value === 'tower' && tower.value === towerId) {
      selected.push(copyEnumerableData(descriptors));
    } else if (includeCommon && scope.value === 'common' && (tower.value === null || tower.value === '')) {
      selected.push(copyEnumerableData(descriptors));
    }
    // Unknown, legacy, mismatched common and other-tower records stay excluded.
  }
  return selected;
}

/** Parse canonical BRL decimal text to exact integer cents (bigint). */
export function parseBrlCents(value) {
  if (typeof value !== 'string') {
    throw new TowerScopeError('Money must be a canonical decimal string');
  }
  // Bound parsing cost before the regex or BigInt sees untrusted input.
  if (value.length > MAX_MONEY_TEXT_LENGTH) {
    throw new TowerScopeError('Money exceeds supported range');
  }
  if (!MONEY.test(value)) {
    throw new TowerScopeError('Money must be a canonical decimal string');
  }
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0');
  if (cents > MAX_CENTS) throw new TowerScopeError('Money exceeds supported range');
  return negative ? -cents : cents;
}

/** Exact total; never convert money to floating-point Number. */
export function sumBrlCents(records, { field = 'amount_brl' } = {}) {
  const count = recordArrayLength(records);
  if (typeof field !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/u.test(field) ||
      ['constructor', 'prototype', '__proto__'].includes(field)) {
    throw new TowerScopeError('Invalid money field');
  }
  let total = 0n;
  for (let i = 0; i < count; i++) {
    const row = recordAt(records, i);
    const descriptors = recordDataDescriptors(row);
    if (!Object.hasOwn(descriptors, field) || !descriptors[field].enumerable) {
      throw new TowerScopeError('Missing or invalid monetary record');
    }
    total += parseBrlCents(descriptors[field].value);
    if (total > MAX_CENTS || total < -MAX_CENTS) {
      throw new TowerScopeError('Money total exceeds supported range');
    }
  }
  return total;
}

/** Format exact integer cents as canonical decimal BRL text, without locale effects. */
export function formatBrlCents(cents) {
  if (typeof cents !== 'bigint' || cents > MAX_CENTS || cents < -MAX_CENTS) {
    throw new TowerScopeError('Expected bounded bigint cents');
  }
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  return (negative ? '-' : '') + String(absolute / 100n) + '.' + String(absolute % 100n).padStart(2, '0');
}
