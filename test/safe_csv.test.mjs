import test from 'node:test';
import assert from 'node:assert/strict';
import { CsvExportError, escapeCsvCell, serializeSafeCsv } from '../src/safe_csv.mjs';

const columns = [{ key: 'tower', label: 'Torre' }, { key: 'description', label: 'Descrição' }];
const csv = rows => serializeSafeCsv({ columns, rows });

test('ordinary CSV syntax, quotes and comma', () => {
  assert.equal(escapeCsvCell('A,"B"'), '"A,""B"""');
});
test('multiline values stay quoted and CRLF rows are stable', () => {
  assert.equal(csv([{ tower: 'A', description: 'linha1\nlinha2' }]), '"Torre","Descrição"\r\n"A","linha1\nlinha2"\r\n');
});
for (const prefix of ['=', '+', '-', '@']) {
  test('formula operator ' + prefix + ' is neutralized', () => {
    assert.equal(escapeCsvCell(prefix + 'SUM(1,2)'), '"' + "'" + prefix + 'SUM(1,2)"');
  });
}
for (const prefix of [' ', '\t', '\r', '\n', '\uFEFF', '\u200B', '\u2060']) {
  test('hidden prefix ' + JSON.stringify(prefix) + ' before formula is neutralized', () => {
    assert.equal(escapeCsvCell(prefix + '=1+1'), '"' + "'" + prefix + '=1+1"');
  });
}
test('leading tab is neutralized without operator', () => {
  assert.equal(escapeCsvCell('\ttexto'), '"' + "'" + '\ttexto"');
});
test('headers are sanitized too', () => {
  assert.equal(serializeSafeCsv({ columns: [{ key: 'a', label: '=HYPERLINK("x")' }], rows: [{ a: 'ok' }] }), '"\'=HYPERLINK(""x"")"\r\n"ok"\r\n');
});
test('negative numeric input is text-escaped', () => {
  assert.equal(escapeCsvCell(-12.5), '"\'-12.5"');
});
test('boolean, bigint and empty cell are serialized', () => {
  assert.equal(escapeCsvCell(true), '"true"');
  assert.equal(escapeCsvCell(123n), '"123"');
  assert.equal(escapeCsvCell(null), '""');
});
test('BOM is opt-in', () => {
  assert.ok(serializeSafeCsv({ columns, rows: [], bom: true }).startsWith('\uFEFF'));
  assert.ok(!csv([]).startsWith('\uFEFF'));
});
test('duplicate columns rejected', () => {
  assert.throws(() => serializeSafeCsv({ columns: [{ key: 'a', label: 'A' }, { key: 'a', label: 'A2' }], rows: [] }), CsvExportError);
});
test('invalid prototype-like column key rejected', () => {
  assert.throws(() => serializeSafeCsv({ columns: [{ key: '__proto__', label: 'A' }], rows: [] }), CsvExportError);
});
test('unexpected fields rejected instead of silently omitted', () => {
  assert.throws(() => csv([{ tower: 'A', description: 'ok', extra: 'hidden' }]), CsvExportError);
});
test('missing fields become empty cells', () => {
  assert.equal(csv([{ tower: 'A' }]), '"Torre","Descrição"\r\n"A",""\r\n');
});
test('invalid scalar and non-finite numbers rejected', () => {
  for (const value of [{}, [], Infinity, NaN, Symbol('x')]) assert.throws(() => escapeCsvCell(value), CsvExportError);
});
test('unsafe integer precision rejected', () => {
  assert.throws(() => escapeCsvCell(9007199254740992), CsvExportError);
});
test('NUL and oversized cell rejected', () => {
  assert.throws(() => escapeCsvCell('a\0b'), CsvExportError);
  assert.throws(() => escapeCsvCell('x'.repeat(8193)), CsvExportError);
});
test('row and column count limits rejected', () => {
  assert.throws(() => csv(Array(10001).fill({})), CsvExportError);
  assert.throws(() => serializeSafeCsv({ columns: Array.from({ length: 65 }, (_, i) => ({ key: 'c' + i, label: 'C' + i })), rows: [] }), CsvExportError);
});
test('non-object rows and malformed descriptors rejected', () => {
  assert.throws(() => csv([null]), CsvExportError);
  assert.throws(() => serializeSafeCsv({ columns: [null], rows: [] }), CsvExportError);
});
test('no mutation of input records', () => {
  const record = Object.freeze({ tower: 'A', description: '=1+1' });
  assert.ok(csv([record]).includes('"\'=1+1"'));
  assert.equal(record.description, '=1+1');
});
test('all generated cells are CSV-quoted', () => {
  assert.equal(csv([{ tower: 'A', description: 'normal' }]), '"Torre","Descrição"\r\n"A","normal"\r\n');
});
for (const prefix of [
  '\u200E', '\u200F', '\u202A', '\u202B', '\u202E',
  '\u2066', '\u2067', '\u2068', '\u2069',
  '\u00AD', '\u034F', '\u061C', '\u180E', '\u0001', '\u0085',
]) {
  test('invisible/control prefix U+' + prefix.codePointAt(0).toString(16) + ' is neutralized', () => {
    assert.equal(escapeCsvCell(prefix + '=1+1'), '"' + "'" + prefix + '=1+1"');
  });
}
test('multiple mixed invisible prefixes before operator are neutralized', () => {
  assert.equal(escapeCsvCell('\u200E\u2066 \t@SUM(1,2)'), '"\'\u200E\u2066 \t@SUM(1,2)"');
});
test('leading C0 control is neutralized even without a formula', () => {
  assert.equal(escapeCsvCell('\u0002hello'), '"\'\u0002hello"');
});
test('safe internal directionality is preserved, not stripped', () => {
  assert.equal(escapeCsvCell('abc\u200E=1'), '"abc\u200E=1"');
});
