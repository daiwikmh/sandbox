import { ENDPOINTS, firstState, openWallet } from './wallet.js';

const wallet = await openWallet();
const state = await firstState(wallet as never);

process.stdout.write('\n  network      Midnight Preview\n');
process.stdout.write(`  node         ${ENDPOINTS.node}\n`);
process.stdout.write(`  indexer      ${ENDPOINTS.indexer}\n\n`);
process.stdout.write(`  address      ${String(state.address)}\n`);
process.stdout.write(`  balances     ${JSON.stringify(state.balances ?? {})}\n\n`);
process.stdout.write('  Fund it at https://faucet.preview.midnight.network/ then run: npm run deploy\n\n');

await (wallet as { close: () => Promise<void> }).close();
process.exit(0);
