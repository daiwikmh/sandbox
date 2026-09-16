import { CompactTypeBytes, CompactTypeVector, persistentHash } from '@midnight-ntwrk/compact-runtime';

const V2_BYTES = new CompactTypeVector(2, new CompactTypeBytes(32));
const V3_BYTES = new CompactTypeVector(3, new CompactTypeBytes(32));

/** Domain separator, padded the way `pad(32, "...")` does in the circuit. */
export function tag(text: string): Uint8Array {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(text));
  return out;
}

export function commitSecret(domain: string, secret: Uint8Array): Uint8Array {
  return persistentHash(V2_BYTES, [tag(domain), secret]);
}

export function datasetIdOf(datasetRoot: Uint8Array, ownerSecret: Uint8Array): Uint8Array {
  return persistentHash(V3_BYTES, [tag('zylo:dataset:v1'), ownerSecret, datasetRoot]);
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
