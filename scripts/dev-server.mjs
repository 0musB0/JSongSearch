import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import songsHandler from '../api/songs.js';
import cronSyncHandler from '../api/cron-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function createMockRes(res) {
  let statusCode = 200;
  return {
    setHeader: (name, val) => res.setHeader(name, val),
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(data));
        },
        send: (body) => {
          res.writeHead(statusCode);
          res.end(body);
        }
      };
    },
    json: (data) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    },
    send: (body) => {
      res.writeHead(statusCode);
      res.end(body);
    }
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // API Routes
  if (pathname === '/api/songs') {
    const mockRes = createMockRes(res);
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    return songsHandler(req, mockRes);
  }

  if (pathname === '/api/cron-sync') {
    const mockRes = createMockRes(res);
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    return cronSyncHandler(req, mockRes);
  }

  // Static File Serving
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(rootDir, pathname.replace(/^\//, ''));

  // Security check: stay within rootDir
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not Found');
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      res.writeHead(403);
      return res.end('Forbidden directory');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Internal Server Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`🎤 Karaoke Search Dev Server running at http://localhost:${PORT}`);
  console.log(`   Serving static assets from ${rootDir}`);
  console.log(`   API endpoints available:`);
  console.log(`   - http://localhost:${PORT}/api/songs`);
  console.log(`   - http://localhost:${PORT}/api/cron-sync`);
});
