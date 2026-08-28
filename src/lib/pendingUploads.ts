/**
 * Fila persistente de uploads da biblioteca de exercícios.
 *
 * Os arquivos selecionados (vídeos/GIFs, inclusive os extraídos de um ZIP)
 * são gravados no IndexedDB ANTES de qualquer envio. Assim o usuário pode
 * fechar o app/aba a qualquer momento: ao reabrir, o `PendingUploadRunner`
 * retoma exatamente de onde parou, sem precisar selecionar os arquivos de
 * novo.
 */

export interface PendingUploadMeta {
  userId: string;
  /** Nome final desejado do exercício (já traduzido, quando houver). */
  desiredName?: string | null;
  /** Nome base para geração automática (ex.: nome da categoria). */
  baseName?: string | null;
  categoryId?: string | null;
  extraIds?: string[];
  isGif?: boolean;
  isGlobal?: boolean;
  /** Pula a recompressão no navegador (GIFs vão como estão). */
  noRecompress?: boolean;
}

export interface PendingUploadRecord {
  id: string;
  createdAt: number;
  fileName: string;
  fileType: string;
  blob: Blob;
  meta: PendingUploadMeta;
}

const DB_NAME = 'pilar-pending-uploads';
const STORE = 'uploads';
export const PENDING_UPLOADS_EVENT = 'pending-uploads-changed';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

function notify() {
  try {
    window.dispatchEvent(new CustomEvent(PENDING_UPLOADS_EVENT));
  } catch {
    /* ignore */
  }
}

export async function enqueueUploads(
  files: { file: File | Blob; name: string; meta: PendingUploadMeta }[],
): Promise<void> {
  for (const f of files) {
    const rec: PendingUploadRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      fileName: f.name,
      fileType: (f.file as File).type || '',
      blob: f.file,
      meta: f.meta,
    };
    await tx('readwrite', (s) => s.add(rec as unknown as never) as IDBRequest<IDBValidKey>);
  }
  notify();
}

export async function listPendingUploads(): Promise<PendingUploadRecord[]> {
  try {
    const all = (await tx('readonly', (s) => s.getAll() as IDBRequest<PendingUploadRecord[]>)) ?? [];
    return all.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function removePendingUpload(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>);
  } catch {
    /* ignore */
  }
}

export async function clearPendingUploads(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.clear() as unknown as IDBRequest<undefined>);
    notify();
  } catch {
    /* ignore */
  }
}
