import { EXCHANGE_ADDRESS, INDEXER_URL, INDEXER_WS_URL, NETWORK_ID, PROOF_SERVER_URL, ZK_CONFIG_URL } from '../utils/constants';

export const CONTRACT_CONFIGURED = EXCHANGE_ADDRESS.length > 0;

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
};

export const PROVIDER_CONFIG = {
  networkId: NETWORK_ID,
  indexer: INDEXER_URL,
  indexerWS: INDEXER_WS_URL,
  proofServer: PROOF_SERVER_URL,
  zkConfig: ZK_CONFIG_URL,
  contract: EXCHANGE_ADDRESS,
} as const;

const ACCOUNT_ID = 'zylo';

/**
 * Local-only encryption for the private state store. The secrets it protects are
 * also exportable from Settings, which is the real backup path.
 */
const PASSWORD_PROVIDER = async (): Promise<string> => 'zylo-local-state';

export async function connectProviders(): Promise<ProviderBundle> {
  if (!CONTRACT_CONFIGURED) {
    throw new Error(
      'No contract address configured. Set NEXT_PUBLIC_EXCHANGE_ADDRESS once the exchange is deployed.',
    );
  }

  const [{ indexerPublicDataProvider }, { httpClientProofProvider }, { FetchZkConfigProvider }, { levelPrivateStateProvider }] =
    await Promise.all([
      import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
      import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
      import('@midnight-ntwrk/midnight-js-fetch-zk-config-provider'),
      import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
    ]);

  const zkConfigProvider = new FetchZkConfigProvider(ZK_CONFIG_URL);

  return {
    publicDataProvider: indexerPublicDataProvider(INDEXER_URL, INDEXER_WS_URL),
    proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
    zkConfigProvider,
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'zylo-exchange',
      accountId: ACCOUNT_ID,
      privateStoragePasswordProvider: PASSWORD_PROVIDER,
    }),
  };
}
