import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
// The same Cross-Origin headers vercel.json sets in production, so the dev server behaves like the host.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

// One build: the site (index.html → dist/), deployed to ai.lamplitlabs.com (ADR-001). The models it lists are built
// and measured elsewhere; the only thing that crosses over is src/data/site.json.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': `${here}src` } },
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    rollupOptions: { input: `${here}index.html` },
  },
  server: { port: 5173, headers: isolation },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Suites that dynamically import the site tree in beforeAll (SiteLayout.test.tsx) transform it cold; on a
    // loaded machine that exceeded vitest's 10 s default and the whole suite was skipped with "Hook timed out".
    // Give every hook the same 60 s room so `make test` runs the same tests in every run.
    hookTimeout: 60_000,
    // The same cold transform can push a single test past vitest's 5 s default testTimeout on a loaded machine,
    // which failed `make test` intermittently (2 of 4 runs). Set the per-test limit to the same explicit 60 s.
    testTimeout: 60_000,
  },
});
