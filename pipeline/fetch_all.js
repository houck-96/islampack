import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const DATA_DIR = path.resolve('./data');
const HADITH_DIR = path.join(DATA_DIR, 'hadith');
const TAFSIR_DIR = path.join(DATA_DIR, 'tafsir');

[DATA_DIR, HADITH_DIR, TAFSIR_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

console.log("==========================================================");
console.log("   📥 خط جلب وتوثيق البيانات الإسلامية المعتمدة (Pipeline) ");
console.log("==========================================================\n");

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 30000;

function fetchUrl(url, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft < 0) return reject(new Error("تجاوز حد التحويلات (redirect loop)."));
    const req = https.get(url, { headers: { 'User-Agent': 'IslamPack-Pipeline/1.0' }, timeout: REQUEST_TIMEOUT_MS }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return fetchUrl(res.headers.location, redirectsLeft - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} لـ ${url}`));
      }
      let data = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => req.destroy(new Error(`انتهت مهلة الطلب (${REQUEST_TIMEOUT_MS}ms): ${url}`)));
    req.on('error', reject);
  });
}

async function run() {
  // 1. جلب المصحف الشريف المعتمد (Tanzil Uthmani Text)
  const quranOut = path.join(DATA_DIR, 'quran_full_uthmani.json');
  if (!fs.existsSync(quranOut)) {
    console.log("⏳ جاري تنزيل نص المصحف الشريف بالرسم العثماني...");
    const raw = await fetchUrl("https://raw.githubusercontent.com/risan/quran-json/main/dist/quran.json");
    const parsed = JSON.parse(raw);
    const verses = [];
    for (const s of parsed) {
      for (const v of s.verses) {
        verses.push({ s: s.id, a: v.id, t: String(v.text).trim() });
      }
    }
    if (verses.length !== 6236) {
      throw new Error(`عدد الآيات المجلوبة غير مطابق (${verses.length} بدل 6236) — رفض الحفظ.`);
    }
    const tmp = `${quranOut}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(verses), 'utf-8');
    fs.renameSync(tmp, quranOut);
    console.log(`✓ تم حفظ المصحف كاملاً: ${verses.length} آية.`);
  } else {
    const existing = JSON.parse(fs.readFileSync(quranOut, 'utf-8'));
    console.log(`✓ المصحف الشريف موجود مسبقاً (${existing.length} آية) — تُخطي التنزيل.`);
  }

  // 2. كتب الحديث والتفسير: تُدار يدوياً من مصادر موثقة — لا تنزيل تلقائي
  // لمنع تلويث المدونة ببيانات غير مدققة. راجع SOURCES.md.
  for (const f of ["bukhari.json", "muslim.json", "abudawud.json", "tirmidhi.json", "nasai.json"]) {
    const p = path.join(HADITH_DIR, f);
    if (!fs.existsSync(p)) console.log(`⚠️ ملف الحديث مفقود (يتطلب إضافة يدوية موثقة): ${p}`);
  }
  for (const f of ["jalalayn.json", "saadi.json", "ibn_kathir.json", "baghawi.json", "qurtubi.json"]) {
    const p = path.join(TAFSIR_DIR, f);
    if (!fs.existsSync(p)) console.log(`⚠️ ملف التفسير مفقود (يتطلب إضافة يدوية موثقة): ${p}`);
  }
  console.log("\n🎉 اكتمل خط الجلب دون أخطاء.");
}

run().catch((e) => { console.error(`❌ فشل خط الجلب: ${e.message}`); process.exit(1); });
