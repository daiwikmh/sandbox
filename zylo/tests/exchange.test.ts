import { beforeEach, describe, expect, it } from 'vitest';
import {
  vaultSimulator,
  bytes,
  commitSecret,
  datasetIdOf,
  enclaveFingerprint,
  enclaveKeypair,
  grantNullifierOf,
  jobIdOf,
  payoutCommitmentOf,
  signAttestation,
} from './vault-simulator.js';

const GOVERNOR = bytes(42);
const OWNER = bytes(1);
const BUYER = bytes(2);

const ROOT = bytes(200);
const TERMS = bytes(201);
const PRICE = 500n;
const ROWS = 10_000n;
const CLASSES = 7n;

const enclave = enclaveKeypair(1234n);
const rogue = enclaveKeypair(9999n);

const SPEC = bytes(77);
const RESULT = bytes(88);

let sim: vaultSimulator;

async function bootstrap(): Promise<void> {
  sim = await vaultSimulator.deploy(GOVERNOR);
  await sim.allowlistEnclave(enclave.publicKey);
  await sim.registerDataset(ROOT, TERMS, PRICE, ROWS, CLASSES);
}

function datasetId(): Uint8Array {
  return datasetIdOf(ROOT, OWNER);
}

function jobId(): Uint8Array {
  return jobIdOf(BUYER, SPEC);
}

async function signFor(message: Uint8Array, kp = enclave, nonceSeed = 555n): Promise<void> {
  const sig = signAttestation(kp, message, nonceSeed);
  sim.patch({ attestationNonce: sig.nonce, attestationScalar: sig.scalar });
}

async function runToSettled(): Promise<void> {
  await sim.requestJob(datasetId(), PRICE, SPEC, PRICE);
  await signFor(jobId());
  await sim.grantAccess(jobId(), enclave.publicKey);
  await signFor(RESULT);
  await sim.settleJob(jobId(), RESULT, enclave.publicKey);
}

beforeEach(bootstrap);

describe('governance', () => {
  it('allowlists an enclave key the governor controls', () => {
    expect(sim.ledger().enclaveKeys.member(enclaveFingerprint(enclave.publicKey))).toBe(true);
  });

  it('rejects an allowlist attempt from a non-governor', async () => {
    sim.patch({ governorSecret: bytes(43) });
    await expect(sim.allowlistEnclave(rogue.publicKey)).rejects.toThrow(/not the governor/);
  });

  it('commits the governor without storing the secret', () => {
    expect(sim.ledger().governor).toEqual(commitSecret('zylo:governor:v1', GOVERNOR));
    expect(sim.rawLedgerState()).not.toContain(Buffer.from(GOVERNOR).toString('hex'));
  });
});

describe('registerDataset', () => {
  it('publishes browsable terms and a listing leaf', () => {
    expect(sim.ledger().listingCount).toBe(1n);
    const listing = sim.ledger().catalog.lookup(datasetId());
    expect(listing.price).toBe(PRICE);
    expect(listing.rows).toBe(ROWS);
    expect(listing.jobClasses).toBe(CLASSES);
  });

  it('rejects a zero budget', async () => {
    await expect(sim.registerDataset(bytes(213), TERMS, PRICE, ROWS, CLASSES, 0n))
      .rejects.toThrow(/budget must allow at least one job/);
  });

  it('decrements the budget on each job and refuses when exhausted', async () => {
    await sim.registerDataset(bytes(214), TERMS, PRICE, ROWS, CLASSES, 1n);
    const id = datasetIdOf(bytes(214), OWNER);
    expect(sim.ledger().catalog.lookup(id).budget).toBe(1n);
    await sim.requestJob(id, PRICE, SPEC, PRICE);
    expect(sim.ledger().catalog.lookup(id).budget).toBe(0n);
    sim.patch({ buyerSecret: bytes(9) });
    await expect(sim.requestJob(id, PRICE, SPEC, PRICE))
      .rejects.toThrow(/query budget exhausted/);
  });

  it('rejects a zero price, an empty dataset and no job classes', async () => {
    await expect(sim.registerDataset(bytes(210), TERMS, 0n, ROWS, CLASSES))
      .rejects.toThrow(/price must be positive/);
    await expect(sim.registerDataset(bytes(211), TERMS, PRICE, 0n, CLASSES))
      .rejects.toThrow(/dataset must have rows/);
    await expect(sim.registerDataset(bytes(212), TERMS, PRICE, ROWS, 0n))
      .rejects.toThrow(/at least one job class/);
  });

  it('rejects registering the same dataset twice', async () => {
    await expect(sim.registerDataset(ROOT, TERMS, PRICE, ROWS, CLASSES))
      .rejects.toThrow(/already registered/);
  });

  it('derives a different datasetId for a different owner', async () => {
    sim.patch({ ownerSecret: bytes(3) });
    await sim.registerDataset(ROOT, TERMS, PRICE, ROWS, CLASSES);
    expect(sim.ledger().listingCount).toBe(2n);
  });
});

