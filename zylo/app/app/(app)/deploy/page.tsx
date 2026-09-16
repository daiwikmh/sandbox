"use client";

import { useCallback, useState } from 'react';
import { Card, CardHead, KV, MetricGrid, Mono, Notice, StatTile } from '../../src/components/ui';
import { useWallet } from '../../src/midnight/wallet';
import { CONTRACT_CONFIGURED, PROVIDER_CONFIG, connectProviders } from '../../src/midnight/providers';
import { formatDust, shortHex } from '../../src/utils/constants';
import { initialPrivateState, witnesses } from '../../src/midnight/witnesses';

type Stage = 'idle' | 'providers' | 'deploying' | 'done';

const STAGE_COPY: Record<Stage, string> = {
  idle: '',
  providers: 'Building providers and reading wallet keys',
  deploying: 'Proving and submitting the deploy transaction',
  done: 'Deployed',
};

export default function DeployPage() {
  const { api, address, unshieldedAddress, dust, dustCap, refresh } = useWallet();
  const [stage, setStage] = useState<Stage>('idle');
  const [deployedAt, setDeployedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deploy = useCallback(async () => {
    if (api === null) return;
    setError(null);
    try {
      setStage('providers');
      const providers = await connectProviders(api as never);

      setStage('deploying');
      const [{ deployContract }, contractModule, { commitSecret }, { CompiledContract }] =
        await Promise.all([
          import('@midnight-ntwrk/midnight-js-contracts'),
          import('../../../../managed/exchange/contract/index.js') as never,
          import('@zylo/crypto/commitments'),
          import('@midnight-ntwrk/compact-js'),
        ]);

      const { Contract } = contractModule as { Contract: new (w: unknown) => unknown };
      const privateState = initialPrivateState();
      const governorCommitment = commitSecret('zylo:governor:v1', privateState.governorSecret);

      const compiledContract = CompiledContract.withCompiledFileAssets(
        CompiledContract.withWitnesses(
          CompiledContract.make('zylo-exchange', Contract as never),
          witnesses as never,
        ),
        PROVIDER_CONFIG.zkConfig as never,
      );

      const deployed = await (deployContract as never as (p: unknown, o: unknown) => Promise<unknown>)(
        providers,
        {
          compiledContract,
          privateStateId: 'zylo-exchange',
          initialPrivateState: privateState,
          args: [governorCommitment],
        },
      );

      const at = (deployed as { deployTxData: { public: { contractAddress: string } } })
        .deployTxData.public.contractAddress;
      setDeployedAt(at);
      setStage('done');
      await refresh();
    } catch (cause) {
      setStage('idle');
      // The SDK's errors carry the useful detail on `name` and `cause`.
      console.error('zylo deploy failed', cause);
      const err = cause as { name?: string; message?: string; cause?: unknown };
      const detail = [err?.name, err?.message].filter(Boolean).join(': ');
      setError(detail.length > 0 ? detail : 'Deploy failed — see the browser console.');
    }
  }, [api, refresh]);

  const busy = stage !== 'idle' && stage !== 'done';
  const funded = dust > 0n;

  return (
    <>
      <MetricGrid>
        <StatTile label="tDUST" value={formatDust(dust)} sub="spendable for fees" violet={funded} />
        <StatTile label="DUST CAP" value={formatDust(dustCap)} sub="generation ceiling" />
        <StatTile label="NETWORK" value={PROVIDER_CONFIG.networkId} sub="from NEXT_PUBLIC_NETWORK_ID" />
        <StatTile
          label="EXCHANGE"
          value={CONTRACT_CONFIGURED || deployedAt ? 'deployed' : 'none'}
          sub="contract address"
        />
      </MetricGrid>

      <div className="overview-grid">
        <Card className="activity-surface">
          <CardHead
            eyebrow="ONE-TIME ACTION"
            title="Deploy the exchange"
            hint="Lace signs and pays. The proof is built by your local proof server."
          />
          <KV k="Shielded address" v={<Mono>{address ? shortHex(address, 12, 8) : '—'}</Mono>} />
          <KV k="Unshielded address" v={<Mono>{unshieldedAddress ? shortHex(unshieldedAddress, 12, 8) : '—'}</Mono>} />
          <KV k="Proof server" v={<Mono>{PROVIDER_CONFIG.proofServer}</Mono>} />
          <KV k="Indexer" v={<Mono>{PROVIDER_CONFIG.indexer}</Mono>} />

          {!funded && (
            <Notice tone="warn">
              This wallet has no spendable tDUST. Request tNIGHT from the faucet, then use
              <strong> Generate tDUST</strong> in Lace to delegate it — tNIGHT alone cannot pay fees.
            </Notice>
          )}

          {error && <Notice tone="bad">{error}</Notice>}

          {deployedAt && (
            <Notice tone="good">
              Deployed. Add this to <code>app/.env.local</code> and restart:
              <br />
              <code>NEXT_PUBLIC_EXCHANGE_ADDRESS={deployedAt}</code>
            </Notice>
          )}

          <div className="trade-actions">
            <button className="primary-button" onClick={() => void deploy()} disabled={!funded || busy}>
              <span>{busy ? STAGE_COPY[stage] : 'Deploy contract'}</span>
              <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h15m-6-6 6 6-6 6" />
              </svg>
            </button>
            <button className="quiet-button outline" onClick={() => void refresh()} disabled={busy}>
              Refresh balance
            </button>
          </div>
        </Card>

        <Card className="readiness-surface">
          <span className="eyebrow">WHAT THIS TRANSACTION DOES</span>
          <h3>Publishes the circuits.</h3>
          <p>
            Deployment writes the six verifier keys on chain and fixes the governor commitment.
            Everything after it — listings, jobs, payouts — runs against this address.
          </p>
          <ul>
            <li>
              <span>Circuits published</span>
              <b>6</b>
            </li>
            <li>
              <span>Signer</span>
              <b>Lace</b>
            </li>
            <li>
              <span>Your seed leaves the wallet</span>
              <b>never</b>
            </li>
          </ul>
          <div className="readiness-line">
            <span>
              <i className="ready-dot" /> Status
            </span>
            <strong>{deployedAt ? 'deployed' : funded ? 'ready' : 'awaiting tDUST'}</strong>
          </div>
        </Card>
      </div>
    </>
  );
}
