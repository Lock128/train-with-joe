import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular({
      tsconfig: './tsconfig.spec.json',
      workspaceRoot: '.',
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'src/test-setup.ts', '**/*.spec.ts', '**/*.test.ts'],
    },
    // Use threads instead of forks for better Angular compatibility
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Disable isolation to prevent TestBed issues
    isolate: false,
    // Run tests sequentially to avoid TestBed conflicts
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    // Retry failed tests once to handle flaky TestBed issues
    retry: 1,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  esbuild: {
    target: 'es2022',
  },
});
