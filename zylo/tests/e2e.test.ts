import { describe, expect, it } from 'vitest';
import { generateDatasetKey, sealDataset } from '../crypto/envelope.js';
import { wrapKeyForEnclave } from '../crypto/keywrap.js';
import { Enclave } from '../enclave/enclave.js';
import { JOB_CLASS } from '../enclave/jobspec.js';
import {
  ExchangeSimulator,
  bytes,
  datasetIdOf,
  jobIdOf,
  payoutCommitmentOf,
} from './exchange-simulator.js';

const GOVERNOR = bytes(42);
const OWNER = bytes(1);
const BUYER = bytes(2);
const PRICE = 500n;
const CLASSES = JOB_CLASS.COUNT | JOB_CLASS.AGGREGATE | JOB_CLASS.GROUPED;

function csv(rows: number): string {
  const lines = ['region,age,spend'];
  for (let i = 0; i < rows; i += 1) {
    lines.push(`${i % 2 === 0 ? 'north' : 'south'},${20 + (i % 40)},${100 + i}`);
  }
  return lines.join('\n');
}

describe('end to end', () => {
  it('carries a real dataset from upload through compute to accrued earnings', async () => {
    const enclave = new Enclave();

    const data = new TextEncoder().encode(csv(200));
    const datasetKey = await generateDatasetKey();
    const sealed = await sealDataset(data, datasetKey);
    const wrappedKey = await wrapKeyForEnclave(datasetKey, enclave.publicKey);

    const sim = await ExchangeSimulator.deploy(GOVERNOR);
    await sim.allowlistEnclave(enclave.publicKey);
    await sim.registerDataset(sealed.root, bytes(201), PRICE, 200n, BigInt(CLASSES));

    const datasetId = datasetIdOf(sealed.root, OWNER);
    const spec = { kind: 'aggregate', column: 'spend', aggregate: 'mean' } as const;
    const specCommitment = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(spec))),
    );

    await sim.requestJob(datasetId, PRICE, specCommitment, PRICE);
    const jobId = jobIdOf(BUYER, specCommitment);

    const outcome = await enclave.execute({
      jobId,
      datasetRoot: sealed.root,
      jobClasses: CLASSES,
      spec,
      sealed,
      wrappedKey,
    });

    sim.patch({
      attestationNonce: outcome.grantSignature.nonce,
      attestationScalar: outcome.grantSignature.scalar,
    });
    await sim.grantAccess(jobId, enclave.publicKey);

    sim.patch({
      attestationNonce: outcome.resultSignature.nonce,
      attestationScalar: outcome.resultSignature.scalar,
    });
    await sim.settleJob(jobId, outcome.resultCommitment, enclave.publicKey);

    expect(outcome.result).toEqual({ kind: 'aggregate', value: 199.5 });
    expect(sim.ledger().accrued.lookup(payoutCommitmentOf(datasetId))).toBe(PRICE);
    expect(sim.ledger().jobs.lookup(jobId).settled).toBe(true);

    const state = sim.rawLedgerState();
    expect(state).not.toContain(Buffer.from(data).toString('hex'));
    expect(state).not.toContain(Buffer.from(datasetKey).toString('hex'));
    expect(state).not.toContain(Buffer.from(OWNER).toString('hex'));
    expect(state).not.toContain(Buffer.from(BUYER).toString('hex'));
  });
});
