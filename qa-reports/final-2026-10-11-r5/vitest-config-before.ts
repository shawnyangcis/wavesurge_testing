import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/**/*.test.{ts,tsx}'], coverage: {
  provider: 'v8', include: ['src/**/*.{ts,tsx}'], reporter: ['text', 'json', 'html', 'json-summary'],
  thresholds: { perFile: true, lines: 100, branches: 100, statements: 100, functions: 100 }
} } });
