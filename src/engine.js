import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { IslamicMPHF } from './mphf.js';

export const RIWAYAT = Object.freeze(["hafs", "warsh", "qalun", "duri", "shubah"]);
export const HADITH_BOOKS = Object.freeze(["bukhari", "muslim", "abudawud", "tirmidhi", "nasai"]);
export const TAFSIR_BOOKS = Object.freeze(["jalalayn", "saadi", "ibn_kathir", "baghawi", "qurtubi"]);

// الفهرس الوصفي الشامل للـ 114 سورة بالتجميد العميق (Deep Freeze) لمنع أي تعديل خارجي
export const SURAHS_META = Object.freeze([
  { id: 1, name: "الفاتحة", type: "مكية", ayahs: 7, bismillah: false },
  { id: 2, name: "البقرة", type: "مدنية", ayahs: 286, bismillah: true },
  { id: 3, name: "آل عمران", type: "مدنية", ayahs: 200, bismillah: true },
  { id: 4, name: "النساء", type: "مدنية", ayahs: 176, bismillah: true },
  { id: 5, name: "المائدة", type: "مدنية", ayahs: 120, bismillah: true },
  { id: 6, name: "الأنعام", type: "مكية", ayahs: 165, bismillah: true },
  { id: 7, name: "الأعراف", type: "مكية", ayahs: 206, bismillah: true },
  { id: 8, name: "الأنفال", type: "مدنية", ayahs: 75, bismillah: true },
  { id: 9, name: "التوبة", type: "مدنية", ayahs: 129, bismillah: false },
  { id: 10, name: "يونس", type: "مكية", ayahs: 109, bismillah: true },
  { id: 11, name: "هود", type: "مكية", ayahs: 123, bismillah: true },
  { id: 12, name: "يوسف", type: "مكية", ayahs: 111, bismillah: true },
  { id: 13, name: "الرعد", type: "مدنية", ayahs: 43, bismillah: true },
  { id: 14, name: "إبراهيم", type: "مكية", ayahs: 52, bismillah: true },
  { id: 15, name: "الحجر", type: "مكية", ayahs: 99, bismillah: true },
  { id: 16, name: "النحل", type: "مكية", ayahs: 128, bismillah: true },
  { id: 17, name: "الإسراء", type: "مكية", ayahs: 111, bismillah: true },
  { id: 18, name: "الكهف", type: "مكية", ayahs: 110, bismillah: true },
  { id: 19, name: "مريم", type: "مكية", ayahs: 98, bismillah: true },
  { id: 20, name: "طه", type: "مكية", ayahs: 135, bismillah: true },
  { id: 21, name: "الأنبياء", type: "مكية", ayahs: 112, bismillah: true },
  { id: 22, name: "الحج", type: "مدنية", ayahs: 78, bismillah: true },
  { id: 23, name: "المؤمنون", type: "مكية", ayahs: 118, bismillah: true },
  { id: 24, name: "النور", type: "مدنية", ayahs: 64, bismillah: true },
  { id: 25, name: "الفرقان", type: "مكية", ayahs: 77, bismillah: true },
  { id: 26, name: "الشعراء", type: "مكية", ayahs: 227, bismillah: true },
  { id: 27, name: "النمل", type: "مكية", ayahs: 93, bismillah: true },
  { id: 28, name: "القصص", type: "مكية", ayahs: 88, bismillah: true },
  { id: 29, name: "العنكبوت", type: "مكية", ayahs: 69, bismillah: true },
  { id: 30, name: "الروم", type: "مكية", ayahs: 60, bismillah: true },
  { id: 31, name: "لقمان", type: "مكية", ayahs: 34, bismillah: true },
  { id: 32, name: "السجدة", type: "مكية", ayahs: 30, bismillah: true },
  { id: 33, name: "الأحزاب", type: "مدنية", ayahs: 73, bismillah: true },
  { id: 34, name: "سبأ", type: "مكية", ayahs: 54, bismillah: true },
  { id: 35, name: "فاطر", type: "مكية", ayahs: 45, bismillah: true },
  { id: 36, name: "يس", type: "مكية", ayahs: 83, bismillah: true },
  { id: 37, name: "الصافات", type: "مكية", ayahs: 182, bismillah: true },
  { id: 38, name: "ص", type: "مكية", ayahs: 88, bismillah: true },
  { id: 39, name: "الزمر", type: "مكية", ayahs: 75, bismillah: true },
  { id: 40, name: "غافر", type: "مكية", ayahs: 85, bismillah: true },
  { id: 41, name: "فصلت", type: "مكية", ayahs: 54, bismillah: true },
  { id: 42, name: "الشورى", type: "مكية", ayahs: 53, bismillah: true },
  { id: 43, name: "الزخرف", type: "مكية", ayahs: 89, bismillah: true },
  { id: 44, name: "الدخان", type: "مكية", ayahs: 59, bismillah: true },
  { id: 45, name: "الجاثية", type: "مكية", ayahs: 37, bismillah: true },
  { id: 46, name: "الأحقاف", type: "مكية", ayahs: 35, bismillah: true },
  { id: 47, name: "محمد", type: "مدنية", ayahs: 38, bismillah: true },
  { id: 48, name: "الفتح", type: "مدنية", ayahs: 29, bismillah: true },
  { id: 49, name: "الحجرات", type: "مدنية", ayahs: 18, bismillah: true },
  { id: 50, name: "ق", type: "مكية", ayahs: 45, bismillah: true },
  { id: 51, name: "الذاريات", type: "مكية", ayahs: 60, bismillah: true },
  { id: 52, name: "الطور", type: "مكية", ayahs: 49, bismillah: true },
  { id: 53, name: "النجم", type: "مكية", ayahs: 62, bismillah: true },
  { id: 54, name: "القمر", type: "مكية", ayahs: 55, bismillah: true },
  { id: 55, name: "الرحمن", type: "مدنية", ayahs: 78, bismillah: true },
  { id: 56, name: "الواقعة", type: "مكية", ayahs: 96, bismillah: true },
  { id: 57, name: "الحديد", type: "مدنية", ayahs: 29, bismillah: true },
  { id: 58, name: "المجادلة", type: "مدنية", ayahs: 22, bismillah: true },
  { id: 59, name: "الحشر", type: "مدنية", ayahs: 24, bismillah: true },
  { id: 60, name: "الممتحنة", type: "مدنية", ayahs: 13, bismillah: true },
  { id: 61, name: "الصف", type: "مدنية", ayahs: 14, bismillah: true },
  { id: 62, name: "الجمعة", type: "مدنية", ayahs: 11, bismillah: true },
  { id: 63, name: "المنافقون", type: "مدنية", ayahs: 11, bismillah: true },
  { id: 64, name: "التغابن", type: "مدنية", ayahs: 18, bismillah: true },
  { id: 65, name: "الطلاق", type: "مدنية", ayahs: 12, bismillah: true },
  { id: 66, name: "التحريم", type: "مدنية", ayahs: 12, bismillah: true },
  { id: 67, name: "الملك", type: "مكية", ayahs: 30, bismillah: true },
  { id: 68, name: "القلم", type: "مكية", ayahs: 52, bismillah: true },
  { id: 69, name: "الحاقة", type: "مكية", ayahs: 52, bismillah: true },
  { id: 70, name: "المعارج", type: "مكية", ayahs: 44, bismillah: true },
  { id: 71, name: "نوح", type: "مكية", ayahs: 28, bismillah: true },
  { id: 72, name: "الجن", type: "مكية", ayahs: 28, bismillah: true },
  { id: 73, name: "المزمل", type: "مكية", ayahs: 20, bismillah: true },
  { id: 74, name: "المدثر", type: "مكية", ayahs: 56, bismillah: true },
  { id: 75, name: "القيامة", type: "مكية", ayahs: 40, bismillah: true },
  { id: 76, name: "الإنسان", type: "مدنية", ayahs: 31, bismillah: true },
  { id: 77, name: "المرسلات", type: "مكية", ayahs: 50, bismillah: true },
  { id: 78, name: "النبأ", type: "مكية", ayahs: 40, bismillah: true },
  { id: 79, name: "النازعات", type: "مكية", ayahs: 46, bismillah: true },
  { id: 80, name: "عبس", type: "مكية", ayahs: 42, bismillah: true },
  { id: 81, name: "التكوير", type: "مكية", ayahs: 29, bismillah: true },
  { id: 82, name: "الانفطار", type: "مكية", ayahs: 19, bismillah: true },
  { id: 83, name: "المطففين", type: "مكية", ayahs: 36, bismillah: true },
  { id: 84, name: "الانشقاق", type: "مكية", ayahs: 25, bismillah: true },
  { id: 85, name: "البروج", type: "مكية", ayahs: 22, bismillah: true },
  { id: 86, name: "الطارق", type: "مكية", ayahs: 17, bismillah: true },
  { id: 87, name: "الأعلى", type: "مكية", ayahs: 19, bismillah: true },
  { id: 88, name: "الغاشية", type: "مكية", ayahs: 26, bismillah: true },
  { id: 89, name: "الفجر", type: "مكية", ayahs: 30, bismillah: true },
  { id: 90, name: "البلد", type: "مكية", ayahs: 20, bismillah: true },
  { id: 91, name: "الشمس", type: "مكية", ayahs: 15, bismillah: true },
  { id: 92, name: "الليل", type: "مكية", ayahs: 21, bismillah: true },
  { id: 93, name: "الضحى", type: "مكية", ayahs: 11, bismillah: true },
  { id: 94, name: "الشرح", type: "مكية", ayahs: 8, bismillah: true },
  { id: 95, name: "التين", type: "مكية", ayahs: 8, bismillah: true },
  { id: 96, name: "العلق", type: "مكية", ayahs: 19, bismillah: true },
  { id: 97, name: "القدر", type: "مكية", ayahs: 5, bismillah: true },
  { id: 98, name: "البينة", type: "مدنية", ayahs: 8, bismillah: true },
  { id: 99, name: "الزلزلة", type: "مدنية", ayahs: 8, bismillah: true },
  { id: 100, name: "العاديات", type: "مكية", ayahs: 11, bismillah: true },
  { id: 101, name: "القارعة", type: "مكية", ayahs: 11, bismillah: true },
  { id: 102, name: "التكاثر", type: "مكية", ayahs: 8, bismillah: true },
  { id: 103, name: "العصر", type: "مكية", ayahs: 3, bismillah: true },
  { id: 104, name: "الهمزة", type: "مكية", ayahs: 9, bismillah: true },
  { id: 105, name: "الفيل", type: "مكية", ayahs: 5, bismillah: true },
  { id: 106, name: "قريش", type: "مكية", ayahs: 4, bismillah: true },
  { id: 107, name: "الماعون", type: "مكية", ayahs: 7, bismillah: true },
  { id: 108, name: "الكوثر", type: "مكية", ayahs: 3, bismillah: true },
  { id: 109, name: "الكافرون", type: "مكية", ayahs: 6, bismillah: true },
  { id: 110, name: "النصر", type: "مدنية", ayahs: 3, bismillah: true },
  { id: 111, name: "المسد", type: "مكية", ayahs: 5, bismillah: true },
  { id: 112, name: "الإخلاص", type: "مكية", ayahs: 4, bismillah: true },
  { id: 113, name: "الفلق", type: "مكية", ayahs: 5, bismillah: true },
  { id: 114, name: "الناس", type: "مكية", ayahs: 6, bismillah: true }
].map(s => Object.freeze(s)));

