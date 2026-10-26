import { describe, expect, it } from 'vitest';
import { toCsv } from '../../src/lib/csv';

const BOM = '﻿';

describe('toCsv', () => {
  it('starts with a UTF-8 BOM and uses CRLF line endings', () => {
    expect(toCsv(['A', 'B'], [['1', '2']])).toBe(`${BOM}A,B\r\n1,2\r\n`);
  });

  it('writes only the header row when there are no rows', () => {
    expect(toCsv(['A', 'B'], [])).toBe(`${BOM}A,B\r\n`);
  });

  it('quotes values containing commas, quotes, CR or LF and doubles embedded quotes', () => {
    const csv = toCsv(['V'], [['a,b'], ['say "hi"'], ['line1\nline2'], ['cr\rhere']]);
    expect(csv).toBe(`${BOM}V\r\n"a,b"\r\n"say ""hi"""\r\n"line1\nline2"\r\n"cr\rhere"\r\n`);
  });

  it.each(['=SUM(A1)', '+1', '-1+2', '@cmd', '\tx'])(
    'guards formula-like value %j with a quote',
    (value) => {
      const csv = toCsv(['V'], [[value]]);
      const cell = csv.split('\r\n')[1]!;
      expect(cell.replace(/^"|"$/g, '').startsWith(`'${value[0]}`)).toBe(true);
    },
  );

  it('renders null and undefined as empty cells and numbers as text', () => {
    expect(toCsv(['A', 'B', 'C'], [[null, undefined, 3]])).toBe(`${BOM}A,B,C\r\n,,3\r\n`);
  });
});
