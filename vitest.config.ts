import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  // Keep DOM tests within their normal timeout on hosts also running Docker browsers.
  maxWorkers: 4,
  include: ['tests/**/*.test.{ts,tsx}'], coverage: {
  provider: 'v8', include: ['src/**/*.{ts,tsx}'], reporter: ['text', 'json', 'html', 'json-summary'],
  thresholds: { perFile: true, lines: 100, branches: 100, statements: 100, functions: 100 }
} } });
