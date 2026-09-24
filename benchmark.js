import os from 'node:os';
import { IslamEngine, SURAHS_META } from './src/engine.js';

console.log("==========================================================");
console.log("   ⚡ قياس الأداء الحقيقي والذاكرة (IslamPack Benchmark)  ");
console.log("==========================================================\n");

const memStart = process.memoryUsage().heapUsed;
const loadStart = process.hrtime.bigint();
const db = IslamEngine.load('islam-full.pack');
const loadEnd = process.hrtime.bigint();
const memEnd = process.memoryUsage().heapUsed;

console.log(`💻 مواصفات البيئة: ${os.cpus()[0]?.model || 'Generic CPU'} (${os.cpus().length} Cores)`);
console.log(`⏱️ زمن التحميل وفك الضغط الأولي: ${(Number(loadEnd - loadStart) / 1_000_000).toFixed(2)} ms`);
console.log(`🧠 استهلاك الذاكرة الفعلي بعد الفك: ${((memEnd - memStart) / (1024 * 1024)).toFixed(2)} MB RAM\n`);

// قياس 10,000 عملية وصول على آيات صالحة وموجودة فعلياً
const ITERATIONS = 10000;
const startQ = process.hrtime.bigint();

for (let i = 0; i < ITERATIONS; i++) {
  const surahId = (i % 114) + 1;
  const maxAyahs = SURAHS_META[surahId - 1].ayahs;
  const ayahId = (i % maxAyahs) + 1;
  db.quran.getAyah(surahId, ayahId, "hafs");
}

const endQ = process.hrtime.bigint();
const avgMicroSec = (Number(endQ - startQ) / ITERATIONS) / 1000;

console.log(`📊 نتائج الاسترجاع الفعلي عبر مفاتيح MPHF الثنائية (${ITERATIONS.toLocaleString()} مرة):`);
console.log(`   ⚡ متوسط زمن الاسترجاع للآية الواحدة: ${avgMicroSec.toFixed(3)} ميكروثانية (μs)`);

// قياس البحث المسبق الفهرسة
const startSearch = process.hrtime.bigint();
const results = db.quran.search("الرحمن", 50);
const endSearch = process.hrtime.bigint();

console.log(`\n📊 نتائج البحث اللفظي لكلمة (الرحمن):`);
console.log(`   ⚡ استخرج ${results.length} آية في: ${(Number(endSearch - startSearch) / 1_000_000).toFixed(3)} ms`);