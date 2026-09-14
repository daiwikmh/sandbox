"use client";

import type { ReactNode } from 'react';

const Arrow = () => (
  <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12h15m-6-6 6 6-6 6" />
  </svg>
);

export const Card = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => <article className={`surface ${className}`.trim()}>{children}</article>;

export const CardHead = ({
  title,
  hint,
  aside,
  eyebrow,
}: {
  title: string;
  hint?: string;
  aside?: ReactNode;
  eyebrow?: string;
}) => (
  <div className="surface-heading">
    <div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h3>{title}</h3>
      {hint && <p className="muted">{hint}</p>}
    </div>
    {aside}
  </div>
);

export const MetricGrid = ({ children }: { children: ReactNode }) => (
  <div className="metric-grid">{children}</div>
);

export const StatTile = ({
  label,
  value,
  sub,
  violet,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  violet?: boolean;
}) => (
  <article className={`metric-card${violet ? ' violet' : ''}`}>
    <span className="eyebrow">{label}</span>
    <strong>{value}</strong>
    <span>{sub}</span>
  </article>
);

export const Empty = ({ title, body }: { title: string; body: string }) => (
  <article className="surface zy-empty">
    <h3>{title}</h3>
    <p className="muted">{body}</p>
  </article>
);

export const KV = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="activity-row">
    <span className="muted">{k}</span>
    <span>{v}</span>
  </div>
);

export const Mono = ({ children }: { children: ReactNode }) => (
  <span className="zy-mono">{children}</span>
);

export const Button = ({
  children,
  onClick,
  disabled,
  busy,
  variant = 'solid',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'solid' | 'ghost';
  type?: 'button' | 'submit';
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || busy}
    className={variant === 'solid' ? 'primary-button' : 'quiet-button outline'}
  >
    {busy && <i className="zy-spinner" aria-hidden="true" />}
    <span>{children}</span>
    {variant === 'solid' && !busy && <Arrow />}
  </button>
);

export const Notice = ({ tone, children }: { tone: 'warn' | 'bad' | 'good'; children: ReactNode }) => (
  <section className={`dashboard-alert zy-alert-${tone}`} role="status">
    <span>{tone === 'good' ? '✓' : '!'}</span>
    <p>{children}</p>
  </section>
);