describe('requestJob', () => {
  it('escrows and records a job', async () => {
    await sim.requestJob(datasetId(), PRICE, SPEC, PRICE);
    const job = sim.ledger().jobs.lookup(jobId());
    expect(job.escrow).toBe(PRICE);
    expect(job.settled).toBe(false);
    expect(job.payoutCommitment).toEqual(payoutCommitmentOf(datasetId()));
  });

  it('rejects escrow below the listed price', async () => {
    await expect(sim.requestJob(datasetId(), PRICE, SPEC, PRICE - 1n))
      .rejects.toThrow(/escrow below listed price/);
  });

  it('rejects a price that does not match the listing leaf', async () => {
    await expect(sim.requestJob(datasetId(), PRICE + 1n, SPEC, PRICE + 1n))
      .rejects.toThrow();
  });

  it('rejects a duplicate job', async () => {
    await sim.requestJob(datasetId(), PRICE, SPEC, PRICE);
    await expect(sim.requestJob(datasetId(), PRICE, SPEC, PRICE))
      .rejects.toThrow(/job already exists/);
  });
});

describe('grantAccess', () => {
  beforeEach(async () => {
    await sim.requestJob(datasetId(), PRICE, SPEC, PRICE);
  });

  it('spends a grant nullifier for an allowlisted enclave', async () => {
    await signFor(jobId());
    await sim.grantAccess(jobId(), enclave.publicKey);
    expect(sim.ledger().grantsSpent.member(grantNullifierOf(jobId()))).toBe(true);
  });

  it('rejects an enclave that is not allowlisted', async () => {
    await signFor(jobId(), rogue);
    await expect(sim.grantAccess(jobId(), rogue.publicKey))
      .rejects.toThrow(/enclave not allowlisted/);
  });

  it('rejects a forged attestation signature', async () => {
    await signFor(jobId());
    sim.patch({ attestationScalar: 1n });
    await expect(sim.grantAccess(jobId(), enclave.publicKey))
      .rejects.toThrow(/bad attestation/);
  });

  it('rejects a signature over a different job', async () => {
    await signFor(bytes(123));
    await expect(sim.grantAccess(jobId(), enclave.publicKey))
      .rejects.toThrow(/bad attestation/);
  });

  it('rejects granting access twice', async () => {
    await signFor(jobId());
    await sim.grantAccess(jobId(), enclave.publicKey);
    await signFor(jobId());
    await expect(sim.grantAccess(jobId(), enclave.publicKey))
      .rejects.toThrow(/access already granted/);
  });

  it('rejects a job that does not exist', async () => {
    await signFor(bytes(5));
    await expect(sim.grantAccess(bytes(5), enclave.publicKey))
      .rejects.toThrow(/no such job/);
  });
});

