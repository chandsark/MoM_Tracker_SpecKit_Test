// RFC 4180 CSV writer per specs/001-meeting-action-tracker/contracts/csv-export.md.
import type { Response } from 'express';

export type CsvValue = string | number | null | undefined;

const BOM = '﻿';
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Spreadsheets would evaluate these as formulas (CSV injection).
  if (FORMULA_START.test(text)) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 BOM, CRLF line endings, header row always present. */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(','));
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** Sends `csv` as a download named `<prefix>-YYYYMMDD.csv` (export date, UTC). */
export function sendCsv(res: Response, prefix: string, csv: string): void {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  res
    .status(200)
    .set('Content-Type', 'text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="${prefix}-${date}.csv"`)
    .send(csv);
}
