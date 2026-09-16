import {
  vault_ADDRESS,
  INDEXER_URL,
  INDEXER_WS_URL,
  NETWORK_ID,
  NODE_URL,
  PROOF_SERVER_URL,
  ZK_CONFIG_URL,
} from '../utils/constants';

export const CONTRACT_CONFIGURED = vault_ADDRESS.length > 0;

// Lace speaks hex over the connector.
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array =>
  Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));

/**
 * Provider wiring for midnight-js.
 *
 * Deliberately lazy: the SDK pulls in WASM that must not load during SSR, and
 * the published midnight-js (4.1.1) targets ledger 8 while this contract is
 * compiled for ledger 9. Until those line up, `connectProviders` throws a clear
 * error rather than half-working, and the app runs against local state.
 */
export type ProviderBundle = {
  readonly publicDataProvider: unknown;
  readonly proofProvider: unknown;
  readonly zkConfigProvider: unknown;
  readonly privateStateProvider: unknown;
  readonly walletProvider: unknown;
  readonly midnightProvider: unknown;
};

export const PROVIDER_CONFIG = {
  networkId: NETWORK_ID,
  indexer: INDEXER_URL,
  indexerWS: INDEXER_WS_URL,
  proofServer: PROOF_SERVER_URL,
  node: NODE_URL,
  zkConfig: ZK_CONFIG_URL,
  contract: vault_ADDRESS,
} as const;

export async function connectProviders(api: {
  balanceUnsealedTransaction: (tx: string, o?: { payFees?: boolean }) => Promise<{ tx: string }>;
  submitTransaction: (tx: string) => Promise<void>;
  getShieldedAddresses: () => Promise<{
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
}): Promise<ProviderBundle> {
  const [
    { indexerPublicDataProvider },
    { httpClientProofProvider },
    { FetchZkConfigProvider },
    { levelPrivateStateProvider },
    { setNetworkId },
    { Transaction },
  ] = await Promise.all([
    import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
    import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
    import('@midnight-ntwrk/midnight-js-fetch-zk-config-provider'),
    import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
    import('@midnight-ntwrk/midnight-js-network-id'),
    import('@midnight-ntwrk/midnight-js-protocol/ledger'),
  ]);

  setNetworkId(NETWORK_ID);

  // FetchZkConfigProvider resolves artifact paths with `new URL(path, base)`,
  // which throws on a relative base like "/zk".
  const zkBase = /^https?:\/\//.test(ZK_CONFIG_URL)
    ? ZK_CONFIG_URL
    : new URL(ZK_CONFIG_URL, window.location.origin).toString();

  // cross-fetch's browser build hands back a fetch that rejects the provider
  // as its receiver; call it through the window instead.
  const zkConfigProvider = new FetchZkConfigProvider(zkBase, (input, init) =>
    fetch(input, init),
  );
  const keys = await api.getShieldedAddresses();

  return {
    publicDataProvider: indexerPublicDataProvider(INDEXER_URL, INDEXER_WS_URL),
    proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
    zkConfigProvider,
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'zylo-vault',
      accountId: keys.shieldedCoinPublicKey.slice(0, 16),
      privateStoragePasswordProvider: async () => 'Zylo-Local-State-Store',
    }),
    walletProvider: {
      getCoinPublicKey: () => keys.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => keys.shieldedEncryptionPublicKey,
      balanceTx: async (tx: { serialize: () => Uint8Array }) => {
        const { tx: balanced } = await api.balanceUnsealedTransaction(toHex(tx.serialize()), {
          payFees: true,
        });
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced));
      },
    },
    midnightProvider: {
      submitTx: async (tx: { serialize: () => Uint8Array; identifiers: () => string[] }) => {
        await api.submitTransaction(toHex(tx.serialize()));
        const [identifier] = tx.identifiers();
        if (identifier === undefined) {
          throw new Error('Wallet returned a transaction with no identifier to watch for.');
        }
        return identifier;
      },
    },
  } as never as ProviderBundle;
}
