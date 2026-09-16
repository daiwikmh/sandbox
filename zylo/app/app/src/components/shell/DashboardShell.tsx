"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import '../../../styles/dashboard.css';
import '../../../styles/app.css';
import { useWallet } from '../../midnight/wallet';
import { CONTRACT_CONFIGURED, PROVIDER_CONFIG } from '../../midnight/providers';
import { shortHex } from '../../utils/constants';

const TABS = [
  { id: 'datasets', label: 'Datasets', icon: '⌘', meta: 'Published by you' },
  { id: 'upload', label: 'Publish', icon: '◇', meta: 'Encrypt and commit' },
  { id: 'catalog', label: 'Catalog', icon: '≡', meta: 'Every listing' },
  { id: 'compute', label: 'Compute', icon: '↗', meta: 'Buy an answer' },
  { id: 'earnings', label: 'Earnings', icon: '◈', meta: 'Claim your tDUST' },
  { id: 'settings', label: 'Settings', icon: '⚙', meta: 'Wallet and limits' },
  { id: 'deploy', label: 'Deploy', icon: '◆', meta: 'Publish the contract' },
] as const;

export const DashboardShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { address, disconnect } = useWallet();
  const active = TABS.find((t) => pathname?.startsWith(`/${t.id}`)) ?? TABS[0];

  return (
    <>
      <a className="dash-skip" href="#dashboard-content">
        Skip to dashboard
      </a>
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
          <Link className="dash-wordmark" href="/" aria-label="Zylo home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mark" src="/logo.png" alt="" width={26} height={26} />
            zylo<span>exchange</span>
            <i aria-hidden="true" />
          </Link>

          <div className="sidebar-context">
            <span className="eyebrow">CONFIDENTIAL EXCHANGE</span>
            <strong>Data desk</strong>
            <span className="network-dot">
              <i /> {PROVIDER_CONFIG.networkId}
            </span>
          </div>

          <nav className="side-nav" aria-label="Workspace sections">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={`/${tab.id}`}
                className={`side-tab${active.id === tab.id ? ' active' : ''}`}
                aria-current={active.id === tab.id ? 'page' : undefined}
              >
                <span className="side-icon" aria-hidden="true">
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="sidebar-foot">
            <span>YOUR KEYS NEVER LEAVE</span>
            <Link href="/">
              Back to landing <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </aside>

        <main className="dashboard-main" id="dashboard-content">
          <header className="dashboard-topbar">
            <div className="topbar-context">
              <strong id="page-label">{active.label}</strong>
              <span id="page-meta">{active.meta}</span>
            </div>
            <div className="topbar-actions">
              <span className="sync-status">
                <i /> {CONTRACT_CONFIGURED ? 'Contract live' : 'Local settlement'}
              </span>
              <button className="wallet-button" onClick={disconnect}>
                <span className="wallet-mark" aria-hidden="true">
                  ◈
                </span>
                <span>{address ? shortHex(address, 6, 4) : 'Connect wallet'}</span>
              </button>
            </div>
          </header>

          <div className="header-facts">
            <div className="header-fact">
              <span>NETWORK</span>
              <strong>{PROVIDER_CONFIG.networkId}</strong>
            </div>
            <div className={`header-fact${CONTRACT_CONFIGURED ? '' : ' muted'}`}>
              <span>EXCHANGE</span>
              <strong>
                {CONTRACT_CONFIGURED ? shortHex(PROVIDER_CONFIG.contract, 6, 4) : 'not deployed'}
              </strong>
            </div>
            <div className="header-fact">
              <span>PROOF SERVER</span>
              <strong>{new URL(PROVIDER_CONFIG.proofServer).host}</strong>
            </div>
            <div className="header-fact">
              <span>YOUR KEYS</span>
              <strong>never leave this browser</strong>
            </div>
          </div>

          {!CONTRACT_CONFIGURED && (
            <section className="dashboard-alert" role="status">
              <span>!</span>
              <p>
                No exchange contract configured. Datasets are encrypted and computed for real, but
                settlement is kept local until NEXT_PUBLIC_EXCHANGE_ADDRESS is set.
              </p>
            </section>
          )}

          {children}
        </main>
      </div>
    </>
  );
};
