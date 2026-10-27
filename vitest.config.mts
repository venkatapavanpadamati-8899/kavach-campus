import { defineConfig } from 'vitest/config';
import { mkdirSync } from 'node:fs';
import path from 'path';

// Vitest/Vite's SSR transform cache is created in the process temporary
// directory. In Windows sandboxed runners that directory can be removed while
// workers still import modules, producing ENOENT failures before any test runs.
// Keep this test-only cache inside the workspace for the lifetime of the run.
const testTempDirectory = path.resolve(import.meta.dirname, '.vitest-tmp');
mkdirSync(testTempDirectory, { recursive: true });
process.env.TEMP = testTempDirectory;
process.env.TMP = testTempDirectory;

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'nextjs_backup', '.next'],
    env: {
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-that-is-long-enough-32-chars',
      NEXT_PUBLIC_SUPABASE_URL: 'https://mock-supabase-test-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-that-is-long-enough-32-chars',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
