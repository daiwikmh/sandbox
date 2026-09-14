import { describe, expect, it } from 'vitest';
import { ecMulGenerator } from '@midnight-ntwrk/compact-runtime';
import { reduceScalar } from '../crypto/attestation.js';
import { CHUNK_SIZE, chunkCount, merkleRoot, leafHash } from '../crypto/merkle.js';
import { equal, generateDatasetKey, openDataset, sealDataset } from '../crypto/envelope.js';
import { unwrapKeyInEnclave, wrapKeyForEnclave } from '../crypto/keywrap.js';

function payload(size: number, seed = 7): Uint8Array {
  const out = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) out[i] = (i * 31 + seed) % 251;
  return out;
}

describe('merkle', () => {
  it('chunks by 1 MiB', () => {
    expect(chunkCount(0)).toBe(1);
    expect(chunkCount(CHUNK_SIZE)).toBe(1);
    expect(chunkCount(CHUNK_SIZE + 1)).toBe(2);
    expect(chunkCount(CHUNK_SIZE * 4)).toBe(4);
  });

  it('separates leaf and node domains', async () => {
    const a = await leafHash(new Uint8Array([1]));
    const b = await leafHash(new Uint8Array([2]));
    expect(equal(await merkleRoot([a]), a)).toBe(true);
    expect(equal(await merkleRoot([a, b]), a)).toBe(false);
  });

  it('rejects an empty dataset', async () => {
    await expect(merkleRoot([])).rejects.toThrow(/zero chunks/);
  });
});

describe('envelope', () => {
  it('round-trips a multi-chunk dataset', async () => {
    const data = payload(CHUNK_SIZE * 2 + 1234);
    const key = await generateDatasetKey();
    const sealed = await sealDataset(data, key);
    expect(sealed.chunkCount).toBe(3);
    const opened = await openDataset(sealed, key);
    expect(equal(opened, data)).toBe(true);
  });

  it('produces the same root for the same bytes', async () => {
    const data = payload(50_000);
    const a = await sealDataset(data, await generateDatasetKey());
    const b = await sealDataset(data, await generateDatasetKey());
    expect(equal(a.root, b.root)).toBe(true);
  });

  it('produces a different root for different bytes', async () => {
    const a = await sealDataset(payload(50_000, 1), await generateDatasetKey());
    const b = await sealDataset(payload(50_000, 2), await generateDatasetKey());
    expect(equal(a.root, b.root)).toBe(false);
  });

  it('rejects a tampered chunk', async () => {
    const key = await generateDatasetKey();
    const sealed = await sealDataset(payload(5000), key);
    sealed.chunks[0].ciphertext[0] ^= 0xff;
    await expect(openDataset(sealed, key)).rejects.toThrow();
  });

  it('rejects the wrong key', async () => {
    const sealed = await sealDataset(payload(5000), await generateDatasetKey());
    await expect(openDataset(sealed, await generateDatasetKey())).rejects.toThrow();
  });

  it('rejects a swapped commitment', async () => {
    const key = await generateDatasetKey();
    const sealed = await sealDataset(payload(5000), key);
    const forged = { ...sealed, root: new Uint8Array(32).fill(9) };
    await expect(openDataset(forged, key)).rejects.toThrow(/root mismatch/);
  });
});

describe('key wrapping', () => {
  const secret = reduceScalar(987654321n);
  const publicKey = ecMulGenerator(secret);

  it('wraps to the enclave and unwraps inside it', async () => {
    const datasetKey = await generateDatasetKey();
    const wrapped = await wrapKeyForEnclave(datasetKey, publicKey);
    const recovered = await unwrapKeyInEnclave(wrapped, secret);
    expect(equal(recovered, datasetKey)).toBe(true);
  });

  it('does not unwrap with a different enclave secret', async () => {
    const wrapped = await wrapKeyForEnclave(await generateDatasetKey(), publicKey);
    const other = reduceScalar(111222333n);
    await expect(unwrapKeyInEnclave(wrapped, other)).rejects.toThrow();
  });

  it('never puts the dataset key in the wrapped blob', async () => {
    const datasetKey = await generateDatasetKey();
    const wrapped = await wrapKeyForEnclave(datasetKey, publicKey);
    const hex = Buffer.from(wrapped.ciphertext).toString('hex');
    expect(hex).not.toContain(Buffer.from(datasetKey).toString('hex'));
  });
});
