import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * The contract test only. Kept separate from the unit suite because it
 * touches the network: a CBN outage should redden a job that means "the
 * upstream moved", not block a push that has nothing to do with it.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/contract/**/*.contract.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
