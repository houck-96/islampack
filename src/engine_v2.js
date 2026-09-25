/**
 * محرك الجيل الثاني (v2) — فتح كسول + تجزئة تامة + بحث شامل.
 *
 * الفارق الجوهري عن v1: open() لا يفك ضغط أي نص. يقرأ الفهرس (~30KB) فقط
 * ويُبقي بقية الملف على القرص عبر fd. كل استعلام = قراءة شريحة واحدة
 * + فك ضغط كتلة واحدة + تحقق SHA-256 للكتلة. الذاكرة المقيمة: الفهرس
 * + ذاكرة كتل مؤقتة (32 كتلة كحد أقصى) — لا شيء غير ذلك.
 *
 * المفاتيح المعبأة (packQuranKey/packHadithKey/packTafsirKey) تجزئة تامة
 * بالبناء (injective على النطاقات المتحقق منها): لا تصادم ممكن رياضياً،
 * والوصول O(1) عبر جدول الكتل + بحث ثنائي على حدود المقاطع المرتبة.
 *
 * الدقة: نفس normalizeArabicSuper للفهرسة والاستعلام (src/normalize.js).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { SURAHS_META, RIWAYAT, HADITH_BOOKS, TAFSIR_BOOKS, IslamEngine } from './engine.js';
import { normalizeArabicSuper, tafsirSortKey } from './normalize.js';
import { V2_MAGIC } from './packv2.js';

const BLOCK_CACHE_CAP = 32;

function resolvePackPath(filename) {
  if (path.isAbsolute(filename) && fs.existsSync(filename)) return filename;
  for (const p of [path.resolve(filename), path.resolve('./dist', filename),
    path.resolve(path.basename(filename)), path.resolve('./dist', path.basename(filename))]) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`تعذر العثور على الحزمة: ${filename}`);
}

function binaryChunk(chunks, key, firstKey = 'first', lastKey = 'last') {
  let lo = 0, hi = chunks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (key < chunks[mid][firstKey]) hi = mid - 1;
    else if (key > chunks[mid][lastKey]) lo = mid + 1;
    else return chunks[mid];
  }
  return null;
}

export class IslamEngineV2 {
  constructor() {
    this.fd = null;
    this.filePath = null;
    this.fileSize = 0;
    this.index = null;
    this.blockById = new Map();
    this.cache = new Map();       // blkId → parsed (FIFO، حد أقصى BLOCK_CACHE_CAP)
    this.qNorm = null;            // {order:[[s,a]...], n:[...]} — تُحمّل عند الفتح (صغيرة)
    this.hNorm = new Map();       // bookId → {order, n} — كسولة لكل كتاب
    this.tNormCache = new Map();  // blkId → [norm...] — كسولة مع حد أقصى
  }

  static open(packPath = 'islam-v2.pack') {
    const resolved = resolvePackPath(packPath);
    const eng = new IslamEngineV2();
    eng.filePath = resolved;
    eng.fd = fs.openSync(resolved, 'r');
    try {
      const st = fs.fstatSync(eng.fd);
      eng.fileSize = st.size;
      if (st.size < 44) throw new Error('الملف تالف: أصغر من الترويسة.');
      const magic = Buffer.alloc(8);
      fs.readSync(eng.fd, magic, 0, 8, 0);
      if (magic.toString('utf-8') !== V2_MAGIC) {
        throw new Error(`ليست حزمة v2 (الترويسة: ${magic.toString('utf-8')}). استخدم IslamEngine.load للحزم الكلاسيكية.`);
      }
      const expected = Buffer.alloc(32);
      fs.readSync(eng.fd, expected, 0, 32, 8);
      const lenBuf = Buffer.alloc(4);
      fs.readSync(eng.fd, lenBuf, 0, 4, 40);
      const indexLen = lenBuf.readUInt32LE(0);
      if (44 + indexLen > st.size) throw new Error('طول الفهرس يتجاوز حجم الملف.');
      const indexComp = Buffer.alloc(indexLen);
      fs.readSync(eng.fd, indexComp, 0, indexLen, 44);
      // التحقق الشامل قبل أي تحليل: SHA-256 لكل ما بعد البايت 40
      const h = crypto.createHash('sha256');
      h.update(lenBuf); h.update(indexComp);
      const restStart = 44 + indexLen;
      const CH = 4 * 1024 * 1024;
      const tmp = Buffer.alloc(Math.min(CH, st.size - restStart));
      let pos = restStart, remaining = st.size - restStart;
      while (remaining > 0) {
        const n = fs.readSync(eng.fd, tmp, 0, Math.min(tmp.length, remaining), pos);
        if (n <= 0) break;
        h.update(tmp.subarray(0, n)); pos += n; remaining -= n;
      }
      if (!h.digest().equals(expected)) throw new Error('فشل التحقق الشامل SHA-256: الملف مبتور أو معبث به.');
      const index = JSON.parse(zlib.brotliDecompressSync(indexComp).toString('utf-8'));
      if (index.v !== 2) throw new Error(`إصدار فهرس غير مدعوم: ${index.v}`);
      eng.index = index;
      eng.indexLen = indexLen;
      eng.blocksStart = 44 + indexLen;
      for (const b of index.blocks) eng.blockById.set(b.id, b);
      // كتلة تطبيع القرآن صغيرة (~150KB) — تُحمّل فوراً لخدمة البحث
      eng.qNorm = eng._readBlock(index.nrm.q);
      return eng;
    } catch (e) {
      try { fs.closeSync(eng.fd); } catch { /* */ }
      eng.fd = null;
      throw e;
    }
  }

  close() {
    if (this.fd !== null) { try { fs.closeSync(this.fd); } catch { /* */ } this.fd = null; }
    this.cache.clear(); this.hNorm.clear(); this.tNormCache.clear(); this.qNorm = null;
  }

  /** الإزاحة المطلقة لكتلة (النسبية المخزنة + بداية منطقة الكتل) */
  blockAbs(blkId) {
    const meta = this.blockById.get(blkId);
    if (!meta) throw new Error(`كتلة مجهولة: ${blkId}`);
    return this.blocksStart + meta.off;
  }

  _readBlock(blkId) {
    const meta = this.blockById.get(blkId);
    if (!meta) throw new Error(`كتلة مجهولة: ${blkId}`);
    const hit = this.cache.get(blkId);
    if (hit) return hit;
    const abs = this.blocksStart + meta.off;
    const comp = Buffer.alloc(meta.len);
    const n = fs.readSync(this.fd, comp, 0, meta.len, abs);
    if (n !== meta.len) throw new Error(`قراءة ناقصة للكتلة ${blkId}.`);
    const actual = crypto.createHash('sha256').update(comp).digest('hex');
    if (actual !== meta.sha) throw new Error(`بصمة الكتلة ${blkId} لا تتطابق — بيانات فاسدة.`);
    const obj = JSON.parse(zlib.brotliDecompressSync(comp).toString('utf-8'));
    if (this.cache.size >= BLOCK_CACHE_CAP) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(blkId, obj);
    return obj;
  }

  _resolveRiwayah(riwayah) {
    let rId;
    if (typeof riwayah === 'number') rId = Number.isInteger(riwayah) ? riwayah : -1;
    else rId = RIWAYAT.indexOf(String(riwayah).toLowerCase());
    if (rId < 0 || rId > 4) throw new TypeError(`الرواية غير معروفة: المتاح هو: ${RIWAYAT.join(', ')}.`);
    return rId;
  }

  _checkSurahAyah(surah, ayah) {
    if (typeof surah !== 'number' || !Number.isInteger(surah) || surah < 1 || surah > 114) {
      throw new TypeError('رقم السورة غير صحيح: يجب أن يكون بين 1 و 114.');
    }
    const meta = SURAHS_META[surah - 1];
    if (typeof ayah !== 'number' || !Number.isInteger(ayah) || ayah < 1 || ayah > meta.ayahs) {
      throw new RangeError(`رقم الآية (${ayah}) خارج نطاق سورة ${meta.name} (1 - ${meta.ayahs}).`);
    }
    return meta;
  }

  _resolveBook(books, book, label) {
    const bId = typeof book === 'number' ? book : books.indexOf(String(book).toLowerCase());
    if (!Number.isInteger(bId) || bId < 0 || bId >= books.length) {
      throw new TypeError(`${label} غير معروف: المتاح هو ${books.join(', ')}.`);
    }
    return bId;
  }

  // ---------------- القرآن ----------------
  getAyah(surah, ayah, riwayah = 'hafs') {
    this._checkSurahAyah(surah, ayah);
    const rId = this._resolveRiwayah(riwayah);
    const blkId = this.index.quran.surahs[surah];
    if (blkId === undefined) return null;
    const block = this._readBlock(blkId);
    if (rId > 0) {
      const w = block.w.find((x) => x.a === ayah && x.r === rId);
      if (w) return w.t;
    }
    const v = block.v.find((x) => x.a === ayah);
    return v ? v.t : null;
  }

  getSurah(surah, riwayah = 'hafs') {
    const meta = this._checkSurahAyah(surah, 1);
    const rId = this._resolveRiwayah(riwayah);
    const block = this._readBlock(this.index.quran.surahs[surah]);
    const wmap = new Map();
    for (const x of block.w) if (x.r === rId) wmap.set(x.a, x.t);
    const vmap = new Map(block.v.map((x) => [x.a, x.t]));
    const out = [];
    for (let a = 1; a <= meta.ayahs; a++) out.push({ surah, ayah: a, text: wmap.get(a) ?? vmap.get(a) ?? null });
    return out;
  }

  getSurahInfo(surahId) {
    if (typeof surahId !== 'number' || !Number.isInteger(surahId) || surahId < 1 || surahId > 114) return null;
    return SURAHS_META[surahId - 1];
  }

  getAllSurahs() { return SURAHS_META; }

  /** جلب دفعي: طلبات كثيرة في لحظة واحدة — تُجمّع حسب الكتلة (فك ضغط واحد لكل سورة) */
  getAyahsBatch(requests, riwayah = 'hafs') {
    const rId = this._resolveRiwayah(riwayah);
    const perSurah = new Map();
    for (const [s, a] of requests) {
      this._checkSurahAyah(s, a);
      if (!perSurah.has(s)) perSurah.set(s, []);
      perSurah.get(s).push(a);
    }
    const out = [];
    for (const [s, ayahs] of perSurah) {
      const block = this._readBlock(this.index.quran.surahs[s]);
      const wmap = new Map();
      for (const x of block.w) if (x.r === rId) wmap.set(x.a, x.t);
      const vmap = new Map(block.v.map((x) => [x.a, x.t]));
      for (const a of ayahs) out.push({ surah: s, ayah: a, text: wmap.get(a) ?? vmap.get(a) ?? null });
    }
    return out;
  }

  searchQuran(query, limit = 50) {
    const q = normalizeArabicSuper(query);
    if (!q) return [];
    const safeLimit = typeof limit === 'number' && Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 50;
    const res = [];
    const { order, n } = this.qNorm;
    for (let i = 0; i < n.length; i++) {
      if (n[i].includes(q)) {
        const [s, a] = order[i];
        res.push({ surah: s, ayah: a, text: this.getAyah(s, a, 'hafs') });
        if (res.length >= safeLimit) break;
      }
    }
    return res;
  }

  // ---------------- الحديث ----------------
  _hadithChunk(bId, num) {
    const book = this.index.hadith[bId];
    if (!book) return null;
    return binaryChunk(book.chunks, num);
  }

  getHadith(book, number) {
    const bId = this._resolveBook(HADITH_BOOKS, book, 'كتاب الحديث');
    const num = typeof number === 'string' && number.trim() !== '' ? Number(number) : number;
    IslamEngine.encodeHadithNumber(num); // تحقق صارم بالنطاق
    const ch = this._hadithChunk(bId, num);
    if (!ch) return null;
    const block = this._readBlock(ch.blk);
    const e = block.e.find((x) => x[0] === num);
    return e ? (e[1] || null) : null;
  }

  getHadithsBatch(book, numbers) {
    const bId = this._resolveBook(HADITH_BOOKS, book, 'كتاب الحديث');
    const perChunk = new Map();
    for (const raw of numbers) {
      const num = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
      IslamEngine.encodeHadithNumber(num);
      const ch = this._hadithChunk(bId, num);
      if (!ch) continue;
      if (!perChunk.has(ch.blk)) perChunk.set(ch.blk, []);
      perChunk.get(ch.blk).push(num);
    }
    const out = [];
    for (const [blk, nums] of perChunk) {
      const block = this._readBlock(blk);
      const map = new Map(block.e.map((x) => [x[0], x[1]]));
      for (const num of nums) out.push({ book: HADITH_BOOKS[bId], number: num, text: map.get(num) || null });
    }
    return out;
  }

  _hadithNorm(bId) {
    let h = this.hNorm.get(bId);
    if (!h) {
      const blkId = this.index.nrm.h[bId];
      if (blkId === undefined) throw new Error(`لا توجد كتلة تطبيع لكتاب الحديث ${bId}.`);
      h = this._readBlock(blkId);
      this.hNorm.set(bId, h);
    }
    return h;
  }

  searchHadith(query, limit = 50, book = null) {
    const q = normalizeArabicSuper(query);
    if (!q) return [];
    const safeLimit = typeof limit === 'number' && Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 50;
    const books = book === null || book === undefined ? Object.keys(this.index.hadith).map(Number)
      : [this._resolveBook(HADITH_BOOKS, book, 'كتاب الحديث')];
    const res = [];
    for (const bId of books) {
      const { order, n } = this._hadithNorm(bId);
      const hits = [];
      for (let i = 0; i < n.length; i++) {
        if (n[i] && n[i].includes(q)) hits.push(order[i]);
      }
      if (hits.length === 0) continue;
      // جلب النصوص الخام للمطابقات فقط، مجمّعة حسب المقاطع
      const perChunk = new Map();
      for (const num of hits) {
        const ch = this._hadithChunk(bId, num);
        if (!ch) continue;
        if (!perChunk.has(ch.blk)) perChunk.set(ch.blk, []);
        perChunk.get(ch.blk).push(num);
      }
      for (const [blk, nums] of perChunk) {
        const block = this._readBlock(blk);
        const map = new Map(block.e.map((x) => [x[0], x[1]]));
        for (const num of nums) {
          res.push({ book: HADITH_BOOKS[bId], number: num, text: map.get(num) || null });
          if (res.length >= safeLimit) return res;
        }
      }
      if (res.length >= safeLimit) break;
    }
    return res;
  }

  // ---------------- التفسير ----------------
  _tafsirChunk(bId, key) {
    const book = this.index.tafsir[bId];
    if (!book) return null;
    return binaryChunk(book.chunks, key);
  }

  getTafsir(book, surah, ayah) {
    const bId = this._resolveBook(TAFSIR_BOOKS, book, 'كتاب التفسير');
    this._checkSurahAyah(surah, ayah);
    const ch = this._tafsirChunk(bId, tafsirSortKey(surah, ayah));
    if (!ch) return null;
    const block = this._readBlock(ch.blk);
    const e = block.e.find((x) => x[0] === surah && x[1] === ayah);
    return e ? (e[2] || null) : null;
  }

  getTafsirsBatch(book, pairs) {
    const bId = this._resolveBook(TAFSIR_BOOKS, book, 'كتاب التفسير');
    const perChunk = new Map();
    for (const [s, a] of pairs) {
      this._checkSurahAyah(s, a);
      const ch = this._tafsirChunk(bId, tafsirSortKey(s, a));
      if (!ch) continue;
      if (!perChunk.has(ch.blk)) perChunk.set(ch.blk, []);
      perChunk.get(ch.blk).push([s, a]);
    }
    const out = [];
    for (const [blk, list] of perChunk) {
      const block = this._readBlock(blk);
      const map = new Map(block.e.map((x) => [`${x[0]}:${x[1]}`, x[2]]));
      for (const [s, a] of list) out.push({ book: TAFSIR_BOOKS[bId], surah: s, ayah: a, text: map.get(`${s}:${a}`) || null });
    }
    return out;
  }

  _tafsirNormChunk(bId, chunkBlk) {
    let arr = this.tNormCache.get(chunkBlk);
    if (!arr) {
      const block = this._readBlock(chunkBlk);
      arr = block.e.map((x) => normalizeArabicSuper(x[2] || ''));
      if (this.tNormCache.size >= 16) {
        const oldest = this.tNormCache.keys().next().value;
        this.tNormCache.delete(oldest);
      }
      this.tNormCache.set(chunkBlk, arr);
    }
    return arr;
  }

  searchTafsir(query, limit = 20, book = null) {
    const q = normalizeArabicSuper(query);
    if (!q) return [];
    const safeLimit = typeof limit === 'number' && Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 20;
    const books = book === null || book === undefined ? Object.keys(this.index.tafsir).map(Number)
      : [this._resolveBook(TAFSIR_BOOKS, book, 'كتاب التفسير')];
    const res = [];
    for (const bId of books) {
      for (const ch of this.index.tafsir[bId].chunks) {
        const block = this._readBlock(ch.blk);
        const norms = this._tafsirNormChunk(bId, ch.blk);
        for (let i = 0; i < block.e.length; i++) {
          if (norms[i] && norms[i].includes(q)) {
            res.push({ book: TAFSIR_BOOKS[bId], surah: block.e[i][0], ayah: block.e[i][1], text: block.e[i][2] });
            if (res.length >= safeLimit) return res;
          }
        }
      }
    }
    return res;
  }

  /** بحث موحد: قرآن + حديث + تفسير في استدعاء واحد */
  searchAll(query, { quran = 20, hadith = 20, tafsir = 10 } = {}) {
    return {
      quran: this.searchQuran(query, quran),
      hadith: this.searchHadith(query, hadith),
      tafsir: this.searchTafsir(query, tafsir)
    };
  }

  // ---------------- إحصائيات ----------------
  getStats() {
    const hadithTotal = Object.values(this.index.hadith).reduce((a, b) => a + b.total, 0);
    const tafsirTotal = Object.values(this.index.tafsir).reduce((a, b) => a + b.total, 0);
    return {
      version: 2, packPath: this.filePath, fileMB: +(this.fileSize / 1048576).toFixed(2),
      quranVerses: this.index.quran.verses, quranVariants: this.index.quran.variants,
      hadithTotal, tafsirTotal, blocks: this.index.blocks.length,
      cachedBlocks: this.cache.size
    };
  }

  memoryStats() {
    const rss = process.memoryUsage().rss;
    return {
      rssMB: +(rss / 1048576).toFixed(1),
      indexBlocks: this.index.blocks.length,
      cachedBlocks: this.cache.size,
      hadithNormBooks: this.hNorm.size,
      tafsirNormChunks: this.tNormCache.size
    };
  }

  // واجهات بأسماء v1 للتوافق الجزئي (quran/hadith/tafsir getters)
  get quran() {
    return {
      getAyah: (s, a, r) => this.getAyah(s, a, r),
      getSurah: (s, r) => this.getSurah(s, r),
      getSurahInfo: (s) => this.getSurahInfo(s),
      getAllSurahs: () => this.getAllSurahs(),
      getCount: () => this.index.quran.verses,
      search: (q, l) => this.searchQuran(q, l)
    };
  }
  get hadith() {
    return {
      get: (b, n) => this.getHadith(b, n),
      count: (b) => {
        const bId = this._resolveBook(HADITH_BOOKS, b, 'كتاب الحديث');
        return this.index.hadith[bId] ? this.index.hadith[bId].total : 0;
      },
      totalCount: () => Object.values(this.index.hadith).reduce((a, b) => a + b.total, 0),
      search: (q, l, b) => this.searchHadith(q, l, b ?? null)
    };
  }
  get tafsir() {
    return {
      get: (b, s, a) => this.getTafsir(b, s, a),
      totalCount: () => Object.values(this.index.tafsir).reduce((a, b) => a + b.total, 0),
      search: (q, l, b) => this.searchTafsir(q, l, b ?? null)
    };
  }
}
