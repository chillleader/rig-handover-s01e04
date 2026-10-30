import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const html = readFileSync(process.env.PREVIEW_FILE ?? '/tmp/preview.html');
createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(request.method === 'HEAD' ? undefined : '{"ok":true}');
    return;
  }
  if (!['/', '/digest/2026-10-28'].includes(pathname)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': html.length,
    'Cache-Control': 'no-store',
  });
  response.end(request.method === 'HEAD' ? undefined : html);
}).listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
