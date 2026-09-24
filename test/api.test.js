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

console.log("\n==========================================================");
console.log("🎉 جميع اختبارات السلوك البرمجي اجتازت بنجاح 100%!");
console.log("==========================================================");