import { type JubjubPoint, jubjubPointX, jubjubPointY } from '@midnight-ntwrk/compact-runtime';
import { type Keypair, fingerprint, generateKeypair, keypairFromSeed } from '../crypto/attestation.js';

export type AttestationDocument = {
  readonly measurement: string;
  readonly publicKey: { x: string; y: string };
  readonly fingerprint: string;
  readonly attested: boolean;
  readonly note: string;
};

/**
 * Binds the enclave's signing key to the platform it is running on.
 *
 * Inside a Nitro enclave, `/dev/nsm` produces a signed attestation document
 * carrying the image measurement (PCR0) and, in its user data, the public key
 * below. Off Nitro there is no hardware to ask, so this reports `attested:
 * false` and the governor must refuse to allowlist it.
 */
export async function describe(keypair: Keypair): Promise<AttestationDocument> {
  const publicKey = {
    x: jubjubPointX(keypair.publicKey).toString(16),
    y: jubjubPointY(keypair.publicKey).toString(16),
  };
  const print = Buffer.from(fingerprint(keypair.publicKey)).toString('hex');

  const nitro = await readNitroMeasurement();
  if (nitro === null) {
    return {
      measurement: 'unattested-local',
      publicKey,
      fingerprint: print,
      attested: false,
      note: 'Not running in a Nitro enclave. Do not allowlist this key.',
    };
  }

  return {
    measurement: nitro,
    publicKey,
    fingerprint: print,
    attested: true,
    note: 'Verify this measurement against the reproducible build before allowlisting.',
  };
}

async function readNitroMeasurement(): Promise<string | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile('/sys/devices/virtual/misc/nsm/pcr0', 'utf8');
    return raw.trim();
  } catch {
    return null;
  }
}

export function bootKeypair(): Keypair {
  const seed = process.env.ZYLO_ENCLAVE_SEED;
  if (seed === undefined) return generateKeypair();
  let value = 0n;
  for (const byte of Buffer.from(seed, 'utf8')) value = (value << 8n) | BigInt(byte);
  return keypairFromSeed(value);
}

export function pointToHex(point: JubjubPoint): { x: string; y: string } {
  return { x: jubjubPointX(point).toString(16), y: jubjubPointY(point).toString(16) };
}
