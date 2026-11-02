import test from 'node:test';
import assert from 'node:assert/strict';
import { CsvExportError, serializeSafeCsv } from '../src/safe_csv.mjs';

const columns = [{ key: 'value', label: 'A' }];
const rowsAtLimit = () => Array.from({ length: 1000 }, (_, i) => ({
  value: 'x'.repeat(i < 995 ? 7996 : 7995),
}));

// The header is 5 UTF-8 bytes and each quoted row adds 4 bytes for quotes/CRLF.
// 995*7996 + 5*7995 + 1000*4 + 5 = 8,000,000 bytes exactly.
test('exactly 8,000,000 UTF-8 bytes are allowed', () => {
  const output = serializeSafeCsv({ columns, rows: rowsAtLimit() });
  assert.equal(new TextEncoder().encode(output).byteLength, 8_000_000);
});

test('one byte beyond limit is rejected, including CRLF', () => {
  const rows = rowsAtLimit();
  rows[999].value += 'x';
  assert.throws(() => serializeSafeCsv({ columns, rows }), CsvExportError);
});

test('BOM is counted as three UTF-8 bytes', () => {
  assert.throws(() => serializeSafeCsv({ columns, rows: rowsAtLimit(), bom: true }), CsvExportError);
});

test('multibyte characters cannot bypass the 8 MB output cap', () => {
  const rows = Array.from({ length: 1000 }, () => ({ value: 'é'.repeat(4096) }));
  assert.throws(() => serializeSafeCsv({ columns, rows }), CsvExportError);
});

test('small BOM and Unicode output remains unchanged', () => {
  const output = serializeSafeCsv({ columns, rows: [{ value: 'Água' }], bom: true });
  assert.equal(output, '\uFEFF"A"\r\n"Água"\r\n');
  assert.equal(new TextEncoder().encode(output).byteLength, 17);
});
