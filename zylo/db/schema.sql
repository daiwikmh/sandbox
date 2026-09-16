-- Off-chain index for Zylo Vault.
--
-- The chain is the source of truth for commitments, escrow and settlement.
-- This holds what the circuits cannot: human-readable titles, column schemas,
-- and a mirror of on-chain values so the catalogue renders without every
-- browser re-scanning the ledger. Nothing here is authoritative; a row that
-- disagrees with the chain is wrong by definition.

CREATE TABLE IF NOT EXISTS listings (
  dataset_id       TEXT PRIMARY KEY,
  dataset_root     TEXT NOT NULL,
  owner_commitment TEXT NOT NULL,
  terms_hash       TEXT NOT NULL,
  price            TEXT NOT NULL,          -- atomic tDUST, bigint as text
  rows             TEXT NOT NULL,          -- bigint as text
  job_classes      INTEGER NOT NULL,
  budget           TEXT NOT NULL,          -- bigint as text
  schema_json      TEXT NOT NULL,          -- JSON array of column names
  title            TEXT NOT NULL,
  tx_hash          TEXT,                   -- registerDataset transaction
  created_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS listings_created_at ON listings (created_at DESC);
CREATE INDEX IF NOT EXISTS listings_root       ON listings (dataset_root);

CREATE TABLE IF NOT EXISTS jobs (
  job_id            TEXT PRIMARY KEY,
  dataset_id        TEXT NOT NULL,
  escrow            TEXT NOT NULL,         -- bigint as text
  settled           INTEGER NOT NULL DEFAULT 0,
  result_commitment TEXT,
  spec_json         TEXT NOT NULL,
  result_json       TEXT,
  tx_hash           TEXT,
  created_at        INTEGER NOT NULL,
  FOREIGN KEY (dataset_id) REFERENCES listings (dataset_id)
);

CREATE INDEX IF NOT EXISTS jobs_dataset ON jobs (dataset_id, created_at DESC);
