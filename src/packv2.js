/**
 * باني حزم الجيل الثاني (v2) — كتل كسولة + فهرس تجزئة تامة (MPHF).
 *
 * الفلسفة: لا يُحمّل أي نص عند الفتح. ملف v2 = ترويسة + فهرس صغير (~30KB)
 * + كتل Brotli مستقلة. المحرك يفك ضغط كتلة واحدة فقط لكل استعلام.
 *
 * البنية: [magic8="ISLAMV2A"][sha256(32) لبقية الملف][u32LE طول الفهرس المضغوط]
 *          [الفهرس JSON مضغوط][الكتل متتالية]
 * سجل الكتلة: {id, kind, count, off, len, sha} + واصفات المجموعات بحدود مرتبة
 * (البيانات مرتبة مسبقاً — يُتحقق من ذلك هنا، وإلا فالبحث الثنائي ينهار).
 *
 * الاستخدام:
 *   node src/packv2.js              → بناء الحزمة الكاملة dist/islam-v2.pack
 *   node src/packv2.js --tiny       → حزمة اختبار صغيرة dist/islam-v2-tiny.pack
 *   node src/packv2.js --out <path> → مسار مخصص
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { normalizeArabicSuper, tafsirSortKey } from './normalize.js';
import { QIRAAT_VARIANTS } from './qiraat.js';

export const V2_MAGIC = 'ISLAMV2A';
export const HADITH_CHUNK = 1000;
export const TAFSIR_CHUNK = 500;

const brotliMax = (buf) => zlib.brotliCompressSync(buf, {
  params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
});
const shaHex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function assertSortedHadeeth(list, label) {
  for (let i = 1; i < list.length; i++) {
    if (!(list[i].n > list[i - 1].n)) {
      throw new Error(`ترتيب الحديث مكسور في ${label} عند الفهرس ${i} (${list[i - 1].n} → ${list[i].n})`);
    }
  }
}
function assertSortedTafsir(list, label) {
  for (let i = 1; i < list.length; i++) {
    const p = tafsirSortKey(list[i - 1].s, list[i - 1].a);
    const c = tafsirSortKey(list[i].s, list[i].a);
    if (!(c > p)) throw new Error(`ترتيب التفسير مكسور في ${label} عند الفهرس ${i}`);
  }
}
function assertSortedQuran(base) {
  for (let i = 1; i < base.length; i++) {
    const p = base[i - 1].s * 1000 + base[i - 1].a;
    const c = base[i].s * 1000 + base[i].a;
    if (!(c > p)) throw new Error(`ترتيب المصحف مكسور عند الفهرس ${i}`);
  }
}

function chunkOf(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * بناء حزمة v2 من المكونات الخام وكتابتها.
 * @returns {{outPath, bytes, blocks, indexBytes}}
 */
export function buildV2Pack({ quranBase, variants, hadith, tafsir, withNormHadith = true }, outPath) {
  assertSortedQuran(quranBase);
  const blocks = [];       // {id, kind, ref, count, data:Buffer(compressed), sha}
  const byId = new Map();
  const addBlock = (kind, ref, count, obj) => {
    const raw = Buffer.from(JSON.stringify(obj), 'utf-8');
    const comp = brotliMax(raw);
    const id = blocks.length;
    const rec = { id, kind, ref, count, rawLen: raw.length, data: comp, sha: shaHex(comp) };
    blocks.push(rec); byId.set(id, rec);
    return id;
  };

  // 1) كتل القرآن: كتلة لكل سورة {s, v:[{a,t}], w:[{a,r,t}]}
  const bySurah = new Map();
  for (const v of quranBase) {
    if (!bySurah.has(v.s)) bySurah.set(v.s, []);
    bySurah.get(v.s).push({ a: v.a, t: v.t });
  }
  const varBySurah = new Map();
  for (const w of variants) {
    if (!varBySurah.has(w.s)) varBySurah.set(w.s, []);
    varBySurah.get(w.s).push({ a: w.a, r: w.r, t: w.t });
  }
  const quranMap = {};
  for (const [s, verses] of [...bySurah.entries()].sort((a, b) => a[0] - b[0])) {
    const id = addBlock('q', s, verses.length, { s, v: verses, w: varBySurah.get(s) || [] });
    quranMap[s] = id;
  }

  // 2) كتل الحديث: مقاطع مرتبة لكل كتاب + حدود أول/آخر رقم
  const hadithMap = {};
  for (const [bStr, list] of Object.entries(hadith)) {
    const b = Number(bStr);
    assertSortedHadeeth(list, `hadith/${b}`);
    const chunks = chunkOf(list, HADITH_CHUNK).map((ch) => {
      const id = addBlock('h', b, ch.length, { b, e: ch.map((h) => [h.n, h.t]) });
      return { first: ch[0].n, last: ch[ch.length - 1].n, blk: id, count: ch.length };
    });
    hadithMap[b] = { total: list.length, chunks };
  }

  // 3) كتل التفسير: مقاطع مرتبة + حدود (s*1000+a)
  const tafsirMap = {};
  for (const [bStr, list] of Object.entries(tafsir)) {
    const b = Number(bStr);
    assertSortedTafsir(list, `tafsir/${b}`);
    const chunks = chunkOf(list, TAFSIR_CHUNK).map((ch) => {
      const id = addBlock('t', b, ch.length, { b, e: ch.map((t) => [t.s, t.a, t.t]) });
      return {
        first: tafsirSortKey(ch[0].s, ch[0].a),
        last: tafsirSortKey(ch[ch.length - 1].s, ch[ch.length - 1].a),
        blk: id, count: ch.length
      };
    });
    tafsirMap[b] = { total: list.length, chunks };
  }

  // 4) كتل التطبيع المسبق (بحث فوري دون فك النصوص الخام):
  //    nq: كل آيات المصحف مطبّعة بترتيب القاعدة | nh: كل كتاب حديث مطبّع بترتيبه
  //    (التفسير يُطبّع عند البحث مع تخزين مؤقت — حجمه المطبّع ~124MB لا يُضمّن عمداً)
  const nqId = addBlock('nq', 0, quranBase.length, {
    order: quranBase.map((v) => [v.s, v.a]),
    n: quranBase.map((v) => normalizeArabicSuper(v.t))
  });
  const nhMap = {};
  if (withNormHadith) {
    for (const [bStr, list] of Object.entries(hadith)) {
      const b = Number(bStr);
      nhMap[b] = addBlock('nh', b, list.length, {
        order: list.map((h) => h.n),
        n: list.map((h) => normalizeArabicSuper(h.t || ''))
      });
    }
  }

  // 5) تجميع الملف: الإزاحات "نسبية" من بداية منطقة الكتل (لا تعتمد على
  //    طول الفهرس) — فلا توجد معادلة ذاتية المرجع ولا حاجة لأي تكرار:
  //    الإزاحة المطلقة = 44 + طول_الفهرس_المضغوط + الإزاحة_النسبية.
  const index = {
    v: 2,
    builtAt: new Date().toISOString(),
    quran: { verses: quranBase.length, variants: variants.length, surahs: quranMap },
    hadith: hadithMap,
    tafsir: tafsirMap,
    nrm: { q: nqId, h: nhMap },
    blocks: []
  };
  let rel = 0;
  index.blocks = blocks.map((b) => {
    const rec = { id: b.id, kind: b.kind, count: b.count, off: rel, len: b.data.length, sha: b.sha };
    rel += b.data.length;
    return rec;
  });
  const indexComp = brotliMax(Buffer.from(JSON.stringify(index), 'utf-8'));
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32LE(indexComp.length, 0);
  const body = Buffer.concat([lenBuf, indexComp, ...blocks.map((b) => b.data)]);
  const hash = crypto.createHash('sha256').update(body).digest();
  const final = Buffer.concat([Buffer.from(V2_MAGIC, 'utf-8'), hash, body]);

  const dir = path.dirname(path.resolve(outPath));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, final);
  return { outPath, bytes: final.length, blocks: blocks.length, indexBytes: indexComp.length };
}

