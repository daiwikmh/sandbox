import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatDust,
  shortHex,
  explorerContract,
  explorerTx,
  JOB_CLASS,
} from '../app/src/utils/constants';
import { readFileSync } from 'node:fs';

describe('dust formatting', () => {
  it('scales by the dust decimals', () => {
    expect(formatDust(0n)).toBe('0');
    expect(formatDust(1_000_000n)).toBe('1');
    expect(formatDust(1_500_000n)).toBe('1.5');
  });
});

describe('byte formatting', () => {
  it('picks a sensible unit', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.00 GB');
  });
});

describe('hex shortening', () => {
  it('leaves short values alone', () => {
    expect(shortHex('abcd', 6, 4)).toBe('abcd');
  });

  it('elides the middle of long values', () => {
    expect(shortHex('0123456789abcdef', 6, 4)).toBe('012345…cdef');
  });
});

describe('explorer links', () => {
  it('builds tx and contract urls', () => {
    expect(explorerTx('0xabc')).toContain('/transactions/0xabc');
    expect(explorerContract('0xdef')).toContain('/contracts/0xdef');
  });
});

describe('job classes', () => {
  it('is a disjoint bitmask', () => {
    expect(JOB_CLASS.COUNT & JOB_CLASS.AGGREGATE).toBe(0);
    expect(JOB_CLASS.AGGREGATE & JOB_CLASS.GROUPED).toBe(0);
    expect(JOB_CLASS.COUNT | JOB_CLASS.AGGREGATE | JOB_CLASS.GROUPED).toBe(7);
  });
});

const landingCss = readFileSync('app/styles/landing.css', 'utf8');
const dashboardCss = readFileSync('app/styles/dashboard.css', 'utf8');

describe('landing styles', () => {
  it('ships the hero, scanner and section frames', () => {
    expect(landingCss).toContain('.hero');
    expect(landingCss).toContain('.scan-canvas');
    expect(landingCss).toContain('.section-frame');
  });

  it('self-hosts DM Sans rather than hotlinking it', () => {
    expect(landingCss).toContain('@font-face');
    expect(landingCss).toContain('/fonts/dm-sans.woff2');
  });

  it('carries the documented palette', () => {
    expect(landingCss).toContain('--paper:#f7f6f2');
    expect(landingCss).toContain('--purple:#7165ed');
    expect(landingCss).toContain('--ink:#252527');
  });
});

describe('dashboard styles', () => {
  it('ships the shell, sidebar and panels', () => {
    expect(dashboardCss).toContain('.dashboard-shell');
    expect(dashboardCss).toContain('.dashboard-sidebar');
    expect(dashboardCss).toContain('.dashboard-main');
  });

  it('provides the surfaces the routes render onto', () => {
    for (const cls of ['.surface', '.metric-card', '.eyebrow', '.primary-button', '.trade-field']) {
      expect(dashboardCss).toContain(cls);
    }
  });
});
