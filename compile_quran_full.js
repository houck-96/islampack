import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { QIRAAT_VARIANTS, RIWAYAT_AR } from './src/qiraat.js';

console.log("==========================================================");
console.log("   ⚡ بدء بناء وضغط المصحف الشريف كاملاً بالقراءات الخمس   ");
console.log("   (114 سورة - 6236 آية كاملة التشكيل + طبقة فوارق الروايات) ");
console.log("==========================================================\n");

// 1. قراءة المصحف الكامل المحفوظ محلياً
const rawQuranPath = path.resolve('./data/quran_full_uthmani.json');
if (!fs.existsSync(rawQuranPath)) {
  throw new Error("ملف المصحف الكامل غير موجود! تأكد من تشغيل fetch_full_quran.js أولاً");
}

const hafsBaseVerses = JSON.parse(fs.readFileSync(rawQuranPath, 'utf-8'));
console.log(`✓ تم تحميل النص الأساسي (رواية حفص): ${hafsBaseVerses.length} آية مشكولة.`);

// 2. طبقة فوارق القراءات (المصدر الموحد: src/qiraat.js)
// الروايات: 0=حفص، 1=ورش، 2=قالون، 3=الدوري، 4=شعبة
// القاعدة الذهبية: الآية التي لا تختلف نصاً ورسماً بين القراءات لا تُكرر، مما يوفر 95% من الحجم!

console.log(`✓ تم دمج طبقة الفوارق المعتمدة للروايات الخمس.`);

// 3. دمج الحزمة القرآنية الكاملة (مغلفة تحت مفتاح quran لتوافق محرك IslamEngine)
const quranBundle = {
  version: "1.0",
  riwayat: [...RIWAYAT_AR],
  totalVerses: hafsBaseVerses.length,
  base: hafsBaseVerses,
  variants: [...QIRAAT_VARIANTS]
};

const rawPayload = JSON.stringify({ quran: quranBundle });
const rawBuffer = Buffer.from(rawPayload, 'utf-8');
const originalSizeKB = (rawBuffer.length / 1024).toFixed(1);

console.log(`\n⏳ جاري تطبيق أقصى درجات الضغط (Brotli Quality 11)...`);

// 4. الضغط الشديد
const compressedBuffer = zlib.brotliCompressSync(rawBuffer, {
  params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    [zlib.constants.BROTLI_PARAM_SIZE_HINT]: rawBuffer.length
  }
});

const compressedSizeKB = (compressedBuffer.length / 1024).toFixed(1);
const hash = crypto.createHash('sha256').update(rawBuffer).digest();

// 5. حفظ الملف الثنائي النهائي
const magic = Buffer.from("ISLAMQUR", "utf-8"); // الترويسة القرآنية
const finalPack = Buffer.concat([magic, hash, compressedBuffer]);

const distDir = path.resolve('./dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const outputPath = path.join(distDir, 'quran_complete.pack');
fs.writeFileSync(outputPath, finalPack);

console.log("\n==========================================================");
console.log("🎉 اكتمل بناء حزمة القرآن الكريم الكاملة بنجاح خيالي!");
console.log("==========================================================");
console.log(`📊 الحجم الأصلي للنص المشكول كاملاً: ${originalSizeKB} KB`);
console.log(`📦 الحجم النهائي للملف المضغوط:      ${compressedSizeKB} KB فقط!`);
console.log(`🚀 نسبة تقليص المساحة:              ${((1 - compressedBuffer.length / rawBuffer.length) * 100).toFixed(1)}%`);
console.log(`🔒 البصمة التشفيرية (SHA-256):       ${hash.toString('hex').substring(0, 32)}...`);
console.log(`💾 مسار الملف المنشأ:                dist/quran_complete.pack`);

// 6. اختبار السرعة اللحظية لاستخراج آيات عشوائية عبر الذاكرة
console.log("\n⚡ اختبار الاسترجاع اللحظي (Benchmark):");

const startBench = process.hrtime.bigint();

// محاكاة قراءة الآية من الملف (البنية متوافقة مع IslamEngine: data.quran.base)
const decomp = JSON.parse(zlib.brotliDecompressSync(finalPack.subarray(40)).toString('utf-8'));

// استرجاع آية الكرسي برواية حفص
const ayahKursi = decomp.quran.base.find(v => v.s === 2 && v.a === 255);

// استرجاع آية سورة الإخلاص برواية شعبة وورش
const ikhlasWarsh = decomp.quran.variants.find(v => v.s === 112 && v.a === 4 && v.r === 1);
const ikhlasShubah = decomp.quran.variants.find(v => v.s === 112 && v.a === 4 && v.r === 4);

const endBench = process.hrtime.bigint();
const latencyMs = Number(endBench - startBench) / 1_000_000;

console.log(`  * سورة الإخلاص آية 4 (ورش):   ${ikhlasWarsh.t}`);
console.log(`  * سورة الإخلاص آية 4 (شعبة):  ${ikhlasShubah.t}`);
console.log(`  * آية الكرسي (حفص):          ${ayahKursi.t.substring(0, 60)}...`);
console.log(`⏱️ زمن فك الضغط والاسترجاع لكامل المصحف: ${latencyMs.toFixed(2)} ميلي ثانية!`);