<div align="center">

# 🕌 IslamPack
### High-Performance Classical Islamic Corpus Engine & Storage Architecture
**The Holy Quran (Hafs Complete & Qira'at Delta Matrix) • 5 Hadith Books (30,189 Hadiths) • 5 Tafsirs (31,121 Entries)**

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC_BY--NC_4.0-d4af37.svg)](LICENSE.md)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0_Native_Node.js-10b981.svg)]()
[![Bundle Size](https://img.shields.io/badge/Bundle_Size-14.82_MB-3b82f6.svg)]()
[![Query Latency](https://img.shields.io/badge/Lookup_Latency-0.34_μs-8b5cf6.svg)]()
[![IslamPack Quality & CI](https://github.com/houck-96/islampack/actions/workflows/ci.yml/badge.svg)](https://github.com/houck-96/islampack/actions/workflows/ci.yml)

[📖 باللغة العربية](#-باللغة-العربية) • [🌐 English Documentation](#-english-documentation) • [📊 Benchmarks](BENCHMARKS.md) • [📜 Sources & Provenance](SOURCES.md) • [⚖️ License](LICENSE.md)

</div>

---

## 📖 باللغة العربية

### عن المشروع
**IslamPack** هي مكتبة ومحرك برمجي نقي خفيف للغاية تم بناؤه من الصفر بدون أي مكتبة خارجية (Zero Dependencies) بالاعتماد الحصري على مكتبات Node.js المدمجة. 

يقدم المشروع حلاً معمارياً متقدماً لتخزين واسترجاع نصوص الوحيين الشريفين وتفاسيرهما العظمى، حيث يقلص حجماً خاماً يتجاوز **236.5 ميغابايت** إلى حزمة ثنائية مستقلة حجمها **14.82 ميغابايت فقط** (نسبة ضغط 93.7%)، مع توفير سرعة استرجاع مجهرية بالنانوثانية (**0.34 ميكروثانية**) للوصول المباشر إلى الآيات والأحاديث والتفاسير عبر الذاكرة.

---

### محتويات الحزمة الشاملة (`islam-full.pack`)

1. **المصحف الشريف بالقراءات والرسم العثماني التام:**
   * **النص الأساسي:** رواية حفص عن عاصم كاملة (6,236 آية) بالتشكيل وعلامات الوقف والسجدات المعتمدة بمصحف المدينة.
   * **معمارية دلتا للقراءات (Delta Architecture):** طبقة فوارق لفظية لروايات (ورش، قالون، الدوري، شعبة) تمنع التكرار وتخزن المتغيرات فقط، وهي قابلة للتوسعة لتشمل سائر الأصول والفرش.
2. **أمهات كتب الحديث الخمسة كاملة (30,189 حديثاً نبوياً مسنداً ومرقماً):**
   * صحيح البخاري • صحيح مسلم • سنن أبي داود • جامع الترمذي • سنن النسائي.
3. **أعظم 5 كتب تفسير في تاريخ الإسلام (31,121 تفسيراً آية بآية):**
   * تفسير الجلالين • تفسير السعدي • تفسير ابن كثير • تفسير البغوي • تفسير القرطبي.

---

### الإصدارات الثلاثة المستقلة المتاحة

| الحزمة | المحتوى | الحجم المضغوط | الحجم الخام | نسبة التقليص |
| :--- | :--- | :--- | :--- | :--- |
| **`dist/islam-qh.pack`** | القرآن الكريم + كتب الحديث الخمسة كاملة | **2.86 MB** | 32.5 MB | **91.2%** |
| **`dist/islam-qt.pack`** | القرآن الكريم + كتب التفسير الخمسة كاملة | **12.14 MB** | 205.4 MB | **94.1%** |
| **`dist/islam-full.pack`** | **الحزمة الذهبية الشاملة (كل شيء كلياً)** | **14.82 MB** | 236.5 MB | **93.7%** |

---

### تجربة سريعة (Quick Start)

```javascript
import { IslamEngine } from './index.js';

// تحميل الحزمة الشاملة والتحقق من سلامتها التشفيرية
const db = IslamEngine.load('islam-full.pack');

// 1. استرجاع آية برواية ورش مقابل حفص
console.log(db.quran.getAyah(1, 4, "hafs"));   // مَٰلِكِ يَوۡمِ ٱلدِّينِ
console.log(db.quran.getAyah(1, 3, "warsh"));  // مَلِكِ يَوْمِ الدِّينِ

// 2. استرجاع بيانات سورة (مكية/مدنية، عدد الآيات)
console.log(db.quran.getSurahInfo(2));         // { name: "البقرة", type: "مدنية", ayahs: 286 }

// 3. استرجاع أول حديث في صحيح البخاري
console.log(db.hadith.get("bukhari", 1));

// 4. استرجاع تفسير آية الكرسي من ابن كثير
console.log(db.tafsir.get("ibn_kathir", 2, 255));

// 5. محرك البحث اللفظي السريع في كامل المصحف
const results = db.quran.search("الرحمن");
console.log(`تم العثور على ${results.length} آية.`);
تشغيل الموقع والواجهة الرسومية المحلية
يحتوي المستودع على واجهة مستخدم فاخرة ومستقلة (app.html) مع خادم محلي آمن غير متزامن (serve.js):
code
Bash
# تشغيل الخادم وفتح الواجهة في المتصفح
npm start
ثم افتح: http://localhost:3000، واسحب أي ملف حزمة (.pack) لتصفح القرآن بالقراءات، وتذهيب علامات الوقف والسجدات، وتصفح الأحاديث والتفاسير ديناميكياً.
🌐 English Documentation
Overview
IslamPack is an ultra-lightweight, zero-dependency engine engineered for offline embedding of the classical Islamic textual corpus into applications, mobile systems, local edge devices, and research environments.
Core Architectural Features
Storage Footprint: Squeezes 236.53 MB of verified Arabic text into a 14.82 MB standalone binary package using Brotli-11 sliding entropy dictionaries (93.7% space reduction).
Execution & Memory: ~15 MB on-disk binary footprint; uncompresses into an active in-memory working heap (~280 MB RAM) to enable ultra-fast indexed lookups (0.34 μs per record) without runtime disk I/O.
Bijective Integer Indexing (MPHF): Replaces expensive string concatenations with packed 32-bit integer keys, reducing memory overhead and accelerating lookup speed.
Cryptographic Verification: Every pack includes a SHA-256 checksum in its binary header, validated on load to prevent textual bit-rot or tampering.
Zero External Dependencies: Built strictly using native Node.js core modules (node:fs, node:zlib, node:crypto, node:http).
Quality & Continuous Integration (CI)
All binary packs, API contracts, boundary bounds, and cryptographic hashes are automatically tested and verified on GitHub Actions runners on every commit:
test/verify.js: Validates headers, SHA-256 hashes, and item counts (6,236 verses, 30,189 hadiths, 31,121 tafsirs).
test/api.test.js: Validates runtime bounds, immutability, normalization, and error handling.
benchmark.js: Reproducible live benchmarking measuring real memory heap and lookup latencies.
code
Bash
# Run integrity & behavioral tests
npm test

# Run live hardware benchmark
npm run benchmark
📜 Sources, Provenance & Methodology
Full documentation of datasets, canonical baseline sources, textual normalization methodology, and provenance records can be reviewed in SOURCES.md.
⚖️ License
This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).
Free & Open: For students, researchers, educational, and non-profit personal projects.
Commercial Use Prohibited: Any monetization, selling, commercial licensing, or proprietary closed-source redistribution is strictly forbidden.
🤲 وقفٌ لله تعالى ودعاءٌ جامع (Dedication & Waqf)
«اللَّهُمَّ إِنِّي أَبْرَأُ إِلَيْكَ مِنْ حَوْلِي وَقُوَّتِي إِلَى حَوْلِكَ وَقُوَّتِكَ، اللَّهُمَّ اجْعَلْ هَذَا العَمَلَ خَالِصاً لِوَجْهِكَ الكَرِيمِ، لَا رِيَاءَ فِيهِ وَلَا سُمْعَةَ.»
نُهْدِي هَذَا الجُهْدَ وَأَجْرَهُ وَثَوَابَهُ الدَّائِمَ المُتَّصِلَ بِإِذْنِ اللهِ تَعَالَى:
إِلى وَالِدَيَّ الكَرِيمَيْنِ، جَزَاهُمَا اللهُ عَنِّي خَيْرَ الجَزَاءِ وَرَفَعَ دَرَجَاتِهِمَا فِي عِلِّيِّينَ.
وَإِلى أَهْلِي وَذُرِّيَّتِي وَعَائِلَتِي جَمِيعاً، حَفِظَهُمُ اللهُ وَبَارَكَ فِيهِمْ.
وَإِلى كُلِّ مَنْ أَحَبَّنِي وَأَحْبَبْتُهُ فِي اللهِ بِصِدْقٍ مِنْ سُوَيْدَاءِ قَلْبِهِ، سِرّاً وَعَلَانِيَةً، وَلَيْسَ نِفَاقاً وَلَا ظَاهِراً.
اللَّهُمَّ احْفَظْنَا وَمَنْ نُحِبُّ مِنْ أَعْيُنِ الحَاسِدِينَ، وَغِلِّ الحَاقِدِينَ، وَمَكْرِ المُنَافِقِينَ؛
﴿رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ وَلَا تَجْعَلْ فِي قُلُوبِنَا غِلًّا لِّلَّذِينَ آمَنُوا رَبَّنَا إِنَّكَ رَءُوفٌ رَّحِيمٌ﴾.
﴿رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ وَأَدْخِلْنِي بِرَحْمَتِكَ فِي عِبَادِكَ الصَّالِحِينَ﴾.
اللَّهُمَّ اجْعَلْ هَذِهِ المَكْتَبَةَ بَرَكَةً فِي حَيَاتِنَا وَنُوراً فِي قُبُورِنَا، وَثِقَلاً فِي مَوَازِينِنَا يَوْمَ نَلْقَاكَ، وَاكْتُبْ أَجْرَ كُلِّ حَرْفٍ يُتْلَى وَيُبْحَثُ عَنْهُ فِيهَا إِلى يَوْمِ القِيَامَةِ.
