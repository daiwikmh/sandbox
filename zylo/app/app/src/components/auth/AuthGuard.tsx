"use client";

import { ReactNode } from 'react';
import { useWallet } from '../../midnight/wallet';
import { LoginScreen } from './LoginScreen';

export const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { address } = useWallet();

  if (address === null) return <LoginScreen />;

  return <>{children}</>;
};
