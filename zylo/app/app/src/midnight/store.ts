"use client";

import type { JobRecord, Listing } from '../types';

const KEY = 'zylo-state-v1';

type Persisted = {
  listings: (Omit<Listing, 'price' | 'rows'> & { price: string; rows: string })[];
  jobs: (Omit<JobRecord, 'escrow'> & { escrow: string })[];
  claimed: Record<string, string>;
};

const EMPTY: Persisted = { listings: [], jobs: [], claimed: {} };

function read(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? EMPTY : { ...EMPTY, ...(JSON.parse(raw) as Persisted) };
  } catch {
    return EMPTY;
  }
}

function write(state: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode — state lives for this session only */
  }
  window.dispatchEvent(new Event('zylo-state'));
}

export function listings(): Listing[] {
  return read().listings.map((l) => ({ ...l, price: BigInt(l.price), rows: BigInt(l.rows) }));
}

export function jobs(): JobRecord[] {
  return read().jobs.map((j) => ({ ...j, escrow: BigInt(j.escrow) }));
}

export function addListing(listing: Listing): void {
  const state = read();
  state.listings = [
    ...state.listings.filter((l) => l.datasetId !== listing.datasetId),
    { ...listing, price: listing.price.toString(), rows: listing.rows.toString() },
  ];
  write(state);
}

export function addJob(job: JobRecord): void {
  const state = read();
  state.jobs = [
    { ...job, escrow: job.escrow.toString() },
    ...state.jobs.filter((j) => j.jobId !== job.jobId),
  ];
  write(state);
}

export function accruedFor(datasetId: string): bigint {
  const settled = jobs().filter((j) => j.settled && j.jobId.startsWith(datasetId.slice(0, 8)));
  const total = settled.reduce((sum, j) => sum + j.escrow, 0n);
  const claimed = BigInt(read().claimed[datasetId] ?? '0');
  return total > claimed ? total - claimed : 0n;
}

export function claim(datasetId: string, amount: bigint): void {
  const state = read();
  state.claimed[datasetId] = (BigInt(state.claimed[datasetId] ?? '0') + amount).toString();
  write(state);
}

export function totalAccrued(): bigint {
  return listings().reduce((sum, l) => sum + accruedFor(l.datasetId), 0n);
}

export function subscribe(listener: () => void): () => void {
  window.addEventListener('zylo-state', listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener('zylo-state', listener);
    window.removeEventListener('storage', listener);
  };
}
