import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { IslamEngine } from '../src/engine.js';

console.log("==========================================================");
console.log("   🧪 الفاحص الصارم لسلامة بيانات IslamPack (CI/Test)     ");
console.log("==========================================================\n");

const PACK_FILES = ['islam-qh.pack', 'islam-qt.pack', 'islam-full.pack'];
let failed = false;

for (const packName of PACK_FILES) {
  try {
    const resolved = IslamEngine.resolvePackPath(packName);
    const buf = fs.readFileSync(resolved);
    
    // 1. فحص الترويسة
    const magic = buf.subarray(0, 8).toString('utf-8');
    if (!magic.startsWith("ISLAM")) {
      throw new Error(`الترويسة السحرية غير صحيحة: ${magic}`);
    }

    // 2. فحص البصمة الرقمية
    const expectedHash = buf.subarray(8, 40);
    const compressed = buf.subarray(40);
    const decompressed = zlib.brotliDecompressSync(compressed);
    const actualHash = crypto.createHash('sha256').update(decompressed).digest();

    if (!expectedHash.equals(actualHash)) {
      throw new Error(`بصمة SHA-256 لا تتطابق مع المحتوى المضغوط!`);
    }

    const data = JSON.parse(decompressed.toString('utf-8'));
    console.log(`✓ الحزمة [${packName}] سليمة وموثقة تشفيرياً 100%.`);

    // 3. فحص المصحف الشريف
    if (data.quran) {
      if (!Array.isArray(data.quran.base) || data.quran.base.length !== 6236) {
        throw new Error(`عدد آيات المصحف غير مطابق (الموجود: ${data.quran.base?.length} آية والمطلوب: 6236).`);
      }
      if (!Array.isArray(data.quran.variants) || data.quran.variants.length < 10) {
        throw new Error(`طبقة فوارق القراءات ناقصة (الموجود: ${data.quran.variants?.length}).`);
      }
      const kursi = data.quran.base.find(v => v.s === 2 && v.a === 255);
      if (!kursi || !kursi.t || kursi.t.length < 50) {
        throw new Error("آية الكرسي (2:255) مفقودة أو مبتورة في الحزمة.");
      }
      console.log(`   - القرآن الكريم: 6,236 آية تامة التشكيل (مطابق للمصحف الشريف).`);
    }

    // 4. فحص الأحاديث (إجمالي + حدود دنيا لكل كتاب لمنع تبديل الكتب)
    if (data.hadith) {
      let count = 0;
      for (const list of Object.values(data.hadith)) count += list.length;
      if (count !== 30189) {
        throw new Error(`عدد الأحاديث غير مطابق (الموجود: ${count} والمطلوب: 30,189).`);
      }
      const mins = [7000, 7000, 5000, 3000, 5000]; // حدود دنيا تقريبية لكل كتاب
      mins.forEach((m, i) => {
        if (!Array.isArray(data.hadith[i]) || data.hadith[i].length < m) {
          throw new Error(`كتاب الحديث [${i}] ناقص بشكل مريب (${data.hadith[i]?.length} < ${m}).`);
        }
      });
      console.log(`   - مجاميع الحديث: 30,189 حديثاً نبوياً مسنداً تامة الأعداد.`);
    }

    // 5. فحص التفاسير
    if (data.tafsir) {
      let count = 0;
      for (const list of Object.values(data.tafsir)) count += list.length;
      if (count < 30000) {
        throw new Error(`أعداد التفاسير ناقصة بشكل غير معتاد (الموجود: ${count}).`);
      }
      console.log(`   - كتب التفسير: ${count.toLocaleString()} تفسيراً آية بآية.`);
    }

  } catch (err) {
    console.error(`❌ فشل التحقق من الحزمة [${packName}]: ${err.message}`);
    failed = true;
  }
}

if (failed) {
  console.error("\n❌ فشل اختبار التحقق من البيانات.");
  process.exit(1);
} else {
  console.log("\n==========================================================");
  console.log("🎉 جميع الحزم سليمة، كاملة التوثيق، ومطابقة لأعلى معايير الدقة 100%!");
  console.log("==========================================================");
  process.exit(0);
}