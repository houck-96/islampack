import os from 'node:os';
import { IslamEngine } from './src/engine.js';

console.log("==========================================================");
console.log("   ⚡ قياس الأداء الحقيقي القابل لإعادة التشغيل (Benchmark) ");
console.log("==========================================================\n");

console.log("💻 مواصفات البيئة الحالية:");
console.log(` - المعالج: ${os.cpus()[0]?.model || 'Generic CPU'}`);
console.log(` - النواة:   ${os.cpus().length} Cores`);
console.log(` - الذاكرة:  ${(os.totalmem() / (1024**3)).toFixed(1)} GB`);
console.log(` - المنصة:   ${os.platform()} (${os.arch()})`);
console.log(` - محرك:     Node.js ${process.version}\n`);

const db = IslamEngine.load('islam-full.pack');

// 1. اختبار استرجاع الآيات (10,000 عملية وصول عشوائي)
const ITERATIONS = 10000;
const startQ = process.hrtime.bigint();
for (let i = 0; i < ITERATIONS; i++) {
  const s = (i % 114) + 1;
  const a = (i % 7) + 1;
  db.quran.getAyah(s, a, "hafs");
}
const endQ = process.hrtime.bigint();
const avgMicroSec = (Number(endQ - startQ) / ITERATIONS) / 1000;

console.log(`📊 نتائج الاسترجاع العشوائي (${ITERATIONS.toLocaleString()} مرة):`);
console.log(`   ⚡ متوسط زمن استرجاع الآية الواحدة: ${avgMicroSec.toFixed(3)} ميكروثانية (μs)!`);

// 2. اختبار البحث في كامل المصحف
const startS = process.hrtime.bigint();
const res = db.quran.search("الرحمن", 50);
const endS = process.hrtime.bigint();
const searchMs = Number(endS - startS) / 1_000_000;

console.log(`\n📊 نتائج البحث اللفظي الشامل لكلمة (الرحمن):`);
console.log(`   ⚡ استخرج ${res.length} نتيجة في: ${searchMs.toFixed(3)} ميلي ثانية (ms)!`);
console.log("==========================================================");