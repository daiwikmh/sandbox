"use client";

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHead, KV, Mono, Notice } from '../../src/components/ui';
import { addListing } from '../../src/midnight/store';
import { ensureSecrets } from '../../src/midnight/secrets';
import { useWallet } from '../../src/midnight/wallet';
import { connectVault } from '../../src/midnight/contract';
import { JOB_CLASS, JOB_CLASS_LABELS, formatBytes } from '../../src/utils/constants';

type Stage = 'idle' | 'hashing' | 'encrypting' | 'registering' | 'done';

const STAGE_COPY: Record<Stage, string> = {
  idle: '',
  hashing: 'Chunking and hashing in your browser',
  encrypting: 'Encrypting each chunk with a key only you hold',
  registering: 'Committing the dataset on Midnight',
  done: 'Published',
};

export default function UploadPage() {
  const router = useRouter();
  const { api } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('0.5');
  const [budget, setBudget] = useState('100');
  const [classes, setClasses] = useState<number>(
    JOB_CLASS.COUNT | JOB_CLASS.AGGREGATE | JOB_CLASS.GROUPED,
  );
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);

  const toggle = (bit: number) => setClasses((current) => current ^ bit);

  const publish = useCallback(async () => {
    if (file === null) return;
    setError(null);
    try {
      setStage('hashing');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const text = new TextDecoder().decode(bytes);
      const header = text.split(/\r?\n/)[0] ?? '';
      const schema = header.split(',').map((c) => c.trim()).filter(Boolean);
      if (schema.length === 0) throw new Error('Could not read a CSV header from that file.');
      const rows = Math.max(0, text.split(/\r?\n/).filter(Boolean).length - 1);

      setStage('encrypting');
      const { sealDataset, generateDatasetKey } = await import('@zylo/crypto/envelope');
      const key = await generateDatasetKey();
      const sealed = await sealDataset(bytes, key);

      setStage('registering');
      const secrets = ensureSecrets();
      const { datasetIdOf, hexToBytes } = await import('@zylo/crypto/commitments');
      const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      const rootHex = toHex(sealed.root);
      const datasetId = toHex(datasetIdOf(sealed.root, hexToBytes(secrets.ownerSecret)));
      const termsHash = new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(schema.join(','))),
      );
      const priceAtomic = BigInt(Math.round(Number(price) * 1_000_000));
      const budgetValue = BigInt(Math.max(1, Math.round(Number(budget))));

      const vault = await connectVault(api as never);
      await vault.callTx.registerDataset(
        sealed.root,
        termsHash,
        priceAtomic,
        BigInt(rows),
        BigInt(classes),
        budgetValue,
      );

      addListing({
        datasetId,
        datasetRoot: rootHex,
        ownerCommitment: datasetId.slice(0, 32),
        termsHash: toHex(termsHash),
        price: priceAtomic,
        rows: BigInt(rows),
        jobClasses: classes,
        schema,
        title: title.trim() === '' ? file.name : title.trim(),
      });

      sessionStorage.setItem(
        `zylo-blob-${datasetId}`,
        JSON.stringify({
          key: toHex(key),
          chunks: sealed.chunks.map((c) => ({
            index: c.index,
            nonce: toHex(c.nonce),
            ciphertext: toHex(c.ciphertext),
          })),
          byteLength: sealed.byteLength,
          root: rootHex,
        }),
      );

      setStage('done');
      router.push('/datasets');
    } catch (cause) {
      setStage('idle');
      setError(cause instanceof Error ? cause.message : 'Publishing failed.');
    }
  }, [api, budget, classes, file, price, router, title]);

  const busy = stage !== 'idle' && stage !== 'done';

  return (
    <div className="zy-split">
      <Card>
        <CardHead
          eyebrow="ENCRYPTED IN THIS TAB"
          title="Your file"
          hint="CSV with a header row. Nothing leaves your machine unencrypted."
        />
        <div className="zy-stack">
          <label className="zy-dropzone">
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <strong>{file === null ? 'Choose a CSV' : file.name}</strong>
            <span className="muted">
              {file === null ? 'Chunked, hashed and encrypted locally' : formatBytes(file.size)}
            </span>
          </label>

          <div className="trade-field">
            <span className="eyebrow zy-field">TITLE</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={file?.name ?? 'Regional spend, 2026'}
            />
          </div>

          <div className="trade-grid">
            <div className="trade-field">
              <span className="eyebrow zy-field">PRICE PER JOB (tDUST)</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </div>
            <div className="trade-field">
              <span className="eyebrow zy-field">QUERY BUDGET</span>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" />
            </div>
          </div>

          <div className="trade-field">
            <span className="eyebrow zy-field">PERMITTED COMPUTATIONS</span>
            <div className="zy-chips">
              {Object.entries(JOB_CLASS_LABELS).map(([bit, label]) => {
                const value = Number(bit);
                return (
                  <button
                    key={bit}
                    type="button"
                    className="zy-chip"
                    aria-pressed={(classes & value) !== 0}
                    onClick={() => toggle(value)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <Notice tone="bad">{error}</Notice>}

          <Button onClick={() => void publish()} disabled={file === null || classes === 0} busy={busy}>
            {busy ? STAGE_COPY[stage] : 'Encrypt and publish'}
          </Button>
        </div>
      </Card>

      <Card className="readiness-surface">
        <CardHead eyebrow="PRIVACY MODEL" title="What reaches the chain" />
        <KV k="Your rows" v="never" />
        <KV k="Your encryption key" v="never" />
        <KV k="Your identity" v="a commitment" />
        <KV k="Merkle commitment" v={<Mono>32 bytes</Mono>} />
        <KV k="Schema and price" v="public, for discovery" />
        <p className="muted">
          The commitment binds the exact bytes you published. An enclave handed a different blob
          cannot produce a result the contract will accept.
        </p>
      </Card>
    </div>
  );
}
