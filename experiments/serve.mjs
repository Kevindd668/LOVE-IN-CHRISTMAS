/**
 * F2 lab-only static server. Serves only the experiments/ directory and uses
 * no formal-project code or build tooling.
 *
 * Run from the Christmas-Wish repository root:
 *   node experiments/serve.mjs
 * Then open http://127.0.0.1:8787/01-heart-particles/
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.LAB_PORT || 8787);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2'
};

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const absolute = path.resolve(ROOT, `.${pathname}`);
  if (absolute !== ROOT && !absolute.startsWith(ROOT + path.sep)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  try {
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      response.writeHead(302, { Location: `${pathname}/` });
      response.end();
      return;
    }
    const ext = path.extname(absolute).toLowerCase();
    response.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store'
    });
    createReadStream(absolute).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`F2 labs: http://127.0.0.1:${PORT}/`);
  console.log(`01: http://127.0.0.1:${PORT}/01-heart-particles/`);
  console.log(`02: http://127.0.0.1:${PORT}/02-double-helix-tree/`);
  console.log(`03: http://127.0.0.1:${PORT}/03-galaxy-nebula/`);
  console.log(`04: http://127.0.0.1:${PORT}/04-photo-memory/`);
  console.log(`05: http://127.0.0.1:${PORT}/05-cinematic-effects/`);
});
