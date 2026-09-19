# ANALISIS MENYELURUH PROYEK NEURONA

**Repo:** `kisampurnaraga/neurona`
**Commit dianalisis:** `287f803` — *"feat: add AUTO execution mode and expand intent logic"*
**Tanggal analisis:** 19 September 2026
**Metode:** pembacaan kode statis + build + boot server + pengujian endpoint secara langsung (live probing)

---

## 1. RINGKASAN EKSEKUTIF

**NEURONA** adalah *AI Video Production Operating System* berbahasa Indonesia: satu aplikasi web yang mengubah satu kalimat perintah menjadi video jadi (naskah → storyboard → gambar → klip video → suara → subtitle → render final), dengan 8 "studio" berbeda (Animasi, Edukasi, Affiliate, Film, Video Ads, Brand Commercial, Cinematic, Quick Create).

**Penilaian singkat:**

| Aspek | Nilai | Catatan |
|---|---|---|
| Kelengkapan fitur | ⭐⭐⭐⭐⭐ | Sangat luas — jauh di atas rata-rata proyek AI video |
| Kualitas arsitektur | ⭐⭐⭐⭐ | Layer provider & intent-router rapi dan terpikirkan |
| Kesehatan build/tipe | ⭐⭐⭐⭐ | `tsc --noEmit` = **0 error**; build produksi sukses |
| **Keamanan** | ⭐ | **3 lubang kritis yang bisa dieksploitasi tanpa login** |
| Kebersihan repo | ⭐ | **334 file skrip sekali-pakai** di root; tanpa README/CI/test |
| Kesiapan produksi | ⭐⭐ | Berjalan, tapi belum layak dibuka ke publik sebelum audit keamanan diperbaiki |

**Kesimpulan utama:** Ini adalah produk yang **secara fungsional sudah sangat matang** tetapi **secara keamanan belum siap produksi**. Terdapat kerentanan yang saya buktikan langsung (dengan `curl`) di mana **siapa pun di internet dapat mengambil alih kendali Founder Control Center hanya dengan menambahkan satu HTTP header**. Ini harus diperbaiki sebelum aplikasi ini di-deploy ke domain publik.

---

## 2. APA YANG DIBANGUN PROYEK INI

### 2.1 Identitas produk

| Item | Isi |
|---|---|
| Nama | NEURONA — "AI Operating System, Production Workspace" |
| Bahasa UI & prompt | Bahasa Indonesia (dengan dukungan output multi-bahasa: `id`, `en`, `ja`, `ko`, `es`, `ar`, `id-en-bilingual`) |
| Target pasar | Kreator konten Indonesia (affiliate TikTok/Shopee, YouTuber, edukasi) |
| Model bisnis | **Early Bird Lifetime Pass — Rp 150.000 sekali bayar → 150 kredit**, aktivasi akun manual oleh Founder via WhatsApp, top-up kredit tambahan |
| Arsitektur auth | JWT 7 hari + RBAC (`founder` / `admin` / `user`) + verifikasi akun manual |
| Nama agen internal | BATARA (Creative Strategist), SINTA (Storyboard Director), dan 6 agen lain |

### 2.2 Delapan "Studio" (jenis produksi)

Didefinisikan di `src/shared/types.ts` sebagai `VideoType`:

`ANIMATION` · `EDUCATIONAL` · `AFFILIATE` · `FILM` · `VIDEO_ADS` · `BRAND_COMMERCIAL` · `CINEMATIC` · `QUICK_CREATE`

Masing-masing punya konfigurasi sendiri (`AnimationConfig`, `EducationalConfig`, `AffiliateConfig`, `FilmConfig`, `VideoAdsConfig`, `QuickCreateConfig`) dengan opsi art style, bahasa, rasio aspek, tone narator, dsb. — ini desain yang bagus: konfigurasi terstruktur, bukan sekadar string prompt bebas.

---

## 3. ARSITEKTUR & TEKNOLOGI

### 3.1 Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 + `motion` (Framer Motion) + `lucide-react` + `recharts` |
| Backend | Express 4 (`server.ts`, 3.298 baris) dijalankan via `tsx` |
| Database | **SQLite** via `better-sqlite3` + **Drizzle ORM** |
| Media | `ffmpeg-static` + `fluent-ffmpeg` (render & muxing video) |
| AI LLM | `@google/genai` (Gemini) + `openai` (GPT-4o sebagai fallback) |
| AI Video/Gambar | 6 provider: **Higgsfield MCP**, **OpenArt MCP**, **Fal.ai**, **Google Veo**, **BytePlus/Seedance**, **Mock** |
| TTS | OpenAI TTS, ElevenLabs, Google Cloud TTS, Web Speech |
| Cloud | `@google-cloud/storage` (GCS), `@google-cloud/tasks` (Cloud Tasks queue) |
| Auth | `jsonwebtoken` + `bcryptjs` (dan `firebase-admin`, lihat §7.5) |

