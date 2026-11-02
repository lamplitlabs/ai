import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { PAGE_HEADS, routePageHtml } from './src/site/routeHead';

const here = fileURLToPath(new URL('.', import.meta.url));
// The same Cross-Origin headers vercel.json sets in production, so the dev server behaves like the host.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

// Link unfurlers that run no JavaScript (Slack, X, LinkedIn, iMessage) read only the HTML the host serves. Emit a copy
// of the built index.html per PAGE_HEADS route with that route's title, description and og:url in its static head;
// vercel.json (and scripts/preview-static.mjs) serve /models and /benchmarks from these files.
const routePages = (): Plugin => ({
  name: 'lamplit:route-pages',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const index = bundle['index.html'];
    if (index?.type !== 'asset') return this.error('route-pages: the build emitted no index.html');
    for (const [route, { file }] of Object.entries(PAGE_HEADS)) {
      this.emitFile({ type: 'asset', fileName: file, source: routePageHtml(String(index.source), route as keyof typeof PAGE_HEADS) });
    }
  },
});

// One build: the site (index.html → dist/), deployed to ai.lamplitlabs.com (ADR-001). The models it lists are built
// and measured elsewhere; the only thing that crosses over is src/data/site.json.
export default defineConfig({
  plugins: [react(), tailwindcss(), routePages()],
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
