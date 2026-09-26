/**
 * Статический сервер production-сборки Waystroke.
 *
 * Нужен для Railway (и для локальной проверки собранного варианта):
 * платформа передаёт порт в переменной PORT, а Angular отдаёт файлы в
 * dist/waystroke-studio/browser. Сайт одностраничный, поэтому любой
 * неизвестный путь отвечает index.html — якорей и роутинга у нас нет,
 * но прямой заход по адресу всё равно должен работать.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'dist', 'waystroke-studio', 'browser');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }

  let filePath = path.join(ROOT, path.normalize(pathname));
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, 'Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    // Одностраничник: всё, что не нашли, разбираем по index.html.
    filePath = path.join(ROOT, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    return send(res, 404, 'Build output not found. Run `npm run build:prod` first.');
  }

  const ext = path.extname(filePath).toLowerCase();
  const isHashed = /-[A-Z0-9]{8,}\.(js|css|woff2?|png|jpg|svg)$/i.test(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 500, 'Server error');
    send(res, 200, data, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': isHashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Waystroke listening on http://0.0.0.0:${PORT}`);
  console.log(`Serving ${ROOT}`);
});
