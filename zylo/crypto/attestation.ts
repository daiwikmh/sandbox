import {
  type JubjubPoint,
  CompactTypeBytes,
  CompactTypeJubjubPoint,
  ecAdd,
  ecMul,
  ecMulGenerator,
  jubjubPointX,
  jubjubPointY,
  persistentHash,
  transientHash,
} from '@midnight-ntwrk/compact-runtime';

export const JUBJUB_ORDER =
  6554484396890773809930967563523245729705921265872317281365359162392183254199n;

const BYTES_32 = new CompactTypeBytes(32);

export type Attestation = {
  readonly nonce: JubjubPoint;
  readonly key: JubjubPoint;
  readonly message: Uint8Array;
};

export const ATTESTATION_TYPE = {
  alignment: () => [
    ...CompactTypeJubjubPoint.alignment(),
    ...CompactTypeJubjubPoint.alignment(),
    ...BYTES_32.alignment(),
  ],
  toValue: (x: Attestation) => [
    ...CompactTypeJubjubPoint.toValue(x.nonce),
    ...CompactTypeJubjubPoint.toValue(x.key),
    ...BYTES_32.toValue(x.message),
  ],
  fromValue: () => {
    throw new Error('attestation values are never decoded');
  },
} as never;

export type Keypair = { readonly secret: bigint; readonly publicKey: JubjubPoint };

/** The circuit takes the Fiat-Shamir challenge as a range-checked 128/128 split. */
export const CHALLENGE_SPLIT = 1n << 128n;

export type Signature = {
  readonly nonce: JubjubPoint;
  readonly scalar: bigint;
  readonly low: bigint;
  readonly high: bigint;
};

export function reduceScalar(value: bigint): bigint {
  const reduced = value % JUBJUB_ORDER;
  return reduced < 0n ? reduced + JUBJUB_ORDER : reduced;
}

export function keypairFromSeed(seed: bigint): Keypair {
  const secret = reduceScalar(seed);
  return { secret, publicKey: ecMulGenerator(secret) };
}

export function generateKeypair(): Keypair {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  let value = 0n;
  for (const byte of raw) value = (value << 8n) | BigInt(byte);
  return keypairFromSeed(value);
}

export function fingerprint(key: JubjubPoint): Uint8Array {
  return persistentHash(CompactTypeJubjubPoint, key);
}

export function challengeHash(
  nonce: JubjubPoint,
  key: JubjubPoint,
  message: Uint8Array,
): bigint {
  return transientHash(ATTESTATION_TYPE, { nonce, key, message });
}

export function splitChallenge(hash: bigint): { low: bigint; high: bigint } {
  return { low: hash % CHALLENGE_SPLIT, high: hash / CHALLENGE_SPLIT };
}

export function sign(keypair: Keypair, message: Uint8Array, nonceSeed?: bigint): Signature {
  const k = nonceSeed === undefined ? generateKeypair().secret : reduceScalar(nonceSeed);
  const nonce = ecMulGenerator(k);
  const { low, high } = splitChallenge(challengeHash(nonce, keypair.publicKey, message));
  return { nonce, scalar: (k + low * keypair.secret) % JUBJUB_ORDER, low, high };
}

export function verify(
  publicKey: JubjubPoint,
  message: Uint8Array,
  signature: Signature,
): boolean {
  const { low } = splitChallenge(challengeHash(signature.nonce, publicKey, message));
  const lhs = ecMulGenerator(reduceScalar(signature.scalar));
  const rhs = ecAdd(signature.nonce, ecMul(publicKey, low));
  return samePoint(lhs, rhs);
}

export function samePoint(a: JubjubPoint, b: JubjubPoint): boolean {
  return jubjubPointX(a) === jubjubPointX(b) && jubjubPointY(a) === jubjubPointY(b);
}
