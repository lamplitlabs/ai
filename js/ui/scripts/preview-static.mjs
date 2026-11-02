#!/usr/bin/env node
// Serves dist/ (the site, after `npm run build`) the way vercel.json does: files as-is, the SPA routes (/, /models,
// /benchmarks) fall back to index.html, every other path gets dist/404.html with a real 404 status, and the same
// Cross-Origin headers vercel.json sets. `node scripts/preview-static.mjs [port]`
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.argv[2] || process.env.PORT || 4174);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
// mirrors the "rewrites" in vercel.json: only these extension-less paths serve index.html
const SPA_ROUTES = new Set(['/', '/models', '/benchmarks']);
const headers = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'cross-origin' };

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(dist, path));
  if (!file.startsWith(dist)) return void res.writeHead(403).end();
  let status = 200;
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (SPA_ROUTES.has(path)) file = join(dist, 'index.html');
    else {
      status = 404;
      file = join(dist, '404.html');
      if (extname(path) || !existsSync(file)) return void res.writeHead(404, headers).end('not found');
    }
  }
  res.writeHead(status, { ...headers, 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Content-Length': statSync(file).size });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`static preview of ${dist} on http://127.0.0.1:${port}/`))
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`port ${port} already in use, is another ui-check still running?`);
      process.exit(1);
    }
    throw err;
  });
