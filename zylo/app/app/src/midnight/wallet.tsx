"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { NETWORK_ID } from '../utils/constants';

type ConnectedApi = {
  getDustBalance(): Promise<{ cap: bigint; balance: bigint }>;
  getUnshieldedAddress(): Promise<{ unshieldedAddress: string }>;
  getShieldedAddresses(): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
  balanceUnsealedTransaction(tx: string, options?: { payFees?: boolean }): Promise<{ tx: string }>;
  submitTransaction(tx: string): Promise<void>;
  getProvingProvider(keyMaterialProvider: unknown): Promise<unknown>;
};

type InitialApi = {
  rdns: string;
  name: string;
  apiVersion: string;
  connect: (networkId: string) => Promise<ConnectedApi>;
};

declare global {
  interface Window {
    midnight?: Record<string, InitialApi>;
  }
}

export type WalletState = {
  readonly address: string | null;
  readonly unshieldedAddress: string | null;
  readonly dust: bigint;
  readonly dustCap: bigint;
  readonly api: ConnectedApi | null;
  readonly connecting: boolean;
  readonly available: boolean;
  readonly walletName: string | null;
  readonly error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
};

const WalletContext = createContext<WalletState | null>(null);

function connector(): InitialApi | undefined {
  if (typeof window === 'undefined') return undefined;
  const wallets = window.midnight;
  if (wallets === undefined) return undefined;
  return wallets.mnLace ?? Object.values(wallets)[0];
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [api, setApi] = useState<ConnectedApi | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [unshieldedAddress, setUnshielded] = useState<string | null>(null);
  const [dust, setDust] = useState<bigint>(0n);
  const [dustCap, setDustCap] = useState<bigint>(0n);
  const [connecting, setConnecting] = useState(false);
  const [available, setAvailable] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const probe = () => {
      const found = connector();
      if (!cancelled && found !== undefined) {
        setAvailable(true);
        setWalletName(found.name);
        return true;
      }
      return false;
    };
    if (probe()) return;
    const timer = setInterval(() => {
      if (probe()) clearInterval(timer);
    }, 400);
    const stop = setTimeout(() => clearInterval(timer), 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, []);

  const read = useCallback(async (connected: ConnectedApi) => {
    const [shielded, unshielded, balance] = await Promise.all([
      connected.getShieldedAddresses(),
      connected.getUnshieldedAddress(),
      connected.getDustBalance(),
    ]);
    setAddress(shielded.shieldedAddress);
    setUnshielded(unshielded.unshieldedAddress);
    setDust(balance.balance);
    setDustCap(balance.cap);
  }, []);

  const connect = useCallback(async () => {
    const lace = connector();
    if (lace === undefined) {
      setError('No Midnight wallet found. Install Lace and reload this page.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const connected = await lace.connect(NETWORK_ID);
      setApi(connected);
      await read(connected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect to the wallet.');
    } finally {
      setConnecting(false);
    }
  }, [read]);

  const refresh = useCallback(async () => {
    if (api !== null) await read(api);
  }, [api, read]);

  const disconnect = useCallback(() => {
    setApi(null);
    setAddress(null);
    setUnshielded(null);
    setDust(0n);
    setDustCap(0n);
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      address,
      unshieldedAddress,
      dust,
      dustCap,
      api,
      connecting,
      available,
      walletName,
      error,
      connect,
      disconnect,
      refresh,
    }),
    [address, unshieldedAddress, dust, dustCap, api, connecting, available, walletName, error, connect, disconnect, refresh],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (ctx === null) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
