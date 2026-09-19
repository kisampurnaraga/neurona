# NEURONA — AI Video Production Operating System

Mengubah satu kalimat perintah Bahasa Indonesia menjadi video jadi: naskah → storyboard → gambar → klip video → suara → subtitle → render final.

Terdapat **8 studio** produksi: Animasi, Edukasi, Affiliate, Film, Video Ads, Brand Commercial, Cinematic, dan Quick Create.

```
User: "buatkan animasi 20 detik tentang petualangan kucing"
  → IntentRouter mendeteksi studio + konfigurasi
  → BATARA (Creative Strategist) menyusun konsep
  → SINTA (Storyboard Director) menyusun adegan + prompt
  → ⏸  MENUNGGU PERSETUJUAN USER
  → Generasi gambar (konsistensi karakter terjaga)
  → Generasi video per adegan dengan fallback antar-provider
  → QA Audit (skor + auto-fix prompt)
  → TTS + subtitle
  → Render FFmpeg → video final + marketing copy
```

---

## Menjalankan

### Prasyarat
- **Node.js 22+**
- Tidak perlu ffmpeg terpisah — `ffmpeg-static` sudah menyertakan binary-nya

### Instalasi

```bash
npm install
cp .env.example .env      # lalu isi minimal FOUNDER_ACCESS_KEY
```

> Jika `npm install` gagal saat membangun `better-sqlite3` (mis. karena `nodejs.org` tidak dapat diakses), gunakan `npm install --ignore-scripts` — `better-sqlite3` v13 sudah menyertakan prebuilt binary untuk linux-x64 / darwin / win32.

### Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan server pengembangan (Express + Vite middleware) di `http://localhost:3000` |
| `npm run build` | Build frontend ke `dist/` + bundle server ke `dist/server.cjs` |
| `npm start` | Jalankan hasil build produksi |
| `npm run lint` | Type check (`tsc --noEmit`) |
| `npm test` | Jalankan test regresi (Vitest) |
| `npm run test:watch` | Test dalam mode watch |
| `npm run test:audit` | Skrip audit manual (domain config & OAuth origin) |

---

## Environment Variables

Lihat `.env.example` untuk daftar lengkap. Yang **wajib** untuk produksi:

| Variabel | Fungsi | Bila kosong |
|---|---|---|
| `FOUNDER_ACCESS_KEY` | Master key login Founder **dan** kunci enkripsi AES-256-GCM untuk kredensial provider | Aplikasi membuat kunci acak di `.neurona_master_key` (gitignored). **Jangan dibiarkan kosong di produksi.** |
| `WORKER_SECRET` | Otentikasi antara Cloud Tasks dan endpoint worker render | Endpoint worker menolak semua request (HTTP 503) |
| `JWT_SECRET` | Kunci penandatangan sesi JWT | Kunci acak dibuat per-proses → semua sesi hangus setiap restart |

Kredensial provider AI (opsional, bisa juga diisi lewat Founder Control Center):

| Variabel | Provider |
|---|---|
| `GEMINI_API_KEY` / `GEMINI_API_KEYS` | Google Gemini (LLM utama) |
| `OPENAI_API_KEY` | OpenAI (fallback LLM + TTS) |
| `FAL_KEY` / `FAL_API_KEYS` | Fal.ai |
| `BYTEPLUS_API_KEY` | BytePlus ModelArk / Seedance |
| `OPENART_*` | OpenArt MCP |
| `VEO_API_KEY` | Google Veo |
| `GOOGLE_CLOUD_PROJECT`, `GCS_BUCKET_NAME`, `CLOUD_TASKS_QUEUE` | Cloud Storage & Cloud Tasks |

Sistem melaporkan status tiap provider secara jujur saat boot (`NOT_CONFIGURED` / `READY`). Tanpa kredensial, aplikasi tetap berjalan dan UI tetap bisa dijelajahi.

---

## Arsitektur

```
server.ts                  Entry point Express (~3.200 baris, ~105 endpoint API)
│
├── server/
│   ├── orchestrator.ts    State machine produksi (15 status, sweeper job macet)
│   ├── llmService.ts      Abstraksi LLM + fallback Gemini ↔ OpenAI
│   ├── imageService.ts    Generasi gambar multi-provider
│   ├── keyRotator.ts      Rotasi API key + cooldown + enkripsi AES-256-GCM
│   ├── creditService.ts   Kalkulasi harga kredit (USD → IDR → kredit)
│   ├── videoRenderService.ts / VideoEditor.ts   Pipeline FFmpeg
│   ├── providers/         6 adapter provider (Higgsfield, OpenArt, Fal, Veo, BytePlus, Mock)
│   ├── services/          19 layanan: TTS, QA audit, GCS, OAuth, domain config, dsb.
│   ├── routes/            videoStudio, workerRoute, founderPayment
│   ├── middleware/auth.ts JWT + RBAC + userDatabase
│   └── utils/             crypto, ssrf, auditLogger, credentialValidator
│
├── src/
│   ├── App.tsx            Shell utama + chat + HUD
│   ├── components/        37 komponen UI
│   ├── server/fcc/FounderService.ts    Backend Founder Control Center
│   ├── server/core/IntentRouter.ts     NLU rule-based Bahasa Indonesia
│   ├── shared/modelCatalog.ts          Katalog model terpadu
│   ├── shared/types.ts                 Tipe domain
│   ├── utils/authFetch.ts              Interceptor JWT otomatis
│   └── db/                Schema Drizzle + koneksi SQLite
│
└── tests/                 Test regresi (Vitest) + skrip audit manual
```

