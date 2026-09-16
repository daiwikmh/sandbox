import { writeFileSync } from 'node:fs';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { Contract } from '../managed/exchange/contract/index.js';
import { commitSecret, bytes } from '../tests/exchange-simulator.js';
import { ENDPOINTS, openWallet } from './wallet.js';

const wallet = await openWallet();

process.stdout.write('waiting for wallet sync…\n');
const state = await firstValueFrom(
  (wallet as never as { state: () => never }).state() as never,
);

const balances = (state as { balances: Record<string, bigint> }).balances ?? {};
const total = Object.values(balances).reduce((a, b) => a + BigInt(b), 0n);
process.stdout.write(`address  ${(state as { address: string }).address}\n`);
process.stdout.write(`balance  ${total}\n`);

if (total === 0n) {
  process.stdout.write(
    '\nThis wallet has no tDUST. Fund it at https://faucet.preview.midnight.network/\n' +
      'then run `npm run deploy` again.\n\n',
  );
  await (wallet as { close: () => Promise<void> }).close();
  process.exit(1);
}

const zkConfigProvider = new NodeZkConfigProvider<never>('managed/exchange');

const providers = {
  privateStateProvider: levelPrivateStateProvider({
    privateStateStoreName: 'zylo-exchange',
    accountId: 'deployer',
    privateStoragePasswordProvider: async () => 'zylo-local-deploy',
  }),
  publicDataProvider: indexerPublicDataProvider(ENDPOINTS.indexer, ENDPOINTS.indexerWs),
  zkConfigProvider,
  proofProvider: httpClientProofProvider(ENDPOINTS.proofServer, zkConfigProvider),
  walletProvider: {
    getCoinPublicKey: () => (state as { coinPublicKey: never }).coinPublicKey,
    getEncryptionPublicKey: () => (state as { encryptionPublicKey: never }).encryptionPublicKey,
    balanceTx: (tx: never, ttl?: Date) =>
      (wallet as never as { balanceTransaction: (t: never, d?: Date) => Promise<never> })
        .balanceTransaction(tx, ttl),
  },
  midnightProvider: {
    submitTx: (tx: never) =>
      (wallet as never as { submitTransaction: (t: never) => Promise<never> }).submitTransaction(tx),
  },
} as never;

const governorSecret = bytes(42);

process.stdout.write('deploying exchange.compact…\n');
const deployed = await deployContract(providers, {
  contract: new Contract({}) as never,
  privateStateId: 'zylo-exchange',
  initialPrivateState: {},
  args: [commitSecret('zylo:governor:v1', governorSecret)],
} as never);

const address = (deployed as { deployTxData: { public: { contractAddress: string } } })
  .deployTxData.public.contractAddress;

process.stdout.write(`\n  deployed at  ${address}\n\n`);
writeFileSync('.deploy-address', `${address}\n`);
writeFileSync('app/.env.local', `NEXT_PUBLIC_EXCHANGE_ADDRESS=${address}\n`, { flag: 'a' });

await (wallet as { close: () => Promise<void> }).close();
process.exit(0);
