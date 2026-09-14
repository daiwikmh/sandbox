import { CHUNK_SIZE, chunkCount, leafHash, merkleRoot, sliceChunk } from './merkle.js';

export const NONCE_BYTES = 12;

export type EncryptedChunk = {
  readonly index: number;
  readonly nonce: Uint8Array;
  readonly ciphertext: Uint8Array;
};

export type SealedDataset = {
  readonly root: Uint8Array;
  readonly chunks: EncryptedChunk[];
  readonly chunkCount: number;
  readonly byteLength: number;
};

export async function generateDatasetKey(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(32));
}

async function importKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

function chunkNonce(index: number): Uint8Array {
  const nonce = new Uint8Array(NONCE_BYTES);
  new DataView(nonce.buffer).setUint32(NONCE_BYTES - 4, index, false);
  return nonce;
}

export async function sealDataset(
  data: Uint8Array,
  datasetKey: Uint8Array,
): Promise<SealedDataset> {
  const key = await importKey(datasetKey);
  const count = chunkCount(data.length);
  const leaves: Uint8Array[] = [];
  const chunks: EncryptedChunk[] = [];

  for (let index = 0; index < count; index += 1) {
    const plain = sliceChunk(data, index);
    leaves.push(await leafHash(plain));
    const nonce = chunkNonce(index);
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce as BufferSource },
        key,
        plain as BufferSource,
      ),
    );
    chunks.push({ index, nonce, ciphertext });
  }

  return {
    root: await merkleRoot(leaves),
    chunks,
    chunkCount: count,
    byteLength: data.length,
  };
}

export async function openDataset(
  sealed: SealedDataset,
  datasetKey: Uint8Array,
): Promise<Uint8Array> {
  const key = await importKey(datasetKey);
  const out = new Uint8Array(sealed.byteLength);
  const leaves: Uint8Array[] = [];

  for (const chunk of sealed.chunks) {
    const plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: chunk.nonce as BufferSource },
        key,
        chunk.ciphertext as BufferSource,
      ),
    );
    leaves.push(await leafHash(plain));
    out.set(plain, chunk.index * CHUNK_SIZE);
  }

  const root = await merkleRoot(leaves);
  if (!equal(root, sealed.root)) {
    throw new Error('dataset root mismatch: the blob does not match its commitment');
  }
  return out;
}

export function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}
