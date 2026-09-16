import path from 'node:path';
import type { NextConfig } from 'next';

const ROOT = path.join(__dirname, '..');

// Wasm identity requires single copy.
const APP_MODULES = path.join(__dirname, 'node_modules');

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'encoding');

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    // asyncWebAssembly emits async/await; without this webpack assumes the
    // target cannot run it and warns on every Midnight wasm module.
    config.output = {
      ...config.output,
      environment: {
        ...(config.output?.environment ?? {}),
        asyncFunction: true,
        dynamicImport: true,
      },
    };

    config.resolve.modules = [APP_MODULES, ...(config.resolve.modules ?? ['node_modules'])];

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