**30 dependensi runtime, 9 devDependencies, 532 paket terpasang.** Tidak ada framework berat — pilihan yang wajar.

### 3.2 Struktur direktori (inti)

```
neurona/
├── server.ts                    # 3.298 baris · entry point + ~105 endpoint API
├── server/
│   ├── orchestrator.ts          # 2.475 baris · MESIN STATE MACHINE produksi
│   ├── llmService.ts            # 1.588 baris · abstraksi LLM + fallback Gemini↔OpenAI
│   ├── imageService.ts          # 1.628 baris · generasi gambar multi-provider
│   ├── keyRotator.ts            # rotasi API key + cooldown + enkripsi AES-256-GCM
│   ├── creditService.ts         # kalkulasi harga kredit (USD → IDR → kredit)
│   ├── videoRenderService.ts    # FFmpeg render pipeline
│   ├── VideoEditor.ts           # stitching, transisi
│   ├── falQueueRunner.ts        # polling job async Fal.ai
│   ├── falModelConfig.ts        # katalog model Fal
│   ├── providers/               # 6 adapter (↔ src/server/providers)
│   ├── services/                # 19 layanan: TTS, QA auditor, GCS, OAuth, dsb.
│   ├── routes/                  # videoStudio, workerRoute, founderPayment
│   ├── middleware/auth.ts       # JWT + RBAC + userDatabase
│   └── utils/                   # crypto, ssrf, auditLogger, credentialValidator
├── src/
│   ├── App.tsx                  # 2.405 baris · shell utama + chat + HUD
│   ├── components/              # 37 komponen (25.091 baris!)
│   ├── server/fcc/FounderService.ts  # 2.084 baris · backend Founder Control Center
│   ├── server/core/IntentRouter.ts   # NLU rule-based Bahasa Indonesia
│   ├── server/providers/        # MediaProviderRouter + 6 adapter
│   ├── shared/modelCatalog.ts   # katalog model terpadu (provider + model + harga)
│   ├── shared/types.ts          # 1.400+ baris tipe domain
│   └── db/                      # schema Drizzle + koneksi SQLite
└── tests/                       # 9 skrip audit manual (bukan test otomatis)
```

**Total ±57.000 baris kode TypeScript/TSX yang relevan (di luar file skrip sekali-pakai).**

### 3.3 Keputusan desain yang bagus

Beberapa hal yang menurut saya **benar dan terpikirkan matang**:

1. **`src/shared/modelCatalog.ts` — "display name is never a routing key".**
   Katalog ini menegaskan aturan: routing selalu pakai `provider + internalModelId`, nama tampilan hanya untuk UI. Ada dukungan `isLegacyAlias` / `aliasOf` untuk kompatibilitas mundur. Ini mengatasi bug klasik "ganti label di UI → routing rusak".

2. **`MediaProviderRegistry` + `MediaProviderRouter` yang terpisah dari adapter.**
   Adapter (`HiggsfieldMCPAdapter`, `OpenArtMCPAdapter`, dst.) hanya tahu cara bicara dengan provider; pemilihan provider & strategi biaya ada di router/registry. Bagus untuk pemeliharaan — walaupun saat ini `getVideoProvider()` di `providers/index.ts` masih punya rantai `if/else` panjang yang menduplikasi logika router.

3. **Key Rotator dengan cooldown & enkripsi.**
   `server/keyRotator.ts` menyimpan API key terenkripsi **AES-256-GCM** di SQLite, punya state `ACTIVE`/`COOLDOWN`/`DISABLED`, pencatatan `totalRequests`/`totalErrors`, dan validasi format key per provider (mis. key `AQ.*` ditolak untuk Gemini). Ini pola rotasi key yang serius, bukan asal ganti key.

4. **SSRF guard yang sadar DNS-rebinding.**
   `server/utils/ssrf.ts` tidak hanya memakai whitelist domain, tetapi juga **me-resolve DNS** dan menolak jika host mengarah ke IP privat (`10.*`, `172.16-31.*`, `192.168.*`, `127.*`, `169.254.*`, `::1`, `fc00::/7`, `fe80::/10`). Ini proteksi yang sering dilupakan orang.

