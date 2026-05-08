/** Shared progress bar id+label for background video processing on the
 * exercise library — used by `LibraryBackgroundRunner`, manual recompress
 * (`recompressExercises`) and `optimizeAllVideos` so all three contribute
 * to a single unified bar instead of stacking. */
export const LIB_BG_JOB_ID = 'lib-bg-process';
export const LIB_BG_JOB_LABEL = 'Ajustando e classificando vídeos';
