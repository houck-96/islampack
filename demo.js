import { IslamEngine } from './src/engine.js';

console.log("==========================================================");
console.log("   🌟 العرض التجريبي الرسمي لمكتبة IslamPack           ");
console.log("==========================================================\n");

// تحميل الحزمة تلقائياً (يدعم الجذر أو مجلد dist)
function fs_exists(p) {
  try { return Boolean(IslamEngine.resolvePackPath(p)); } catch { return false; }
}
const packTarget = fs_exists('islam-full.pack') ? 'islam-full.pack' : './dist/islam-full.pack';

try {
  console.log(`⏳ جاري تحميل الحزمة الشاملة (${packTarget})...`);
  const t0 = process.hrtime.bigint();
  const db = IslamEngine.load(packTarget);
  const t1 = process.hrtime.bigint();
  console.log(`✓ تم فك الضغط والتحقق التشفيري في: ${(Number(t1 - t0) / 1_000_000).toFixed(2)} ms!\n`);

  console.log("【1】 دقة القراءات القرآنية:");
  console.log(" - حفص   (الفاتحة 4): ", db.quran.getAyah(1, 4, "hafs"));
  console.log(" - ورش   (الفاتحة 3): ", db.quran.getAyah(1, 3, "warsh"));
  console.log(" - قالون (الفاتحة 3): ", db.quran.getAyah(1, 3, "qalun"));
  console.log(" - شعبة  (الإخلاص 4): ", db.quran.getAyah(112, 4, "shubah"));

  console.log("\n【2】 كتب الحديث النبوي الشريف:");
  console.log(" * البخاري (حديث 1): ", (db.hadith.get("bukhari", 1) || "غير موجود").substring(0, 80) + "...");
  // ملاحظة: أول حديثين في مصدر مسلم نصّهما فارغ (موثق في README)، فنعرض أول حديث متاح:
  console.log(" * مسلم   (حديث 3): ", (db.hadith.get("muslim", 3) || "غير موجود").substring(0, 80) + "...");

  console.log("\n【3】 كتب التفسير العظمى لآية الكرسي (2:255):");
  console.log(" * ابن كثير: ", (db.tafsir.get("ibn_kathir", 2, 255) || "غير متوفر").substring(0, 90) + "...");
  console.log(" * السعدي:   ", (db.tafsir.get("saadi", 2, 255) || "غير متوفر").substring(0, 90) + "...");

  console.log("\n【4】 تجربة محرك البحث اللفظي الفوري عن كلمة (الْكَوْثَرَ):");
  const sStart = process.hrtime.bigint();
  const res = db.quran.search("الكوثر");
  const sEnd = process.hrtime.bigint();
  res.forEach(r => console.log(`   [سورة ${r.surah}، آية ${r.ayah}]: ${r.text}`));
  console.log(`⚡ زمن البحث: ${(Number(sEnd - sStart) / 1_000_000).toFixed(3)} ms`);

  console.log("\n🎉 تم تشغيل العرض التجريبي بنجاح تام وبلا أي خطأ!");
  console.log("📊 إحصائيات الحزمة:", JSON.stringify(db.getStats()));
} catch (err) {
  console.error("❌ فشل تشغيل العرض التجريبي:", err.message);
  process.exitCode = 1;
}