import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { IslamEngine } from './src/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

// حدود الأمان الصارمة
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;    // 30MB كحد أقصى للحجم المضغوط
const MAX_DECOMPRESSED_BYTES = 180 * 1024 * 1024; // حماية ضد Decompression Bomb

// محرك محمّل مسبقاً في الذاكرة (إن توفرت حزمة محلياً) لخدمة REST مباشرة
let memoryEngine = null;
for (const candidate of ['islam-full.pack', './dist/islam-full.pack']) {
  try {
    memoryEngine = IslamEngine.load(candidate);
    console.log(`✓ تم تحميل الحزمة في ذاكرة الخادم مسبقاً: ${candidate}`);
    break;
  } catch { /* لا توجد حزمة محلية — سيعمل الخادم بوضع الرفع فقط */ }
}
if (!memoryEngine) console.log("ℹ️ لا توجد حزمة محلية — الخادم يعمل بوضع رفع الحزم عبر /api/load-pack فقط.");

function setSecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' data:;");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function serveStatic(res, file, contentType) {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end("ملف الواجهة غير موجود.");
  }
  res.writeHead(200, { 'Content-Type': contentType });
  return fs.createReadStream(p).pipe(res);
}

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);
  let pathname = '/';
  let parsedUrl = null;
  try {
    parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    pathname = parsedUrl.pathname;
  } catch {
    return sendJson(res, 400, { error: "رابط الطلب غير صالح." });
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    return res.end();
  }

  // 1. تقديم صفحة الواجهة
  if ((pathname === '/' || pathname === '/index.html' || pathname === '/app.html') && req.method === 'GET') {
    return serveStatic(res, 'app.html', 'text/html; charset=utf-8');
  }

  // 2. فحص الصحة والإحصائيات
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, loaded: Boolean(memoryEngine), stats: memoryEngine ? memoryEngine.getStats() : null });
  }

  // 3. واجهات القراءة المباشرة (تتطلب حزمة محملة مسبقاً)
  if (pathname === '/api/ayah' && req.method === 'GET') {
    if (!memoryEngine) return sendJson(res, 503, { error: "لا توجد حزمة محملة على الخادم." });
    const surah = Number(parsedUrl.searchParams.get('surah'));
    const ayah = Number(parsedUrl.searchParams.get('ayah'));
    const riwayah = parsedUrl.searchParams.get('riwayah') || 'hafs';
    try {
      const text = memoryEngine.quran.getAyah(surah, ayah, riwayah);
      if (!text) return sendJson(res, 404, { error: "الآية غير موجودة." });
      return sendJson(res, 200, { surah, ayah, riwayah, text });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (pathname === '/api/surah' && req.method === 'GET') {
    if (!memoryEngine) return sendJson(res, 503, { error: "لا توجد حزمة محملة على الخادم." });
    const surah = Number(parsedUrl.searchParams.get('surah'));
    const riwayah = parsedUrl.searchParams.get('riwayah') || 'hafs';
    try {
      const info = memoryEngine.quran.getSurahInfo(surah);
      if (!info) return sendJson(res, 404, { error: "السورة غير موجودة." });
      return sendJson(res, 200, { info, ayahs: memoryEngine.quran.getSurah(surah, riwayah) });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (pathname === '/api/search' && req.method === 'GET') {
    if (!memoryEngine) return sendJson(res, 503, { error: "لا توجد حزمة محملة على الخادم." });
    const q = parsedUrl.searchParams.get('q') || '';
    const limit = Number(parsedUrl.searchParams.get('limit')) || 50;
    try {
      return sendJson(res, 200, { query: q, results: memoryEngine.quran.search(q, limit) });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (pathname === '/api/hadith' && req.method === 'GET') {
    if (!memoryEngine) return sendJson(res, 503, { error: "لا توجد حزمة محملة على الخادم." });
    const book = parsedUrl.searchParams.get('book') || 'bukhari';
    const number = Number(parsedUrl.searchParams.get('number'));
    try {
      const text = memoryEngine.hadith.get(book, number);
      if (!text) return sendJson(res, 404, { error: "الحديث غير موجود." });
      return sendJson(res, 200, { book, number, text });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (pathname === '/api/tafsir' && req.method === 'GET') {
    if (!memoryEngine) return sendJson(res, 503, { error: "لا توجد حزمة محملة على الخادم." });
    const book = parsedUrl.searchParams.get('book') || 'saadi';
    const surah = Number(parsedUrl.searchParams.get('surah'));
    const ayah = Number(parsedUrl.searchParams.get('ayah'));
    try {
      const text = memoryEngine.tafsir.get(book, surah, ayah);
      if (!text) return sendJson(res, 404, { error: "التفسير غير موجود." });
      return sendJson(res, 200, { book, surah, ayah, text });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (pathname === '/api/surahs' && req.method === 'GET') {
    if (!memoryEngine) return sendJson(res, 503, { error: "لا توجد حزمة محملة على الخادم." });
    return sendJson(res, 200, { surahs: memoryEngine.quran.getAllSurahs() });
  }

  // 4. استقبال الملف الثنائي الخام (Octet-Stream) ومعالجته بشكل غير متزامن
  if (pathname === '/api/load-pack' && req.method === 'POST') {
    let receivedBytes = 0;
    let rejected = false;
    const chunks = [];

    req.on('data', (chunk) => {
      if (rejected) return;
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_UPLOAD_BYTES) {
        rejected = true;
        sendJson(res, 413, { error: "تم رفض الطلب: الحجم يتجاوز 30MB." });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (rejected) return;
      if (receivedBytes > MAX_UPLOAD_BYTES) return;

      const fullBuffer = Buffer.concat(chunks);
      if (fullBuffer.length < 40) {
        return sendJson(res, 400, { error: "حجم الملف غير صالح." });
      }

      const magic = fullBuffer.subarray(0, 8).toString('utf-8');
      if (!magic.startsWith("ISLAM")) {
        return sendJson(res, 400, { error: "ترويسة الملف غير صالحة." });
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
          return sendJson(res, 422, { error: "فشل فك ضغط الحزمة: الملف تالف." });
        }

        // الحماية من قنبلة فك الضغط (Zip/Brotli Bomb)
        if (decompressed.length > MAX_DECOMPRESSED_BYTES) {
          return sendJson(res, 413, { error: "الحجم بعد فك الضغط يتجاوز الحد المسموح." });
        }

        // التحقق من SHA-256
        const actualHash = crypto.createHash('sha256').update(decompressed).digest();
        if (!expectedHash.equals(actualHash)) {
          return sendJson(res, 422, { error: "فشل مطابقة البصمة التشفيرية SHA-256." });
        }

        // تخزين اختياري في الذاكرة لخدمة REST اللاحقة + إرجاع الإحصائيات بدل كامل النص
        try {
          memoryEngine = IslamEngine.fromBuffer(fullBuffer, 'uploaded-pack');
        } catch { /* يبقى المحرك السابق إن وُجد */ }
        const stats = memoryEngine ? memoryEngine.getStats() : null;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        // إرجاع ملخص + أول 512KB فقط لتفادي إغراق الشبكة بملف 100MB+
        const preview = decompressed.subarray(0, 512 * 1024).toString('utf-8');
        res.end(JSON.stringify({ ok: true, bytes: decompressed.length, stats, preview }));
      });
    });

    req.on('error', () => {
      if (!res.writableEnded) sendJson(res, 400, { error: "انقطع الاتصال أثناء الرفع." });
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end("404 Not Found");
});

server.listen(PORT, () => {
  console.log(`🌐 خادم IslamPack يعمل الآن على: http://localhost:${PORT}`);
});