5. **State machine produksi yang eksplisit.**
   `ProductionState` mendefinisikan 15 status (`BRIEFING → STORYBOARDING → AWAITING_APPROVAL → PRODUCING → ASSEMBLING → AUDIO → EDITING → QA → COMPLETED`), plus `QUOTA_FALLBACK_PENDING` untuk kasus kuota AI habis. Ada `startStaleJobSweeper()` untuk membersihkan job yang menggantung — tanda sudah dipakai di dunia nyata.

6. **Structured 404 untuk API.**
   `app.all('/api/*')` menjamin API selalu balas JSON 404, tidak pernah jatuh ke `index.html`. Detail kecil yang menunjukkan kematangan.

7. **Migrasi password plaintext → bcrypt otomatis.**
   `userDatabase.verifyPassword()` mendeteksi password lama yang masih plaintext, memverifikasinya sekali, lalu **langsung meng-hash dengan bcrypt dan menghapus plaintext-nya**. Ada juga `tokenVersion` untuk invalidasi sesi paksa saat password diganti.

8. **Buffer nyata untuk kegagalan provider.**
   Ada `ProviderStatus` (`NOT_CONFIGURED`/`READY`/`DEGRADED`/`QUOTA_EXCEEDED`/`TIMEOUT`/…), `ProviderError` dengan flag `retryable`, mode `QUOTA_FALLBACK_PENDING` yang meminta persetujuan user, serta `renderSceneVideoWithFallback()`. Sistem ini dirancang untuk *tidak* mati saat satu API provider down — pertimbangan produksi yang matang.

---

## 4. ALUR BISNIS INTI

```
User mengetik: "buatkan animasi 20 detik tentang petualangan kucing"
        │
        ▼
[1] ConversationalIntentRouter (src/server/core/IntentRouter.ts)
    Regex Bahasa Indonesia → mendeteksi intent + studio + quickConfig
    Contoh pola: "animasi|anime|3d pixar|ghibli|shinkai" → ANIMATION
                 "edukasi|pembelajaran|explainer"          → EDUCATIONAL
                 "iklan|komersial|promo"                   → VIDEO_ADS
        │
        ▼  action: START_PRODUCTION, videoType: ANIMATION
[2] ProductionOrchestrator.start()
    ├─ BATARA (Creative Strategist)  → konsep, hook, audiens
    ├─ SINTA  (Storyboard Director)  → scene, prompt gambar, prompt video
    └─ status → AWAITING_APPROVAL  ← ⏸ HUMAN-IN-THE-LOOP
        │
        ▼  user klik "Lanjut"
[3] Generasi Gambar  → imageService (Higgsfield/OpenArt/Fal/Veo)
    Konsistensi karakter via CharacterProfile + referenceImageUrls
        │
        ▼
[4] Generasi Video per scene → MediaProviderRouter → adapter terpilih
    Polling job async + retry + fallback provider
        │
        ▼
[5] QA Audit (qaAuditAgent.ts)
    Skor 0-100, breakdown: productLockConsistency / visualPromptAdherence / narrativeFlow
    Threshold diatur dari FCC (qaMinScoreThreshold, qaAutoFixThreshold)
    → Auto-fix prompt jika skor di bawah ambang
        │
        ▼
[6] TTS (ttsService) + Subtitle (subtitleStyles → ASS format)
        │
        ▼
[7] FFmpeg render (videoRenderService + VideoEditor)
    stitch, transition, burn subtitle, mux audio → final.mp4
        │
        ▼
[8] Simpan ke GCS (storageService) + showcase gallery + marketing copy
    (caption & hashtag terpisah untuk TikTok / Instagram / YouTube)
```

**Yang saya hargai:** ada *human approval gate* di langkah 2, dan ada **QA loop dengan auto-fix** di langkah 5. Banyak proyek serupa langsung render tanpa kontrol kualitas — di sini malah ada agen QA khusus.

**Monetisasi detail** (`server/creditService.ts`):
```
Biaya USD model × multiplier resolusi
  → × marginMultiplier (default 1.8)
  → × exchangeRate (default 16.000)
  → ÷ creditValueIdr (default 20)
  → dibulatkan ke atas ke kelipatan 5 (minimum 5 kredit)
```
Harga ini bisa diubah live dari Founder Control Center, dan ada `isFounderBypass` (founder tidak dikenai kredit). Bagus: perhitungan ada di satu tempat, bukan tersebar.

