-- ============================================================================
-- SKEMA DATABASE POSTGRESQL (GOOGLE CLOUD SQL / CLOUD RUN) - NEURONNA AI
-- ============================================================================

-- Ekstensi UUID (opsional jika menggunakan gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TABEL PENGGUNA (users)
-- Menyimpan profil akun, peran (RBAC), saldo kredit render, dan status verifikasi manual
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(30) NOT NULL DEFAULT 'user',            -- 'founder', 'admin', 'creator', 'user'
    credits INTEGER NOT NULL DEFAULT 0,                 -- Saldo kredit render video/gambar
    status_aktif BOOLEAN NOT NULL DEFAULT FALSE,        -- FALSE saat baru daftar, TRUE setelah diverifikasi Founder via WA
    package_tier VARCHAR(50) DEFAULT 'early_bird_lifetime', -- 'early_bird_lifetime', 'free_tier', 'custom'
    phone_wa VARCHAR(30),                               -- Nomor WhatsApp aktif pembeli (format internasional 628...)
    transfer_proof_url TEXT,                            -- Bukti pembayaran manual jika diunggah
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexing untuk pencarian cepat berdasarkan email, role, dan nomor WhatsApp
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status_aktif ON users(status_aktif);
CREATE INDEX IF NOT EXISTS idx_users_phone_wa ON users(phone_wa);

-- ----------------------------------------------------------------------------
-- 2. TABEL LOG TRANSAKSI KREDIT (credit_transactions) - Opsional / Audit Trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,                            -- Positif untuk top-up/bonus (+150), Negatif untuk konsumsi render (-15)
    action_type VARCHAR(50) NOT NULL,                   -- 'INITIAL_ACTIVATION', 'SCENE_RENDER_VEO', 'SCENE_RENDER_RUNWAY', 'KEYFRAME_IMAGE', 'MANUAL_TOPUP'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. SEEDING AKUN FOUNDER UTAMA (Default Root Account)
-- ----------------------------------------------------------------------------
INSERT INTO users (id, email, name, role, credits, status_aktif, package_tier, phone_wa, created_at, updated_at)
VALUES (
    'founder_root_001',
    'founder@neuronna.ai',
    'Founder Neuronna',
    'founder',
    999999,
    TRUE,
    'early_bird_lifetime',
    '6281234567890',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE 
SET status_aktif = TRUE, 
    role = 'founder',
    credits = 999999;
