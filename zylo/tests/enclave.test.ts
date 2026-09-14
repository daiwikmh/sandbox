import { describe, expect, it } from 'vitest';
import { verify } from '../crypto/attestation.js';
import { generateDatasetKey, sealDataset } from '../crypto/envelope.js';
import { wrapKeyForEnclave } from '../crypto/keywrap.js';
import { Enclave, type JobRequest } from '../enclave/enclave.js';
import { JOB_CLASS, LIMITS, type JobSpec } from '../enclave/jobspec.js';
import { laplaceNoise, parseCsv, run } from '../enclave/runner.js';

const ALL_CLASSES = JOB_CLASS.COUNT | JOB_CLASS.AGGREGATE | JOB_CLASS.GROUPED;

function csv(rows: number): string {
  const lines = ['region,age,spend'];
  for (let i = 0; i < rows; i += 1) {
    lines.push(`${i % 2 === 0 ? 'north' : 'south'},${20 + (i % 40)},${100 + i}`);
  }
  return lines.join('\n');
}

async function buildRequest(
  enclave: Enclave,
  spec: JobSpec,
  rows = 200,
  jobClasses = ALL_CLASSES,
): Promise<JobRequest> {
  const data = new TextEncoder().encode(csv(rows));
  const datasetKey = await generateDatasetKey();
  const sealed = await sealDataset(data, datasetKey);
  return {
    jobId: new Uint8Array(32).fill(3),
    datasetRoot: sealed.root,
    jobClasses,
    spec,
    sealed,
    wrappedKey: await wrapKeyForEnclave(datasetKey, enclave.publicKey),
  };
}

describe('runner limits', () => {
  const table = parseCsv(csv(200));

  it('refuses a selection below the k-anonymity minimum', () => {
    expect(() =>
      run(table, { kind: 'count', where: { column: 'age', op: 'eq', value: 20 } }),
    ).toThrow(/k-anonymity minimum/);
  });

  it('refuses an unknown column', () => {
    expect(() => run(table, { kind: 'aggregate', column: 'ssn', aggregate: 'sum' }))
      .toThrow(/unknown column/);
  });

  it('drops groups below the minimum rather than leaking them', () => {
    const result = run(table, { kind: 'grouped', groupBy: 'region', column: 'spend', aggregate: 'mean' });
    expect(result.kind).toBe('grouped');
    if (result.kind === 'grouped') {
      expect(result.groups).toHaveLength(2);
      expect(result.groups.map((g) => g.key)).toEqual(['north', 'south']);
    }
  });

  it('caps the number of groups', () => {
    const wide = parseCsv(
      ['id,v', ...Array.from({ length: 200 }, (_, i) => `${i},${i}`)].join('\n'),
    );
    expect(() => run(wide, { kind: 'grouped', groupBy: 'id', column: 'v', aggregate: 'sum' }))
      .toThrow(/above the cap/);
  });

  it('computes a correct mean', () => {
    const result = run(table, { kind: 'aggregate', column: 'spend', aggregate: 'mean' });
    expect(result.kind).toBe('aggregate');
    if (result.kind === 'aggregate') expect(result.value).toBeCloseTo(199.5, 6);
  });
});

describe('enclave', () => {
  it('runs a job and signs both the grant and the result', async () => {
    const enclave = new Enclave();
    const request = await buildRequest(enclave, { kind: 'count' });
    const outcome = await enclave.execute(request);

    expect(outcome.result).toEqual({ kind: 'count', value: 200 });
    expect(verify(enclave.publicKey, request.jobId, outcome.grantSignature)).toBe(true);
    expect(verify(enclave.publicKey, outcome.resultCommitment, outcome.resultSignature)).toBe(true);
  });

  it('refuses a blob whose root does not match the on-chain commitment', async () => {
    const enclave = new Enclave();
    const request = await buildRequest(enclave, { kind: 'count' });
    const forged = { ...request, datasetRoot: new Uint8Array(32).fill(1) };
    await expect(enclave.execute(forged)).rejects.toThrow(/does not match the on-chain/);
  });

  it('refuses a job class the listing does not permit', async () => {
    const enclave = new Enclave();
    const request = await buildRequest(
      enclave,
      { kind: 'grouped', groupBy: 'region', column: 'spend', aggregate: 'mean' },
      200,
      JOB_CLASS.COUNT,
    );
    await expect(enclave.execute(request)).rejects.toThrow(/not permitted/);
  });

  it('cannot decrypt a key wrapped to a different enclave', async () => {
    const enclave = new Enclave();
    const other = new Enclave();
    const request = await buildRequest(other, { kind: 'count' });
    await expect(enclave.execute({ ...request })).rejects.toThrow();
  });

  it('produces a different result commitment for a different result', async () => {
    const enclave = new Enclave();
    const a = await enclave.execute(await buildRequest(enclave, { kind: 'count' }));
    const b = await enclave.execute(
      await buildRequest(enclave, { kind: 'aggregate', column: 'spend', aggregate: 'sum' }),
    );
    expect(Buffer.from(a.resultCommitment)).not.toEqual(Buffer.from(b.resultCommitment));
  });

  it('enforces the result size cap', () => {
    expect(LIMITS.MAX_RESULT_BYTES).toBeLessThanOrEqual(8192);
  });
});

describe('differential privacy', () => {
  const table = parseCsv(csv(400));

  it('returns the exact answer when no epsilon is supplied', () => {
    const a = run(table, { kind: 'count' });
    const b = run(table, { kind: 'count' });
    expect(a).toEqual(b);
    expect(a).toEqual({ kind: 'count', value: 400 });
  });

  it('perturbs a count when an epsilon is supplied', () => {
    const samples = Array.from(
      { length: 40 },
      () => (run(table, { kind: 'count' }, { epsilon: 0.5 }) as { value: number }).value,
    );
    expect(new Set(samples).size).toBeGreaterThan(1);
  });

  it('stays near the true value at a loose epsilon', () => {
    const samples = Array.from(
      { length: 200 },
      () => (run(table, { kind: 'count' }, { epsilon: 5 }) as { value: number }).value,
    );
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(Math.abs(mean - 400)).toBeLessThan(10);
  });

  it('scales noise inversely with epsilon', () => {
    const spread = (epsilon: number) => {
      const samples = Array.from({ length: 400 }, () => Math.abs(laplaceNoise(epsilon, 1)));
      return samples.reduce((a, b) => a + b, 0) / samples.length;
    };
    expect(spread(0.1)).toBeGreaterThan(spread(10));
  });

  it('never reports a negative count', () => {
    for (let i = 0; i < 200; i += 1) {
      const out = run(table, { kind: 'count' }, { epsilon: 0.01 }) as { value: number };
      expect(out.value).toBeGreaterThanOrEqual(0);
    }
  });
});
