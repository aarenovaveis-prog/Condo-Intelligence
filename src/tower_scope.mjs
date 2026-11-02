/**
 * Offline demonstration contract for tower filters and BRL totals.
 * NOT an authorization boundary, database policy, or substitute for Supabase RLS.
 * Uses only synthetic records; does not connect to the Condo application.
 */
const MAX_CENTS = 99_999_999_999_999n; // R$ 999,999,999,999.99
// Longest accepted representation: -999999999999.99 (16 UTF-16 code units).
const MAX_MONEY_TEXT_LENGTH = 16;
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

function plainRecord(row) {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) return false;
  const proto = Object.getPrototypeOf(row);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(Object.getOwnPropertyDescriptors(row)).every(d => Object.hasOwn(d, 'value'));
}

function catalogIds(knownTowers) {
  if (!Array.isArray(knownTowers) && !(knownTowers instanceof Set)) {
    throw new TowerScopeError('knownTowers must be an array or Set');
  }
  const ids = [...knownTowers];
  if (!ids.length || ids.some(id => !canonicalId(id)) || new Set(ids).size !== ids.length) {
    throw new TowerScopeError('knownTowers must contain unique canonical IDs');
  }
  return new Set(ids);
}

/** Return shallow copies of records explicitly scoped to one tower. */
export function filterTowerRecords(records, { towerId, knownTowers, includeCommon = false } = {}) {
  if (!canonicalId(towerId)) throw new TowerScopeError('towerId must be canonical');
  const catalog = catalogIds(knownTowers);
  if (!catalog.has(towerId)) throw new TowerScopeError('Unknown towerId');
  if (typeof includeCommon !== 'boolean') throw new TowerScopeError('includeCommon must be boolean');
  if (!Array.isArray(records)) throw new TowerScopeError('records must be an array');

  const selected = [];
  for (const row of records) {
    if (!plainRecord(row)) throw new TowerScopeError('record must be a plain data object');
    if (row.scope === 'tower' && row.tower_id === towerId) {
      selected.push({ ...row });
    } else if (includeCommon && row.scope === 'common' && (row.tower_id === null || row.tower_id === '')) {
      selected.push({ ...row });
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
  if (!Array.isArray(records)) throw new TowerScopeError('records must be an array');
  if (typeof field !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/u.test(field) ||
      ['constructor', 'prototype', '__proto__'].includes(field)) {
    throw new TowerScopeError('Invalid money field');
  }
  let total = 0n;
  for (const row of records) {
    if (!plainRecord(row) || !Object.hasOwn(row, field)) {
      throw new TowerScopeError('Missing or invalid monetary record');
    }
    total += parseBrlCents(row[field]);
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
