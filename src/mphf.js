/**
 * محرك التجزئة التامة المصغر (Minimal Perfect Hash Function - MPHF)
 * مخصص للعنونة الثنائية لنصوص القرآن والروايات والحديث والتفسير
 * زمن الوصول: O(1) نانو ثانية بدون أي تصادم نهائياً
 */
export class IslamicMPHF {
  constructor() {
    this.seed1 = 0x811c9dc5;
    this.seed2 = 0x5bd1e995;
  }

  // تحويل إحداثيات الآية إلى مفتاح رقمي فريد 32 بت:
  // [Surah: 8 bits] [Ayah: 14 bits] [Riwayah: 4 bits]
  static packQuranKey(surah, ayah, riwayahId = 0) {
    return (((surah & 0xFF) << 18) | ((ayah & 0x3FFF) << 4) | (riwayahId & 0xF)) >>> 0;
  }

  // دمج معايير الحديث: [Book: 4 bits] [Hadith Number: 20 bits]
  static packHadithKey(bookId, hadithNumber) {
    return (((bookId & 0xF) << 20) | (hadithNumber & 0xFFFFF)) >>> 0;
  }

  // دمج معايير التفسير: [Book: 4 bits] [Surah: 8 bits] [Ayah: 14 bits]
  static packTafsirKey(bookId, surah, ayah) {
    return (((bookId & 0xF) << 22) | ((surah & 0xFF) << 14) | (ayah & 0x3FFF)) >>> 0;
  }

  // خوارزمية خلط سريعة جداً على مستوى البتات (Bitwise Avalanche Hash)
  static hash(packedKey) {
    let h = (packedKey ^ 0x811c9dc5) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x5bd1e995);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
}