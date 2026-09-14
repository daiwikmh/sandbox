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

export type WalletState = {
  readonly address: string | null;
  readonly coinPublicKey: string | null;
  readonly connecting: boolean;
  readonly available: boolean;
  readonly error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

type LaceApi = {
  state: () => Promise<{ address: string; coinPublicKey: string }>;
};

type LaceConnector = {
  isEnabled: () => Promise<boolean>;
  enable: () => Promise<LaceApi>;
  apiVersion: string;
  name: string;
};

declare global {
  interface Window {
    midnight?: Record<string, LaceConnector>;
  }
}

const WalletContext = createContext<WalletState | null>(null);

function connector(): LaceConnector | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.midnight?.mnLace;
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [coinPublicKey, setCoinPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const probe = () => {
      const found = connector() !== undefined;
      if (!cancelled) setAvailable(found);
      return found;
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

  const connect = useCallback(async () => {
    const lace = connector();
    if (lace === undefined) {
      setError('Lace wallet not found. Install the Midnight Lace extension to continue.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const api = await lace.enable();
      const state = await api.state();
      setAddress(state.address);
      setCoinPublicKey(state.coinPublicKey);
      try {
        localStorage.setItem('zylo-wallet', '1');
      } catch {
        /* private mode — reconnect stays manual */
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect to Lace.');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setCoinPublicKey(null);
    try {
      localStorage.removeItem('zylo-wallet');
    } catch {
      /* nothing to clear */
    }
  }, []);

  const value = useMemo<WalletState>(
    () => ({ address, coinPublicKey, connecting, available, error, connect, disconnect }),
    [address, coinPublicKey, connecting, available, error, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (ctx === null) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
