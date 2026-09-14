"use client";

import Link from 'next/link';
import { useStore } from '../../src/components/data/useStore';
import { accruedFor, listings, totalAccrued } from '../../src/midnight/store';
import { MetricGrid, StatTile } from '../../src/components/ui';
import { JOB_CLASS_LABELS, formatDust, shortHex } from '../../src/utils/constants';
import type { Listing } from '../../src/types';

const classLabels = (mask: number) =>
  Object.entries(JOB_CLASS_LABELS)
    .filter(([bit]) => (mask & Number(bit)) !== 0)
    .map(([, label]) => label)
    .join(' · ');

export default function DatasetsPage() {
  const rows = useStore<Listing[]>(listings, []);
  const accrued = useStore<bigint>(totalAccrued, 0n);

  const totalRows = rows.reduce((n, l) => n + Number(l.rows), 0);
  const earning = rows.filter((l) => accruedFor(l.datasetId) > 0n).length;

  return (
    <>
      <MetricGrid>
        <StatTile label="PUBLISHED" value={rows.length} sub="datasets committed" />
        <StatTile label="TOTAL ROWS" value={totalRows.toLocaleString()} sub="never readable on-chain" />
        <StatTile label="EARNING" value={earning} sub="with a balance to claim" />
        <StatTile label="UNCLAIMED" value={formatDust(accrued)} sub="tDUST accrued" violet />
      </MetricGrid>

      <div className="overview-grid">
        <article className="surface activity-surface">
          <div className="surface-heading">
            <div>
              <span className="eyebrow">YOUR LISTINGS</span>
              <h3>{rows.length === 0 ? 'Nothing published yet' : 'Published datasets'}</h3>
            </div>
            <Link className="quiet-button" href="/upload">
              Publish a dataset ↗
            </Link>
          </div>

          {rows.length === 0 ? (
            <p className="trade-copy">
              Publish a dataset to make it computable. It is chunked, hashed and encrypted in this
              browser before anything leaves the machine — the chain only ever sees a commitment.
            </p>
          ) : (
            <div className="listing-list" style={{ marginTop: 24 }}>
              {rows.map((listing) => {
                const balance = accruedFor(listing.datasetId);
                return (
                  <article key={listing.datasetId} className="listing-card">
                    <div className="listing-head">
                      <strong>{listing.title}</strong>
                      <span className="listing-price">{formatDust(listing.price)} tDUST / JOB</span>
                    </div>
                    <div className="listing-quote">
                      <span>Rows</span>
                      <b>{Number(listing.rows).toLocaleString()}</b>
                    </div>
                    <div className="listing-quote">
                      <span>Columns</span>
                      <b>{listing.schema.join(', ')}</b>
                    </div>
                    <div className="listing-quote">
                      <span>Permitted</span>
                      <b>{classLabels(listing.jobClasses)}</b>
                    </div>
                    <div className="listing-reserve">
                      Commitment {shortHex(listing.datasetRoot, 10, 8)}
                    </div>
                    <div className="listing-foot">
                      <span>
                        Accrued <b>{formatDust(balance)} tDUST</b>
                      </span>
                      {balance > 0n ? (
                        <Link href="/earnings" style={{ color: '#5140c5' }}>
                          Claim ↗
                        </Link>
                      ) : (
                        <span>Nothing to claim yet</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <article className="surface readiness-surface">
          <span className="eyebrow">WHAT THE CHAIN NEVER SEES</span>
          <h3>Listed, not readable.</h3>
          <p>
            The catalog carries a schema, a row count and a price so the market is browsable. The
            rows themselves, your key and your identity never reach the ledger.
          </p>
          <ul>
            <li>
              <span>Your rows</span>
              <b>never</b>
            </li>
            <li>
              <span>Your encryption key</span>
              <b>never</b>
            </li>
            <li>
              <span>Who bought a job</span>
              <b>never</b>
            </li>
            <li>
              <span>Which dataset a job hit</span>
              <b>never</b>
            </li>
          </ul>
          <div className="readiness-line">
            <span>
              <i className="ready-dot" /> Published
            </span>
            <strong>{rows.length} committed</strong>
          </div>
          <Link href="/catalog">
            See how buyers view them <span aria-hidden="true">↗</span>
          </Link>
        </article>
      </div>

    </>
  );
}
