const LEAF_TAG = 0x00;
const NODE_TAG = 0x01;

export const CHUNK_SIZE = 1024 * 1024;

async function sha256(...parts: Uint8Array[]): Promise<Uint8Array> {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', joined));
}

export async function leafHash(chunk: Uint8Array): Promise<Uint8Array> {
  return sha256(new Uint8Array([LEAF_TAG]), chunk);
}

export async function nodeHash(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  return sha256(new Uint8Array([NODE_TAG]), left, right);
}

export async function merkleRoot(leaves: Uint8Array[]): Promise<Uint8Array> {
  if (leaves.length === 0) throw new Error('cannot build a Merkle root over zero chunks');
  let level = leaves;
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(await nodeHash(left, right));
    }
    level = next;
  }
  return level[0];
}

export function chunkCount(byteLength: number): number {
  return Math.max(1, Math.ceil(byteLength / CHUNK_SIZE));
}

export function sliceChunk(data: Uint8Array, index: number): Uint8Array {
  return data.subarray(index * CHUNK_SIZE, Math.min((index + 1) * CHUNK_SIZE, data.length));
}
