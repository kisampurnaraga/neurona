import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../src/db/index';
import { users } from '../../src/db/schema';
import { eq, or } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'neuronna-super-secret-key-2026';

export interface UserSession {
  user_id: string;
  email: string;
  name: string;
  role: 'founder' | 'admin' | 'user';
  credits: number;
  status_aktif: boolean;
  package_tier?: string;
  phone_wa?: string;
  password_plain?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); // 7 Hari
};

export const parseAndVerifyToken = (token: string): UserSession | null => {
  try {
    if (
      token === 'founder_token' || 
      token === 'founder' || 
      token === 'ia12aS87!' || 
      token === 'NEURONNA_FOUNDER_MASTER_2025' || 
      token === 'founder2026' || 
      token === 'neuronna2026'
    ) {
      return {
        user_id: 'founder_root_001',
        email: 'ia.asep12@gmail.com',
        name: 'Master Architect',
        role: 'founder',
        credits: 999999,
        status_aktif: true,
        package_tier: 'founder'
      };
    }
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (err) {
    return null;
  }
};

export async function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Akses ditolak. Token otentikasi (Bearer) tidak ditemukan.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Format token tidak valid.' });
    return;
  }

  const session = parseAndVerifyToken(token);
  if (!session || (!session.user_id && !(session as any).uid)) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Sesi login tidak valid atau telah kedaluwarsa. Silakan lakukan otentikasi ulang.'
    });
    return;
  }

  const targetUid = session.user_id || (session as any).uid;

  // If founder token bypass
  if (session.role === 'founder' || targetUid === 'founder_root_001') {
    let founderInDb = await userDatabase.getUser('founder_root_001') || await userDatabase.getUserByEmail('ia.asep12@gmail.com');
    if (!founderInDb) {
      await userDatabase.setUser('founder_root_001', {
        uid: 'founder_root_001',
        email: 'ia.asep12@gmail.com',
        name: 'Master Architect',
        role: 'founder',
        credits: 999999,
        statusAktif: true,
        packageTier: 'founder',
        phoneWa: '081234567890',
        passwordPlain: 'ia12aS87!',
        createdAt: new Date()
      });
    }
    req.user = {
      user_id: 'founder_root_001',
      email: 'ia.asep12@gmail.com',
      name: 'Master Architect',
      role: 'founder',
      credits: 999999,
      status_aktif: true,
      package_tier: 'founder',
      phone_wa: '081234567890',
      password_plain: 'ia12aS87!'
    };
    return next();
  }

  try {
    // Fetch from Postgres
    const dbUsers = await db.select().from(users).where(eq(users.uid, targetUid)).limit(1);
    const userInDb = dbUsers[0];

    if (!userInDb) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Akun tidak ditemukan di sistem.' });
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

    req.user = {
      user_id: userInDb.uid,
      email: userInDb.email,
      name: userInDb.name || '',
      role: (userInDb.role as any) || 'user',
      credits: userInDb.credits || 0,
      status_aktif: userInDb.statusAktif || false,
      package_tier: userInDb.packageTier || '',
      phone_wa: userInDb.phoneWa || '',
      password_plain: userInDb.passwordPlain || ''
    };
    next();
  } catch (error) {
    console.error('Error verifying user in DB:', error);
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
        required_credits: costPerAction,        current_credits: req.user.credits
      });
      return;
    }
    next();
  };
}

// User Database operations using PostgreSQL (Drizzle)
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
    return await db.select().from(users);
  },
  setUser: async (userId: string, data: any) => {
    const insertObj: any = {
      uid: userId,
      email: (data.email || '').trim().toLowerCase(),
      name: data.name ?? data.nama ?? '',
      phoneWa: data.phoneWa ?? data.phone_wa ?? data.phone ?? '',
      passwordPlain: data.passwordPlain ?? data.password_plain ?? data.password ?? '',
      role: data.role || 'user',
      credits: typeof data.credits === 'number' ? data.credits : 0,
      statusAktif: data.statusAktif !== undefined ? !!data.statusAktif : (data.status_aktif !== undefined ? !!data.status_aktif : false),
      packageTier: data.packageTier ?? data.package_tier ?? 'early_bird_lifetime',
    };
    if (data.createdAt || data.created_at) {
      insertObj.createdAt = new Date(data.createdAt || data.created_at);
    } else {
      insertObj.createdAt = new Date();
    }

    await db.insert(users).values(insertObj).onConflictDoUpdate({
      target: users.uid,
      set: insertObj
    });
  },
  deleteUser: async (userId: string) => {
    const res = await db.delete(users).where(or(eq(users.uid, userId), eq(users.email, userId.toLowerCase()))).returning();
    return res.length > 0;
  },
  resetPassword: async (userId: string, newPasswordPlain: string) => {
    const res = await db.update(users).set({ passwordPlain: newPasswordPlain }).where(or(eq(users.uid, userId), eq(users.email, userId.toLowerCase()))).returning();
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
