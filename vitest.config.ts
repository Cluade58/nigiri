import { defineConfig } from 'vitest/config';

// Logic and storage tests run in Node with fake-indexeddb and the real pinned ts-fsrs.
// The time zone is fixed in tests/setup.ts so local-day rules are repeatable on any laptop.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
