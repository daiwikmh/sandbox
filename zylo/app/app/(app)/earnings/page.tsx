"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '../../src/components/data/useStore';
import { accruedFor, claim, listings, totalAccrued } from '../../src/midnight/store';
import { MetricGrid, Notice, StatTile } from '../../src/components/ui';
import { formatDust, shortHex } from '../../src/utils/constants';
import type { Listing } from '../../src/types';

export default function EarningsPage() {
  const rows = useStore<Listing[]>(listings, []);
  const total = useStore<bigint>(totalAccrued, 0n);
  const [claiming, setClaiming] = useState<string | null>(null);

  const withBalance = rows.filter((l) => accruedFor(l.datasetId) > 0n);

  return (
    <>
      <MetricGrid>
        <StatTile label="UNCLAIMED" value={formatDust(total)} sub="tDUST accrued" violet />
        <StatTile label="EARNING DATASETS" value={withBalance.length} sub="with a balance" />
        <StatTile label="PAYOUT LINKAGE" value="none" sub="a separate transaction" />
        <StatTile label="CLAIM GATE" value="ownerSecret" sub="nobody can claim for you" />
      </MetricGrid>

      <Notice tone="good">
        Claiming is a separate transaction from settlement, on purpose. Nothing on chain links the
        payout you take to the jobs that produced it, or to the dataset that earned it.
      </Notice>

      <div className="overview-grid">
        <article className="surface activity-surface">
          <div className="surface-heading">
            <div>
              <span className="eyebrow">ACCRUED BALANCES</span>
              <h3>{withBalance.length === 0 ? 'Nothing to claim' : 'Ready to claim'}</h3>
            </div>
            <Link className="quiet-button" href="/datasets">
              All datasets ↗
            </Link>
          </div>

          {withBalance.length === 0 ? (
            <p className="trade-copy">
              Earnings accrue to a commitment when a job settles against one of your datasets. They
              wait there until you claim them — there is no deadline and no one else can move them.
            </p>
          ) : (
            <div className="listing-list" style={{ marginTop: 24 }}>
              {withBalance.map((listing) => {
                const balance = accruedFor(listing.datasetId);
                return (
                  <article key={listing.datasetId} className="listing-card">
                    <div className="listing-head">
                      <strong>{listing.title}</strong>
                      <span className="listing-price">{formatDust(balance)} tDUST</span>
                    </div>
                    <div className="listing-quote">
                      <span>Dataset</span>
                      <b>{shortHex(listing.datasetId, 10, 8)}</b>
                    </div>
                    <div className="listing-quote">
                      <span>Accrued to</span>
                      <b>a commitment only you can open</b>
                    </div>
                    <div className="trade-actions">
                      <button
                        className="primary-button"
                        disabled={claiming === listing.datasetId}
                        onClick={() => {
                          setClaiming(listing.datasetId);
                          claim(listing.datasetId, balance);
                          setClaiming(null);
                        }}
                      >
                        <span>Claim {formatDust(balance)} tDUST</span>
                        <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 12h15m-6-6 6 6-6 6" />
                        </svg>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <article className="surface readiness-surface">
          <span className="eyebrow">HOW THE PAYOUT STAYS PRIVATE</span>
          <h3>Paid, not traced.</h3>
          <p>
            Settlement accrues to a commitment derived from your dataset. Claiming spends a
            nullifier in a transaction of its own, at a moment you choose.
          </p>
          <ul>
            <li>
              <span>Settlement and payout</span>
              <b>separate txs</b>
            </li>
            <li>
              <span>Payout names the job</span>
              <b>never</b>
            </li>
            <li>
              <span>Payout names the dataset</span>
              <b>never</b>
            </li>
            <li>
              <span>Double claim</span>
              <b>nullified</b>
            </li>
          </ul>
          <div className="readiness-line">
            <span>
              <i className="ready-dot" /> Recovery
            </span>
            <strong>your secret, your problem</strong>
          </div>
          <Link href="/settings">
            Back up your secrets <span aria-hidden="true">↗</span>
          </Link>
        </article>
      </div>

    </>
  );
}
