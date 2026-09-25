import assert from 'node:assert/strict';
import { IslamEngine, normalizeArabic, SURAHS_META } from '../src/engine.js';

console.log("==========================================================");
console.log("   🧪 اختبارات التحقق السلوكي للواجهات البرمجية (API Tests) ");
console.log("==========================================================\n");

const db = IslamEngine.load('islam-full.pack');

// 1. اختبار استرجاع آية صالحة وتجريدها عثمانياً
const fatiha1 = db.quran.getAyah(1, 1, "hafs");
assert.ok(fatiha1 && normalizeArabic(fatiha1).includes("بسم الله"), "فشل استرجاع الآية الأولى من الفاتحة.");
console.log("✓ نجح اختبار استرجاع آية صحيحة (الفاتحة: 1) مع المطابقة العثمانية.");

// 2. اختبار آية الكرسي
const kursi = db.quran.getAyah(2, 255, "hafs");
assert.ok(kursi && normalizeArabic(kursi).includes("الله لا اله الا هو الحي القيوم"), "فشل استرجاع آية الكرسي.");
console.log("✓ نجح اختبار استرجاع آية الكرسي بالكامل.");

// 3. اختبار الرمي بالخطأ عند طلب سورة خارج النطاق (115)
assert.throws(() => {
  db.quran.getAyah(115, 1);
}, /رقم السورة غير صحيح/, "لم يطلق المحرك خطأ عند طلب سورة 115.");
console.log("✓ نجح اختبار التحقق من حدود السور (رفض سورة 115).");

// 4. اختبار الرمي بالخطأ عند طلب آية خارج نطاق السورة (الفاتحة: 8)
assert.throws(() => {
  db.quran.getAyah(1, 8);
}, /خارج نطاق سورة/, "لم يطلق المحرك خطأ عند طلب آية غير موجودة في الفاتحة.");
console.log("✓ نجح اختبار التحقق من حدود الآيات (رفض الفاتحة آية 8).");

// 5. اختبار استرجاع الحديث الشريف (صحيح البخاري: 1)
const bukhari1 = db.hadith.get("bukhari", 1);
assert.ok(bukhari1 && normalizeArabic(bukhari1).includes("الاعمال بالنيات"), "فشل استرجاع أول حديث في البخاري.");
console.log("✓ نجح اختبار استرجاع الحديث الشريف (إنما الأعمال بالنيات).");

// 6. اختبار استرجاع التفسير (السعدي: الفاتحة 1)
const saadi1 = db.tafsir.get("saadi", 1, 1);
assert.ok(saadi1 && saadi1.length > 10, "فشل استرجاع تفسير السعدي للفاتحة.");
console.log("✓ نجح اختبار استرجاع كتب التفسير.");

// 7. اختبار عدم قابلية التعديل الخارجي لبيانات السور
const surahs = db.quran.getAllSurahs();
assert.throws(() => {
  surahs[0].name = "تم التعديل";
}, /Cannot assign to read only property/, "فشل حماية البيانات الوصفية من التعديل العرضي.");
console.log("✓ نجح اختبار تجميد البيانات الوصفية (Immutability).");

// 8. اختبار البحث اللفظي السريع
const searchRes = db.quran.search("الكوثر");
assert.ok(searchRes.length > 0, "فشل العثور على كلمة الكوثر.");
assert.equal(searchRes[0].surah, 108, "سورة الكوثر يجب أن تكون رقم 108.");
console.log("✓ نجح اختبار البحث المعجمي السريع.");

// 9. اختبار الرواية غير المعروفة تُرمى بخطأ واضح
assert.throws(() => {
  db.quran.getAyah(1, 1, "unknown-riwayah");
}, /الرواية غير معروفة/, "لم يطلق المحرك خطأ عند طلب رواية مجهولة.");
console.log("✓ نجح اختبار رفض الرواية المجهولة.");

// 10. اختبار استرجاع السورة كاملة (الفيل 5 آيات)
const fil = db.quran.getSurah(105, "hafs");
assert.equal(fil.length, 5, "سورة الفيل يجب أن تحوي 5 آيات.");
assert.ok(fil.every(v => v.text && v.text.length > 0), "آيات السورة يجب أن تكون نصوصاً غير فارغة.");
console.log("✓ نجح اختبار استرجاع السورة كاملة.");

// 11. اختبار قبول رقم الحديث كسلسلة نصية + رفض الرقم السالب
assert.ok(db.hadith.get("bukhari", "1"), "يجب قبول رقم الحديث النصي '1'.");
assert.throws(() => db.hadith.get("bukhari", -3), /رقم الحديث/, "لم يرفض رقم الحديث السالب.");
console.log("✓ نجح اختبار مرونة رقم الحديث وحدوده.");

// 12. اختبار التحقق من حدود التفسير (سورة 115 مرفوضة)
assert.throws(() => {
  db.tafsir.get("saadi", 115, 1);
}, /رقم السورة غير صحيح/, "لم يرفض التفسير سورة خارج النطاق.");
console.log("✓ نجح اختبار حدود التفسير.");

// 13. اختبار البحث الفارغ وحدّ النتائج
assert.deepEqual(db.quran.search("   ", 10), [], "البحث الفارغ يجب أن يعيد [].");
const limited = db.quran.search("الله", 3);
assert.ok(limited.length <= 3, "يجب احترام حدّ النتائج.");
console.log("✓ نجح اختبار حدود البحث.");

// 14. اختبار الإحصائيات الشاملة
const stats = db.getStats();
assert.equal(stats.quranVerses, 6236, "إحصاء الآيات يجب أن يكون 6236.");
assert.equal(stats.hadithTotal, 30189, "إحصاء الأحاديث يجب أن يكون 30189.");
assert.ok(stats.tafsirTotal >= 30000, "إحصاء التفاسير يجب أن يكون ≥ 30000.");
console.log("✓ نجح اختبار الإحصائيات الشاملة.");

// 15. اختبار حزم المفاتيح (MPHF): رفض المدخلات المموهة سابقاً بالتكميم الصامت
import { IslamicMPHF } from '../src/mphf.js';
assert.throws(() => IslamicMPHF.packQuranKey(300, 1, 0), RangeError, "يجب رفض سورة 300.");
assert.throws(() => IslamicMPHF.packHadithKey(0, -1), RangeError, "يجب رفض رقم حديث سالب.");
const roundTrip = IslamicMPHF.unpackQuranKey(IslamicMPHF.packQuranKey(2, 255, 0));
assert.deepEqual(roundTrip, { surah: 2, ayah: 255, riwayahId: 0 }, "فكّ التعبئة يجب أن يعيد الإحداثيات.");
console.log("✓ نجح اختبار صرامة مفاتيح MPHF.");

console.log("\n==========================================================");
console.log("🎉 جميع اختبارات السلوك البرمجي اجتازت بنجاح 100%!");
console.log("==========================================================");