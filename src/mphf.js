/**
 * محرك التجزئة التامة المصغر (Minimal Perfect Hash Function - MPHF)
 * مخصص للعنونة الثنائية لنصوص القرآن والروايات والحديث والتفسير
 * زمن الوصول: O(1) عبر حقول بتّية غير متداخلة (collision-free by construction)
 * بشرط احترام النطاقات الموثقة أدناه — أي تجاوز يرمي خطأ بدل التكميم الصامت.
 */
export class IslamicMPHF {
  // تحويل إحداثيات الآية إلى مفتاح رقمي فريد 32 بت:
  // [Surah: 8 bits] [Ayah: 14 bits] [Riwayah: 4 bits]
  // النطاقات: surah 1..114 (يُسمح 0..255 تقنياً)، ayah 1..16383، riwayahId 0..15
  static packQuranKey(surah, ayah, riwayahId = 0) {
    if (!Number.isInteger(surah) || surah < 0 || surah > 255) {
      throw new RangeError(`packQuranKey: رقم السورة خارج النطاق (0..255): ${surah}`);
    }
    if (!Number.isInteger(ayah) || ayah < 0 || ayah > 16383) {
      throw new RangeError(`packQuranKey: رقم الآية خارج النطاق (0..16383): ${ayah}`);
    }
    if (!Number.isInteger(riwayahId) || riwayahId < 0 || riwayahId > 15) {
      throw new RangeError(`packQuranKey: معرّف الرواية خارج النطاق (0..15): ${riwayahId}`);
    }
    return (((surah & 0xFF) << 18) | ((ayah & 0x3FFF) << 4) | (riwayahId & 0xF)) >>> 0;
  }

  // دمج معايير الحديث: [Book: 4 bits] [Hadith Number: 20 bits]
  // النطاقات: bookId 0..15، hadithNumber 0..1048575
  // ملاحظة: أرقام الأحاديث المكررة في المصادر (مثل 402.2) يرمّزها المحرك
  // عبر IslamEngine.encodeHadithNumber (n × 100) إلى عدد صحيح قبل التعبئة،
  // لأن هذه الدالة تقبل أعداداً صحيحة فقط لضمان خلوّ المفاتيح من التصادم.
  static packHadithKey(bookId, hadithNumber) {
    if (!Number.isInteger(bookId) || bookId < 0 || bookId > 15) {
      throw new RangeError(`packHadithKey: معرّف الكتاب خارج النطاق (0..15): ${bookId}`);
    }
    if (!Number.isInteger(hadithNumber) || hadithNumber < 0 || hadithNumber > 0xFFFFF) {
      throw new RangeError(`packHadithKey: رقم الحديث خارج النطاق (0..1048575): ${hadithNumber}`);
    }
    return (((bookId & 0xF) << 20) | (hadithNumber & 0xFFFFF)) >>> 0;
  }

  // دمج معايير التفسير: [Book: 4 bits] [Surah: 8 bits] [Ayah: 14 bits]
  static packTafsirKey(bookId, surah, ayah) {
    if (!Number.isInteger(bookId) || bookId < 0 || bookId > 15) {
      throw new RangeError(`packTafsirKey: معرّف الكتاب خارج النطاق (0..15): ${bookId}`);
    }
    if (!Number.isInteger(surah) || surah < 0 || surah > 255) {
      throw new RangeError(`packTafsirKey: رقم السورة خارج النطاق (0..255): ${surah}`);
    }
    if (!Number.isInteger(ayah) || ayah < 0 || ayah > 16383) {
      throw new RangeError(`packTafsirKey: رقم الآية خارج النطاق (0..16383): ${ayah}`);
    }
    return (((bookId & 0xF) << 22) | ((surah & 0xFF) << 14) | (ayah & 0x3FFF)) >>> 0;
  }

  // خوارزمية خلط سريعة جداً على مستوى البتات (Bitwise Avalanche Hash)
  // تُستخدم لتوزيع المفاتيح في جداول التجزئة العامة، وليست جزءاً من مسار
  // الاسترجاع الأساسي (الذي يعتمد على خرائط Map بمفاتيح مُحزمة خالية من التصادم).
  static hash(packedKey) {
    if (!Number.isInteger(packedKey)) {
      throw new TypeError(`hash: المفتاح يجب أن يكون عدداً صحيحاً: ${packedKey}`);
    }
    let h = (packedKey >>> 0 ^ 0x811c9dc5) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x5bd1e995);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // فكّ تعبئة مفتاح قرآني (للتشخيص والاختبارات)
  static unpackQuranKey(key) {
    const k = key >>> 0;
    return { surah: (k >>> 18) & 0xFF, ayah: (k >>> 4) & 0x3FFF, riwayahId: k & 0xF };
  }
}