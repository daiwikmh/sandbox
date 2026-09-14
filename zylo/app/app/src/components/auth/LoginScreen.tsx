"use client";

import Link from 'next/link';
import '../../../styles/dashboard.css';
import '../../../styles/app.css';
import { useWallet } from '../../midnight/wallet';
import { EXTERNAL_LINKS } from '../../utils/constants';

export const LoginScreen = () => {
  const { connect, connecting, available, error } = useWallet();

  return (
    <div className="login-shell">
      <main id="dashboard-content">
        <div className="login-card surface">
          <Link className="dash-wordmark login-wordmark" href="/" aria-label="Zylo home">
            <span className="login-mark" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" width={22} height={22} />
            </span>
            zylo<span>exchange</span>
            <i aria-hidden="true" />
          </Link>

          <span className="eyebrow">CONFIDENTIAL EXCHANGE</span>
          <h3>Your data, earning without leaving you</h3>
          <p>
            Publish a dataset that stays encrypted, let others compute on it, and collect tDUST
            without revealing what you hold or who bought it.
          </p>

          <button className="primary-button" onClick={() => void connect()} disabled={connecting}>
            <span>{connecting ? 'Connecting…' : 'Connect Lace wallet'}</span>
            <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h15m-6-6 6 6-6 6" />
            </svg>
          </button>

          {!available && (
            <section className="dashboard-alert" role="status">
              <span>!</span>
              <p>
                No Midnight wallet detected.{' '}
                <a href={EXTERNAL_LINKS.LACE} target="_blank" rel="noreferrer">
                  Install Lace
                </a>{' '}
                and reload this page.
              </p>
            </section>
          )}

          {error && (
            <section className="dashboard-alert" role="status">
              <span>!</span>
              <p>{error}</p>
            </section>
          )}

          <span className="login-foot">Unaudited testnet software. Do not use with data you care about.</span>
        </div>
      </main>
    </div>
  );
};
