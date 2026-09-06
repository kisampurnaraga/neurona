import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../../src/db/index';
import { users } from '../../src/db/schema';
import { eq, or } from 'drizzle-orm';

// Ensure cryptographically strong JWT secret (from env or runtime-generated secure random)
const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  if (!(globalThis as any).__EPHEMERAL_JWT_SECRET__) {
    (globalThis as any).__EPHEMERAL_JWT_SECRET__ = crypto.randomBytes(32).toString('hex');
    console.log('[SECURITY] Ephemeral cryptographically random JWT_SECRET initialized for session validation.');
  }
  return (globalThis as any).__EPHEMERAL_JWT_SECRET__;
})();

export interface UserSession {
  user_id: string;
  email: string;
  name: string;
  role: 'founder' | 'admin' | 'user';
  credits: number;
  status_aktif: boolean;
  package_tier?: string;
  phone_wa?: string;
  token_version?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

export const generateToken = (payload: any): string => {
  const sanitizedPayload: UserSession = {
    user_id: payload.user_id || payload.uid,
    email: payload.email,
    name: payload.name || '',
    role: payload.role || 'user',
    credits: typeof payload.credits === 'number' ? payload.credits : 0,
    status_aktif: payload.status_aktif !== undefined ? !!payload.status_aktif : (payload.statusAktif !== undefined ? !!payload.statusAktif : true),
    package_tier: payload.package_tier || payload.packageTier || 'early_bird_lifetime',
    phone_wa: payload.phone_wa || payload.phoneWa || '',
    token_version: payload.token_version ?? payload.tokenVersion ?? 0
  };
  return jwt.sign(sanitizedPayload, JWT_SECRET, { expiresIn: '7d' });
};

export const parseAndVerifyToken = (token: string): UserSession | null => {
  try {
    if (!token || typeof token !== 'string') return null;
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    if (!decoded || (!decoded.user_id && !(decoded as any).uid)) {
      return null;
    }
    return decoded;
  } catch (err) {
    return null;
  }
};

export async function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]?.trim();
  } else if (req.headers['x-auth-token']) {
    token = (req.headers['x-auth-token'] as string)?.trim();
  }

  // Reject unauthenticated requests immediately (No hardcoded fallback bypass)
  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Akses ditolak. Token otentikasi diperlukan. Silakan login terlebih dahulu.'
    });
    return;
  }

  const session = parseAndVerifyToken(token);
  if (!session) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Sesi login tidak valid atau telah kedaluwarsa. Silakan lakukan otentikasi ulang.'
    });
    return;
  }

  const targetUid = session.user_id || (session as any).uid;

  try {
    // Fetch latest user data from DB
    const dbUsers = await db.select().from(users).where(eq(users.uid, targetUid)).limit(1);
    const userInDb = dbUsers[0];

    if (!userInDb) {
      // If valid founder session token from founder-login but not yet in DB, provision founder record
      if (session.role === 'founder' || targetUid === 'founder_root_001') {
        const founderObj = {
          uid: 'founder_root_001',
          email: session.email || 'ia.asep12@gmail.com',
          name: session.name || 'Master Architect',
          role: 'founder',
          credits: 999999,
          statusAktif: true,
          packageTier: 'founder',
          phoneWa: session.phone_wa || '081234567890',
          createdAt: new Date().toISOString()
        };
        await userDatabase.setUser('founder_root_001', founderObj);
        req.user = {
          user_id: 'founder_root_001',
          email: founderObj.email,
          name: founderObj.name,
          role: 'founder',
          credits: 999999,
          status_aktif: true,
          package_tier: 'founder',
          phone_wa: founderObj.phoneWa,
          token_version: 0
        };
        return next();
      }

      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Akun tidak ditemukan di sistem.' });
      return;
    }

    console.log(`[AUTH CHECK] targetUid: ${targetUid}, DB Version: ${userInDb.tokenVersion}, Session Version: ${session.token_version}`);
    if (userInDb.tokenVersion !== undefined && userInDb.tokenVersion !== null && session.token_version !== undefined && userInDb.tokenVersion > session.token_version) {
      console.log(`[AUTH] Session expired. DB Version: ${userInDb.tokenVersion}, Session Version: ${session.token_version}`);
      res.status(401).json({
        error: 'SESSION_EXPIRED',
        message: 'Password telah diubah atau sesi dihentikan (force re-login). Silakan login kembali.'
      });
      return;
    }

    if (!userInDb.statusAktif && userInDb.role !== 'founder') {
      res.status(403).json({
        error: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda belum aktif. Harap lakukan pembayaran Rp 150.000 dan kirim bukti transfer ke WhatsApp Admin untuk aktivasi instan.',
        activation_url: `https://wa.me/6281234567890?text=${encodeURIComponent(
          `Halo Admin Neuronna, saya ingin mengaktifkan akun (User ID: ${userInDb.uid}, Email: ${userInDb.email}). Berikut bukti transfer Rp 150.000:`
        )}`
      });
      return;
    }

    // Attach sanitized session without credentials
    req.user = {
      user_id: userInDb.uid,
      email: userInDb.email,
      name: userInDb.name || '',
      role: (userInDb.role as any) || 'user',
      credits: userInDb.credits || 0,
      status_aktif: userInDb.statusAktif || false,
      package_tier: userInDb.packageTier || '',
      phone_wa: userInDb.phoneWa || '',
      token_version: userInDb.tokenVersion || 0
    };
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Gagal memverifikasi pengguna.' });
  }
}