export function normalizeArabic(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

export class IslamEngine {
  constructor(packPath) {
    this.packPath = packPath;
    this.data = null;
    this.quranIndex = new Map();     // Key: uint32 packed coordinate via IslamicMPHF
    this.quranVariants = new Map();  // Key: uint32 packed coordinate
    this.hadithIndex = new Map();    // Key: uint32 packed coordinate
    this.tafsirIndex = new Map();    // Key: uint32 packed coordinate
    this.normalizedQuranCache = [];  // فهرس البحث المسبق لتسريع البحث
  }

  static resolvePackPath(filename) {
    const candidates = [
      path.resolve(filename),
      path.resolve('./dist', filename),
      path.resolve(path.basename(filename)),
      path.resolve('./dist', path.basename(filename))
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error(`تعذر العثور على الحزمة: ${filename}`);
  }

  static load(packPath = 'islam-full.pack') {
    const resolved = IslamEngine.resolvePackPath(packPath);
    const engine = new IslamEngine(resolved);
    const buf = fs.readFileSync(resolved);

    if (buf.length < 40) throw new Error("الملف تالف: الحجم أقل من الترويسة القياسية.");

    const magic = buf.subarray(0, 8).toString('utf-8');
    if (!magic.startsWith("ISLAM")) {
      throw new Error(`ترويسة الحزمة غير صالحة: ${magic}`);
    }

    const expectedHash = buf.subarray(8, 40);
    const compressedBody = buf.subarray(40);
    const decompressed = zlib.brotliDecompressSync(compressedBody);
    const actualHash = crypto.createHash('sha256').update(decompressed).digest();

    if (!expectedHash.equals(actualHash)) {
      throw new Error("فشل التحقق التشفيري الصارم (SHA-256): البيانات غير موثوقة أو مبتورة!");
    }

    engine.data = JSON.parse(decompressed.toString('utf-8'));
    engine._buildIndexes();
    return engine;
  }

  _buildIndexes() {
    // 1. فهرسة القرآن عبر مفاتيح الأعداد الصحيحة 32-bit Integer بالـ IslamicMPHF
    if (this.data.quran && Array.isArray(this.data.quran.base)) {
      for (const v of this.data.quran.base) {
        const key = IslamicMPHF.packQuranKey(v.s, v.a, 0);
        this.quranIndex.set(key, v.t);
        this.normalizedQuranCache.push({ s: v.s, a: v.a, raw: v.t, norm: normalizeArabic(v.t) });
      }
      if (Array.isArray(this.data.quran.variants)) {
        for (const v of this.data.quran.variants) {
          const key = IslamicMPHF.packQuranKey(v.s, v.a, v.r);
          this.quranVariants.set(key, v.t);
        }
      }
    }

    // 2. فهرسة الحديث الشريف بمفاتيح 32-bit Integer
    if (this.data.hadith) {
      for (const [bookId, list] of Object.entries(this.data.hadith)) {
        const bId = Number(bookId);
        if (Array.isArray(list)) {
          for (const h of list) {
            if (h.t && typeof h.n === 'number') {
              const key = IslamicMPHF.packHadithKey(bId, h.n);
              this.hadithIndex.set(key, h.t);
            }
          }
        }
      }
    }

    // 3. فهرسة التفسير بمفاتيح 32-bit Integer
    if (this.data.tafsir) {
      for (const [bookId, list] of Object.entries(this.data.tafsir)) {
        const bId = Number(bookId);
        if (Array.isArray(list)) {
          for (const t of list) {
            if (t.t) {
              const key = IslamicMPHF.packTafsirKey(bId, t.s, t.a);
              this.tafsirIndex.set(key, t.t);
            }
          }
        }
      }
    }
  }

  get quran() {
    return {
      getAyah: (surah, ayah, riwayah = "hafs") => {
        if (typeof surah !== 'number' || surah < 1 || surah > 114) {
          throw new TypeError(`رقم السورة غير صحيح: يجب أن يكون بين 1 و 114.`);
        }
        const meta = SURAHS_META[surah - 1];
        if (typeof ayah !== 'number' || ayah < 1 || ayah > meta.ayahs) {
          throw new RangeError(`رقم الآية (${ayah}) خارج نطاق سورة ${meta.name} (1 - ${meta.ayahs}).`);
        }

        const rId = typeof riwayah === 'number' ? riwayah : RIWAYAT.indexOf(String(riwayah).toLowerCase());
        if (rId < 0 || rId > 4) {
          throw new TypeError(`الرواية غير معروفة: المتاح هو: ${RIWAYAT.join(', ')}.`);
        }

        if (rId > 0) {
          const varKey = IslamicMPHF.packQuranKey(surah, ayah, rId);
          const variant = this.quranVariants.get(varKey);
          if (variant) return variant;
        }

        const baseKey = IslamicMPHF.packQuranKey(surah, ayah, 0);
        return this.quranIndex.get(baseKey) || null;
      },

      getSurahInfo: (surahId) => {
        if (typeof surahId !== 'number' || surahId < 1 || surahId > 114) return null;
        return SURAHS_META[surahId - 1];
      },

      getAllSurahs: () => SURAHS_META,

      search: (query, limit = 50) => {
        const cleanQuery = normalizeArabic(query);
        if (!cleanQuery) return [];
        const results = [];

        for (let i = 0; i < this.normalizedQuranCache.length; i++) {
          const item = this.normalizedQuranCache[i];
          if (item.norm.includes(cleanQuery)) {
            results.push({ surah: item.s, ayah: item.a, text: item.raw });
            if (results.length >= limit) break;
          }
        }
        return results;
      }
    };
  }

  get hadith() {
    return {
      get: (book, number) => {
        const bId = typeof book === 'number' ? book : HADITH_BOOKS.indexOf(String(book).toLowerCase());
        if (bId === -1) throw new TypeError(`كتاب الحديث غير معروف: المتاح هو ${HADITH_BOOKS.join(', ')}.`);
        if (typeof number !== 'number' || number < 1) throw new TypeError("رقم الحديث يجب أن يكون رقماً موجباً.");

        const key = IslamicMPHF.packHadithKey(bId, number);
        return this.hadithIndex.get(key) || null;
      },

      count: (book) => {
        const bId = typeof book === 'number' ? book : HADITH_BOOKS.indexOf(String(book).toLowerCase());
        if (bId === -1 || !this.data.hadith?.[bId]) return 0;
        return this.data.hadith[bId].length;
      }
    };
  }

  get tafsir() {
    return {
      get: (book, surah, ayah) => {
        const bId = typeof book === 'number' ? book : TAFSIR_BOOKS.indexOf(String(book).toLowerCase());
        if (bId === -1) throw new TypeError(`كتاب التفسير غير معروف: المتاح هو ${TAFSIR_BOOKS.join(', ')}.`);

        const key = IslamicMPHF.packTafsirKey(bId, surah, ayah);
        return this.tafsirIndex.get(key) || null;
      }
    };
  }
}