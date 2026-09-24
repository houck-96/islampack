import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const MAX_PAYLOAD_SIZE = 30 * 1024 * 1024; // حد أقصى 30 ميغابايت للحماية

function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? 'start' :
                   process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${startCmd} ${url}`, () => {});
}

const server = http.createServer((req, res) => {
  const sanitizedUrl = new URL(req.url, `http://${req.headers.host}`).pathname;

  // 1. تقديم الواجهة app.html
  if (sanitizedUrl === '/' || sanitizedUrl === '/index.html' || sanitizedUrl === '/app.html') {
    const htmlPath = path.join(__dirname, 'app.html');
    if (!fs.existsSync(htmlPath)) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end("خطأ: لم يتم العثور على ملف app.html في مسار الخادم.");
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(htmlPath).pipe(res);
  }

  // 2. معالجة وفك ضغط الحزمة مع التحقق الأمني التام
  if (sanitizedUrl === '/api/load-pack' && req.method === 'POST') {
    let receivedBytes = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_PAYLOAD_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "تم رفض الملف: الحجم يتجاوز الحد الأقصى المسموح (30MB)." }));
        req.destroy();
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (receivedBytes > MAX_PAYLOAD_SIZE) return;

      try {
        const fullBuffer = Buffer.concat(chunks);
        const magicIndex = fullBuffer.indexOf(Buffer.from("ISLAM"));

        if (magicIndex === -1 || fullBuffer.length < magicIndex + 40) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "صيغة الحزمة غير صالحة: الترويسة السحرية مفقودة." }));
        }

        const rawPack = fullBuffer.subarray(magicIndex);
        const expectedHash = rawPack.subarray(8, 40);
        const compressedBody = rawPack.subarray(40);

        // فك الضغط
        const decompressed = zlib.brotliDecompressSync(compressedBody);

        // التحقق من البصمة التشفيرية
        const actualHash = crypto.createHash('sha256').update(decompressed).digest();
        if (!expectedHash.equals(actualHash)) {
          res.writeHead(422, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "فشل التحقق التشفيري: بصمة SHA-256 لا تتطابق!" }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(decompressed);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "فشل فك ضغط الحزمة: تأكد من سلامة الملف." }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end("الصفحة غير موجودة 404");
});

server.listen(PORT, () => {
  console.log(`🌐 خادم IslamPack يعمل الآن على: http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production' && !process.env.CI) {
    openBrowser(`http://localhost:${PORT}`);
  }
});