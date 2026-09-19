import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration kept separate from vite.config.ts so tests do not load
 * the React/Tailwind build plugins. Tests here are logic- and source-level,
 * so the node environment is enough.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // Each test file gets its own temporary SQLite database so tests never
    // touch the developer's working database in outputs/sqlite.db.
    setupFiles: ['tests/unit/setup.ts'],
    testTimeout: 20000,
  },
});
