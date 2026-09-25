# 📜 Data Sources, Provenance & Scientific Methodology

## 1. The Holy Quran (القرآن الكريم)
* **Primary Text Baseline:** Tanzil Project (v1.0.2 - Tanzil.net) & King Fahd Glorious Quran Printing Complex (KFGQPC).
* **Script Type:** Uthmanic Text with complete Tajweed stop marks and diacritics.
* **Qira'at Scope:** Complete Hafs baseline with an integrated canonical Farsh variant layer for Warsh, Qalun, Al-Duri, and Shu'bah on verified differing verses.

## 2. Hadith Compendiums (مجاميع الحديث الشريف)
* **Sources:** Authenticated digital open corpora verified against classical printings (Darussalam, Muhammad Fu'ad Abd al-Baqi numbering).
* **Collections:** Sahih al-Bukhari, Sahih Muslim, Sunan Abi Dawud, Jami' al-Tirmidhi, Sunan an-Nasa'i (30,189 total records).

## 3. Tafsir Exegesis (كتب التفسير)
* **Sources:** Open Tafsir corpus (King Saud University / Tanzil / Spa5k APIs).
* **Books:** Tafsir al-Jalalayn, Tafsir al-Sa'di, Tafsir Ibn Kathir, Tafsir al-Baghawi, Tafsir al-Qurtubi.

## 4. Verification & Integrity Policy
* Every compiled bundle is cryptographically sealed with a SHA-256 checksum in its binary header.
* Text manipulation or bit-rot results in immediate rejection upon load.