---

## 5. 🔴 TEMUAN KEAMANAN — Kritis

> **Semua temuan di bawah sudah saya buktikan langsung dengan `curl` terhadap server yang berjalan.** Bukan sekadar dugaan dari membaca kode.

### 5.1 KRITIS — Founder Control Center bisa diambil alih dengan 1 header palsu

**Lokasi:** `server.ts` — 27 rute memakai pola guard yang salah:

```ts
if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden...'});
```

`x-role` adalah **header HTTP yang dikirim oleh klien** — tidak ada tanda tangan, tidak ada JWT, tidak ada validasi apa pun. Siapa pun cukup mengirim `x-role: founder` dan langsung dianggap Founder.

**Bukti (dijalankan di sandbox ini):**

```bash
# Tanpa header → ditolak
curl http://localhost:3000/api/fcc/config
# → HTTP 403 {"error":"Forbidden. Founder access required."}

# Dengan header palsu → TEMBUS
curl -H 'x-role: founder' http://localhost:3000/api/fcc/config
# → HTTP 200  {"providers":[{"id":"higgsfield",... "endpoint":"https://mcp.higgsfield.ai/mcp"...}]}
```

**Dampak:** penyerang tanpa akun bisa:
- Membaca seluruh konfigurasi platform (provider, endpoint, model, kunci ter-mask, statistik biaya)
- Mengubah pengaturan engine LLM / image / video, flag, dan ambang QA (mis. turunkan QA jadi 0 untuk melewati kontrol kualitas)
- **Menulis ulang kredensial & endpoint provider.** Pada `FounderService.saveProviderConfig('openart', { apiKey, endpoint })`, nilai `endpoint` ditulis ke `process.env.OPENART_MCP_ENDPOINT` dan `apiKey` disimpan ke tabel `api_keys`. Artinya penyerang bisa **mengarahkan seluruh traffic media generation platform ke server MCP miliknya** dan menyuntikkan kunci API-nya sendiri.
- Melihat daftar kunci API ter-mask dan menghapusnya (`/api/fcc/key-rotator/clear-all` saya konfirmasi balas HTTP 200 tanpa autentikasi).

**Ironisnya**, sisi frontend (`src/FounderControlCenter.tsx`) memang **hanya mengirim header itu** dan tidak pernah mengirim JWT — jadi ini bukan sekadar bug kecil, melainkan model otorisasi yang memang dirancang salah. Ada sistem JWT asli di `/api/auth/founder-login` + `verifyToken` + `requireRole(['founder'])`, tetapi rute `/api/fcc/*` tidak memakainya.

### 5.2 KRITIS — `/api/fcc/key-rotator/*` sama sekali tanpa autentikasi

Berbeda dari rute FCC lain yang setidaknya punya cek header, keluarga rute key-rotator **tidak punya cek apa pun**:

```bash
curl http://localhost:3000/api/fcc/key-rotator
# → HTTP 200 {"gemini":[], "veo":[], "openai":[], "fal":[]}

curl -X POST http://localhost:3000/api/fcc/key-rotator/add \
     -d '{"provider":"gemini","key":"INVALID_TEST_KEY_123"}'
# → HTTP 200 {"success":true,"count":1,...}   ← berhasil menyuntikkan key!
```

Saya berhasil menyuntikkan kunci ke database key rotator tanpa kredensial apa pun, lalu membersihkannya kembali. Endpoint `delete`, `reactivate`, dan `clear-all` juga terbuka.

### 5.3 SEDANG-TINGGI — Rute produksi & proyek tanpa autentikasi

Rute-rute ini menerima permintaan tanpa token:

| Rute | Risiko |
|---|---|
| `POST /api/render` | Memicu render video (membakar kredit/biaya API nyata). Membalas `{"status":"SUCCESS","message":"User 'default-user' tidak ditemukan..."}` — tidak dieksekusi hanya karena user default tidak ada, bukan karena diblokir. |
| `POST /api/projects/:id/generate-scene-video` | Membakar biaya provider |
| `POST /api/projects/:id/generate-all-images` | Membakar biaya provider |
| `GET /api/projects` | Mengembalikan **seluruh proyek semua user** |
| `DELETE /api/projects/:id/hard` | Hapus permanen |
| `GET /api/projects/deleted` | Daftar proyek terhapus |
| `POST /api/projects/:id/toggle-showcase` | Mengubah galeri publik |
| `GET /api/projects/:id/stream`, `/events` | Streaming progres (SSE) proyek siapa pun |
| `POST /api/tts` | Menggunakan kredit TTS platform |
| `GET /api/proxy-video`, `/api/proxy-image` | Proxy terbuka (ada guard SSRF, tapi tetap beban) |

