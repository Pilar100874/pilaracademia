/** Shared progress bar id+label for background video processing on the
 * exercise library — used by `LibraryBackgroundRunner`, manual recompress
 * (`recompressExercises`) and `optimizeAllVideos` so all three contribute
 * to a single unified bar instead of stacking. */
export const LIB_BG_JOB_ID = 'lib-bg-process';
export const LIB_BG_JOB_LABEL = 'Ajustando e classificando vídeos';

/**
 * Contador global de importações em andamento (upload em massa,
 * importação do Instagram, etc). Enquanto > 0, o
 * `LibraryBackgroundRunner` aguarda — só começa a otimizar/classificar
 * vídeos depois que toda importação termina, evitando concorrência
 * de I/O e CPU no navegador.
 */
let importBusyCount = 0;
const listeners = new Set<() => void>();

export function beginImport() {
  importBusyCount++;
  listeners.forEach((l) => l());
}

export function endImport() {
  importBusyCount = Math.max(0, importBusyCount - 1);
  listeners.forEach((l) => l());
}

export function isImportBusy() {
  return importBusyCount > 0;
}

export function subscribeImportBusy(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
