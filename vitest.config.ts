import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'backend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'frontend/**',
      'join_page/**',
      'competitors_page/**',
      'profile_cards/**',
    ],
    testTimeout: 3000,
    pool: 'forks',
    maxWorkers: 4,
    minWorkers: 2,
    singleFork: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: [
        'coverage/**',
        'dist/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        'cypress/**',
        'test{,s}/**',
        'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
        '**/mocks/**',
        '**/__mocks__/**',
      ],
    },
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.git/**', '**/cdk.out/**'],
  },
  resolve: {
    alias: [
      {
        find: 'aws-cdk-lib/core/lib/fs/fingerprint',
        replacement: resolve(__dirname, './backend/test/mocks/fingerprint-mock.ts'),
      },
      {
        find: 'aws-cdk-lib/core/lib/asset-staging',
        replacement: resolve(__dirname, './backend/test/mocks/asset-staging-mock.ts'),
      },
      {
        find: 'aws-cdk-lib/core/lib/names',
        replacement: resolve(__dirname, './backend/test/mocks/names-mock.ts'),
      },
    ],
  },
  esbuild: {
    target: 'node18',
  },
});
