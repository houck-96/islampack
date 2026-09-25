import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { QIRAAT_VARIANTS } from './src/qiraat.js';

console.log("==========================================================");
console.log("   🚀 تجميع وبناء [الإصدار 1: القرآن والحديث الشريف]      ");
console.log("   (المصحف كاملاً 5 قراءات + 30,189 حديثاً نبوياً كاملاً)   ");
console.log("==========================================================\n");

// 1. تحميل المصحف الشريف
const quranPath = path.resolve('./data/quran_full_uthmani.json');
const quranBase = JSON.parse(fs.readFileSync(quranPath, 'utf-8'));
console.log(`✓ تم تحميل المصحف الشريف الأساسي (${quranBase.length} آية).`);

// فوارق القراءات الخمس (المصدر الموحد: src/qiraat.js — أي تعديل يكون هناك فقط)

// 2. تحميل كتب الحديث الخمسة
const HADITH_FILES = [
  { id: 0, name: "صحيح البخاري", file: "bukhari.json" },
  { id: 1, name: "صحيح مسلم",   file: "muslim.json" },
  { id: 2, name: "سنن أبي داود", file: "abudawud.json" },
  { id: 3, name: "جامع الترمذي", file: "tirmidhi.json" },
  { id: 4, name: "سنن النسائي",  file: "nasai.json" },
];

const allHadiths = {};
let totalHadiths = 0;

for (const b of HADITH_FILES) {
  const filePath = path.resolve(`./data/hadith/${b.file}`);
  const list = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  allHadiths[b.id] = list;
  totalHadiths += list.length;
  console.log(`✓ تم تضمين [${b.name}]: ${list.length} حديثاً.`);
}

console.log(`\n📊 إجمالي الأحاديث النبوية المعتمدة: ${totalHadiths.toLocaleString()} حديثاً.`);

// 3. بناء الحزمة المتكاملة
const bundlePayload = {
  header: "ISLAM-QH-EDITION",
  version: "1.0",
  riwayat: ["حفص", "ورش", "قالون", "الدوري", "شعبة"],
  quran: {
    base: quranBase,
    variants: QIRAAT_VARIANTS
  },
  hadith: allHadiths
};

const rawBuffer = Buffer.from(JSON.stringify(bundlePayload), 'utf-8');
const rawSizeMB = (rawBuffer.length / (1024 * 1024)).toFixed(2);
console.log(`\n📦 الحجم الأصلي للنصوص الخام مجتمعة: ${rawSizeMB} MB`);

console.log("⏳ جاري تطبيق أقصى درجات الضغط (Brotli Quality 11)... قد يستغرق ثوانٍ معدودة...");

// 4. الضغط الشديد
const compressedBuffer = zlib.brotliCompressSync(rawBuffer, {
  params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    [zlib.constants.BROTLI_PARAM_SIZE_HINT]: rawBuffer.length
  }
});

const compressedSizeMB = (compressedBuffer.length / (1024 * 1024)).toFixed(2);
const hash = crypto.createHash('sha256').update(rawBuffer).digest();

// 5. كتابة الملف الثنائي الموحد
const magic = Buffer.from("ISLAM_QH", "utf-8"); // 8 بايت
const finalPack = Buffer.concat([magic, hash, compressedBuffer]);

const distDir = path.resolve('./dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const targetPack = path.join(distDir, 'islam-qh.pack');
fs.writeFileSync(targetPack, finalPack);

console.log("\n==========================================================");
console.log("🎉 تم بنجاح إنتاج [الإصدار 1: القرآن والحديث الشريف]!");
console.log("==========================================================");
console.log(`📊 الحجم الأصلي:               ${rawSizeMB} MB`);
console.log(`📦 الحجم النهائي المضغوط:      ${compressedSizeMB} MB فقط!`);
console.log(`🚀 نسبة تقليص المساحة:         ${((1 - compressedBuffer.length / rawBuffer.length) * 100).toFixed(1)}%`);
console.log(`🔒 البصمة الرقمية للتحقق:      ${hash.toString('hex').substring(0, 32)}...`);
console.log(`💾 مسار الملف المستقل:         dist/islam-qh.pack`);

// 6. اختبار وفحص السرعة الفائقة
console.log("\n⚡ فحص دقة وسرعة الاسترجاع من الحزمة الجديدة:");
const startTest = process.hrtime.bigint();

// فك الضغط اللحظي
const decomp = JSON.parse(zlib.brotliDecompressSync(finalPack.subarray(40)).toString('utf-8'));

// استخراج أول حديث في البخاري ومسلم
const bukhari1 = decomp.hadith[0][0];
const muslim1 = decomp.hadith[1][0];
const ayahKursi = decomp.quran.base.find(v => v.s === 2 && v.a === 255);

const endTest = process.hrtime.bigint();
const latencyMs = Number(endTest - startTest) / 1_000_000;

console.log(`  * أول حديث في البخاري:  ${bukhari1.t.substring(0, 80)}...`);
console.log(`  * أول حديث في مسلم:    ${muslim1.t.substring(0, 80)}...`);
console.log(`  * آية الكرسي كاملة:    ${ayahKursi.t.substring(0, 80)}...`);
console.log(`⏱️ زمن فحص واسترجاع البيانات: ${latencyMs.toFixed(2)} ميلي ثانية!`);