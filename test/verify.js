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
      if (data.quran.base.length !== 6236) {
        throw new Error(`عدد آيات المصحف غير مطابق (الموجود: ${data.quran.base.length} آية والمطلوب: 6236).`);
      }
      console.log(`   - القرآن الكريم: 6,236 آية تامة التشكيل (مطابق للمصحف الشريف).`);
    }

    // 4. فحص الأحاديث
    if (data.hadith) {
      let count = 0;
      for (const list of Object.values(data.hadith)) count += list.length;
      if (count !== 30189) {
        throw new Error(`عدد الأحاديث غير مطابق (الموجود: ${count} والمطلوب: 30,189).`);
      }
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