"use client";

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '../../src/components/data/useStore';
import { addJob, listings } from '../../src/midnight/store';
import { ensureSecrets } from '../../src/midnight/secrets';
import { Button, Card, CardHead, Empty, KV, Mono, Notice } from '../../src/components/ui';
import { JOB_CLASS, LIMITS, formatDust, shortHex } from '../../src/utils/constants';
import type { Aggregate, JobSpec, Listing } from '../../src/types';

const AGGREGATES: Aggregate[] = ['sum', 'mean', 'min', 'max'];

type Stage = 'idle' | 'escrow' | 'granting' | 'running' | 'settling' | 'done';

const STAGE_COPY: Record<Stage, string> = {
  idle: '',
  escrow: 'Escrowing payment against the listing',
  granting: 'Releasing the key to an allowlisted enclave',
  running: 'Computing inside the enclave',
  settling: 'Settling the proof on Midnight',
  done: 'Done',
};

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function ComputeInner() {
  const params = useSearchParams();
  const rows = useStore<Listing[]>(listings, []);
  const preselected = params.get('dataset');

  const [datasetId, setDatasetId] = useState<string | null>(preselected);
  const [kind, setKind] = useState<JobSpec['kind']>('aggregate');
  const [column, setColumn] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [aggregate, setAggregate] = useState<Aggregate>('mean');
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<unknown>(null);
  const [commitment, setCommitment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listing = useMemo(
    () => rows.find((l) => l.datasetId === (datasetId ?? preselected)) ?? rows[0] ?? null,
    [rows, datasetId, preselected],
  );

  const spec = useMemo<JobSpec | null>(() => {
    if (listing === null) return null;
    if (kind === 'count') return { kind: 'count' };
    if (column === '') return null;
    if (kind === 'aggregate') return { kind: 'aggregate', column, aggregate };
    if (groupBy === '') return null;
    return { kind: 'grouped', groupBy, column, aggregate };
  }, [kind, column, groupBy, aggregate, listing]);

  const runJob = useCallback(async () => {
    if (listing === null || spec === null) return;
    setError(null);
    setResult(null);
    setCommitment(null);
    try {
      const blob = sessionStorage.getItem(`zylo-blob-${listing.datasetId}`);
      if (blob === null) {
        throw new Error(
          'The encrypted blob for this dataset is not in this browser session. Publish it again to compute locally.',
        );
      }
      const parsed = JSON.parse(blob) as {
        key: string;
        byteLength: number;
        root: string;
        chunks: { index: number; nonce: string; ciphertext: string }[];
      };

      setStage('escrow');
      const [{ Enclave }, { wrapKeyForEnclave }] = await Promise.all([
        import('@zylo/enclave/enclave'),
        import('@zylo/crypto/keywrap'),
      ]);
      const enclave = new Enclave();

      setStage('granting');
      const secrets = ensureSecrets();
      const jobIdSource = new TextEncoder().encode(
        `${secrets.buyerSecret}:${JSON.stringify(spec)}:${Date.now()}`,
      );
      const jobId = new Uint8Array(await crypto.subtle.digest('SHA-256', jobIdSource));

      setStage('running');
      const outcome = await enclave.execute({
        jobId,
        datasetRoot: hexToBytes(parsed.root),
        jobClasses: listing.jobClasses,
        spec,
        sealed: {
          root: hexToBytes(parsed.root),
          byteLength: parsed.byteLength,
          chunkCount: parsed.chunks.length,
          chunks: parsed.chunks.map((c) => ({
            index: c.index,
            nonce: hexToBytes(c.nonce),
            ciphertext: hexToBytes(c.ciphertext),
          })),
        },
        wrappedKey: await wrapKeyForEnclave(hexToBytes(parsed.key), enclave.publicKey),
      });

      setStage('settling');
      const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      const jobIdHex = toHex(jobId);
      addJob({
        jobId: `${listing.datasetId.slice(0, 8)}${jobIdHex.slice(8)}`,
        escrow: listing.price,
        settled: true,
        resultCommitment: toHex(outcome.resultCommitment),
        spec,
        result: outcome.result,
      });

      setResult(outcome.result);
      setCommitment(toHex(outcome.resultCommitment));
      setStage('done');
    } catch (cause) {
      setStage('idle');
      setError(cause instanceof Error ? cause.message : 'The job failed.');
    }
  }, [listing, spec]);

  const busy = stage !== 'idle' && stage !== 'done';

  if (rows.length === 0) {
    return (
      <Empty
        title="Nothing to compute on"
        body="The catalog is empty. Publish a dataset first, then come back and run a query against it."
      />
    );
  }

  return (
    <div className="zy-split">
      <Card className="trade-surface">
        <CardHead
          eyebrow="ONLY AGGREGATES LEAVE THE ENCLAVE"
          title="Compose a job"
          aside={listing ? <span className="queue-count">{formatDust(listing.price)} tDUST</span> : undefined}
        />
        <div className="zy-stack">
          <div className="trade-field">
            <span className="eyebrow zy-field">DATASET</span>
            <select value={listing?.datasetId ?? ''} onChange={(event) => setDatasetId(event.target.value)}>
              {rows.map((l) => (
                <option key={l.datasetId} value={l.datasetId}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          <div className="trade-field">
            <span className="eyebrow zy-field">QUERY</span>
            <div className="zy-chips">
              {(['count', 'aggregate', 'grouped'] as const).map((k) => {
                const bit =
                  k === 'count'
                    ? JOB_CLASS.COUNT
                    : k === 'aggregate'
                      ? JOB_CLASS.AGGREGATE
                      : JOB_CLASS.GROUPED;
                const allowed = listing !== null && (listing.jobClasses & bit) !== 0;
                return (
                  <button
                    key={k}
                    type="button"
                    className="zy-chip"
                    disabled={!allowed}
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>

          {kind !== 'count' && (
            <>
              <div className="trade-grid">
                {kind === 'grouped' && (
                  <div className="trade-field">
                    <span className="eyebrow zy-field">GROUP BY</span>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                      <option value="">Choose a column</option>
                      {listing?.schema.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="trade-field">
                  <span className="eyebrow zy-field">COLUMN</span>
                  <select value={column} onChange={(e) => setColumn(e.target.value)}>
                    <option value="">Choose a column</option>
                    {listing?.schema.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="trade-field">
                <span className="eyebrow zy-field">AGGREGATE</span>
                <div className="zy-chips">
                  {AGGREGATES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className="zy-chip"
                      aria-pressed={aggregate === a}
                      onClick={() => setAggregate(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <Notice tone="bad">{error}</Notice>}

          <Button onClick={() => void runJob()} disabled={spec === null} busy={busy}>
            {busy ? STAGE_COPY[stage] : `Pay ${listing ? formatDust(listing.price) : '0'} tDUST and run`}
          </Button>
        </div>
      </Card>

      <div className="zy-stack">
        <Card className="readiness-surface">
          <CardHead eyebrow="SIGNED BY THE ENCLAVE" title="Result" />
          {result === null ? (
            <p className="muted">Run a job and the answer appears here. The rows behind it never do.</p>
          ) : (
            <>
              <pre className="zy-result">{JSON.stringify(result, null, 2)}</pre>
              {commitment && (
                <>
                  <KV k="Result commitment" v={<Mono>{shortHex(commitment, 10, 8)}</Mono>} />
                  <KV k="Signed by" v="allowlisted enclave" />
                </>
              )}
            </>
          )}
        </Card>

        <Card>
          <CardHead eyebrow="REFUSED, NOT TRIMMED" title="Enforced limits" />
          <KV k="Minimum group size" v={String(LIMITS.MIN_GROUP_SIZE)} />
          <KV k="Maximum groups" v={String(LIMITS.MAX_GROUPS)} />
          <KV k="Maximum result" v={`${LIMITS.MAX_RESULT_BYTES} bytes`} />
          <KV k="Row-level output" v="never" />
          <p className="muted">
            These caps are what stop a buyer reconstructing a dataset one narrow query at a time.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function ComputePage() {
  return (
    <Suspense fallback={null}>
      <ComputeInner />
    </Suspense>
  );
}
