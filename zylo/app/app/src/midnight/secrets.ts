const STORAGE_KEY = 'zylo-secrets-v1';

export type Secrets = {
  readonly ownerSecret: string;
  readonly buyerSecret: string;
  readonly governorSecret: string;
};

function randomHex(): string {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return [...raw].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function loadSecrets(): Secrets | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : (JSON.parse(raw) as Secrets);
  } catch {
    return null;
  }
}

export function ensureSecrets(): Secrets {
  const existing = loadSecrets();
  if (existing !== null && typeof existing.governorSecret === 'string') return existing;
  if (existing !== null) {
    const upgraded: Secrets = { ...existing, governorSecret: randomHex() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
    } catch {
      /* caller surfaces the backup warning */
    }
    return upgraded;
  }
  const created: Secrets = {
    ownerSecret: randomHex(),
    buyerSecret: randomHex(),
    governorSecret: randomHex(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
  } catch {
    /* caller surfaces the backup warning */
  }
  return created;
}

export function importSecrets(payload: string): Secrets {
  const parsed = JSON.parse(payload) as Partial<Secrets>;
  const governorSecret = parsed.governorSecret ?? randomHex();
  if (typeof parsed.ownerSecret !== 'string' || typeof parsed.buyerSecret !== 'string') {
    throw new Error('That backup does not contain both secrets.');
  }
  for (const value of [parsed.ownerSecret, parsed.buyerSecret, governorSecret]) {
    if (!/^[0-9a-f]{64}$/.test(value)) {
      throw new Error('Secrets must be 32-byte hex strings.');
    }
  }
  const secrets: Secrets = {
    ownerSecret: parsed.ownerSecret,
    buyerSecret: parsed.buyerSecret,
    governorSecret,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
  return secrets;
}

export function exportSecrets(): string {
  return JSON.stringify(ensureSecrets(), null, 2);
}

export function secretsPersisted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Idempotent: creates the secrets if absent, then reports whether they survived. */
export function secretsReady(): boolean {
  ensureSecrets();
  return secretsPersisted();
}
