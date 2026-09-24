<div align="center">

# 🕌 IslamPack
### High-Performance, Zero-Dependency Islamic Canonical Engine
**The Holy Quran (5 Qira'at) • 5 Hadith Compendiums (30,189 Hadiths) • 5 Tafsirs (31,121 Entries)**

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC_BY--NC_4.0-gold.svg)](LICENSE.md)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0_Native_Node.js-emerald.svg)]()
[![Bundle Size](https://img.shields.io/badge/Full_Corpus-14.82_MB-blue.svg)]()
[![Query Latency](https://img.shields.io/badge/Lookup_Time-3.4_μs-brightgreen.svg)]()
[![IslamPack Quality & CI](https://github.com/houck-96/islampack/actions/workflows/ci.yml/badge.svg)](https://github.com/اسم_حسابك/islampack/actions/workflows/ci.yml)
[العربية](#-باللغة-العربية) • [English](#-english-documentation) • [Benchmarks](BENCHMARKS.md) • [License](LICENSE.md)

</div>

---

## 📖 باللغة العربية

### عن المشروع
**IslamPack** هي مكتبة ومحرك برمجي نقي خفيف للغاية تم بناؤه من الصفر بدون أي مكتبة خارجية (Zero Dependencies). يحقق المشروع سابقة تقنية بضغط تراث الوحيين الشريفين وتفاسيرهما العظمى من **236.5 ميغابايت** إلى **14.8 ميغابايت فقط** (تقليص 93.7%)، مع استرجاع لحظي لأي نص في زمن **أقل من 0.004 ميلي ثانية**!

### محتويات الحزمة الشاملة
1. **المصحف الشريف بالقراءات الخمس كاملاً بالتشكيل والرسم العثماني:**
   - حفص عن عاصم • ورش عن نافع • قالون عن نافع • الدوري عن أبي عمرو • شعبة عن عاصم.
2. **أمهات كتب الحديث الخمسة كاملة (30,189 حديثاً نبوياً مسنداً ومرقماً):**
   - صحيح البخاري • صحيح مسلم • سنن أبي داود • جامع الترمذي • سنن النسائي.
3. **أعظم 5 كتب تفسير في تاريخ الإسلام (31,121 تفسيراً آية بآية):**
   - تفسير ابن كثير • تفسير السعدي • تفسير البغوي • تفسير القرطبي • تفسير الجلالين.

### الإصدارات الثلاثة المستقلة المتاحة
- **`dist/islam-qh.pack`** (القرآن + الحديث): **2.86 MB** فقط!
- **`dist/islam-qt.pack`** (القرآن + التفسير): **12.14 MB** فقط!
- **`dist/islam-full.pack`** (الشامل الذهبي لكل شيء): **14.82 MB** فقط!

### تجربة سريعة (Quick Start)
```javascript
import { IslamEngine } from './src/engine.js';

// تحميل الحزمة الشاملة في ثانية واحدة
const db = IslamEngine.load('./dist/islam-full.pack');

// 1. استرجاع آية بقراءة ورش مقابل حفص
console.log(db.quran.getAyah(1, 4, "hafs"));   // مَٰلِكِ يَوۡمِ ٱلدِّينِ
console.log(db.quran.getAyah(1, 3, "warsh"));  // مَلِكِ يَوْمِ الدِّينِ

// 2. استرجاع أول حديث في صحيح البخاري
console.log(db.hadith.get("bukhari", 1));

// 3. استرجاع تفسير آية الكرسي من ابن كثير
console.log(db.tafsir.get("ibn_kathir", 2, 255));

// 4. محرك البحث اللحظي في كامل القرآن
const results = db.quran.search("الكوثر");
