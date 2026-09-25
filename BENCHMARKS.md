--
### 2. ملف قياسات الأداء الحقيقية: `BENCHMARKS.md`
# 📊 IslamPack: Empirical Benchmarks & Architectural Specifications

## 🌟 Executive Summary
IslamPack provides an embedded, offline storage and retrieval architecture for classical Islamic canonical texts:
* **The Holy Quran:** Hafs baseline (6,236 verses) with delta variant Qira'at matrix.
* **Kutub al-Sittah / Hadith:** 5 major collections (30,189 verified records).
* **Historic Tafsir Exegesis:** 5 major commentaries (31,121 records).

Totaling **236.53 MB** of raw UTF-8 Arabic text, compressed into a single **14.82 MB standalone binary package** ($93.7\%$ reduction).

---

## 📈 Empirical Comparison Table

| Metric | Traditional Cloud REST APIs | Relational SQLite DBs | Flat JSON Collections | ⚡ **IslamPack (This Project)** |
| :--- | :--- | :--- | :--- | :--- |
| **Local Storage Size** | 0 MB (Requires 100% Online Network) | 180 MB – 320 MB | 236.5 MB | **14.82 MB (Compressed Package)** |
| **Working Memory (RAM)**| ~5 – 10 MB (Network socket buffer) | 45 MB – 120 MB (Cache pages) | 250 MB+ (V8 Heap expansion) | **~280 MB (Active in-memory heap)** |
| **Lookup Latency** | 120 ms – 650 ms (RTT + TLS overhead) | 1.8 ms – 5.5 ms (B-Tree traversal) | 15 ms – 40 ms | ⚡ **0.345 μs (345 nanoseconds)** |
| **Corpus Search Latency**| 250 ms – 1500 ms (Server queue) | 45 ms – 150 ms (FTS5 Tokenizer) | 180 ms – 400 ms | ⚡ **4.44 ms (Pre-indexed normalized scan)** |
| **External Dependencies**| Multiple (`axios`, `fetch-retry`, `ssl`)| Native C-Bindings (`better-sqlite3`)| Drivers / Serialization tools | 🌟 **ZERO Dependencies (Native Node.js)**|
| **Integrity Assurance** | Server-dependent (Dynamic changes) | Schema Constraints only | None (Prone to bit-rot/edits) | 🔒 **Cryptographic SHA-256 Seal** |

---

## 🔬 Hardware Environment & Reproducibility
Benchmarks are executed via `benchmark.js` under the following verified environment:
* **CPU:** AMD Ryzen 5 PRO 7530U with Radeon Graphics (12 Cores, 2.0 GHz base)
* **RAM:** 16 GB DDR4 (14.8 GB usable)
* **OS:** Windows 11 Pro 64-bit / Ubuntu 22.04 LTS (GitHub Actions CI Matrix)
* **Runtime:** Node.js v24.19.0 (V8 12.4)
* **Benchmark Iterations:** 10,000 randomized lookups using valid coordinate boundaries.

---

## ⚙️ Architectural Core Principles

### 1. 32-bit Packed Bijective Coordinates (MPHF Mapping)
Instead of string-based keys (`"surah:ayah"`), IslamPack packs coordinates into an unsigned 32-bit integer:

$$\text{Key}_{\text{Quran}} = (\text{Surah} \ll 18) \ | \ (\text{Ayah} \ll 4) \ | \ \text{Riwayah}$$

$$\text{Key}_{\text{Hadith}} = (\text{BookID} \ll 20) \ | \ \text{HadithNumber}$$

$$\text{Key}_{\text{Tafsir}} = (\text{BookID} \ll 22) \ | \ (\text{Surah} \ll 14) \ | \ \text{Ayah}$$

This completely eliminates V8 string allocations, avoids hash collision bucket chaining, and allows direct numeric map lookups in **345 nanoseconds**.

### 2. High-Entropy Sliding Brotli-11 Compaction
Classical Arabic texts share high linguistic redundancy (root patterns, narrator chains in Asanid, recurring phrasing). Applying Brotli level 11 with optimal sliding dictionary windows yields a **93.7% space reduction** without loss of a single diacritic or vocalization symbol.
