"use client";

import { useState, useSyncExternalStore } from 'react';
import { Card, CardHead, KV, Mono, Notice } from '../../src/components/ui';
import { useWallet } from '../../src/midnight/wallet';
import { CONTRACT_CONFIGURED, PROVIDER_CONFIG } from '../../src/midnight/providers';
import { exportSecrets, importSecrets, secretsReady } from '../../src/midnight/secrets';
import { EXTERNAL_LINKS, LIMITS, shortHex } from '../../src/utils/constants';

const NO_SUBSCRIBE = () => () => {};
const SERVER_SNAPSHOT = () => true;

export default function SettingsPage() {
  const { address, disconnect } = useWallet();
  const [backup, setBackup] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const persisted = useSyncExternalStore(NO_SUBSCRIBE, secretsReady, SERVER_SNAPSHOT);

  return (
    <div className="zy-stack">
      <div className="zy-split">
        <Card>
          <CardHead title="Wallet" />
          <KV k="Address" v={<Mono>{address ? shortHex(address, 10, 8) : '—'}</Mono>} />
          <KV k="Network" v={PROVIDER_CONFIG.networkId} />
          <div className="zy-actions">
            <button className="quiet-button outline" onClick={disconnect}>
              Sign out
            </button>
          </div>
        </Card>

        <Card>
          <CardHead title="Endpoints" />
          <KV k="Indexer" v={<Mono>{PROVIDER_CONFIG.indexer}</Mono>} />
          <KV k="Proof server" v={<Mono>{PROVIDER_CONFIG.proofServer}</Mono>} />
          <KV k="ZK artifacts" v={<Mono>{PROVIDER_CONFIG.zkConfig}</Mono>} />
          <KV
            k="vault"
            v={
              CONTRACT_CONFIGURED ? (
                <Mono>{shortHex(PROVIDER_CONFIG.contract, 10, 8)}</Mono>
              ) : (
                <span className="muted">not deployed</span>
              )
            }
          />
        </Card>
      </div>

      <Card>
        <CardHead
          title="Your secrets"
          hint="These derive your dataset identity and your right to claim earnings."
        />
        <div className="zy-stack">
          {!persisted && (
            <Notice tone="warn">
              Secrets could not be written to this browser. They will be lost when you close this
              tab, and with them the ability to claim anything you earn.
            </Notice>
          )}

          <Notice tone="warn">
            Losing these secrets means losing your earnings. Nobody can recover them for you — that
            is the point. Back them up somewhere safe.
          </Notice>

          <div className="zy-actions">
            <button
              type="button"
              className="quiet-button outline"
              onClick={() => {
                setBackup(exportSecrets());
                setMessage('Copy the text below and store it somewhere safe.');
                setError(null);
              }}
            >
              Export secrets
            </button>
            <button
              type="button"
              className="quiet-button outline"
              onClick={() => {
                try {
                  importSecrets(backup);
                  setMessage('Secrets restored.');
                  setError(null);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : 'Import failed.');
                  setMessage(null);
                }
              }}
            >
              Restore from backup
            </button>
          </div>

          <textarea
            value={backup}
            onChange={(event) => setBackup(event.target.value)}
            rows={6}
            spellCheck={false}
            placeholder='{"ownerSecret":"…","buyerSecret":"…"}'
          />

          {message && <Notice tone="good">{message}</Notice>}
          {error && <Notice tone="bad">{error}</Notice>}
        </div>
      </Card>

      <Card>
        <CardHead title="Enforced compute limits" />
        <KV k="Minimum group size" v={String(LIMITS.MIN_GROUP_SIZE)} />
        <KV k="Maximum groups per query" v={String(LIMITS.MAX_GROUPS)} />
        <KV k="Maximum result size" v={`${LIMITS.MAX_RESULT_BYTES} bytes`} />
        <KV k="Chunk size" v={`${LIMITS.CHUNK_SIZE / 1024 / 1024} MiB`} />
        <div className="zy-actions">
          <a href={EXTERNAL_LINKS.FAUCET} target="_blank" rel="noreferrer" className="quiet-button outline">
            Testnet faucet
          </a>
          <a href={EXTERNAL_LINKS.DOCS} target="_blank" rel="noreferrer" className="quiet-button outline">
            Midnight docs
          </a>
        </div>
      </Card>
    </div>
  );
}