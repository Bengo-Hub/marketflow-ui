/** Saves a Blob as a file in the browser. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** "leads-2026-10-23.csv" */
export function datedFilename(prefix: string, ext: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}