Catatan: `GET /api/projects` dan `GET /api/videos/:name` memang dipakai halaman publik (Landing Page & showcase), jadi sebagian mungkin sengaja publik — tetapi `generate-*`, `render`, dan `hard delete` jelas **bukan** untuk publik.

### 5.4 SEDANG — Kunci enkripsi cadangan yang di-hardcode

`server/utils/crypto.ts`:
```ts
const MASTER_SECRET = process.env.FOUNDER_ACCESS_KEY || 'NEURONA_MASTER_ENCRYPTION_KEY_2026_PROD';
```

Jika `FOUNDER_ACCESS_KEY` tidak di-set (dan di `.env.example` nilainya memang **kosong**), maka seluruh API key provider di database dienkripsi dengan kunci yang **tertulis di repo publik ini**. Siapa pun yang punya file `outputs/sqlite.db` bisa mendekripsi semua kunci.

Hal serupa: `server/routes/workerRoute.ts` dan `server/services/queueService.ts` memakai fallback `'neuronna-internal-worker-secret-2025'` (yang juga ada di `.env.example`), sehingga endpoint worker bisa dipanggil siapa saja.

### 5.5 RENDAH — Isu lain

- **Dua sistem autentikasi paralel:** `server/middleware/auth.ts` (JWT asli) dan `src/middleware/auth.ts` (verifikasi Firebase ID token). Yang kedua sepertinya sisa dan tidak dipakai oleh rute mana pun — kebingungan yang berbahaya.
- **`firebase-applet-config.json`** berisi `apiKey` Google yang ter-commit. Kunci web Firebase memang didesain publik, tapi tetap sebaiknya tidak di dalam repo.
- **`GET /api/proxy-image`** mengizinkan `google.com` dan `googleapis.com` di whitelist — terlalu luas, bisa dipakai untuk open proxy ke layanan internal Google.
- **`express.json({ limit: '200mb' })`** — DoS mudah (memori server habis) karena endpoint terbuka menerima body 200 MB.
- **`uncaughtException` handler tidak mematikan proses** (kecuali EADDRINUSE), sehingga server bisa berjalan dalam state rusak.
- **Email Founder ter-hardcode**: `ia.asep12@gmail.com` dan `founder_root_001` muncul di kode.
- **`GET /api/fcc/pricing` terbuka** — pesaing bisa membaca `marginMultiplier: 1.8` dan struktur biaya Anda.

---

## 6. 🟠 TEMUAN KUALITAS KODE

### 6.1 Root direktori kacau — 334 file skrip sekali-pakai

Root repo berisi **433 file**, dan mayoritas adalah sampah proses development yang ter-commit:

| Pola nama | Jumlah |
|---|---|
| `fix_*.cjs` / `fix_*.py` / `fix_*.ts` | 136 |
| `patch_*.cjs` / `patch_*.sh` / `patch_*.ts` | 125 |
| `check*.ts` / `test*.ts` / `check*.cjs` (ad-hoc) | 97 |
| `update_*.cjs` / `update_*.py` | 24 |
| Sisa skrip lain (`clear_keys`, `get_logs3`, `rewrite_auth`, `move_effect2`, …) | 312 |

Isinya adalah skrip *one-shot* seperti `fix_div.cjs`, `fix_div2.cjs`, `fix_lint2.cjs`, `fix_lint3.cjs`, `fix_keyrotator2.cjs`, `fix_keyrotator3.cjs`, `fix_test_endpoint2/3/4.cjs`. Ini adalah **rekaman jejak AI agent yang mengedit repo secara langsung** — bukan kode produk. Tidak satu pun di-import oleh aplikasi.

Sampah lain di root: `broken_auth.txt` (potongan kode React), `fallback_code.txt`, `local.db` (0 byte), `neurona.db` (0 byte), `list.txt`, `proj.json`, `projects.json` (dump data user), `server/routes/resync.ts` (**0 byte**), `server/middleware/auth.ts.patch`.

