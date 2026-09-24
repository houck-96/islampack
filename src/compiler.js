import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

console.log("==========================================================");
console.log("   🚀 مترجم ومجمع الحزم الرسمي (IslamPack Compiler)       ");
console.log("==========================================================\n");

// التأكد من وجود مجلد dist
const distDir = path.resolve('./dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// 1. تحميل القرآن الكريم
const quranFile = path.resolve('./data/quran_full_uthmani.json');
if (!fs.existsSync(quranFile)) {
  console.error("❌ ملف المصحف data/quran_full_uthmani.json غير موجود!");
  process.exit(1);
}
const quranBase = JSON.parse(fs.readFileSync(quranFile, 'utf-8'));

const QIRAAT_VARIANTS = [
  { s: 1, a: 1, r: 1, t: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
  { s: 1, a: 3, r: 1, t: "مَلِكِ يَوْمِ الدِّينِ" },
  { s: 1, a: 6, r: 1, t: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ" },
  { s: 1, a: 7, r: 1, t: "غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" },
  { s: 1, a: 3, r: 2, t: "مَلِكِ يَوْمِ الدِّينِ" },
  { s: 1, a: 6, r: 2, t: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ" },
  { s: 1, a: 7, r: 2, t: "غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" },
  { s: 1, a: 4, r: 3, t: "مَلِكِ يَوْمِ الدِّينِ" },
  { s: 2, a: 9, r: 1, t: "يُخَادِعُونَ اللَّهَ وَالَّذِينَ آمَنُوا وَمَا يُخَادِعُونَ إِلَّا أَنفُسَهُمْ وَمَا يَشْعُرُونَ" },
  { s: 112, a: 4, r: 1, t: "وَلَمْ يَكُن لَّهُ كُفُؤًا أَحَدٌ" },
  { s: 112, a: 4, r: 4, t: "وَلَمْ يَكُن لَّهُ كُفْؤًا أَحَدٌ" }
];
const quranBundle = { base: quranBase, variants: QIRAAT_VARIANTS };

// 2. تحميل كتب الحديث
const hadithFiles = ["bukhari.json", "muslim.json", "abudawud.json", "tirmidhi.json", "nasai.json"];
const hadithBundle = {};
hadithFiles.forEach((file, idx) => {
  const p = path.resolve(`./data/hadith/${file}`);
  if (fs.existsSync(p)) hadithBundle[idx] = JSON.parse(fs.readFileSync(p, 'utf-8'));
});

// 3. تحميل كتب التفسير
const tafsirFiles = ["jalalayn.json", "saadi.json", "ibn_kathir.json", "baghawi.json", "qurtubi.json"];
const tafsirBundle = {};
tafsirFiles.forEach((file, idx) => {
  const p = path.resolve(`./data/tafsir/${file}`);
  if (fs.existsSync(p)) tafsirBundle[idx] = JSON.parse(fs.readFileSync(p, 'utf-8'));
});

function createPack(filename, payload, magicHeader) {
  const rawStr = JSON.stringify(payload);
  const rawBuf = Buffer.from(rawStr, 'utf-8');
  const compressed = zlib.brotliCompressSync(rawBuf, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
  });
  const hash = crypto.createHash('sha256').update(rawBuf).digest();
  const magic = Buffer.from(magicHeader, 'utf-8');
  const finalFile = Buffer.concat([magic, hash, compressed]);

  // حفظ نسخة في dist ونسخة في الجذر لتسهيل المسارات
  fs.writeFileSync(path.join(distDir, filename), finalFile);
  fs.writeFileSync(path.resolve(filename), finalFile);
  console.log(`✓ تم إنتاج [${filename}] بنجاح (${(finalFile.length / (1024 * 1024)).toFixed(2)} MB).`);
}

createPack('islam-qh.pack', { quran: quranBundle, hadith: hadithBundle }, 'ISLAM_QH');
createPack('islam-qt.pack', { quran: quranBundle, tafsir: tafsirBundle }, 'ISLAM_QT');
createPack('islam-full.pack', { quran: quranBundle, hadith: hadithBundle, tafsir: tafsirBundle }, 'ISLAMALL');

console.log("\n🎉 تم بناء جميع الحزم بنجاح 100%!");