**Stack:** React 19 · Vite 6 · Tailwind 4 · Express 4 · SQLite (better-sqlite3) + Drizzle ORM · FFmpeg · `@google/genai` · `openai`

### Aturan routing model

`src/shared/modelCatalog.ts` menetapkan dua aturan yang **tidak boleh dilanggar**:

1. **Nama tampilan tidak pernah menjadi kunci routing.** Routing selalu memakai `provider + internalModelId`.
2. **Model Higgsfield dan OpenArt tidak boleh saling dieksekusi.**

Dilanggarnya aturan ini berarti pekerjaan dikirim ke provider yang salah dan kredit terbuang. Ada test khusus untuk menjaganya.

### Kredit

```
biaya USD model × multiplier resolusi
  → × marginMultiplier (default 1.8)
  → × exchangeRate (default 16.000)
  → ÷ creditValueIdr (default 20)
  → dibulatkan ke atas ke kelipatan 5 (minimum 5 kredit)
```

Founder tidak dikenai kredit (`isFounderBypass`). Harga dapat diubah langsung dari Founder Control Center.

---

## Keamanan

Model otorisasi sudah diperbaiki menyeluruh. **Satu aturan yang harus dijaga:**

> **Jangan pernah menjaga rute terproteksi dengan header yang dikirim klien** (seperti `x-role`). Gunakan middleware yang memverifikasi JWT.

| Middleware | Kegunaan |
|---|---|
| `requireFounder` | Rute Founder Control Center (`/api/fcc/*`). Verifikasi JWT + role `founder` dari database. |
| `verifyToken` | Rute yang butuh login. Juga menerima `?token=` **hanya untuk GET** (EventSource tidak bisa mengirim header). |
| `requireProjectOwnership` | Rute ber-cakupan proyek. Selalu gabungan `[verifyToken, requireProjectAccess(getProjectById)]`. |
| `requireCredits(n)` | Menolak bila saldo kredit kurang (founder dikecualikan). |

Ketentuan lain:
- Kredensial provider dienkripsi **AES-256-GCM** di database. Kunci berasal dari `FOUNDER_ACCESS_KEY`.
- Endpoint worker render **fail-closed**: menolak semua request bila `WORKER_SECRET` kosong.
- Route proxy (`/api/proxy-image`, `/api/proxy-video`) dilindungi allowlist domain + pemeriksaan DNS-rebinding.
- Semua request `/api` se-origin dari browser otomatis membawa JWT lewat `src/utils/authFetch.ts` — tidak perlu menambahkan header manual di setiap `fetch()`.

`tests/unit/routeGuards.test.ts` memverifikasi hal-hal ini secara statis, sehingga pola rentan tidak bisa kembali tanpa membuat CI gagal.

---

## Test

```bash
npm test
```

118 test mencakup:

| Berkas | Cakupan |
|---|---|
| `auth.test.ts` | JWT (termasuk penolakan token yang dipalsukan), `requireRole`, `requireFounder`, ownership proyek |
| `routeGuards.test.ts` | Audit statis: tidak ada `x-role`, semua rute FCC terjaga, secret tidak di-hardcode |
| `proxySecurity.test.ts` | Guard SSRF |
| `intentRouter.test.ts` | Routing 8 studio dari bahasa alami |
| `modelCatalog.test.ts` | Aturan "nama tampilan bukan kunci routing" |
| `subtitleUtils.test.ts` | Deteksi placeholder subtitle |

Test berjalan terhadap database SQLite sementara (via `NEURONA_DB_PATH`), jadi tidak akan menyentuh data kerja Anda.

`tests/*.ts` di luar `tests/unit/` adalah skrip audit manual, dijalankan dengan `npm run test:audit`.

---

## Catatan Produksi

- **Ganti `FOUNDER_ACCESS_KEY` dan `JWT_SECRET`** sebelum deploy.
- Folder `outputs/` menyimpan database SQLite dan hasil render. Pastikan punya strategi backup — ini satu-satunya tempat data proyek tersimpan.
- Payload awal frontend ±748 kB mentah (±205 kB gzip) — turun dari 1.810 kB (472 kB gzip) setelah komponen berat dipisah dengan `React.lazy`. Founder Control Center, Storyboard Matrix, Video Timeline, dan grafik `recharts` baru diunduh saat benar-benar dibuka.
- Aktivasi akun masih **manual** (transfer Rp 150.000 → konfirmasi WhatsApp → Founder mengaktifkan). Endpoint admin: `POST /api/admin/users/:id/activate`.
