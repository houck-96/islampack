import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { QIRAAT_VARIANTS } from './src/qiraat.js';

console.log("==========================================================");
console.log("   🚀 المجمع الرئيسي: بناء وضغط الإصدارات الثلاثة بالكامل  ");
console.log("==========================================================\n");

// [1] تحميل القرآن والقراءات الخمس (المصدر الموحد: src/qiraat.js)
console.log("⏳ تحميل المصحف الشريف (رواية حفص)...");
const quranBase = JSON.parse(fs.readFileSync('./data/quran_full_uthmani.json', 'utf-8'));

if (quranBase.length !== 6236) {
  console.error(`❌ عدد آيات المصحف غير مطابق (${quranBase.length} بدل 6236).`);
  process.exit(1);
}
const quranBundle = { base: quranBase, variants: [...QIRAAT_VARIANTS] };
console.log(`✓ المصحف جاهز (${quranBase.length} آية + طبقة القراءات).`);

// [2] تحميل كتب الحديث الخمسة
console.log("\n⏳ تحميل كتب الحديث الخمسة...");
const hadithFiles = ["bukhari.json", "muslim.json", "abudawud.json", "tirmidhi.json", "nasai.json"];
const hadithBundle = {};
let totalHadiths = 0;
hadithFiles.forEach((file, idx) => {
  const data = JSON.parse(fs.readFileSync(`./data/hadith/${file}`, 'utf-8'));
  hadithBundle[idx] = data;
  totalHadiths += data.length;
});
console.log(`✓ كتب الحديث جاهزة (${totalHadiths.toLocaleString()} حديثاً).`);

// [3] تحميل كتب التفسير الخمسة
console.log("\n⏳ تحميل كتب التفسير الخمسة...");
const tafsirFiles = ["jalalayn.json", "saadi.json", "ibn_kathir.json", "baghawi.json", "qurtubi.json"];
const tafsirBundle = {};
let totalTafsirs = 0;
tafsirFiles.forEach((file, idx) => {
  const data = JSON.parse(fs.readFileSync(`./data/tafsir/${file}`, 'utf-8'));
  tafsirBundle[idx] = data;
  totalTafsirs += data.length;
});
console.log(`✓ كتب التفسير جاهزة (${totalTafsirs.toLocaleString()} تفسيراً).`);

// دالة الضغط والحفظ
const distDir = path.resolve('./dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

function packAndSave(filename, payload, magicHeader, label) {
  console.log(`\n⏳ ضغط وتجميع [${label}]...`);
  const rawStr = JSON.stringify(payload);
  const rawBuf = Buffer.from(rawStr, 'utf-8');
  const rawMB = (rawBuf.length / (1024 * 1024)).toFixed(2);

  const compressed = zlib.brotliCompressSync(rawBuf, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: rawBuf.length
    }
  });

  const compMB = (compressed.length / (1024 * 1024)).toFixed(2);
  const hash = crypto.createHash('sha256').update(rawBuf).digest();
  const magic = Buffer.from(magicHeader, 'utf-8');
  const finalFile = Buffer.concat([magic, hash, compressed]);

  fs.writeFileSync(path.join(distDir, filename), finalFile);
  console.log(`✓ تم إنتاج: dist/${filename}`);
  console.log(`   - الحجم الأصلي: ${rawMB} MB`);
  console.log(`   - الحجم النهائي المضغوط: ${compMB} MB فقط!`);
  console.log(`   - نسبة التقليص: ${((1 - compressed.length / rawBuf.length) * 100).toFixed(1)}%`);
}

// 1. بناء الإصدار الأول: القرآن والحديث
packAndSave('islam-qh.pack', { quran: quranBundle, hadith: hadithBundle }, 'ISLAM_QH', 'الإصدار 1: القرآن والحديث');

// 2. بناء الإصدار الثاني: القرآن والتفاسير
packAndSave('islam-qt.pack', { quran: quranBundle, tafsir: tafsirBundle }, 'ISLAM_QT', 'الإصدار 2: القرآن والتفاسير');

// 2. بناء الإصدار الثالث: الشامل لكل شيء كلياً
packAndSave('islam-full.pack', { quran: quranBundle, hadith: hadithBundle, tafsir: tafsirBundle }, 'ISLAMALL', 'الإصدار 3: الشامل الذهبي');

console.log("\n==========================================================");
console.log("🎉 اكتمل بناء وتجهيز جميع الإصدارات الثلاثة بنجاح تام 100%!");
console.log("==========================================================");