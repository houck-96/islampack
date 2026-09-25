import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { QIRAAT_VARIANTS } from './qiraat.js';

console.log("==========================================================");
console.log("   🚀 مترجم ومجمع الحزم الرسمي (IslamPack Compiler)       ");
console.log("==========================================================\n");

const args = new Set(process.argv.slice(2));
const onlyQH = args.has('--only-qh');
const onlyQT = args.has('--only-qt');
const onlyFull = args.has('--only-full');
const skipRootCopy = args.has('--no-root-copy');
const buildAll = !onlyQH && !onlyQT && !onlyFull;

// التأكد من وجود مجلد dist
const distDir = path.resolve('./dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// 1. تحميل القرآن الكريم
const quranFile = path.resolve('./data/quran_full_uthmani.json');
if (!fs.existsSync(quranFile)) {
  console.error("❌ ملف المصحف data/quran_full_uthmani.json غير موجود!");
  process.exit(1);
}
const quranBase = JSON.parse(fs.readFileSync(quranFile, 'utf-8'));
if (!Array.isArray(quranBase) || quranBase.length !== 6236) {
  console.error(`❌ عدد آيات المصحف غير مطابق (الموجود: ${quranBase?.length} والمطلوب: 6236). أوقف البناء لمنع حزمة فاسدة.`);
  process.exit(1);
}
const quranBundle = { base: quranBase, variants: [...QIRAAT_VARIANTS] };

// 2. تحميل كتب الحديث
const hadithFiles = ["bukhari.json", "muslim.json", "abudawud.json", "tirmidhi.json", "nasai.json"];
const hadithBundle = {};
hadithFiles.forEach((file, idx) => {
  const p = path.resolve(`./data/hadith/${file}`);
  if (!fs.existsSync(p)) {
    console.error(`❌ ملف الحديث مفقود: ${p}`);
    process.exit(1);
  }
  hadithBundle[idx] = JSON.parse(fs.readFileSync(p, 'utf-8'));
});
const hadithTotal = Object.values(hadithBundle).reduce((a, l) => a + l.length, 0);
if (hadithTotal !== 30189) {
  console.error(`❌ عدد الأحاديث غير مطابق (الموجود: ${hadithTotal} والمطلوب: 30,189). أوقف البناء.`);
  process.exit(1);
}

// 3. تحميل كتب التفسير
const tafsirFiles = ["jalalayn.json", "saadi.json", "ibn_kathir.json", "baghawi.json", "qurtubi.json"];
const tafsirBundle = {};
tafsirFiles.forEach((file, idx) => {
  const p = path.resolve(`./data/tafsir/${file}`);
  if (!fs.existsSync(p)) {
    console.error(`❌ ملف التفسير مفقود: ${p}`);
    process.exit(1);
  }
  tafsirBundle[idx] = JSON.parse(fs.readFileSync(p, 'utf-8'));
});
const tafsirTotal = Object.values(tafsirBundle).reduce((a, l) => a + l.length, 0);
if (tafsirTotal < 30000) {
  console.error(`❌ أعداد التفاسير ناقصة (الموجود: ${tafsirTotal}). أوقف البناء.`);
  process.exit(1);
}

console.log(`✓ المصحف: 6,236 آية + ${QIRAAT_VARIANTS.length} فرش قراءات | الحديث: ${hadithTotal.toLocaleString()} | التفسير: ${tafsirTotal.toLocaleString()}`);

function createPack(filename, payload, magicHeader) {
  if (Buffer.byteLength(magicHeader, 'utf-8') !== 8) {
    throw new Error(`الترويسة يجب أن تكون 8 بايت بالضبط: ${magicHeader}`);
  }
  const withMeta = { _meta: { builder: 'islampack-compiler', version: 1, builtAt: new Date().toISOString() }, ...payload };
  const rawStr = JSON.stringify(withMeta);
  const rawBuf = Buffer.from(rawStr, 'utf-8');
  const compressed = zlib.brotliCompressSync(rawBuf, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
  });
  const hash = crypto.createHash('sha256').update(rawBuf).digest();
  const magic = Buffer.from(magicHeader, 'utf-8');
  const finalFile = Buffer.concat([magic, hash, compressed]);

  // حفظ نسخة في dist ونسخة في الجذر لتسهيل المسارات (تُتخطى مع --no-root-copy)
  fs.writeFileSync(path.join(distDir, filename), finalFile);
  if (!skipRootCopy) fs.writeFileSync(path.resolve(filename), finalFile);
  console.log(`✓ تم إنتاج [${filename}] بنجاح (${(finalFile.length / (1024 * 1024)).toFixed(2)} MB).`);
}

if (buildAll || onlyQH) createPack('islam-qh.pack', { quran: quranBundle, hadith: hadithBundle }, 'ISLAM_QH');
if (buildAll || onlyQT) createPack('islam-qt.pack', { quran: quranBundle, tafsir: tafsirBundle }, 'ISLAM_QT');
if (buildAll || onlyFull) createPack('islam-full.pack', { quran: quranBundle, hadith: hadithBundle, tafsir: tafsirBundle }, 'ISLAMALL');

console.log("\n🎉 تم بناء جميع الحزم بنجاح 100%!");
