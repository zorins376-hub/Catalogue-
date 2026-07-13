import { defineConfig } from 'vitest/config';

// Single root config: unit tests for pure logic across packages/shared and
// apps/api. Vite resolves the workspace TS sources directly (no build step).
export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/api/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@wasser/shared': new URL('./packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
});