**Dampak nyata:** `tsconfig.json` tidak punya `include`, jadi **`npm run lint` mengecek 469 file termasuk semua sampah itu**. Setiap `tsc` membuang waktu, IDE lambat, dan `git grep` hasilnya tidak berguna. Lebih buruk lagi: file `fix_*.cjs` dan `rewrite_auth.cjs` berisi logika modifikasi kode yang membingungkan pembaca berikutnya.

### 6.2 File sumber raksasa (God Files)

| File | Baris |
|---|---|
| `src/components/StoryboardMatrixModal.tsx` | **5.106** |
| `server.ts` | **3.298** |
| `server/orchestrator.ts` | 2.475 |
| `src/App.tsx` | 2.405 |
| `src/server/fcc/FounderService.ts` | 2.084 |
| `src/components/HolographicHudNode.tsx` | 1.887 |
| `server/imageService.ts` | 1.628 |
| `server/llmService.ts` | 1.588 |
| `src/FounderControlCenter.tsx` | 1.584 |
| `src/server/providers/OpenArtMCPAdapter.ts` | 1.504 |

`server.ts` berisi **3.298 baris dengan ~105 endpoint** dalam satu file. Ini menyulitkan pencarian bug (dan memang, bug keamanan §5.1 muncul karena guard yang tersebar 27 kali secara manual, bukan lewat middleware terpusat).

`StoryboardMatrixModal.tsx` sebesar 300 KB / 5.106 baris adalah kandidat utama untuk dipecah.

### 6.3 Duplikasi & kode mati

- **`src/utils/subtitleUtils.ts` ≡ `server/utils/subtitleUtils.ts`** — dua file **identik** (verified via `diff`).
- **`src/types/production.ts`** — mendefinisikan `ProductionProject` & `Scene` **berbeda** dari `src/shared/types.ts` yang sebenarnya dipakai. Hanya di-import oleh `src/server/core/EventBus.ts` untuk satu tipe. Ini sumber kebingungan serius: dua "kebenaran" untuk entitas yang sama.
- **`src/middleware/auth.ts`** (Firebase) — tidak dipakai rute mana pun.
- **`server/ttsService.ts`** hanya re-export `./services/ttsService` (shim, tidak berbahaya tapi mengaburkan).
- **`server/routes/resync.ts`** — file 0 byte.
- **`src/server/core/HermesAdapter.ts`** (281 byte) & **`OpenClawAdapter.ts`** (242 byte) — stub adapter yang tidak diimplementasikan.

### 6.4 Tidak ada infrastruktur kualitas

| Item | Status |
|---|---|
| Test otomatis | ❌ Tidak ada. `package.json` tidak punya script `test`, tidak ada vitest/jest |
| CI/CD | ❌ Tidak ada `.github/` |
| ESLint / Prettier | ❌ Tidak ada. Script `lint` hanyalah `tsc --noEmit` |
| README / dokumentasi | ❌ Tidak ada README, tidak ada `docs/` |
| Lisensi | ❌ Tidak ada |
| Migrasi DB formal | ❌ Tidak ada folder migrasi — migrasi dilakukan manual via `ALTER TABLE` dalam `initTables()` |

`tests/` berisi 9 file, tapi itu **skrip audit manual** (`domain_config_audit.ts`, `runtime_oauth_test.ts`, `live_http_audit.ts`, …) yang mencetak hasil ke console dan harus dijalankan satu per satu. Bukan test yang bisa dijalankan di CI. Bagus sebagai alat debugging, bukan sebagai jaring pengaman regresi.

### 6.5 Bundle frontend tidak dipecah

Hasil `npm run build` (berhasil, 7 detik):

```
dist/index.html                   2,48 kB │ gzip:   0,87 kB
dist/assets/index-*.css         284,09 kB │ gzip:  30,62 kB
dist/assets/index-*.js        1.809,29 kB │ gzip: 471,51 kB   ⚠️
```

Satu chunk JavaScript **1,8 MB (471 KB gzip)** tanpa code-splitting. Untuk aplikasi dengan 37 komponen berat (HUD holografik, timeline, matrix, modal-modal besar), ini menyebabkan *time-to-interactive* lambat di HP kelas menengah — padahal target pengguna adalah kreator mobile-first Indonesia. Vite sendiri sudah memberi peringatan. Perbaikan mudah: `React.lazy()` untuk `FounderControlCenter`, `HolographicHudNode`, `StoryboardMatrixModal`, `VideoTimeline`, dan `manualChunks`.

---

## 7. YANG SUDAH BERJALAN BAIK (terverifikasi)

Supaya penilaian ini berimbang — hal-hal berikut **saya uji dan berhasil**:

