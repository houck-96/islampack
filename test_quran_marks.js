import fs from 'node:fs';
import path from 'node:path';

console.log("==========================================================");
console.log("   🔍 الفاحص الدقيق لعلامات الوقف والتجويد والسجدات      ");
console.log("==========================================================\n");

const quranPath = path.resolve('./data/quran_full_uthmani.json');
const verses = JSON.parse(fs.readFileSync(quranPath, 'utf-8'));

// رموز الوقف والضبط التجويدي في اليونيكود القرآني
const MARKS = {
  "ج (جائز الوقف)": /\u06DA/g,
  "صلى (الوصل أولى)": /\u06D6/g,
  "قلى (الوقف أولى)": /\u06D7/g,
  "مـ (الوقف اللازم)": /\u06E2/g,
  "لا (الوقف الممنوع)": /\u06D9/g,
  "ۛ ... ۛ (وقف التعانق)": /\u06DB/g,
  "علامة المد (~ المتصل والمنفصل)": /\u0653/g,
  "السكون القرآني العثماني (رأس خاء ۡ)": /\u06E1/g,
  "رمز السجدة (۩)": /\u06E9/g,
  "رمز الربع والحزب (۞)": /\u06DE/g
};

console.log("📊 إحصائيات علامات الضبط والتجويد في مصحفك المحلي:\n");

for (const [name, regex] of Object.entries(MARKS)) {
  let count = 0;
  for (const v of verses) {
    const matches = v.t.match(regex);
    if (matches) count += matches.length;
  }
  const status = count > 0 ? `✅ موجود (${count.toLocaleString()} موضعاً)` : `❌ غير موجود في النص المباشر`;
  console.log(` - ${name.padEnd(35, ' ')} : ${status}`);
}

// فحص عينة عملية من آية الكرسي
const kursi = verses.find(v => v.s === 2 && v.a === 255);
console.log("\n----------------------------------------------------------");
console.log("🔍 فحص علامات الوقف عملياً في آية الكرسي:");
console.log(kursi.t);
console.log("----------------------------------------------------------");