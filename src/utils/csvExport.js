/**
 * Generic CSV-download-as-Blob utility, shared across pages that export
 * table data (e.g. TrackingHistory's screening summary tables).
 */

const escapeCsvValue = (value) => {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/**
 * Build a CSV file from headers + rows and trigger a browser download.
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array<*>>} rows - Row values, in the same order as headers
 * @param {string} filename - Download filename (e.g. "Export_2026.01.01_.csv")
 */
export const downloadCsv = (headers, rows, filename) => {
  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
