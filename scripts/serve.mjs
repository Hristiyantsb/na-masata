import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('docs'),
  types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.webmanifest': 'application/manifest+json',
  };
http
  .createServer((req, res) => {
    let relative;
    try {
      relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const file = path.resolve(root, '.' + relative + (relative.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  })
  .listen(4173, '127.0.0.1', () => console.log('На масата: http://127.0.0.1:4173'));
