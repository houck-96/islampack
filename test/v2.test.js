/**
 * اختبارات الجيل الثاني (v2): حزمة صغيرة اصطناعية تُبنى لحظياً في مجلد مؤقت،
 * فلا تعتمد على data/ ولا على الحزمة الكاملة — آمنة وسريعة في CI.
 * إن وُجدت dist/islam-v2.pack الكاملة تُجرى فحوص تكافؤ إضافية مع محرك v1.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildV2Pack } from '../src/packv2.js';
import { IslamEngineV2 } from '../src/engine_v2.js';
import { normalizeArabicSuper } from '../src/normalize.js';

console.log('==========================================================');
console.log('   🧪 اختبارات محرك الجيل الثاني (v2: كتل كسولة + بحث شامل) ');
console.log('==========================================================\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'islampack-v2-'));
const tinyPath = path.join(tmp, 'tiny.pack');

const quranBase = [
  { s: 1, a: 1, t: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
  { s: 1, a: 2, t: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
  { s: 1, a: 3, t: 'الرَّحْمَٰنِ الرَّحِيمِ' },
  { s: 108, a: 1, t: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ' },
  { s: 112, a: 4, t: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ' }
];
const variants = [{ s: 1, a: 3, r: 1, t: 'مَلِكِ يَوْمِ الدِّينِ' }];
const hadith = {
  0: [
    { n: 1, t: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ' },
    { n: 2, t: '' },
    { n: 402.2, t: 'حديث مكرر للاختبار' }
  ]
};
const tafsir = { 1: [{ s: 1, a: 1, t: 'تفسير تجريبي عن الفاتحة العظيمة' }] };

buildV2Pack({ quranBase, variants, hadith, tafsir }, tinyPath);
const db = IslamEngineV2.open(tinyPath);

// 1. استرجاع آية + فرش رواية
assert.ok(normalizeArabicSuper(db.getAyah(1, 1, 'hafs')).includes('بسم الله'), 'فشل استرجاع البسملة.');
assert.equal(db.getAyah(1, 3, 'warsh'), 'مَلِكِ يَوْمِ الدِّينِ', 'فشل فرش ورش.');
assert.equal(db.getAyah(1, 3, 'hafs'), 'الرَّحْمَٰنِ الرَّحِيمِ', 'حفص يجب أن تعيد الأصل.');
console.log('✓ استرجاع الآيات وفروش الروايات.');

// 2. الحديث الكسري + الفارغ + الدفعي
assert.equal(db.getHadith('bukhari', 402.2), 'حديث مكرر للاختبار', 'فشل الحديث المكرر 402.2.');
assert.equal(db.getHadith('bukhari', 1), 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', 'فشل حديث 1.');
assert.equal(db.getHadith('bukhari', 2), null, 'الحديث الفارغ يجب أن يعيد null.');
const batch = db.getHadithsBatch('bukhari', [1, 402.2]);
assert.equal(batch.length, 2, 'الدفعة يجب أن تعيد عنصرين.');
console.log('✓ الأحاديث (كسري/فارغ/دفعي).');

// 3. التفسير + الدفعي
assert.equal(db.getTafsir('saadi', 1, 1), 'تفسير تجريبي عن الفاتحة العظيمة', 'فشل التفسير.');
console.log('✓ التفسير.');

// 4. البحث الموحد بدون تشكيل
const q = db.searchQuran('الكوثر');
assert.equal(q.length, 1, 'بحث الكوثر يجب أن يعيد آية واحدة.');
assert.equal(q[0].surah, 108, 'سورة الكوثر 108.');
const h = db.searchHadith('الاعمال بالنيات'); // بدون همزات/تشكيل
assert.ok(h.length >= 1 && h[0].number === 1, 'بحث الحديث المطبّع فشل.');
const t = db.searchTafsir('الفاتحه العظيمه'); // ة→ه + بدون تشكيل
assert.ok(t.length >= 1, 'بحث التفسير المطبّع فشل.');
const all = db.searchAll('الله', { quran: 5, hadith: 5, tafsir: 5 });
assert.ok(all.quran && all.hadith && all.tafsir, 'searchAll يجب أن يعيد الأقسام الثلاثة.');
console.log('✓ البحث الشامل المطبّع (قرآن/حديث/تفسير).');

// 5. الدفعي القرآني + السورة الكاملة
const bq = db.getAyahsBatch([[1, 1], [1, 2], [108, 1]], 'hafs');
assert.equal(bq.length, 3, 'الدفعة القرآنية يجب أن تعيد 3.');
assert.ok(db.getSurah(1, 'hafs').length >= 3, 'getSurah فشل.');
console.log('✓ الجلب الدفعي والسورة الكاملة.');

// 6. حدود صارمة
assert.throws(() => db.getAyah(115, 1), /رقم السورة/, 'لم يرفض سورة 115.');
assert.throws(() => db.getHadith('bukhari', -1), /رقم الحديث/, 'لم يرفض حديثاً سالباً.');
assert.throws(() => db.getTafsir('saadi', 1, 99), /خارج نطاق/, 'لم يرفض آية تفسير خارج النطاق.');
assert.deepEqual(db.searchQuran('   '), [], 'البحث الفارغ يجب أن يعيد [].');
console.log('✓ الحدود الصارمة.');

// 7. كشف العبث: قلب بايت في كتلة يجب أن يُكتشف ببصمتها
const tampered = path.join(tmp, 'tampered.pack');
fs.copyFileSync(tinyPath, tampered);
const fh = fs.openSync(tampered, 'r+');
const idx = db.index;
const blk = idx.blocks.find((b) => b.kind === 'q');
const absOff = db.blockAbs(blk.id);
const one = Buffer.alloc(1);
fs.readSync(fh, one, 0, 1, absOff + 2);
fs.writeSync(fh, Buffer.from([one[0] ^ 0xff]), 0, 1, absOff + 2);
fs.closeSync(fh);
// إصلاح البصمة الشاملة ليتجاوز الفحص الأول ويصل لفحص الكتلة
{
  const buf = fs.readFileSync(tampered);
  const crypto = await import('node:crypto');
  const body = buf.subarray(40);
  crypto.createHash('sha256').update(body).digest().copy(buf, 8);
  fs.writeFileSync(tampered, buf);
}
const dbT = IslamEngineV2.open(tampered);
assert.throws(() => dbT.getAyah(1, 1), /بصمة الكتلة/, 'لم يكتشف العبث بالكتلة.');
dbT.close();
console.log('✓ كشف العبث على مستوى الكتلة.');

// 8. تكافؤ مع v1 على الحزمة الكاملة (إن وُجدت)
let parity = false;
try {
  const { IslamEngine } = await import('../src/engine.js');
  const v1 = IslamEngine.load('islam-full.pack');
  const v2full = IslamEngineV2.open('islam-v2.pack');
  const samples = [[1, 1, 'hafs'], [2, 255, 'hafs'], [108, 1, 'hafs'], [112, 4, 'shubah']];
  for (const [s, a, r] of samples) {
    assert.equal(v2full.getAyah(s, a, r), v1.quran.getAyah(s, a, r), `تكافؤ الآية ${s}:${a} (${r})`);
  }
  assert.equal(v2full.getHadith('bukhari', 1), v1.hadith.get('bukhari', 1), 'تكافؤ حديث البخاري 1.');
  assert.equal(v2full.getHadith('bukhari', 402.2), v1.hadith.get('bukhari', 402.2), 'تكافؤ حديث 402.2.');
  assert.equal(v2full.getTafsir('saadi', 1, 1), v1.tafsir.get('saadi', 1, 1), 'تكافؤ تفسير السعدي 1:1.');
  const s1 = v1.quran.search('الرحمن', 20).map((x) => `${x.surah}:${x.ayah}`).sort().join(',');
  const s2 = v2full.searchQuran('الرحمن', 20).map((x) => `${x.surah}:${x.ayah}`).sort().join(',');
  assert.equal(s2, s1, 'تكافؤ نتائج البحث.');
  const st = v2full.getStats();
  assert.equal(st.quranVerses, 6236, 'إحصاء الآيات.');
  assert.equal(st.hadithTotal, 30189, 'إحصاء الأحاديث.');
  assert.ok(st.tafsirTotal >= 30000, 'إحصاء التفاسير.');
  v2full.close();
  parity = true;
  console.log('✓ التكافؤ الكامل مع محرك v1 (6236 آية، بحث، إحصائيات).');
} catch (e) {
  if (/تعذر العثور على الحزمة/.test(e.message)) {
    console.log('ℹ️ الحزمة الكاملة v2 غير مبنية — تُخطي فحوص التكافؤ (شغّل: node src/packv2.js).');
  } else throw e;
}

db.close();
fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n==========================================================');
console.log(`🎉 جميع اختبارات v2 اجتازت بنجاح 100%!${parity ? ' (مع التكافؤ الكامل)' : ''}`);
console.log('==========================================================');
