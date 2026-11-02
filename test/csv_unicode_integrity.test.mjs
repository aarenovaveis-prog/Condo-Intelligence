import test from 'node:test';
import assert from 'node:assert/strict';
import { CsvExportError, escapeCsvCell, serializeSafeCsv } from '../src/safe_csv.mjs';

const columns = [{ key: 'value', label: 'Valor' }];

for (const [label, input] of [
  ['lone high surrogate', '\uD800'],
  ['lone low surrogate', '\uDC00'],
  ['high surrogate followed by ordinary text', '\uD800A'],
  ['valid pair followed by orphan low surrogate', '\uD83D\uDE00\uDC00'],
]) {
  test(`reject ${label} in cell`, () => {
    assert.throws(() => escapeCsvCell(input), CsvExportError);
  });
}

test('reject malformed Unicode in header labels', () => {
  assert.throws(() => serializeSafeCsv({ columns: [{ key: 'value', label: 'V\uD800' }], rows: [] }), CsvExportError);
});

test('valid supplementary Unicode is preserved byte-for-byte', () => {
  const csv = serializeSafeCsv({ columns, rows: [{ value: 'Torre 🏢' }] });
  assert.equal(csv, '"Valor"\r\n"Torre 🏢"\r\n');
  assert.ok(new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(csv)).includes('🏢'));
});
