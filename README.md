# IslamPack 🕌

[![CI](https://github.com/houck-96/islampack/actions/workflows/ci.yml/badge.svg)](https://github.com/houck-96/islampack/actions)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![Zero deps](https://img.shields.io/badge/dependencies-0-blue.svg)](package.json)

High-performance, **zero-dependency** Islamic canonical engine for Node.js:
Quran (5 Qira'at), 5 Hadith books, 5 Tafsir books — Brotli-compressed,
SHA-256 sealed, O(1) retrieval.

> بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ — built for developers to reuse in
> their own projects. May Allah accept it as ongoing charity (صدقة جارية).

## Contents (verified by `npm test`)

| Dataset | Records |
|---|---|
| Holy Quran (Uthmani, fully vocalized) | 6,236 verses, per-surah counts match the Madani Mushaf exactly |
| Qira'at farsh layer (warsh, qalun, duri, shubah over hafs base) | 12 authenticated variants, each textually distinct from the base |
| Hadith: Bukhari 7,589 · Muslim 7,563 · Abu Dawud 5,274 · Tirmidhi 3,998 · Nasa'i 5,765 | 30,189 total (`n` unique incl. fractional *mukarrar* like `402.2`) |
| Tafsir: Jalalayn · Saadi · Ibn Kathir · Baghawi · Qurtubi | 31,121 entries |

## Pack editions (`dist/`)

| File | Contains | Compressed | Raw |
|---|---|---|---|
| `islam-qh.pack` | Quran + Hadith | 2.86 MB | 32.5 MB |
| `islam-qt.pack` | Quran + Tafsir | 12.14 MB | 205.4 MB |
| `islam-full.pack` | Everything (v1 engine) | 14.82 MB | 236.5 MB |
| `islam-v2.pack` | Everything, lazy blocks (v2 engine) | 18.75 MB | — |
| `quran_complete.pack` | Quran only | 0.19 MB | 1.4 MB |

Every pack is sealed with SHA-256: tampering or bit-rot is rejected on load.

## Requirements

- Node.js **≥ 18**, ESM (`"type": "module"`)
- **No dependencies.** No `npm install` needed.

## Install

```bash
git clone https://github.com/houck-96/islampack.git
cd islampack
node demo.js   # sanity check, no install step
```

## Quickstart

```js
import { IslamEngine } from './index.js';

const db = IslamEngine.load('islam-full.pack'); // auto-resolves dist/

db.quran.getAyah(2, 255, 'hafs');   // Ayat al-Kursi
db.quran.getAyah(1, 3, 'warsh');    // farsh variant (مَلِكِ) or hafs fallback
db.hadith.get('bukhari', 1);        // "إنما الأعمال بالنيات…"
db.hadith.get('bukhari', 402.2);    // fractional mukarrar numbers work
db.tafsir.get('saadi', 2, 255);     // tafsir of Ayat al-Kursi
db.quran.search('الكوثر');          // tashkeel-insensitive, [{surah:108,…}]
db.getStats();                      // { quranVerses: 6236, hadithTotal: 30189, … }
```

Low-memory lazy engine (v2 — 46 MB RSS instead of ~950 MB, opens in ~38 ms):

```js
import { IslamEngineV2 } from './index.js';

const db = IslamEngineV2.open('islam-v2.pack'); // reads only a 9.8 KB index
db.getAyah(112, 4, 'shubah');
db.getAyahsBatch([[2, 255], [2, 256], [108, 1]]); // grouped by block: 1 decompress per surah
db.searchHadith('الاعمال بالنيات');  // normalized: no tashkeel/hamza needed
db.searchTafsir('الكرسي', 5, 'saadi');
db.searchAll('الرحمن', { quran: 20, hadith: 20, tafsir: 10 });
db.close();
```

## API reference

### Quran (`db.quran`)

| Method | Description |
|---|---|
| `getAyah(surah, ayah, riwayah='hafs')` | Verse text; falls back to hafs when a riwayah has no farsh there. `riwayah ∈ hafs, warsh, qalun, duri, shubah` |
| `getSurah(surah, riwayah='hafs')` | Whole surah, ordered `[{surah, ayah, text}]` |
| `getSurahInfo(id)` / `getAllSurahs()` | Frozen metadata (name, type, ayah count). Immutable — assignment throws |
| `search(query, limit=50)` | Normalized substring search over all 6,236 verses |
| `getCount()` | 6236 |

Out-of-range surah/ayah/riwayah throw `TypeError`/`RangeError` with Arabic messages.

### Hadith (`db.hadith`)

| Method | Description |
|---|---|
| `get(book, number)` | Text or `null`. Accepts floats (`402.2`) and numeric strings |
| `count(book)` | Per-book count |
| `totalCount()` | 30189 |

Books: `bukhari, muslim, abudawud, tirmidhi, nasai` (name or 0–4).

### Tafsir (`db.tafsir`)

| Method | Description |
|---|---|
| `get(book, surah, ayah)` | Validated commentary text or `null` |
| `totalCount()` | 31121 |

Books: `jalalayn, saadi, ibn_kathir, baghawi, qurtubi`.

### v2 extras (`IslamEngineV2`)

Same getters plus `searchHadith`, `searchTafsir`, `searchAll`, batch getters,
`getStats()`, `memoryStats()`. Remember `db.close()`.

## Search & normalization

One canonical normalizer (`src/normalize.js`, `normalizeArabicSuper`) is used
at index- and query-time, so queries need no tashkeel, hamza variants, or
`ة/ى` exactness: it strips all vocalization/Quranic marks/tatweel, unifies
`إأآٱ→ا`, `ى→ي`, `ة→ه`, decomposes `ﷲ→الله`, folds Arabic digits to ASCII,
removes punctuation, and is idempotent (`N(N(x)) === N(x)`, tested).

## HTTP server

```bash
npm start   # http://localhost:3000 (PORT=… to override)
```

Serves `app.html` (Arabic explorer UI) plus a read API
(with CSP/HSTS/nosniff, 30 MB upload cap, decompression-bomb guard):

| Endpoint | Example |
|---|---|
| `GET /api/health` | stats + loaded flag |
| `GET /api/ayah?surah=2&ayah=255&riwayah=hafs` | single verse |
| `GET /api/surah?surah=112` | whole surah |
| `GET /api/surahs` | metadata |
| `GET /api/search?q=الكوثر&limit=10` | verse search |
| `GET /api/hadith?book=bukhari&number=1` | hadith |
| `GET /api/tafsir?book=saadi&surah=1&ayah=1` | tafsir |
| `POST /api/load-pack` | verify + inspect an uploaded pack |

## Scripts

| Command | What it does |
|---|---|
| `npm test` | `verify` (SHA-256 + counts) + `api.test` (15 behavior tests) + `v2.test` (lazy engine + v1 parity) |
| `npm run build` | rebuild v1 packs from `data/` (validates 6236 / 30189 / ≥30000 first) |
| `npm run build:v2` | rebuild `dist/islam-v2.pack` (217 lazy blocks) |
| `npm run demo` / `npm run benchmark` | console demo / load + retrieval timings |
| `npm start` | HTTP server |

## Project structure

```
index.js            public API (v1 + v2 engines, constants, normalizer)
src/engine.js       v1 engine: full in-RAM index, O(1) maps
src/engine_v2.js    v2 engine: lazy fd-based blocks, batch + full search
src/packv2.js       v2 pack builder (also: --tiny test packs)
src/compiler.js     v1 pack builder (qh/qt/full, strict validation)
src/mphf.js         collision-free 32-bit key packing + avalanche hash
src/normalize.js    canonical super-normalizer (single source of truth)
src/qiraat.js       the 12 farsh variants (shared by all builders)
serve.js + app.html HTTP API + Arabic explorer UI
pipeline/fetch_all.js data acquisition (quran w/ redirect cap + timeout)
test/               verify.js (integrity) · api.test.js (behavior) · v2.test.js
data/               raw corpora (quran + hadith/ + tafsir/)
dist/               built, sealed packs (tracked so CI/tests run instantly)
SOURCES.md          provenance & methodology
```

## Known data notes (upstream, not bugs)

- **374 hadith texts are empty strings in the source** (Muslim 203, Tirmidhi 74,
  Nasa'i 86, Bukhari 9, Abu Dawud 2) → `get()` returns `null` for them.
- **Saadi tafsir covers 6,177/6,236 verses** (59 verse-keys absent upstream) →
  `get()` returns `null` there; the other four tafsirs cover all 6,236.
- Independent audit scripts verified: per-surah verse counts, per-book hadith
  counts, sort order, key uniqueness, all 12 variants distinct from base, and
  **full v1↔v2 parity over 92,490 records with 0 mismatches**.

## Performance (measured, AMD Ryzen 5 PRO 7530U)

| | v1 | v2 |
|---|---|---|
| Open/load | 1647 ms | 38 ms |
| Resident memory | ~950 MB | ~46 MB |
| Verse fetch (hot) | <1 µs | ~2 µs |
| Verse fetch (cold block) | <1 µs | ~160 µs |
| Batch 200 hadith | — | 6 ms |
| Quran search | ~3 ms | ~6 ms |
| Hadith search (warm) | — | ~10 ms |

## License

[CC BY-NC 4.0](LICENSE) — free for non-commercial use with attribution.
See [SOURCES.md](SOURCES.md) for data provenance.
