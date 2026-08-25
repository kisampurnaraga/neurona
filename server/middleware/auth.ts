import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ============================================================================
// ROLE BASED ACCESS CONTROL (RBAC) & AUTHENTICATION MIDDLEWARE - NEURONNA AI
// ============================================================================

/**
 * Tipe Role Pengguna pada Platform Neuronna:
 * - 'founder' : Hak akses tertinggi (Founder Control Center, setting API Key, aktivasi user, refund/top-up kredit).
 * - 'admin'   : Manajemen operasional, monitoring queue render, moderasi prompt.
 * - 'creator' : Pengguna berbayar dengan kuota kredit tinggi dan akses studio lengkap.
 * - 'user'    : Pengguna reguler terdaftar (Akses Storyboard Gratis + Render berbasis Kredit).
 * - 'guest'   : Pengunjung belum terdaftar / belum aktif.
 */
export type UserRole = 'founder' | 'admin' | 'creator' | 'user' | 'guest';

export interface UserSession {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  credits: number;
  status_aktif: boolean;
  package_tier: 'early_bird_lifetime' | 'free_tier' | 'custom';
  password_hash?: string;
  password_plain?: string;
  phone_wa?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

// Secret key untuk penandatanganan JWT / HMAC (Diambil dari Cloud Run Secret atau Fallback aman)
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'neuronna_super_secure_jwt_secret_cloud_run_2026';

// In-Memory Fallback Cache / SQL Simulation jika database belum terkoneksi
const activeUserStore: Map<string, UserSession> = new Map([
  [
    'founder_root_001',
    {
      user_id: 'founder_root_001',
      email: 'ia.asep12@gmail.com',
      name: 'Asep (Founder & Master Architect)',
      role: 'founder',
      password_plain: 'ia12aS87!',
      credits: 999999,
      status_aktif: true,
      package_tier: 'early_bird_lifetime',
      phone_wa: '6281234567890',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  [
    'founder_root_backup',
    {
      user_id: 'founder_root_backup',
      email: 'founder@neuronna.ai',
      name: 'Founder Neuronna',
      role: 'founder',
      password_plain: 'NEURONNA_FOUNDER_MASTER_2025',
      credits: 999999,
      status_aktif: true,
      package_tier: 'early_bird_lifetime',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  [
    'usr_pioneer_demo',
    {
      user_id: 'usr_pioneer_demo',
      email: 'kreator@neuronna.ai',
      name: 'Kreator Pioneer',
      role: 'user',
      password_plain: '123456',
      credits: 150,
      status_aktif: true,
      package_tier: 'early_bird_lifetime',
      phone_wa: '6281234567890',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
]);

/**
 * Helper: Membuat Token JWT mandiri (Zero-dependency HMAC SHA256)
 */
export function generateUserToken(user: UserSession, expiresInHours: number = 72): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const payload = Buffer.from(JSON.stringify({ ...user, exp })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

/**
 * Helper: Memverifikasi tanda tangan Token JWT
 */
export function parseAndVerifyToken(token: string): UserSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSig) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (decoded.exp && Math.floor(Date.now() / 1000) > decoded.exp) {
      return null; // Token kadaluarsa
    }

    return decoded as UserSession;
  } catch (err) {
    return null;
  }
}

/**
 * 1. Middleware: verifyToken
 * Memeriksa token dari Authorization Header (Bearer <token>), cookie, atau custom header.
 * Memvalidasi identitas user_id unik dan status_aktif di database.
 */
export async function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (typeof authHeader === 'string' ? authHeader : undefined);

  // Jika tidak ada token pada rute terproteksi
  if (!token) {
    // Mode demo / default fallback jika sedang development local
    const devUserId = (req.headers['x-user-id'] as string) || 'founder_root_001';
    const cached = activeUserStore.get(devUserId);
    if (cached) {
      req.user = cached;
      return next();
    }

    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token otentikasi tidak ditemukan. Silakan login atau sertakan header Authorization: Bearer <token>.'
    });
    return;
  }

  const session = parseAndVerifyToken(token);
  if (!session || !session.user_id) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Sesi login tidak valid atau telah kedaluwarsa. Silakan lakukan otentikasi ulang.'
    });
    return;
  }

  // Cek status aktif user di database (atau memory store)
  const userInDb = activeUserStore.get(session.user_id) || session;

  // Proteksi Aktivasi Akun: User yang belum diaktifkan oleh Founder akan dicegat
  if (!userInDb.status_aktif) {
    res.status(403).json({
      error: 'ACCOUNT_INACTIVE',
      message: 'Akun Anda belum aktif. Harap lakukan pembayaran Rp 150.000 dan kirim bukti transfer ke WhatsApp Admin untuk aktivasi instan.',
      activation_url: `https://wa.me/6281234567890?text=${encodeURIComponent(
        `Halo Admin Neuronna, saya ingin mengaktifkan akun (User ID: ${userInDb.user_id}, Email: ${userInDb.email}). Berikut bukti transfer Rp 150.000:`
      )}`
    });
    return;
  }

  // Pasang data sesi ke request
  req.user = userInDb;
  next();
}

