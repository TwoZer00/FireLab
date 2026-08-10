import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    sequence: { concurrent: false },
    testTimeout: 15000,
  },
});
