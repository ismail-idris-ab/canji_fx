import { defineConfig } from 'vitest/config';

/**
 * Tests cover the pure domain modules only — Rate Book, Upstream Feed and
 * Alert Engine. Those import nothing from React Native or Supabase, so they
 * run in plain Node with no native preset and no mocking layer.
 *
 * A test that needs a Supabase mock is being written at the wrong seam.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/domain/**/*.test.ts'],
  },
});