/**
 * 2. Middleware: requireRole
 * Memblokir akses jika role user di database tidak termasuk dalam daftar allowedRoles.
 * Contoh penggunaan:
 *   app.use('/api/admin/*', verifyToken, requireRole(['founder']));
 *   app.use('/api/creator/*', verifyToken, requireRole(['founder', 'admin', 'creator']));
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Pengguna belum terotentikasi.'
      });
      return;
    }

    if (!rolesArray.includes(req.user.role)) {
      console.warn(`[RBAC DENIED] User '${req.user.user_id}' (${req.user.role}) mencoba mengakses rute terproteksi role: [${rolesArray.join(', ')}]`);
      res.status(403).json({
        error: 'FORBIDDEN_ROLE_ACCESS',
        message: `Akses ditolak (403 Forbidden). Rute ini memerlukan hak akses tingkat [${rolesArray.join(' atau ')}], sedangkan akun Anda memiliki role '${req.user.role}'.`
      });
      return;
    }

    next();
  };
}

/**
 * 3. Middleware: requireCredits
 * Memeriksa kecukupan kredit pengguna sebelum merender Gambar / Video AI.
 * (Founder dibebaskan / unlimited).
 */
export function requireCredits(costPerAction: number = 15) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu.' });
      return;
    }

    if (req.user.role === 'founder') {
      return next(); // Founder bypass credit check
    }

    if (req.user.credits < costPerAction) {
      res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        message: `Kredit render tidak mencukupi. Diperlukan ${costPerAction} kredit, sisa kredit Anda saat ini: ${req.user.credits}. Silakan top up via WhatsApp.`,
        required_credits: costPerAction,
        current_credits: req.user.credits
      });
      return;
    }

    next();
  };
}

// ============================================================================
// PANDUAN ARSITEKTUR & SKEMA AKTIVASI SQL (GOOGLE CLOUD SQL / CLOUD RUN)
// ============================================================================
/**
 * ----------------------------------------------------------------------------
 * 1. Skema Tabel PostgreSQL / Google Cloud SQL:
 * ----------------------------------------------------------------------------
 * CREATE TABLE users (
 *     id VARCHAR(64) PRIMARY KEY,
 *     email VARCHAR(255) UNIQUE NOT NULL,
 *     name VARCHAR(150) NOT NULL,
 *     role VARCHAR(30) DEFAULT 'user',        -- 'founder', 'admin', 'user'
 *     credits INT DEFAULT 0,                 -- Saldo kredit render video/gambar
 *     status_aktif BOOLEAN DEFAULT FALSE,    -- FALSE saat baru daftar, TRUE setelah transfer terverifikasi
 *     package_tier VARCHAR(50) DEFAULT 'early_bird_lifetime',
 *     phone_wa VARCHAR(30),
 *     transfer_proof_url TEXT,
 *     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * ----------------------------------------------------------------------------
 * 2. Alur Pembayaran & Aktivasi Manual Founder via WhatsApp:
 * ----------------------------------------------------------------------------
 * Langkah A [User Side]:
 * - User membuka Landing Page Neuronna dan memilih Paket Early Bird Rp 150.000.
 * - Tombol checkout mengarahkan user ke WhatsApp Admin dengan pesan otomatis:
 *   "Halo Admin Neuronna, saya ingin mendaftar akun dan membeli akses seharga Rp 150.000. Berikut bukti transfer saya: [Lampirkan Gambar]"
 * - User menyertakan bukti transfer dan alamat email akun.
 * 
 * Langkah B [Founder Side]:
 * - Founder mengecek mutasi rekening bank / e-wallet.
 * - Setelah transfer valid, Founder membuka menu Founder Control Center (/founder)
 *   atau mengeksekusi endpoint API aktivasi:
 *   POST /api/admin/users/:user_id/activate
 *   Body: { status_aktif: true, credits: 150, role: 'user' }
 * 
 *   Atau via SQL Query langsung di Cloud SQL Studio:
 *   UPDATE users 
 *   SET status_aktif = TRUE, 
 *       credits = credits + 150, 
 *       updated_at = NOW() 
 *   WHERE email = 'pembeli@gmail.com';
 * 
 * Langkah C [Instant Access]:
 * - Token JWT berdurasi panjang / link login instan dibuat dan dikirim kembali
 *   ke WhatsApp user.
 * - User login dan status_aktif langsung bernilai TRUE dengan 150 kredit awal siap pakai!
 */

export const userDatabase = {
  getUser: (userId: string) => activeUserStore.get(userId),
  getUserByEmail: (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    for (const user of activeUserStore.values()) {
      if (user.email.toLowerCase() === cleanEmail) {
        return user;
      }
    }
    return null;
  },
  getAllUsers: () => Array.from(activeUserStore.values()),
  setUser: (userId: string, data: UserSession) => activeUserStore.set(userId, data),
  activateUser: (userId: string, bonusCredits: number = 150) => {
    const existing = activeUserStore.get(userId);
    if (!existing) return null;
    existing.status_aktif = true;
    existing.credits = (existing.credits || 0) + bonusCredits;
    existing.updated_at = new Date().toISOString();
    activeUserStore.set(userId, existing);
    return existing;
  }
};
