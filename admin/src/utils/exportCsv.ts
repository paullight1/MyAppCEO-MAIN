/**
 * Client-side CSV export. Turns an array of records into a downloadable CSV
 * file — no backend required. Handles quoting/escaping and BOM for Excel.
 */

type Primitive = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
    header: string;
    accessor: (row: T) => Primitive;
}

const escapeCell = (value: Primitive): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Quote if the value contains a comma, quote, or newline.
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
    const headerLine = columns.map((c) => escapeCell(c.header)).join(',');
    const dataLines = rows.map((row) =>
        columns.map((c) => escapeCell(c.accessor(row))).join(','),
    );
    return [headerLine, ...dataLines].join('\r\n');
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
    const csv = toCsv(rows, columns);
    // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