| Uji | Hasil |
|---|---|
| `npm install` | ✅ 532 paket (butuh `--ignore-scripts` di sandbox karena `nodejs.org` diblokir; `better-sqlite3` v13 punya prebuild bawaan jadi tetap jalan) |
| `npx tsc --noEmit` | ✅ **0 error** dari 469 file — disiplin tipe sangat baik |
| `npm run build` | ✅ Sukses, 7 detik |
| Boot server (`npx tsx server.ts`) | ✅ Berjalan di `0.0.0.0:3000` tanpa crash |
| Inisialisasi SQLite | ✅ Membuat 5 tabel + index otomatis, ada `quick_check` + pemulihan otomatis jika DB korup |
| Health check `/api/health` | ✅ `{"status":"ok"}` |
| Katalog model `/api/models/catalog` | ✅ 15 model video dengan harga, tier, capabilities |
| Daftar suara `/api/tts/voices` | ✅ Mengembalikan preset suara lengkap |
| Registrasi `/api/auth/register` | ✅ Berhasil membuat user, mengembalikan konfigurasi pembayaran |
| Login user non-aktif | ✅ Diblokir dengan pesan aktivasi WhatsApp yang benar |
| Error handling API | ✅ JSON 404 terstruktur, bukan HTML |
| Health check provider otomatis saat boot | ✅ Melaporkan status Gemini/Veo/Fal/OpenAI/OpenArt dengan jujur (`NOT_CONFIGURED`) |

**Catatan positif penting:** sistem *gagal dengan jujur*. Saat kredensial tidak ada, ia melaporkan `NOT_CONFIGURED` alih-alih berpura-pura bisa. Pola pemulihan DB (deteksi korupsi → hapus → buat ulang) juga menunjukkan sistem ini sudah melewati masa debugging yang panjang.

---

## 8. REKOMENDASI — Berdasarkan Prioritas

### 🔴 P0 — SEBELUM deploy ke domain publik (hitungan jam)

1. **Ganti guard `x-role` dengan JWT sungguhan.** Buat satu middleware `requireFounder` yang memakai `verifyToken` + `requireRole(['founder'])` yang **sudah ada** di `server/middleware/auth.ts`, lalu pasang di semua 27 rute `/api/fcc/*` dan `/api/admin/*`. Hapus seluruh pola `req.headers['x-role'] !== 'founder'`.
   → **Wajib sekaligus mengubah `src/FounderControlCenter.tsx`** agar mengirim `Authorization: Bearer <jwt>` (token dari `/api/auth/founder-login`) dan berhenti mengirim `x-role`. Juga hapus `x-role` dari daftar `Access-Control-Allow-Headers` di `server.ts`.
2. **Amankan `/api/fcc/key-rotator/*`** — tambahkan `verifyToken` + `requireRole(['founder'])` pada kelima rutenya.
3. **Tambahkan autentikasi ke rute produksi** — `POST /api/render`, semua `generate-*`, `DELETE /api/projects/:id/hard`, `POST /api/projects/:id/toggle-showcase`. Gunakan `verifyToken`; tambahkan `requireCredits()` untuk rute yang membakar biaya.
4. **Pisahkan data proyek per user.** `GET /api/projects` harus memfilter `userId === req.user.user_id` untuk non-founder.
5. **Hapus hardcoded fallback secret.** Di `server/utils/crypto.ts` dan `workerRoute.ts`, **gagalkan startup** jika `FOUNDER_ACCESS_KEY` / `WORKER_SECRET` tidak di-set, alih-alih memakai nilai default yang publik.

### 🟠 P1 — Minggu ini

6. **Bersihkan root repo.** Pindahkan 334 file skrip ke `scripts/legacy/` atau hapus. Tambahkan `include: ["src", "server", "server.ts", "tests"]` ke `tsconfig.json` agar `tsc` tidak memeriksa sampah. Hapus `local.db`, `neurona.db`, `list.txt`, `broken_auth.txt`, `fallback_code.txt`, `server/routes/resync.ts`.
7. **Satukan tipe domain.** Hapus `src/types/production.ts`, pindahkan konsumen terakhirnya (`EventBus.ts`) ke `src/shared/types.ts`. Hapus `src/middleware/auth.ts` (Firebase) yang tidak terpakai dan `src/utils/subtitleUtils.ts` (duplikat).
8. **Code-splitting frontend.** `React.lazy()` untuk 5 komponen terberat + `manualChunks`. Target: chunk awal < 400 KB.
9. **Tambahkan test otomatis.** Minimal Vitest untuk jalur paling berisiko: `IntentRouter`, `CreditService.calculateCreditCost()`, `validateProxyUrl()`, dan `MediaProviderRouter` (memilih adapter yang benar untuk tiap model). Ini juga langsung mengamankan aturan "display name is never a routing key".
10. **Balas `Cache-Control: no-store`** pada respons API sensitif, dan turunkan `express.json` limit dari 200 MB ke ±10 MB dengan limit khusus untuk endpoint upload.

