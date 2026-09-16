"use client";

import { PROVIDER_CONFIG, connectProviders } from './providers';
import { initialPrivateState, witnesses } from './witnesses';
import { vault_ADDRESS } from '../utils/constants';

export const CONTRACT_TAG = 'zylo-vault';
export const PRIVATE_STATE_ID = 'zylo-vault';

type WalletApi = Parameters<typeof connectProviders>[0];

export async function buildCompiledContract(): Promise<unknown> {
  const [contractModule, { CompiledContract }] = await Promise.all([
    import('../../../../managed/vault/contract/index.js') as never,
    import('@midnight-ntwrk/compact-js'),
  ]);
  const { Contract } = contractModule as { Contract: new (w: unknown) => unknown };
  return CompiledContract.withCompiledFileAssets(
    CompiledContract.withWitnesses(
      CompiledContract.make(CONTRACT_TAG, Contract as never),
      witnesses as never,
    ),
    PROVIDER_CONFIG.zkConfig as never,
  );
}

type VaultCircuits = {
  readonly callTx: {
    registerDataset: (
      datasetRoot: Uint8Array,
      termsHash: Uint8Array,
      price: bigint,
      rows: bigint,
      jobClasses: bigint,
      budget: bigint,
    ) => Promise<{ public: { txId: string; txHash: string } }>;
  };
};

export async function connectVault(api: WalletApi): Promise<VaultCircuits> {
  if (vault_ADDRESS.length === 0) {
    throw new Error('No contract address configured. Set NEXT_PUBLIC_vault_ADDRESS.');
  }
  const [providers, { findDeployedContract }, compiledContract] = await Promise.all([
    connectProviders(api),
    import('@midnight-ntwrk/midnight-js-contracts'),
    buildCompiledContract(),
  ]);
  const found = await (findDeployedContract as never as (
    p: unknown,
    o: unknown,
  ) => Promise<unknown>)(providers, {
    compiledContract,
    contractAddress: vault_ADDRESS,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: initialPrivateState(),
  });
  return found as VaultCircuits;
}
