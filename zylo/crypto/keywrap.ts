import {
  type JubjubPoint,
  ecMul,
  ecMulGenerator,
  jubjubPointX,
  jubjubPointY,
} from '@midnight-ntwrk/compact-runtime';
import { reduceScalar } from './attestation.js';

export type WrappedKey = {
  readonly ephemeralPublicKey: JubjubPoint;
  readonly nonce: Uint8Array;
  readonly ciphertext: Uint8Array;
};

function fieldToBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

async function deriveSharedKey(point: JubjubPoint): Promise<CryptoKey> {
  const material = new Uint8Array(64);
  material.set(fieldToBytes(jubjubPointX(point)), 0);
  material.set(fieldToBytes(jubjubPointY(point)), 32);
  const digest = await crypto.subtle.digest('SHA-256', material as BufferSource);
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export function randomScalar(): bigint {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  let value = 0n;
  for (const byte of raw) value = (value << 8n) | BigInt(byte);
  return reduceScalar(value);
}

export async function wrapKeyForEnclave(
  datasetKey: Uint8Array,
  enclavePublicKey: JubjubPoint,
): Promise<WrappedKey> {
  const ephemeral = randomScalar();
  const shared = await deriveSharedKey(ecMul(enclavePublicKey, ephemeral));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce as BufferSource },
      shared,
      datasetKey as BufferSource,
    ),
  );
  return { ephemeralPublicKey: ecMulGenerator(ephemeral), nonce, ciphertext };
}

export async function unwrapKeyInEnclave(
  wrapped: WrappedKey,
  enclaveSecret: bigint,
): Promise<Uint8Array> {
  const shared = await deriveSharedKey(ecMul(wrapped.ephemeralPublicKey, enclaveSecret));
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: wrapped.nonce as BufferSource },
      shared,
      wrapped.ciphertext as BufferSource,
    ),
  );
}