### 🟡 P2 — Bulan ini

11. **Pecah `server.ts`** menjadi `server/routes/*.ts` per domain (auth, projects, fcc, media, tts). Target: `server.ts` < 300 baris sebagai bootstrap saja.
12. **Pecah `StoryboardMatrixModal.tsx`** (5.106 baris) menjadi komponen-komponen kecil.
13. **Tambahkan README** berisi arsitektur, cara setup (termasuk catatan bahwa `.env` harus diisi), alur produksi, dan daftar environment variable — plus `.env.example` yang lengkap (saat ini `JWT_SECRET` kosong dan tidak ada penjelasan `FOUNDER_ACCESS_KEY`).
14. **Tambahkan migrasi DB formal** (drizzle-kit `generate` + `migrate`) menggantikan `ALTER TABLE` manual dalam `initTables()`.
15. **Sentralkan pemilihan provider.** `getVideoProvider()` di `providers/index.ts` masih punya rantai `if/else` yang menduplikasi `MediaProviderRouter`; satukan agar hanya ada satu sumber kebenaran routing.
16. **Tambahkan CI** (`.github/workflows/ci.yml`) yang menjalankan `tsc --noEmit`, `npm run build`, dan test — cukup 3 langkah ini untuk mencegah regresi besar.
17. **Ganti `console.log` audit dengan penyimpanan persisten.** `server/utils/auditLogger.ts` saat ini hanya menulis ke stdout; untuk produk berbayar, log audit harus masuk ke tabel/Cloud Logging yang tidak bisa dihapus penyerang.

---

## 9. PENILAIAN AKHIR

Ini **bukan proyek main-main**. Cakupannya besar (57.000 baris, 105 endpoint, 6 provider AI, pipeline video lengkap dengan QA dan TTS), dan bagian-bagian yang paling sulit dalam membangun produk AI video — konsistensi karakter antar-scene, fallback antar-provider, kontrol biaya per model, dan state machine produksi yang bisa pulih dari kegagalan — **sudah dikerjakan dengan pemikiran yang jelas**. Bahwa `tsc --noEmit` bersih di 469 file adalah bukti disiplin yang tidak biasa.

Masalahnya ada di **dua tempat**:

1. **Keamanan.** Model otorisasi `/api/fcc/*` rusak secara fundamental — saya membuktikannya bisa ditembus tanpa akun. Untuk produk yang targetnya membuka pendaftaran publik dan menerima uang, ini adalah penghambat mutlak. Perbaikannya jelas dan terarah (§8 P0), mungkin 1–2 hari kerja karena `verifyToken` dan `requireRole` sudah ada tinggal dipasang.

2. **Higiene engineering.** 334 file sampah, tanpa README, tanpa test, tanpa CI, tanpa lint. Ini biasanya gejala pengembangan cepat dengan bantuan AI agent tanpa *checkpoint* pembersihan. Efeknya nyata: pencegahan regresi nol, dan bug keamanan di §5.1 lolos justru karena tidak ada test yang pernah menguji klaim "hanya founder" pada endpoint itu.

**Urutan kerja yang saya sarankan:** amankan dulu (P0, 1–2 hari) → bersihkan dan tambahkan test (P1, 1 minggu) → baru lanjutkan fitur baru. Setelah P0 dan P1 selesai, proyek ini punya fondasi yang layak untuk benar-benar dijual.

---

*Semua temuan keamanan di dokumen ini telah diverifikasi langsung terhadap instance yang berjalan di sandbox (`http://localhost:3000`). Kunci uji yang saya suntikkan saat pengujian sudah dibersihkan kembali. Perubahan kode yang saya lakukan selama analisis: satu penambahan `allowedHosts: true` pada `vite.config.ts` (diperlukan agar dev server Vite 6 menerima Host dari domain preview/proxy — tanpa ini aplikasi menolak diakses lewat URL apa pun selain localhost).*
