import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// حدود الأمان الصارمة
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;    // 30MB كحد أقصى للحجم المضغوط
const MAX_DECOMPRESSED_BYTES = 180 * 1024 * 1024; // حماية ضد Decompression Bomb

function setSecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' data:;");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // 1. تقديم صفحة الواجهة
  if (pathname === '/' || pathname === '/index.html' || pathname === '/app.html') {
    const htmlPath = path.join(__dirname, 'app.html');
    if (!fs.existsSync(htmlPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end("ملف app.html غير موجود.");
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(htmlPath).pipe(res);
  }

  // 2. استقبال الملف الثنائي الخام (Octet-Stream) ومعالجته بشكل غير متزامن
  if (pathname === '/api/load-pack' && req.method === 'POST') {
    let receivedBytes = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_UPLOAD_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: "تم رفض الطلب: الحجم يتجاوز 30MB." }));
        req.destroy();
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (receivedBytes > MAX_UPLOAD_BYTES) return;

      const fullBuffer = Buffer.concat(chunks);
      if (fullBuffer.length < 40) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: "حجم الملف غير صالح." }));
      }

      const magic = fullBuffer.subarray(0, 8).toString('utf-8');
      if (!magic.startsWith("ISLAM")) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: "ترويسة الملف غير صالحة." }));
      }

      const expectedHash = fullBuffer.subarray(8, 40);
      const compressedBody = fullBuffer.subarray(40);

      // فك ضغط غير متزامن تماماً لعدم حجب مسار Node.js Event Loop
      zlib.brotliDecompress(compressedBody, {
        params: {
          [zlib.constants.BROTLI_DECODER_PARAM_LARGE_WINDOW]: 1
        }
      }, (err, decompressed) => {
        if (err) {
          res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: "فشل فك ضغط الحزمة: الملف تالف." }));
        }

        // الحماية من قنبلة فك الضغط (Zip/Brotli Bomb)
        if (decompressed.length > MAX_DECOMPRESSED_BYTES) {
          res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: "الحجم بعد فك الضغط يتجاوز الحد المسموح." }));
        }

        // التحقق من SHA-256
        const actualHash = crypto.createHash('sha256').update(decompressed).digest();
        if (!expectedHash.equals(actualHash)) {
          res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: "فشل مطابقة البصمة التشفيرية SHA-256." }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(decompressed);
      });
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end("404 Not Found");
});

server.listen(PORT, () => {
  console.log(`🌐 خادم IslamPack يعمل الآن على: http://localhost:${PORT}`);
});