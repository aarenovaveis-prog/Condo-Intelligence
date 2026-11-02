/**
 * Standalone offline CSV export boundary. Not integrated with the Condo UI.
 * CSV quoting alone does not prevent spreadsheet formula execution.
 * Spreadsheet import behavior differs by vendor: review before production use.
 */
const FORMULA_PREFIX = /^[\s\u0001-\u001F\u007F-\u009F\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]*[=+\-@]/u;
const CONTROL_PREFIX = /^[\u0001-\u001F\u007F-\u009F]/u;
const MAX_ROWS = 10_000;
const MAX_COLUMNS = 64;
const MAX_CELL_LENGTH = 8_192;
const MAX_CSV_BYTES = 8_000_000;
const utf8 = new TextEncoder();

export class CsvExportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CsvExportError';
  }
}

function scalarToText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new CsvExportError('Non-finite numeric cell');
    if (!Number.isSafeInteger(value) && Number.isInteger(value)) {
      throw new CsvExportError('Unsafe integer precision');
    }
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  throw new CsvExportError('Unsupported CSV cell type');
}

export function escapeCsvCell(value) {
  const text = scalarToText(value);
  if (text.length > MAX_CELL_LENGTH) throw new CsvExportError('CSV cell too long');
  if (text.includes('\0')) throw new CsvExportError('NUL byte in CSV cell');
  // TextEncoder silently replaces unpaired UTF-16 surrogates with U+FFFD.
  // Reject malformed input rather than silently corrupting exported records.
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
      throw new CsvExportError('Malformed Unicode in CSV cell');
    }
  }
  const safe = FORMULA_PREFIX.test(text) || CONTROL_PREFIX.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function serializeSafeCsv({ columns, rows, bom = false }) {
  if (!Array.isArray(columns) || columns.length === 0 || columns.length > MAX_COLUMNS) {
    throw new CsvExportError('Invalid CSV column count');
  }
  if (!Array.isArray(rows) || rows.length > MAX_ROWS) {
    throw new CsvExportError('Invalid CSV row count');
  }
  if (typeof bom !== 'boolean') throw new CsvExportError('bom must be boolean');

  const keys = new Set();
  for (const column of columns) {
    if (column === null || typeof column !== 'object' || Array.isArray(column)) {
      throw new CsvExportError('Invalid column descriptor');
    }
    const { key, label } = column;
    if (typeof key !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key) ||
        ['__proto__', 'constructor', 'prototype'].includes(key) || keys.has(key)) {
      throw new CsvExportError('Invalid or duplicate column key');
    }
    if (typeof label !== 'string' || !label.trim()) {
      throw new CsvExportError('Column label is required');
    }
    keys.add(key);
  }

  const lines = [columns.map(c => escapeCsvCell(c.label)).join(',')];
  // Include header CRLF and the optional UTF-8 BOM in the output byte budget.
  let totalBytes = (bom ? 3 : 0) + utf8.encode(lines[0]).byteLength + 2;
  if (totalBytes > MAX_CSV_BYTES) throw new CsvExportError('CSV exceeds size limit');
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new CsvExportError('Invalid CSV row');
    }
    for (const key of Object.keys(row)) {
      if (!keys.has(key)) throw new CsvExportError('Unexpected CSV field');
    }
    const line = columns.map(c => escapeCsvCell(Object.hasOwn(row, c.key) ? row[c.key] : '')).join(',');
    totalBytes += utf8.encode(line).byteLength + 2;
    if (totalBytes > MAX_CSV_BYTES) throw new CsvExportError('CSV exceeds size limit');
    lines.push(line);
  }
  const output = lines.join('\r\n') + '\r\n';
  return bom ? '\uFEFF' + output : output;
}
