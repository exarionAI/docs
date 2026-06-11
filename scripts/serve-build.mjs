#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../build', import.meta.url)));
const args = process.argv.slice(2);

let host = '127.0.0.1';
let port = 3000;

for (let i = 0; i < args.length; ++i) {
  const arg = args[i];
  if (arg === '--host' && args[i + 1]) {
    host = args[++i];
  } else if (arg === '--port' && args[i + 1]) {
    port = Number.parseInt(args[++i], 10);
  }
}

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mp3', 'audio/mpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function sendHeaders(res, status, filePath) {
  res.writeHead(status, {
    'Content-Type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
}

function resolveRequestPath(url) {
  const requestUrl = new URL(url, `http://${host}:${port}`);
  const decodedPath = decodeURIComponent(requestUrl.pathname);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = resolve(join(root, safePath));

  if (!filePath.startsWith(root + sep) && filePath !== root) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  } else if (!existsSync(filePath) && !extname(filePath)) {
    filePath = join(filePath, 'index.html');
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath;
  }

  const fallback = join(root, '404.html');
  return existsSync(fallback) ? fallback : null;
}

const server = createServer((req, res) => {
  const filePath = resolveRequestPath(req.url ?? '/');
  if (!filePath) {
    res.writeHead(404).end('Not found');
    return;
  }

  const status = filePath.endsWith(`${sep}404.html`) ? 404 : 200;
  sendHeaders(res, status, filePath);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[docs-serve] http://${host}:${port}/`);
  console.log('[docs-serve] COOP/COEP enabled for SoundTrace WASM AudioWorklet demos');
});