export function requireRole(allowedRoles: string | string[]) {
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

export function requireCredits(costPerAction: number = 15) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu.' });
      return;
    }
    if (req.user.role === 'founder') {
      return next();
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

// User Database operations using SQLite (Drizzle) with Bcrypt Hashing
export const userDatabase = {
  getUser: async (userId: string) => {
    const res = await db.select().from(users).where(or(eq(users.uid, userId), eq(users.email, userId.toLowerCase()))).limit(1);
    return res[0] || null;
  },
  getUserByEmail: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const res = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    return res[0] || null;
  },
  getAllUsers: async () => {
    const all = await db.select().from(users);
    // Sanitize user list: remove plaintext passwords and password hashes from returned records
    return all.map(u => ({
      uid: u.uid,
      id: u.uid,
      email: u.email,
      name: u.name,
      phoneWa: u.phoneWa,
      phone_wa: u.phoneWa,
      role: u.role,
      credits: u.credits,
      statusAktif: u.statusAktif,
      status_aktif: u.statusAktif,
      packageTier: u.packageTier,
      package_tier: u.packageTier,
      createdAt: u.createdAt,
      hasPassword: !!(u.passwordHash || u.passwordPlain)
    }));
  },
  setUser: async (userId: string, data: any) => {
    const rawPass = data.password ?? data.passwordPlain ?? data.password_plain;
    let passwordHashToStore = data.passwordHash ?? data.password_hash;

    if (rawPass && typeof rawPass === 'string' && rawPass.trim().length > 0) {
      if (rawPass.startsWith('$2a$') || rawPass.startsWith('$2b$')) {
        passwordHashToStore = rawPass;
      } else {
        passwordHashToStore = bcrypt.hashSync(rawPass.trim(), 10);
      }
    }

    const insertObj: any = {
      uid: userId,
      email: (data.email || '').trim().toLowerCase(),
      name: data.name ?? data.nama ?? '',
      phoneWa: data.phoneWa ?? data.phone_wa ?? data.phone ?? '',
      passwordPlain: null, // Wipe plaintext passwords
      passwordHash: passwordHashToStore || null,
      tokenVersion: data.tokenVersion ?? data.token_version ?? 0,
      role: data.role || 'user',
      credits: typeof data.credits === 'number' ? data.credits : 0,
      statusAktif: data.statusAktif !== undefined ? !!data.statusAktif : (data.status_aktif !== undefined ? !!data.status_aktif : false),
      packageTier: data.packageTier ?? data.package_tier ?? 'early_bird_lifetime',
    };

    if (data.createdAt || data.created_at) {
      insertObj.createdAt = new Date(data.createdAt || data.created_at).toISOString();
    } else {
      insertObj.createdAt = new Date().toISOString();
    }

    await db.insert(users).values(insertObj).onConflictDoUpdate({
      target: users.uid,
      set: insertObj
    });
  },
  verifyPassword: async (user: any, plainPassword: string): Promise<boolean> => {
    if (!user || !plainPassword) return false;
    const cleanPass = plainPassword.trim();

    // 1. If modern bcrypt hash exists
    if (user.passwordHash) {
      try {
        return bcrypt.compareSync(cleanPass, user.passwordHash);
      } catch (err) {
        console.error('[Bcrypt Compare Error]:', err);
        return false;
      }
    }

    // 2. Legacy Plaintext Migration: verify once, hash with bcrypt, wipe plaintext
    if (user.passwordPlain && user.passwordPlain === cleanPass) {
      try {
        const newHash = bcrypt.hashSync(cleanPass, 10);
        await db.update(users).set({
          passwordHash: newHash,
          passwordPlain: null
        }).where(eq(users.uid, user.uid));
        console.log(`[SECURITY] Auto-migrated legacy plaintext password to bcrypt hash for user: ${user.email}`);
        return true;
      } catch (migrationErr) {
        console.error('[Legacy Password Migration Error]:', migrationErr);
        return true;
      }
    }

    return false;
  },
  deleteUser: async (userId: string) => {
    const res = await db.delete(users).where(or(eq(users.uid, userId), eq(users.email, userId.toLowerCase()))).returning();
    return res.length > 0;
  },
  resetPassword: async (userId: string, newPasswordPlain: string) => {
    const hash = bcrypt.hashSync(newPasswordPlain.trim(), 10);
    const target = await db.select().from(users).where(or(eq(users.uid, userId), eq(users.email, userId.toLowerCase()))).limit(1);
    if (!target || target.length === 0) return null;
    
    const user = target[0];
    const newVersion = (user.tokenVersion || 0) + 1;

    const res = await db.update(users).set({ 
      passwordHash: hash,
      passwordPlain: null,
      tokenVersion: newVersion
    }).where(or(eq(users.uid, userId), eq(users.email, userId.toLowerCase()))).returning();
    return res[0] || null;
  },
  adjustCredits: async (userId: string, deltaOrExact: number, isDelta: boolean = true) => {
    const target = await db.select().from(users).where(or(eq(users.uid, userId), eq(users.email, userId.toLowerCase()))).limit(1);
    if (!target || target.length === 0) return null;
    const currentCredits = target[0].credits || 0;
    const newCredits = isDelta ? Math.max(0, currentCredits + deltaOrExact) : Math.max(0, deltaOrExact);
    
    const res = await db.update(users).set({ credits: newCredits }).where(eq(users.uid, target[0].uid)).returning();
    return res[0] || null;
  },
  activateUser: async (userId: string, bonusCredits: number = 150) => {
    const target = await db.select().from(users).where(or(eq(users.uid, userId), eq(users.email, userId.toLowerCase()))).limit(1);
    if (!target || target.length === 0) return null;
    const currentCredits = target[0].credits || 0;
    const res = await db.update(users).set({ 
      statusAktif: true, 
      credits: currentCredits + bonusCredits 
    }).where(eq(users.uid, target[0].uid)).returning();
    return res[0] || null;
  }
};
