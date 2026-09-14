import path from 'node:path';
import type { NextConfig } from 'next';

const ROOT = path.join(__dirname, '..');

const nextConfig: NextConfig = {
  outputFileTracingRoot: ROOT,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'encoding');

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      '@zylo/crypto': path.join(ROOT, 'crypto'),
      '@zylo/enclave': path.join(ROOT, 'enclave'),
      'isomorphic-ws': path.join(__dirname, 'app/src/midnight/ws-shim.ts'),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