// ---------- التشغيل المباشر ----------
const args = new Set(process.argv.slice(2));
const isMain = process.argv[1] && String(process.argv[1]).replace(/\\/g, '/').endsWith('src/packv2.js');
if (isMain) {
  const getArg = (name, def) => {
    const i = process.argv.indexOf(name);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
  };
  if (args.has('--tiny')) {
    // حزمة اختبار صغيرة (اصطناعية) — سريعة ولا تعتمد على data/
    const quranBase = [
      { s: 1, a: 1, t: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
      { s: 1, a: 2, t: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
      { s: 1, a: 3, t: 'الرَّحْمَٰنِ الرَّحِيمِ' },
      { s: 108, a: 1, t: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ' },
      { s: 112, a: 4, t: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ' }
    ];
    const variants = [{ s: 1, a: 3, r: 1, t: 'مَلِكِ يَوْمِ الدِّينِ' }];
    const hadith = { 0: [{ n: 1, t: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ' }, { n: 402.2, t: 'حديث مكرر للاختبار' }] };
    const tafsir = { 1: [{ s: 1, a: 1, t: 'تفسير تجريبي للفاتحة' }] };
    const out = getArg('--out', './dist/islam-v2-tiny.pack');
    const r = buildV2Pack({ quranBase, variants, hadith, tafsir }, out);
    console.log(`✓ حزمة الاختبار v2: ${out} (${r.bytes} بايت، ${r.blocks} كتلة)`);
  } else {
    console.log('⏳ بناء حزمة v2 الكاملة (كتل كسولة)…');
    const quranBase = JSON.parse(fs.readFileSync('./data/quran_full_uthmani.json', 'utf-8'));
    const hadith = {}, tafsir = {};
    for (const [i, f] of ['bukhari.json', 'muslim.json', 'abudawud.json', 'tirmidhi.json', 'nasai.json'].entries()) {
      hadith[i] = JSON.parse(fs.readFileSync(`./data/hadith/${f}`, 'utf-8'));
    }
    for (const [i, f] of ['jalalayn.json', 'saadi.json', 'ibn_kathir.json', 'baghawi.json', 'qurtubi.json'].entries()) {
      tafsir[i] = JSON.parse(fs.readFileSync(`./data/tafsir/${f}`, 'utf-8'));
    }
    const out = getArg('--out', './dist/islam-v2.pack');
    const t0 = process.hrtime.bigint();
    const r = buildV2Pack({ quranBase, variants: [...QIRAAT_VARIANTS], hadith, tafsir }, out);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(`✓ حزمة v2 الكاملة: ${out} (${(r.bytes / 1048576).toFixed(2)} MB، ${r.blocks} كتلة، فهرس ${(r.indexBytes / 1024).toFixed(1)} KB) في ${(ms / 1000).toFixed(1)}s`);
  }
}
