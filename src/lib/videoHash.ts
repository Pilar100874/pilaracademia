/**
 * SHA-256 hash (hex) de um Blob/ArrayBuffer — usado para identificar
 * vídeos com conteúdo idêntico no momento da importação. Permite avisar
 * o usuário antes de criar um exercício duplicado.
 */
export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return sha256Hex(buf);
}

export async function hashUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return sha256Hex(buf);
  } catch {
    return null;
  }
}
