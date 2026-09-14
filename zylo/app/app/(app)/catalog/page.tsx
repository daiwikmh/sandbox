"use client";

import Link from 'next/link';
import { useStore } from '../../src/components/data/useStore';
import { listings } from '../../src/midnight/store';
import { MetricGrid, StatTile } from '../../src/components/ui';
import { JOB_CLASS_LABELS, LIMITS, formatDust, shortHex } from '../../src/utils/constants';
import type { Listing } from '../../src/types';

export default function CatalogPage() {
  const rows = useStore<Listing[]>(listings, []);

  const cheapest = rows.reduce<bigint | null>(
    (min, l) => (min === null || l.price < min ? l.price : min),
    null,
  );

  return (
    <>
      <MetricGrid>
        <StatTile label="LISTINGS" value={rows.length} sub="open to compute" />
        <StatTile
          label="ROWS AVAILABLE"
          value={rows.reduce((n, l) => n + Number(l.rows), 0).toLocaleString()}
          sub="none of them readable"
        />
        <StatTile
          label="FROM"
          value={cheapest === null ? '—' : formatDust(cheapest)}
          sub="tDUST per job"
        />
        <StatTile label="ROW OUTPUT" value="never" sub="aggregates only" violet />
      </MetricGrid>

      <div className="overview-grid">
        <article className="surface activity-surface">
          <div className="surface-heading">
            <div>
              <span className="eyebrow">OPEN LISTINGS</span>
              <h3>{rows.length === 0 ? 'No listings yet' : 'Browse by shape'}</h3>
            </div>
            <Link className="quiet-button" href="/compute">
              Compose a job ↗
            </Link>
          </div>

          {rows.length === 0 ? (
            <p className="trade-copy">
              Nothing has been published to this catalog. Publish a dataset and it appears here for
              others to compute on.
            </p>
          ) : (
            <div className="listing-list" style={{ marginTop: 24 }}>
              {rows.map((listing) => (
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
                    <span>Schema</span>
                    <b>{listing.schema.join(', ')}</b>
                  </div>
                  <div className="listing-quote">
                    <span>Permitted</span>
                    <b>
                      {Object.entries(JOB_CLASS_LABELS)
                        .filter(([bit]) => (listing.jobClasses & Number(bit)) !== 0)
                        .map(([, label]) => label)
                        .join(' · ')}
                    </b>
                  </div>
                  <div className="listing-reserve">
                    Commitment {shortHex(listing.datasetRoot, 10, 8)}
                  </div>
                  <div className="listing-foot">
                    <span>Answers only, capped at {LIMITS.MAX_RESULT_BYTES} bytes</span>
                    <Link href={`/compute?dataset=${listing.datasetId}`} style={{ color: '#5140c5' }}>
                      Compute ↗
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="surface readiness-surface">
          <span className="eyebrow">WHAT YOU ARE BUYING</span>
          <h3>An answer, not access.</h3>
          <p>
            Every listing shows its shape and its price. None of them shows a row. An enclave runs
            your query against the committed bytes and signs the result.
          </p>
          <ul>
            <li>
              <span>Minimum group size</span>
              <b>{LIMITS.MIN_GROUP_SIZE} rows</b>
            </li>
            <li>
              <span>Maximum groups</span>
              <b>{LIMITS.MAX_GROUPS}</b>
            </li>
            <li>
              <span>Maximum result</span>
              <b>{LIMITS.MAX_RESULT_BYTES} bytes</b>
            </li>
            <li>
              <span>Row-level output</span>
              <b>never</b>
            </li>
          </ul>
          <div className="readiness-line">
            <span>
              <i className="ready-dot" /> Refused, not trimmed
            </span>
            <strong>enclave aborts</strong>
          </div>
          <Link href="/compute">
            Run a query <span aria-hidden="true">↗</span>
          </Link>
        </article>
      </div>

    </>
  );
}
