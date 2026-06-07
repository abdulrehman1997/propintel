import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js', 'app/**/__tests__/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.js'],
      exclude: ['lib/calculations.js'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