describe('settleJob', () => {
  it('accrues the escrow to the payout commitment', async () => {
    await runToSettled();
    expect(sim.ledger().accrued.lookup(payoutCommitmentOf(datasetId()))).toBe(PRICE);
    expect(sim.ledger().jobs.lookup(jobId()).settled).toBe(true);
    expect(sim.ledger().jobs.lookup(jobId()).resultCommitment).toEqual(RESULT);
  });

  it('rejects settling without a prior grant', async () => {
    await sim.requestJob(datasetId(), PRICE, SPEC, PRICE);
    await signFor(RESULT);
    await expect(sim.settleJob(jobId(), RESULT, enclave.publicKey))
      .rejects.toThrow(/access was never granted/);
  });

  it('rejects settling twice', async () => {
    await runToSettled();
    await signFor(RESULT);
    await expect(sim.settleJob(jobId(), RESULT, enclave.publicKey))
      .rejects.toThrow(/already settled/);
  });

  it('rejects a result not signed by the enclave', async () => {
    await sim.requestJob(datasetId(), PRICE, SPEC, PRICE);
    await signFor(jobId());
    await sim.grantAccess(jobId(), enclave.publicKey);
    await signFor(bytes(99));
    await expect(sim.settleJob(jobId(), RESULT, enclave.publicKey))
      .rejects.toThrow(/bad attestation/);
  });

  it('accumulates across two jobs on the same dataset', async () => {
    await runToSettled();
    sim.patch({ buyerSecret: bytes(4) });
    const second = jobIdOf(bytes(4), SPEC);
    await sim.requestJob(datasetId(), PRICE, SPEC, PRICE);
    await signFor(second);
    await sim.grantAccess(second, enclave.publicKey);
    await signFor(RESULT);
    await sim.settleJob(second, RESULT, enclave.publicKey);
    expect(sim.ledger().accrued.lookup(payoutCommitmentOf(datasetId()))).toBe(PRICE * 2n);
  });
});

describe('claimEarnings', () => {
  it('rejects a claim when nothing has accrued', async () => {
    await expect(sim.claimEarnings(ROOT, 100n)).rejects.toThrow(/nothing accrued/);
  });

  it('rejects an amount above the accrued balance', async () => {
    await runToSettled();
    await expect(sim.claimEarnings(ROOT, PRICE + 1n)).rejects.toThrow(/exceeds accrued balance/);
  });

  it('rejects a zero amount', async () => {
    await runToSettled();
    await expect(sim.claimEarnings(ROOT, 0n)).rejects.toThrow(/must be positive/);
  });

  it('rejects a claim from someone who is not the owner', async () => {
    await runToSettled();
    sim.patch({ ownerSecret: bytes(3) });
    await expect(sim.claimEarnings(ROOT, PRICE)).rejects.toThrow(/nothing accrued/);
  });
});

describe('privacy', () => {
  it('never writes the owner secret to the ledger', async () => {
    await runToSettled();
    expect(sim.rawLedgerState()).not.toContain(Buffer.from(OWNER).toString('hex'));
  });

  it('never writes the buyer secret to the ledger', async () => {
    await runToSettled();
    expect(sim.rawLedgerState()).not.toContain(Buffer.from(BUYER).toString('hex'));
  });

  it('never links a job to the dataset it targets', async () => {
    await runToSettled();
    const job = sim.ledger().jobs.lookup(jobId());
    expect(job.payoutCommitment).not.toEqual(datasetId());
    expect(Buffer.from(job.specCommitment)).not.toEqual(Buffer.from(datasetId()));
  });

  it('accrues to a commitment, not to an owner identity', async () => {
    await runToSettled();
    const listing = sim.ledger().catalog.lookup(datasetId());
    for (const [commitment] of sim.ledger().accrued) {
      expect(commitment).not.toEqual(listing.ownerCommitment);
    }
  });
});
