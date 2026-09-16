export const NETWORK_ID = process.env.NEXT_PUBLIC_NETWORK_ID ?? 'preview';

export const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL ??
  'https://indexer.preview.midnight.network/api/v4/graphql';

export const INDEXER_WS_URL =
  process.env.NEXT_PUBLIC_INDEXER_WS_URL ??
  'wss://indexer.preview.midnight.network/api/v4/graphql/ws';

export const NODE_URL = process.env.NEXT_PUBLIC_NODE_URL ?? 'https://rpc.preview.midnight.network';

export const PROOF_SERVER_URL =
  process.env.NEXT_PUBLIC_PROOF_SERVER_URL ?? 'http://localhost:6300';

export const ZK_CONFIG_URL = process.env.NEXT_PUBLIC_ZK_CONFIG_URL ?? '/zk';

export const vault_ADDRESS = process.env.NEXT_PUBLIC_vault_ADDRESS ?? '';

export const ENCLAVE_URL = process.env.ENCLAVE_URL ?? 'http://127.0.0.1:8088';

export const EXPLORER_URL = 'https://explorer.preview.midnight.network';

export const DUST_DECIMALS = 6;

export const JOB_CLASS = {
  COUNT: 1,
  AGGREGATE: 2,
  GROUPED: 4,
} as const;

export const JOB_CLASS_LABELS: Record<number, string> = {
  1: 'Row counts',
  2: 'Aggregates',
  4: 'Grouped aggregates',
};

export const LIMITS = {
  MIN_GROUP_SIZE: 25,
  MAX_GROUPS: 64,
  MAX_RESULT_BYTES: 8192,
  CHUNK_SIZE: 1024 * 1024,
} as const;

export const EXTERNAL_LINKS = {
  LACE: 'https://www.lace.io/',
  FAUCET: 'https://faucet.preview.midnight.network/',
  DOCS: 'https://docs.midnight.network/',
} as const;

export const explorerTx = (hash: string) => `${EXPLORER_URL}/transactions/${hash}`;
export const explorerContract = (address: string) => `${EXPLORER_URL}/contracts/${address}`;

export const formatDust = (value: bigint): string =>
  (Number(value) / 10 ** DUST_DECIMALS).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export const shortHex = (value: string, lead = 6, tail = 4): string =>
  value.length <= lead + tail ? value : `${value.slice(0, lead)}…${value.slice(-tail)}`;
