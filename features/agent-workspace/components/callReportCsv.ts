type CsvValue = string | number | null | undefined;

export const downloadCsv = (filename: string, rows: CsvValue[][]) => {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const str = value === null || value === undefined ? '' : String(value);
          return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    )
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
