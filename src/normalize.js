/**
 * نظام التطبيع الخارق الموحد (Super Normalization) — مصدر الحقيقة الوحيد.
 *
 * القاعدة الذهبية للدقة الكاملة: نفس الدالة تُستخدم عند الفهرسة (build-time)
 * وعند الاستعلام (query-time). أي اختلاف بين الطرفين = نتائج ناقصة، لذلك
 * يُمنع أي تطبيع ad-hoc خارج هذا الملف.
 *
 * الخصائص:
 *  - إزالة كل التشكيل والحركات (U+064B–U+065F: فتح/ضم/كسر/شدة/سكون/مدّة/همزات فوقية)
 *    والحركات القرآنية (U+0610–061A, U+0670, U+06D6–06ED) والتطويل
 *  - توحيد الألف (إأآٱ → ا)، الياء المقصورة (ى → ي)، التاء المربوطة (ة → ه)
 *  - تفكيك الحروف المتصلة (لام-ألف، ﷲ → الله) عبر NFKD
 *  - توحيد الأرقام العربية/الفارسية → ASCII، إزالة المحارف صفرية العرض
 *  - إزالة الترقيم والزخارف، دمج المسافات
 *  - idempotent: N(N(x)) === N(x) — مضمون بالاختبارات
 */
const TASHKEEL_FULL = /[ؐ-ًؚ-ٰٟـۖ-ۭ]/g; // U+0610–U+061A, U+064B–U+065F, U+0670, U+0640, U+06D6–U+06ED
const ALEF_FORMS = /[إأآٱ]/g;
const ALEF_MAQSURA = /ى/g;
const TEH_MARBUTA = /ة/g;
const ARABIC_DIGITS = /[٠-٩]/g;
const PERSIAN_DIGITS = /[۰-۹]/g;
const ZERO_WIDTH = /[‌‍‎‏\u200B-\u200F\uFEFF]/g;
const PUNCT = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~«»“”‘’'…—–:؛؟٫٬؍؜؞؟!,.،؛×÷±§©®™°•◦▪▫★☆✓✗←→↑↓↔٭﴾﴿ﴽﴼ]/g;
const MULTI_SPACE = /\s+/g;

export function normalizeArabicSuper(text) {
  if (typeof text !== 'string') return '';
  let s = text;
  s = s.replace(ZERO_WIDTH, '');
  s = s.normalize('NFKD');                    // تفكيك: أ→ا+همزة، ﷲ→الله، لام-ألف المتصلة…
  s = s.replace(TASHKEEL_FULL, '');           // إزالة كل التشكيل والمدّات والهمزات العلوية
  s = s.replace(ALEF_FORMS, 'ا');
  s = s.replace(ALEF_MAQSURA, 'ي');
  s = s.replace(TEH_MARBUTA, 'ه');
  s = s.replace(ARABIC_DIGITS, (c) => String(c.charCodeAt(0) - 0x0660));
  s = s.replace(PERSIAN_DIGITS, (c) => String(c.charCodeAt(0) - 0x06F0));
  s = s.normalize('NFC');
  s = s.replace(PUNCT, ' ');
  s = s.replace(MULTI_SPACE, ' ').trim();
  return s;
}

// الاسم القديم — يُبقي التوافق مع engine.js والاختبارات الحالية
export const normalizeArabic = normalizeArabicSuper;

/** تقسيم النص المطبّع إلى رموز كلمية (للفهارس الكلمية المستقبلية والتشخيص) */
export function tokenize(text) {
  const n = normalizeArabicSuper(text);
  if (!n) return [];
  return n.split(' ').filter(Boolean);
}

/** مفتاح قابل للمقارنة لمدخل تفسيري (s,a) — يحافظ على الترتيب */
export function tafsirSortKey(s, a) {
  return s * 1000 + a;
}
