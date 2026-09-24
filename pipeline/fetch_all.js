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

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'IslamPack-Pipeline/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
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
        verses.push({ s: s.id, a: v.id, t: v.text.trim() });
      }
    }
    fs.writeFileSync(quranOut, JSON.stringify(verses), 'utf-8');
    console.log(`✓ تم حفظ المصحف كاملاً: ${verses.length} آية.`);
  } else {
    console.log("✓ المصحف الشريف موجود مسبقاً.");
  }
}

run().catch(console.error);