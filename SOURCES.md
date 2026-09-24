# 📜 Data Sources, Provenance & Methodology

## 1. The Holy Quran (القرآن الكريم)
* **Baseline Text:** Tanzil Project (v1.0.2 - [Tanzil.net](https://tanzil.net/)) aligned with the King Fahd Glorious Quran Printing Complex (KFGQPC) Medina Mushaf.
* **Character Set:** Full Uthmanic Unicode script with complete vocalization (Tashkeel), stop marks (Waqf: ج, صلى, قلى, مـ, ۛ), and Sajdah symbols (۩).
* **Qira'at Scope:** Complete 6,236 verses according to Hafs 'an 'Asim. An extensible delta matrix provides variant readings for Warsh, Qalun, Al-Duri, and Shu'bah on differing verses.

## 2. Hadith Compendiums (مجاميع الحديث الشريف)
* **Sources:** Authenticated digital open corpora verified against classical scholarly numbering systems (Darussalam, Muhammad Fu'ad Abd al-Baqi).
* **Collections & Counts:**
  * **Sahih al-Bukhari:** 7,589 records
  * **Sahih Muslim:** 7,563 records
  * **Sunan Abi Dawud:** 5,274 records
  * **Jami' al-Tirmidhi:** 3,998 records
  * **Sunan an-Nasa'i:** 5,765 records
  * **Total Verified Hadiths:** 30,189 records.

## 3. Historic Tafsir Commentaries (كتب التفسير العظمى)
* **Sources:** Digitized scholarly corpora from open verified academic repositories (King Saud University / Tanzil / Spa5k APIs).
* **Books & Counts:**
  * **Tafsir al-Jalalayn:** 6,236 records
  * **Tafsir al-Sa'di:** 6,177 records (combines contextually related short verses)
  * **Tafsir Ibn Kathir:** 6,236 records
  * **Tafsir al-Baghawi:** 6,236 records
  * **Tafsir al-Qurtubi:** 6,236 records
  * **Total Exegesis Records:** 31,121 records.

---

## 4. Reproducible Build Pipeline
To verify or regenerate the binary distributions from upstream raw data:

```bash
# 1. Fetch raw authenticated datasets
npm run data:fetch

# 2. Compile into cryptographically sealed distributions
npm run build

# 3. Verify integrity
npm test
