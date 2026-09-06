import { validateProxyUrl } from './server/utils/ssrf.ts';
import "dotenv/config";
import { NeuronaChatService } from './server/neuronaChatService';
import http from "http";
import express from "express";
import fs from "fs";
import { db } from './src/db/index';
import { projects as dbProjects } from './src/db/schema';
import { eq } from 'drizzle-orm';

import path from "path";
import { createServer as createViteServer } from "vite";
import { ProductionOrchestrator, projectEvents, projects, loadProjects, saveProjects, startOutputsCleanupTask, getRemoteUrlForFilename, setRemoteUrlForFilename, appendLog } from "./server/orchestrator";
import { CreditService } from "./server/creditService";
import { getVideoProvider } from "./src/server/providers";
import { ConversationalIntentRouter } from "./src/server/core/IntentRouter";
import { FounderService } from "./src/server/fcc/FounderService";
import { keyRotator } from "./server/keyRotator";
import { cleanApiKeyString } from "./server/utils/credentialValidator";
import { TTSService, SUPPORTED_VOICE_PRESETS } from "./server/services/ttsService";
import { isPlaceholderSubtitle } from "./server/utils/subtitleUtils";
import { GCSStreamService } from "./server/services/gcsStreamService";
import { verifyToken, requireRole, generateToken, userDatabase, AuthenticatedRequest, UserSession } from "./server/middleware/auth";
import { AuditLogger } from "./server/utils/auditLogger";
import videoStudioRouter from "./server/routes/videoStudio";
import workerRouter from "./server/routes/workerRoute";
import founderPaymentRouter from "./server/routes/founderPayment";

// === INJECT FFMPEG-STATIC INTO GLOBAL PATH ===
import ffmpegStatic from 'ffmpeg-static';
if (ffmpegStatic) {
  process.env.FFMPEG_PATH = ffmpegStatic;
  const ffmpegDir = path.dirname(ffmpegStatic);
  process.env.PATH = `${ffmpegDir}:${process.env.PATH}`;
  console.log('[SYSTEM] ffmpeg-static globally loaded and added to PATH at:', ffmpegStatic);
}
// =============================================


// Global safety handlers to prevent process crashing on background unhandled rejections
process.on('uncaughtException', (err: any) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  if (err && err.code === 'EADDRINUSE') {
    console.error('[UNCAUGHT EXCEPTION] Fatal EADDRINUSE detected. Exiting process so supervisor can recover.');
    process.exit(1);
  }
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

async function startServer() {
  // Load existing projects from local db
  loadProjects();

  // Start background output assets cleanup and retention task
  startOutputsCleanupTask();

  const app = express();
  const PORT = 3000;

  // Immediate health check route for container & proxy readiness
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // CORS & Preflight headers for all /api requests
  app.get("/api/test-db", async (req, res) => {
    try {
      res.json({ success: true, dbType: typeof db });
    } catch (e: any) {
      res.json({ success: false, error: e.message });
    }
  });

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-role, x-custom-api-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  
  // Increase payload limit to support base64 product images / attachments
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ extended: true, limit: '200mb' }));

  // API routes FIRST
  

  
  
  app.post('/api/founder/update-key', verifyToken, requireRole(['founder']), (req: AuthenticatedRequest, res) => {
    const { key } = req.body;
    if (key) {
      process.env.GEMINI_MANUAL_API_KEY = key;
      AuditLogger.log('UPDATE_MANUAL_API_KEY', req.user!.user_id, null, 'Founder memperbarui API key manual');
    } else {
      delete process.env.GEMINI_MANUAL_API_KEY;
      AuditLogger.log('DELETE_MANUAL_API_KEY', req.user!.user_id, null, 'Founder menghapus API key manual');
    }
    res.json({ success: true });
  });

  app.post('/api/neurona-chat',
 async (req, res) => {
    try {
      const { userId, message, history } = req.body;
      const response = await NeuronaChatService.chat(userId || 'default', message, history);
      res.json(response);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Mount Google Cloud Veo Studio & Cloud Tasks Worker routes
  app.use('/api/v1/studio', videoStudioRouter);
  app.use('/api/v1/tasks', workerRouter);
  app.use('/api/v1/founder/payment', founderPaymentRouter);

  // Public Payment Configuration for Landing Page & Checkout
  app.get("/api/public/payment-config", (req, res) => {
    res.json({
      success: true,
      paymentConfig: FounderService.getPaymentConfig()
    });
  });

  // RBAC Authentication & Session Endpoints
  app.get("/api/auth/me", verifyToken, (req: AuthenticatedRequest, res) => {
    res.json({
      user: req.user,
      authenticated: true
    });
  });

  // User Registration Endpoint (Nama, Email, Password, WhatsApp) -> Status Pending Activation
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, phone_wa, phone } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanPass = String(password).trim();
    const cleanPhone = phone_wa ? String(phone_wa).trim() : (phone ? String(phone).trim() : '');

    const existing = await userDatabase.getUserByEmail(cleanEmail);
    if (existing) {
      if (existing.statusAktif) {
        return res.status(409).json({
          error: 'ALREADY_ACTIVE',
          message: 'Email sudah terdaftar dan akun sudah aktif. Silakan langsung masuk ke Studio.'
        });
      }

      // Update existing pending user info & password with secure hash
      const updatedData = {
        uid: existing.uid,
        email: cleanEmail,
        name: cleanName,
        password: cleanPass,
        phoneWa: cleanPhone || existing.phoneWa || '',
        statusAktif: false
      };
      await userDatabase.setUser(existing.uid, updatedData);

      return res.json({
        success: true,
        user: {
          user_id: existing.uid,
          email: cleanEmail,
          name: cleanName,
          role: existing.role || 'user',
          status_aktif: false,
          phone_wa: cleanPhone || existing.phoneWa || ''
        },
        paymentConfig: FounderService.getPaymentConfig(),
        message: 'Data pendaftaran berhasil diperbarui. Silakan selesaikan pembayaran dan kirim konfirmasi ke WhatsApp.'
      });
    }

    const userId = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newUser = {
      uid: userId,
      user_id: userId,
      email: cleanEmail,
      name: cleanName,
      role: 'user',
      credits: 0, // Will be set to 150 upon activation by founder
      statusAktif: false,
      status_aktif: false,
      password: cleanPass,
      phoneWa: cleanPhone,
      phone_wa: cleanPhone,
      packageTier: 'early_bird_lifetime',
      package_tier: 'early_bird_lifetime',
      createdAt: new Date().toISOString()
    };

    await userDatabase.setUser(userId, newUser);

    res.json({
      success: true,
      user: {
        user_id: userId,
        email: cleanEmail,
        name: cleanName,
        role: 'user',
        credits: 0,
        status_aktif: false,
        package_tier: 'early_bird_lifetime',
        phone_wa: cleanPhone
      },
      paymentConfig: FounderService.getPaymentConfig(),
      message: 'Pendaftaran akun berhasil! Silakan lakukan transfer dan konfirmasi via WhatsApp.'
    });
  });

  // User Login Endpoint (Email + Password/PIN)
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password/PIN harus diisi.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();

    let user = await userDatabase.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'Email belum terdaftar. Silakan lakukan pendaftaran dan aktivasi akun terlebih dahulu.'
      });
    }

    // Verify Password / PIN using Bcrypt
    const isPasswordValid = await userDatabase.verifyPassword(user, cleanPass);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Password yang Anda masukkan salah. Periksa kembali password saat pendaftaran.'
      });
    }

    // Check if active
    if (!user.statusAktif && user.role !== 'founder') {
      const waNumber = FounderService.getPaymentConfig().whatsappNumber.replace(/[^0-9]/g, '') || '6281234567890';
      return res.status(403).json({
        error: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda sedang menunggu verifikasi/aktivasi pembayaran oleh Founder. Kirimkan bukti transfer ke WhatsApp Admin.',
        activation_url: `https://wa.me/${waNumber}?text=${encodeURIComponent(
          `Halo Admin Neuronna, saya sudah mendaftar akun (${user.email}) dan ingin mengaktifkan akun saya. Berikut bukti transfer Rp 150.000:`
        )}`
      });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: {
        user_id: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        credits: user.credits,
        status_aktif: user.statusAktif,
        package_tier: user.packageTier,
        phone_wa: user.phoneWa
      },
      message: `Selamat datang kembali, ${user.name}!`
    });
  });

  // Founder Direct Login Gate Endpoint
  app.post('/api/auth/founder-login', async (req, res) => {
    const { key } = req.body || {};
    const founderMasterKey = process.env.FOUNDER_ACCESS_KEY;
    const cleanKey = String(key || '').trim();
    
    let founderUser: any;
    try {
      founderUser = await userDatabase.getUserByEmail('ia.asep12@gmail.com') || await userDatabase.getUser('founder_root_001');
    } catch (err) {
      console.error('[DB Error] Gagal memuat user saat login:', err);
      return res.status(500).json({ error: 'DB_ERROR', message: 'Terjadi kesalahan sistem pada database. Coba lagi.' });
    }
    
    let isDbMatch = false;
    let allowFallback = false;
    
    if (founderUser) {
      isDbMatch = await userDatabase.verifyPassword(founderUser, cleanKey);
      
      // Auto-migrate jika akun Founder ada, tapi belum memiliki password hash sama sekali
      // (misal, akun dibuat versi sebelumnya yang belum support hash)
      if (!isDbMatch && (!founderUser.passwordHash || founderUser.passwordHash === null)) {
        allowFallback = true;
      }
    } else {
      // HANYA memicu fallback ke FOUNDER_ACCESS_KEY jika tabel DB benar-benar kosong 
      // (user founder belum pernah dibuat / file SQLite wipe total).
      // Jika terjadi error koneksi DB, proses akan terhenti di block catch di atas.
      allowFallback = true;
    }

    if (isDbMatch || (allowFallback && founderMasterKey && cleanKey === founderMasterKey)) {
      if (!founderUser) {
        founderUser = {
          uid: 'founder_root_001',
          email: 'ia.asep12@gmail.com',
          name: 'Master Architect',
          role: 'founder',
          credits: 999999,
          statusAktif: true,
          packageTier: 'founder',
          phoneWa: '081234567890',
          createdAt: new Date().toISOString()
        };
      }
      
      // Auto-migrate: update password di database jika tadi menggunakan fallback
      if (!isDbMatch && allowFallback) {
        founderUser.password = cleanKey; // Memicu hashing bcrypt di dalam setUser
        await userDatabase.setUser(founderUser.uid, founderUser);
      }

      const token = generateToken(founderUser);
      return res.json({
        success: true,
        token,
        user: {
          user_id: founderUser.uid,
          email: founderUser.email,
          name: founderUser.name,
          role: 'founder',
          credits: founderUser.credits,
          status_aktif: true,
          package_tier: 'founder'
        },
        message: 'Akses Founder Terverifikasi. Selamat Datang Founder.'
      });
    }

    return res.status(401).json({
      error: 'INVALID_FOUNDER_KEY',
      message: 'Kunci Otorisasi Founder tidak valid.'
    });
  });

  // Founder Change Password Endpoint
  app.post('/api/auth/founder/change-password', verifyToken, requireRole(['founder']), async (req: AuthenticatedRequest, res) => {
    const { oldPassword, newPassword } = req.body || {};
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'MISSING_DATA', message: 'Password lama dan baru harus diisi.' });
    }
    
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (newPassword.length < 12 || !hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ error: 'INVALID_PASSWORD', message: 'Password harus min. 12 karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol.' });
    }

    const targetUid = req.user!.user_id;
    const userInDb = await userDatabase.getUser(targetUid);
    
    if (!userInDb) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Akun Founder tidak ditemukan.' });
    }

    const cleanOld = String(oldPassword).trim();
    const cleanNew = String(newPassword).trim();
    
    // Karena Founder sudah ada di DB, kita tidak mengizinkan fallback kunci master. 
    // Harus menggunakan password lama yang tersimpan di DB.
    let isOldValid = await userDatabase.verifyPassword(userInDb, cleanOld);
    
    if (!isOldValid) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Password lama tidak cocok.' });
    }

    // Bump token version and update password (this hashes it via userDatabase)
    const newVersion = (userInDb.tokenVersion || 0) + 1;
    await userDatabase.setUser(targetUid, {
      ...userInDb,
      password: cleanNew, // Will be hashed inside setUser
      tokenVersion: newVersion,
      token_version: newVersion
    });

    console.log(`[AUDIT LOG] Password untuk Founder (${userInDb.email}) berhasil diubah pada ${new Date().toISOString()}. Semua sesi sebelumnya dihentikan.`);

    return res.json({
      success: true,
      message: 'Password Founder berhasil diubah. Silakan login kembali dengan password baru.'
    });
  });

  // Admin: Get all users
  app.get('/api/admin/users', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) => {
    const rawUsers = await userDatabase.getAllUsers();
    res.json({ users: rawUsers });
  });

  // Admin: Create & Activate User Manual
  app.post('/api/admin/users/create', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) => {
    const { name, email, phone_wa, phone, credits = 150, role = 'user', password } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ error: 'Nama dan Email harus diisi.' });
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
    const pin = password || Math.floor(100000 + Math.random() * 900000).toString();
    const cleanPhone = phone_wa ? String(phone_wa).trim() : (phone ? String(phone).trim() : '');

    const newUser = {
      uid: userId,
      user_id: userId,
      email: String(email).trim().toLowerCase(),
      name: String(name).trim(),
      role: (role as any) || 'user',
      credits: Number(credits) || 150,
      statusAktif: true,
      status_aktif: true,
      password: pin,
      phoneWa: cleanPhone,
      phone_wa: cleanPhone,
      packageTier: 'early_bird_lifetime',
      package_tier: 'early_bird_lifetime',
      createdAt: new Date().toISOString()
    };

    await userDatabase.setUser(userId, newUser);
    AuditLogger.log('CREATE_USER', req.user!.user_id, userId, `Founder/Admin mendaftarkan user baru (Email: ${newUser.email}, Role: ${newUser.role})`);
    res.json({
      success: true,
      user: {
        id: userId,
        uid: userId,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        credits: newUser.credits,
        status_aktif: true,
        phone_wa: cleanPhone
      },
      pin,
      message: `Pengguna '${newUser.name}' berhasil didaftarkan dan diaktifkan dengan PIN: ${pin}`
    });
  });

  // Admin / Founder: Activate User & Top-up Credits
  app.post('/api/admin/users/:id/activate', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { credits = 150 } = req.body;
    
    const updated = await userDatabase.activateUser(id, credits);
    
    if (!updated) {
      return res.status(404).json({ error: 'User not found in registry.' });
    }
    
    AuditLogger.log('ACTIVATE_USER', req.user!.user_id, id, `Founder/Admin mengaktifkan user dan memberikan ${credits} kredit awal`);
    res.json({
      success: true,
      message: `User '${id}' berhasil diaktifkan dengan ${credits} kredit render.`,
      user: {
        id: updated.uid,
        uid: updated.uid,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        credits: updated.credits,
        status_aktif: updated.statusAktif
      }
    });
  });

  // Admin / Founder: Reset User Password & Generate Instant WhatsApp link
  app.post('/api/admin/users/:id/reset-password', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    
    const newPass = newPassword ? String(newPassword).trim() : Math.floor(100000 + Math.random() * 900000).toString();
    const updated = await userDatabase.resetPassword(id, newPass);
    
    if (!updated) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    AuditLogger.log('RESET_USER_PASSWORD', req.user!.user_id, id, 'Founder/Admin me-reset password user');
    res.json({
      success: true,
      user: {
        id: updated.uid,
        uid: updated.uid,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        credits: updated.credits
      },
      newPassword: newPass,
      message: `Password akun ${updated.email} berhasil direset menjadi: ${newPass}`
    });
  });

  // Admin / Founder: Delete User Account Permanently
  app.delete('/api/admin/users/:id', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const deleted = await userDatabase.deleteUser(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'User tidak ditemukan atau sudah dihapus.' });
    }

    AuditLogger.log('DELETE_USER_ACCOUNT', req.user!.user_id, id, 'Founder/Admin menghapus akun user secara permanen');
    res.json({
      success: true,
      message: `Akun user '${id}' telah berhasil dihapus secara permanen.`
    });
  });

  // Admin / Founder: Adjust Credits (+ / -)
  app.post('/api/admin/users/:id/credits', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { amount = 100, isDelta = true } = req.body;
    
    const updated = await userDatabase.adjustCredits(id, Number(amount), !!isDelta);
    if (!updated) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    AuditLogger.log('MANUAL_CREDIT_ADJUSTMENT', req.user!.user_id, id, `Founder/Admin menyesuaikan kredit manual sebesar ${amount} (isDelta: ${isDelta})`);
    res.json({
      success: true,
      user: {
        id: updated.uid,
        uid: updated.uid,
        email: updated.email,
        credits: updated.credits
      },
      message: `Saldo kredit user ${updated.email} berhasil diperbarui menjadi ${updated.credits} kredit.`
    });
  });

  // Utility: Generate Sample Token (Protected - Founder/Admin only)
  app.get("/api/auth/token-sample", verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) => {
    const sample = {
      user_id: 'user_pioneer_' + Math.random().toString(36).substring(2, 7),
      email: (req.query.email as string) || 'kreator@neuronna.ai',
      name: (req.query.name as string) || 'Kreator Neuronna',
      role: ((req.query.role as any) || 'user'),
      credits: 150,
      status_aktif: true,
      package_tier: 'early_bird_lifetime' as const
    };
    await userDatabase.setUser(sample.user_id, sample);
    const token = generateToken(sample);
    res.json({ token, user: sample });
  });

  app.get("/api/providers/status", async (req, res) => {
    try {
      const model = req.query.model as string | undefined;
      const provider = getVideoProvider(model);
      const status = await provider.getStatus();
      res.json({ provider: provider.name, isMock: provider.isMock, status });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Handler for user interaction (supports /api/chat and /api/interact)
  const handleInteraction = async (req: express.Request, res: express.Response) => {
    try {
      const { 
        prompt, 
        projectId, 
        videoModel,
        ttsVoiceConfig,
        attachedAssets, 
        affiliateConfig, 
        animationConfig, 
        educationalConfig, 
        videoType,
        userRole
      } = req.body;
      const project = projectId ? projects.get(projectId) : null;
      const hasAssets = Boolean(attachedAssets && attachedAssets.length > 0);
      
      const result = await ConversationalIntentRouter.route(prompt || "", project, hasAssets);
      
      let newProjectId = projectId;
      if (result.action === 'START_PRODUCTION') {
         const finalType = result.videoType || videoType || 'BRAND_COMMERCIAL';
         newProjectId = await ProductionOrchestrator.startProduction({
           prompt: prompt || (hasAssets ? "Buatkan video affiliate produk sepatu ini" : "Buatkan video produksi"),
           videoType: finalType,
           videoModel,
           ttsVoiceConfig,
           attachedAssets,
           affiliateConfig,
           animationConfig: animationConfig || (finalType === 'ANIMATION' ? result.quickConfig : undefined),
           educationalConfig: educationalConfig || (finalType === 'EDUCATIONAL' ? result.quickConfig : undefined),
           userRole
         });
      } else if (result.action === 'APPROVE' && projectId) {
         await ProductionOrchestrator.approveStoryboard(projectId);
      } else if (result.action === 'FALLBACK_APPROVE' && projectId) {
         await ProductionOrchestrator.resumeWithTemplate(projectId);
      } else if (result.action === 'FALLBACK_REJECT' && projectId) {
         await ProductionOrchestrator.rejectFallback(projectId);
      }
      
      res.json({ ...result, projectId: newProjectId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  app.post('/api/chat', handleInteraction);
  app.post('/api/interact', handleInteraction);

  
  app.get('/api/tts/voices', (req, res) => {
    res.json({
      success: true,
      voices: SUPPORTED_VOICE_PRESETS.map(v => ({
        id: v.id,
        name: v.name,
        gender: v.ssmlGender.toLowerCase(),
        provider: v.provider,
        lang: v.languageCode,
        category: v.category,
        model: v.model,
        badge: v.category.toUpperCase(),
        description: v.description
      }))
    });
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const customKey = req.headers['x-custom-api-key'] as string;
      if (customKey) process.env.GEMINI_MANUAL_API_KEY = customKey;

      const { text, provider, voiceName, voiceGender, model } = req.body;
      const buffer = await TTSService.generateTTS(provider, text, { voiceName, voiceGender, model });
      const isWav = buffer.length > 4 && buffer.toString('utf8', 0, 4) === 'RIFF';
      res.set('Content-Type', isWav ? 'audio/wav' : 'audio/mpeg');
      res.send(buffer);
    } catch (e: any) {
      console.error("[TTS API] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // --- [ENDPOINT UTAMA: GATEKEEPER & VIDEO RENDER PIPELINE] ---
  app.post('/api/render', async (req: express.Request, res: express.Response) => {
    try {
      // 1. Ekstrak data dari request Frontend (React)
      const { projectId, userId, storyboardScenes, social_media_kit, project_meta, videoType } = req.body;
      const COST_PER_RENDER = 15; // Biaya untuk merender 1 video penuh

      // 2. Gatekeeper Logika: Cek Saldo Kredit (Simulasi)
      const currentCredits = 50; // Simulasi database
      
      if (currentCredits < COST_PER_RENDER) {
        return res.status(402).json({
          success: false,
          message: "Kredit tidak mencukupi. Silakan top-up terlebih dahulu.",
          current_credits: currentCredits,
          required_credits: COST_PER_RENDER
        });
      }

      console.log(`[DB] Memotong ${COST_PER_RENDER} kredit dari user ${userId || 'default-user'}...`);

      // 3. Panggil VideoRenderService dengan Dynamic Engine Routing & Failover
      const { VideoRenderService } = await import('./server/videoRenderService');
      const pipelineResult = await VideoRenderService.executeVideoRenderPipeline({
        projectId: projectId || `proj_${Date.now()}`,
        userId: userId || 'default-user',
        deductedCredits: COST_PER_RENDER,
        scenes: storyboardScenes || [],
        social_media_kit,
        project_meta,
        videoType
      });

      if (pipelineResult.status === 'PARTIAL_SUCCESS') {
        return res.status(200).json({
          success: true,
          status: "PARTIAL_SUCCESS",
          message: pipelineResult.message,
          scenes: pipelineResult.scenes,
          social_media_kit: pipelineResult.social_media_kit,
          project_meta: pipelineResult.project_meta,
          refunded_credits: pipelineResult.refundedCredits,
          remaining_credits: currentCredits, // Kredit dikembalikan
          engine_logs: pipelineResult.engineLogs
        });
      }

      return res.status(200).json({
        success: true,
        status: "SUCCESS",
        message: pipelineResult.message,
        final_video_url: pipelineResult.finalVideoUrl,
        scenes: pipelineResult.scenes,
        social_media_kit: pipelineResult.social_media_kit,
        project_meta: pipelineResult.project_meta,
        remaining_credits: currentCredits - COST_PER_RENDER,
        engine_used: pipelineResult.primaryEngineUsed,
        engine_logs: pipelineResult.engineLogs
      });

    } catch (error: any) {
      console.error("[GATEKEEPER ERROR]:", error);
      return res.status(500).json({ success: false, message: "Terjadi kesalahan internal server." });
    }
  });

  // Founder Control Center API - Key Rotator Management
  app.get('/api/fcc/key-rotator', (req, res) => {
     res.json(keyRotator.getHealthReport());
  });

  app.post('/api/fcc/key-rotator/add', (req, res) => {
    try {
      const { provider, key, keys } = req.body;
      const targetProvider: 'gemini' | 'veo' | 'openai' | 'fal' = provider || 'gemini';
      const rawKeysInput = keys || key;
      if (!rawKeysInput) return res.status(400).json({ error: 'Key input is required' });

      // Split by newline, comma, or semicolon
      const keyList = String(rawKeysInput)
        .split(/[\n,;]/)
        .map((k: string) => cleanApiKeyString(k))
        .filter((k: string) => k.length > 5);

      if (keyList.length === 0) {
        return res.status(400).json({ error: 'Tidak ada API Key valid yang ditemukan dalam input' });
      }

      const addedHealths: any[] = [];
      const errorMsgs: string[] = [];

      for (const k of keyList) {
        try {
          const added = keyRotator.addKey(targetProvider, k);
          addedHealths.push(added);
        } catch (err: any) {
          errorMsgs.push(err.message || 'Format API key tidak valid');
        }
      }

      if (addedHealths.length === 0 && errorMsgs.length > 0) {
        return res.status(400).json({ error: errorMsgs.join('; ') });
      }

      res.json({
        success: true,
        count: addedHealths.length,
        healths: addedHealths,
        warnings: errorMsgs.length > 0 ? errorMsgs : undefined,
        report: keyRotator.getHealthReport()
      });
    } catch (globalErr: any) {
      res.status(500).json({ error: globalErr.message || 'Gagal menambahkan API key' });
    }
  });

  app.post('/api/fcc/key-rotator/delete', (req, res) => {
     const { provider, key } = req.body;
     if (!key || !provider) return res.status(400).json({ error: 'provider and key are required' });
     const removed = keyRotator.removeKey(provider, key);
     res.json({ success: removed, report: keyRotator.getHealthReport() });
  });

  app.post('/api/fcc/key-rotator/clear-all', (req, res) => {
     const { provider } = req.body;
     keyRotator.clearAllKeys(provider || 'all');
     res.json({ success: true, report: keyRotator.getHealthReport() });
  });

  app.post('/api/fcc/key-rotator/reactivate', (req, res) => {
     const { provider, key } = req.body;
     if (!key || !provider) return res.status(400).json({ error: 'provider and key are required' });
     const reactivated = keyRotator.reactivateKey(provider, key);
     res.json({ success: reactivated, report: keyRotator.getHealthReport() });
  });

  app.get('/api/fcc/config', async (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden. Founder access required.'});
     try {
       const config = await FounderService.getPlatformConfig();
       res.json(config);
     } catch (e: any) {
       res.status(500).json({ error: e.message || 'Internal server error' });
     }
  });

  app.post('/api/fcc/providers/:id/config', (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden. Founder access required.'});
     try {
       const result = FounderService.saveProviderConfig(req.params.id, req.body);
       res.json(result);
     } catch (e: any) {
       res.status(400).json({ error: e.message });
     }
  });

  app.post('/api/fcc/providers/:id/test', async (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden. Founder access required.'});
     try {
       const result = await FounderService.testProvider(req.params.id);
       res.json(result);
     } catch (e: any) {
       res.status(400).json({ error: e.message });
     }
  });

  app.post('/api/fcc/flags', (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden. Founder access required.'});
     try {
       const { key, value } = req.body;
       const result = FounderService.updateFlag(key, value);
       res.json(result);
     } catch (e: any) {
       res.status(400).json({ error: e.message });
     }
  });

  
  app.post('/api/fcc/qa-thresholds', (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden'});
     try {
       const { minScore, autoFix } = req.body;
       const result = FounderService.setQaThresholds(minScore, autoFix);
       res.json(result);
     } catch (e: any) {
       res.status(400).json({ error: e.message });
     }
  });

  app.post('/api/fcc/llm-engine', (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden. Founder access required.'});
     try {
       const { engine } = req.body;
       const result = FounderService.setLlmEngine(engine);
       res.json(result);
     } catch (e: any) {
       res.status(400).json({ error: e.message });
     }
  });

  app.post('/api/fcc/image-engine', (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden. Founder access required.'});
     try {
       const { engine } = req.body;
       const result = FounderService.setImageEngine(engine);
       res.json(result);
     } catch (e: any) {
       res.status(400).json({ error: e.message });
     }
  });

  app.post('/api/fcc/video-engine', (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden. Founder access required.'});
     try {
       const { engine } = req.body;
       const result = FounderService.setPrimaryVideoEngine(engine);
       res.json(result);
     } catch (e: any) {
       res.status(400).json({ error: e.message });
     }
  });

  // Fal Model Catalog Endpoint (Public / Client & Founder accessible)
  app.get('/api/fal/models', async (req, res) => {
    try {
      const { FAL_MODELS, FAL_TIER_META, FAL_TIER_DEFAULTS } = await import('./server/falModelConfig');
      const { CreditService } = await import('./server/creditService');
      const activeFalConfig = FounderService.getFalConfig();
      const pricing = CreditService.getPricingConfig();

      const modelsWithCalculatedCost = FAL_MODELS.map(m => {
        const costInfo = CreditService.calculateCreditCost(m.id, { duration: m.defaultDuration });
        return {
          ...m,
          calculatedCost: costInfo
        };
      });

      res.json({
        success: true,
        models: modelsWithCalculatedCost,
        tiers: FAL_TIER_META,
        tierDefaults: FAL_TIER_DEFAULTS,
        activeModel: activeFalConfig.model || FAL_TIER_DEFAULTS.balanced,
        pricing
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Fal Image Models Endpoint (T2I & Image Edit)
  app.get('/api/fal/image-models', async (req, res) => {
    try {
      const { FAL_IMAGE_MODELS, IMAGE_MODEL_TIERS } = await import('./server/falModelConfig');
      const { CreditService } = await import('./server/creditService');
      const pricing = CreditService.getPricingConfig();

      const modelsWithCalculatedCost = FAL_IMAGE_MODELS.map(m => {
        const cost05K = CreditService.calculateImageCreditCost(m.id, { resolution: '0.5K' });
        const cost1K = CreditService.calculateImageCreditCost(m.id, { resolution: '1K' });
        const cost2K = CreditService.calculateImageCreditCost(m.id, { resolution: '2K' });
        const cost4K = CreditService.calculateImageCreditCost(m.id, { resolution: '4K' });
        return {
          ...m,
          calculatedCost: {
            '0.5K': cost05K,
            '1K': cost1K,
            '2K': cost2K,
            '4K': cost4K
          }
        };
      });

      res.json({
        success: true,
        models: modelsWithCalculatedCost,
        tiers: IMAGE_MODEL_TIERS,
        pricing
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // FCC Pricing Configuration
  app.get('/api/fcc/pricing', (req, res) => {
    try {
      res.json({ success: true, pricing: CreditService.getPricingConfig() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/fcc/pricing', (req, res) => {
    if (req.headers['x-role'] !== 'founder') return res.status(403).json({ error: 'Forbidden. Founder access required.' });
    try {
      const updated = CreditService.updatePricingConfig(req.body);
      res.json({ success: true, pricing: updated });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Fal.ai Live Test Runner Endpoint (Real Render Verification with Custom or Stored Key)
  app.post('/api/fcc/fal-live-test', async (req, res) => {
    if (req.headers['x-role'] !== 'founder') {
      return res.status(403).json({ error: 'Forbidden. Founder access required.' });
    }
    try {
      const { executeFalLiveTest } = await import('./server/falLiveTester');
      const { apiKey, target, customPrompt } = req.body || {};
      const results = await executeFalLiveTest({ apiKey, target, customPrompt });
      res.json(results);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // FCC Fal All-Models Test & Validation Endpoint
  app.post('/api/fcc/fal-test-models', async (req, res) => {
    if (req.headers['x-role'] !== 'founder') return res.status(403).json({ error: 'Forbidden. Founder access required.' });
    try {
      const { FAL_MODELS } = await import('./server/falModelConfig');
      const { keyRotator } = await import('./server/keyRotator');
      const key = keyRotator.getNextFalKey() || process.env.FAL_KEY || '';

      if (!key) {
        return res.status(400).json({ success: false, error: 'FAL_KEY tidak terkonfigurasi pada sistem.' });
      }

      // Check key health format
      const isColonFormat = key.includes(':');
      const results = FAL_MODELS.map(m => ({
        id: m.id,
        name: m.name,
        tier: m.tier,
        endpoint: `https://queue.fal.run/${m.id}`,
        prefixValid: m.id.startsWith('bytedance/') || m.id.startsWith('fal-ai/'),
        status: 'READY'
      }));

      res.json({
        success: true,
        keyConfigured: true,
        keyFormatValid: isColonFormat || key.length > 20,
        totalModels: results.length,
        models: results
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const id = await ProductionOrchestrator.startProduction(req.body);
      res.json({ id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects/:id/approve', async (req, res) => {
    try {
      const { subtitleStyle } = req.body;
      const project = projects.get(req.params.id);
      if (project) {
        project.subtitleStyle = subtitleStyle;
      }
      await ProductionOrchestrator.approveStoryboard(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects/:id/choose-storyboard-only', async (req, res) => {
    try {
      await ProductionOrchestrator.chooseStoryboardOnly(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects/:id/generate-scene-image', async (req, res) => {
    try {
      const { sceneId, imageEngine, resolution, allowFallbackToFlux } = req.body;
      await ProductionOrchestrator.generateSceneImage(req.params.id, sceneId, imageEngine, resolution || '1K', allowFallbackToFlux);
      res.json({ success: true });
    } catch (e: any) {
      const isQuotaErr = e.message && e.message.includes('[NANO_QUOTA_EXHAUSTED]');
      res.status(isQuotaErr ? 402 : 500).json({ error: e.message, code: isQuotaErr ? 'NANO_QUOTA_EXHAUSTED' : 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/projects/:id/generate-all-images', async (req, res) => {
    try {
      const { imageEngine, resolution, allowFallbackToFlux } = req.body;
      await ProductionOrchestrator.generateAllSceneImages(req.params.id, imageEngine, resolution || '1K', allowFallbackToFlux);
      res.json({ success: true });
    } catch (e: any) {
      const isQuotaErr = e.message && e.message.includes('[NANO_QUOTA_EXHAUSTED]');
      res.status(isQuotaErr ? 402 : 500).json({ error: e.message, code: isQuotaErr ? 'NANO_QUOTA_EXHAUSTED' : 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/projects/:id/generate-scene-video', async (req, res) => {
    try {
      const { sceneId, videoModel } = req.body;
      const project = projects.get(req.params.id);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      
      // HARD GATE: Cannot render video before storyboard is approved
      if (['DRAFT', 'BRIEFING', 'STORYBOARDING', 'AWAITING_APPROVAL'].includes(project.status || 'DRAFT')) {
         return res.status(403).json({ error: `Video tidak bisa mulai di-render sebelum storyboard di-approve. Status saat ini: ${project.status}` });
      }

      // Do not await to avoid 504 timeouts on the frontend. The video generation takes minutes.
      // The frontend will poll the project state to see the updated videoUrl.
      ProductionOrchestrator.generateSceneVideo(req.params.id, sceneId, videoModel).catch(err => {
         console.error('[BACKGROUND GENERATE VIDEO ERROR]', err);
      });
      res.json({ success: true, message: 'Video generation started in background.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/diagnostics/video-models', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { runVideoModelsDiagnostic } = await import('./src/server/diagnostics');
      const results = await runVideoModelsDiagnostic();
      AuditLogger.log('RUN_DIAGNOSTICS', req.user!.user_id, null, 'Founder/Admin menjalankan diagnostik model video');
      res.json({ success: true, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects/:id/retry', async (req, res) => {
    try {
      await ProductionOrchestrator.retryStage(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects/:id/override-scene', async (req, res) => {
    try {
      const { sceneId, ...updates } = req.body;
      const project = await ProductionOrchestrator.overrideSceneAsset(req.params.id, sceneId, updates);
      res.json({ success: true, project });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects/:id/reorder-scenes', async (req, res) => {
    try {
      const { scenes } = req.body;
      const project = await ProductionOrchestrator.reorderScenes(req.params.id, scenes);
      res.json({ success: true, project });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects/:id/resync-scenes', async (req, res) => {
    try {
      const { action, targetIndex } = req.body;
      const project = await ProductionOrchestrator.resyncScenes(req.params.id, action, targetIndex);
      res.json({ success: true, project });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post(['/api/projects/:id/stitch-action', '/api/projects/:id/stitch', '/api/stitch-action'], async (req, res) => {
    try {
      const body = req.body || {};
      let projectId = req.params?.id;
      if (!projectId || projectId === 'undefined' || projectId === 'null') {
        projectId = body.projectId;
      }
      if (!projectId) {
        // Fallback to most recent project in memory
        const projectKeys = Array.from(projects.keys());
        if (projectKeys.length > 0) {
          projectId = projectKeys[projectKeys.length - 1];
        }
      }
      if (!projectId) {
        return res.status(400).json({ error: 'ID Proyek tidak valid atau tidak disertakan.' });
      }

      const project = projects.get(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      // HARD GATE: Cannot stitch video before storyboard is approved
      if (['DRAFT', 'BRIEFING', 'STORYBOARDING', 'AWAITING_APPROVAL'].includes(project.status || 'DRAFT')) {
         return res.status(403).json({ error: `Video tidak bisa digabungkan sebelum storyboard di-approve. Status saat ini: ${project.status}` });
      }

      const { subtitleStyle, ttsVoiceConfig, scenes } = body;
      
      // Update status immediately so client knows it's processing
      if (project) {
        if (Array.isArray(scenes) && scenes.length > 0 && project.storyboard?.scenes) {
          scenes.forEach((sc: any, idx: number) => {
            const existing = project.storyboard.scenes[idx] || project.storyboard.scenes.find((s: any) => String(s.id) === String(sc.id));
            if (existing) {
              if (typeof sc.subtitle === 'string' && sc.subtitle.trim().length > 0 && !isPlaceholderSubtitle(sc.subtitle)) {
                existing.subtitle = sc.subtitle.trim();
                if (!existing.textOverlay || isPlaceholderSubtitle(existing.textOverlay)) {
                  existing.textOverlay = existing.subtitle;
                }
              }
              if (typeof sc.textOverlay === 'string' && sc.textOverlay.trim().length > 0 && !isPlaceholderSubtitle(sc.textOverlay)) {
                existing.textOverlay = sc.textOverlay.trim();
                if (!existing.subtitle || isPlaceholderSubtitle(existing.subtitle)) {
                  existing.subtitle = existing.textOverlay;
                }
              }
              if (typeof sc.voiceOver === 'string' && sc.voiceOver.trim().length > 0 && !isPlaceholderSubtitle(sc.voiceOver)) {
                existing.voiceOver = sc.voiceOver.trim();
              }
            }
          });
        }
        project.status = 'PROCESSING';
        project.updatedAt = new Date().toISOString();
        project.overallProgress = 85; // Roughly the progress before stitching
        saveProjects();
        projectEvents.emit(`update:${projectId}`, project);
      }

      // Execute video generation asynchronously without awaiting
      ProductionOrchestrator.stitchMasterVideo(projectId, subtitleStyle, ttsVoiceConfig)
        .then(() => console.log(`[Stitch] Async video generation for ${projectId} completed successfully.`))
        .catch(err => console.error(`[Stitch] Async video generation failed for ${projectId}:`, err));

      res.json({ 
         success: true, 
         status: 'PROCESSING',
         message: 'Perakitan video master sedang berjalan di latar belakang. Silakan pantau log untuk melihat progres.'
      });
    } catch (e: any) {
      console.error('[stitch-action] Error:', e);
      res.status(500).json({ error: e.message || 'Terjadi kesalahan saat memproses master video' });
    }
  });

  // Generate Character Turnaround Sheet for Animation Character Lock
  app.post('/api/generate-character-sheet', async (req, res) => {
    try {
      const { characterDescription, artStyle, genre, imageEngine } = req.body;
      const { ImageGenerationService } = await import('./server/imageService');
      const result = await ImageGenerationService.generateCharacterSheet({
        characterDescription,
        artStyle,
        genre,
        imageEngine
      });
      res.json({ success: true, ...result });
    } catch (e: any) {
      console.error('[API generate-character-sheet] Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Audit & Optimize T2I Prompt for Raw API Execution
  app.post('/api/audit-prompt', async (req, res) => {
    try {
      const { rawPrompt, videoType } = req.body;
      const { ImageGenerationService } = await import('./server/imageService');
      const auditResult = ImageGenerationService.auditAndOptimizePrompt(rawPrompt || '', videoType || 'AFFILIATE');
      res.json({ success: true, ...auditResult });
    } catch (e: any) {
      console.error('[API audit-prompt] Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  
  // Streaming Video Endpoint (Same-Origin, Zero 403, 100% iFrame & Range header compatible)
  app.get('/api/videos/:name', (req, res) => {
    const name = req.params.name.replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const videoPath = path.join(process.cwd(), 'public', 'videos', name);
    
    let targetPath = videoPath;
    if (!fs.existsSync(videoPath)) {
      const fallbackPath = path.join(process.cwd(), 'public', 'videos', 'sample-ocean.mp4');
      if (fs.existsSync(fallbackPath)) {
        targetPath = fallbackPath;
      } else {
        return res.status(404).send('Video not found');
      }
    }

    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept-Ranges, Content-Type',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    });

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(targetPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(targetPath).pipe(res);
    }
  });

  // Gallery API
  app.get('/api/v1/projects', (req, res) => {
    res.json({ success: true, projects: Array.from(projects.values()) });
  });

  // Streaming Video Proxy Endpoint (Zero CORS issue, Full HTTP 206 Range Request Support)
  app.get('/api/proxy-video', async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        return res.status(400).json({ error: 'Valid URL is required' });
      }
      
      const isSafe = await validateProxyUrl(url);
      if (!isSafe) {
        return res.status(403).json({ error: 'Forbidden: Unauthorized proxy destination or blocked IP' });
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const upstreamRes = await fetch(url, { headers });
      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        return res.status(upstreamRes.status).json({ error: 'Failed to fetch upstream video' });
      }

      const contentType = upstreamRes.headers.get('content-type') || 'video/mp4';
      const contentLength = upstreamRes.headers.get('content-length');
      const contentRange = upstreamRes.headers.get('content-range');
      const acceptRanges = upstreamRes.headers.get('accept-ranges') || 'bytes';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', acceptRanges);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);

      res.status(upstreamRes.status);
      const arrayBuffer = await upstreamRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (e: any) {
      console.error('[Proxy-Video] Error:', e.message);
      res.status(500).json({ error: e.message || 'Video proxy error' });
    }
  });

  app.get('/api/gallery', verifyToken, (req: AuthenticatedRequest, res) => {
    try {
      const allProjects = Array.from(projects.values())
        .filter(p => (p.status as string) !== 'deleted' && p.userId === req.user?.user_id)
        .sort((a, b) => {
           const tA = new Date(a.createdAt || 0).getTime();
           const tB = new Date(b.createdAt || 0).getTime();
           return tB - tA;
        });
      res.json(allProjects);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET all generated images & keyframe & video assets (Fal.ai, Gemini, uploaded, project frames)
  const handleGalleryAssets = async (req: any, res: express.Response) => {
    try {
      const assetMap = new Map<string, any>();
      const outputsDir = path.join(process.cwd(), 'outputs');

      // 1. Gather all scene keyframes, video renders, and reference assets from active & saved projects
      for (const p of Array.from(projects.values()).filter((proj: any) => proj.userId === req.user?.user_id)) {
        if (p.storyboard && Array.isArray(p.storyboard.scenes)) {
          p.storyboard.scenes.forEach((scene: any, idx: number) => {
            // Images
            const imgUrl = scene.imageUrl || scene.assetUrl;
            if (imgUrl && typeof imgUrl === 'string' && !imgUrl.startsWith('data:video/')) {
              const engineStr = scene.imageEngine || (p as any).imageEngine || (p as any).imageModel || 'fal-ai';
              const isFal = engineStr.includes('fal') || engineStr.includes('flux') || engineStr.includes('wan') || engineStr.includes('hunyuan') || engineStr.includes('seedance') || engineStr.includes('kling') || engineStr.includes('standard') || engineStr.includes('precision') || engineStr.includes('draft');
              const isGemini = engineStr.includes('gemini') || engineStr.includes('banana') || engineStr.includes('nano-asli') || engineStr.includes('google');

              assetMap.set(imgUrl, {
                id: `proj_${p.id}_scene_${scene.id || idx + 1}_img`,
                type: 'image',
                url: imgUrl,
                filename: imgUrl.split('/').pop(),
                thumbnailUrl: imgUrl,
                remoteUrl: scene.remoteUrl || scene.falUrl,
                prompt: scene.visualDirection || scene.textOverlay || `Keyframe Adegan #${idx + 1}`,
                engine: engineStr,
                source: isFal ? 'fal-ai' : isGemini ? 'gemini' : 'other',
                projectId: p.id,
                projectTitle: p.title || 'Tanpa Judul',
                sceneIndex: idx + 1,
                sceneId: scene.id,
                aspectRatio: (p as any).aspectRatio || (p as any).customRatio || '9:16',
                createdAt: p.createdAt || new Date().toISOString()
              });
            }

            // Videos (Fal.ai, Wan, Hunyuan, Kling, etc.)
            const vidUrl = scene.videoUrl;
            if (vidUrl && typeof vidUrl === 'string' && !vidUrl.startsWith('data:image/')) {
              const engineStr = scene.videoModel || (p as any).videoModel || 'fal-ai';
              assetMap.set(vidUrl, {
                id: `proj_${p.id}_scene_${scene.id || idx + 1}_vid`,
                type: 'video',
                url: vidUrl,
                filename: vidUrl.split('/').pop(),
                remoteUrl: (scene as any).remoteVideoUrl || scene.remoteUrl || scene.falUrl,
                thumbnailUrl: scene.imageUrl || scene.assetUrl || vidUrl,
                prompt: scene.visualDirection || `Video Render Adegan #${idx + 1}`,
                engine: engineStr,
                source: 'fal-ai',
                duration: scene.duration || '5s',
                projectId: p.id,
                projectTitle: p.title || 'Tanpa Judul',
                sceneIndex: idx + 1,
                sceneId: scene.id,
                aspectRatio: (p as any).aspectRatio || (p as any).customRatio || '9:16',
                createdAt: p.createdAt || new Date().toISOString()
              });
            }
          });
        }

        // Project Final Video if present
        if (p.finalVideoUrl && typeof p.finalVideoUrl === 'string' && !p.finalVideoUrl.startsWith('data:image/')) {
          const firstSceneThumb = p.storyboard?.scenes?.[0]?.imageUrl || p.storyboard?.scenes?.[0]?.assetUrl;
          assetMap.set(p.finalVideoUrl, {
            id: `proj_${p.id}_final_vid`,
            type: 'video',
            url: p.finalVideoUrl,
            filename: p.finalVideoUrl.split('/').pop(),
            remoteUrl: (p as any).remoteFinalVideoUrl,
            thumbnailUrl: firstSceneThumb || p.finalVideoUrl,
            prompt: `Final Video Master: ${p.title || 'Kreasi AI'}`,
            engine: (p as any).videoModel || 'AI Master Video',
            source: 'fal-ai',
            projectId: p.id,
            projectTitle: p.title || 'Tanpa Judul',
            aspectRatio: (p as any).aspectRatio || '9:16',
            createdAt: p.createdAt || new Date().toISOString()
          });
        }

        // Master character reference
        if (p.masterCharacterImageUrl && typeof p.masterCharacterImageUrl === 'string') {
          assetMap.set(p.masterCharacterImageUrl, {
            id: `proj_${p.id}_char_ref`,
            type: 'image',
            url: p.masterCharacterImageUrl,
            filename: p.masterCharacterImageUrl.split('/').pop(),
            thumbnailUrl: p.masterCharacterImageUrl,
            prompt: `Master Character Reference: ${p.characterProfile?.name || p.title || 'Proyek'}`,
            engine: 'reference',
            source: 'reference',
            projectId: p.id,
            projectTitle: p.title || 'Tanpa Judul',
            createdAt: p.createdAt || new Date().toISOString()
          });
        }

        // Master product reference
        if (p.masterProductImageUrl && typeof p.masterProductImageUrl === 'string') {
          assetMap.set(p.masterProductImageUrl, {
            id: `proj_${p.id}_prod_ref`,
            type: 'image',
            url: p.masterProductImageUrl,
            filename: p.masterProductImageUrl.split('/').pop(),
            thumbnailUrl: p.masterProductImageUrl,
            prompt: `Master Product Reference: ${p.title || 'Produk'}`,
            engine: 'reference',
            source: 'reference',
            projectId: p.id,
            projectTitle: p.title || 'Tanpa Judul',
            createdAt: p.createdAt || new Date().toISOString()
          });
        }
      }

      // 2. Helper to recursively scan directory for media files
      const scanMediaDir = (dirPath: string, urlPrefix: string) => {
        if (!fs.existsSync(dirPath)) return;
        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
              scanMediaDir(fullPath, `${urlPrefix}/${entry.name}`);
            } else if (entry.isFile()) {
              const file = entry.name;
              const isImg = /\.(png|jpg|jpeg|webp)$/i.test(file);
              const isVid = /\.(mp4|mov|webm)$/i.test(file);
              if (isImg || isVid) {
                const url = `${urlPrefix}/${file}`;
                try {
                  const stat = fs.statSync(fullPath);
                  if (!assetMap.has(url)) {
                    let inferredSource = 'fal-ai';
                    let inferredEngine = isVid ? 'fal-ai/video-render' : 'fal-ai/flux/schnell';
                    if (file.includes('gemini') || file.includes('banana') || file.includes('nano')) {
                      inferredSource = 'gemini';
                      inferredEngine = 'gemini-2.5-flash-image';
                    } else if (file.includes('ref') || file.includes('upload') || file.includes('avatar') || file.includes('product')) {
                      inferredSource = 'uploaded';
                      inferredEngine = 'custom-upload';
                    }

                    let promptDesc = isVid ? 'Video Render Fal.ai' : 'Generated Image Asset';
                    if (file.startsWith('fal_rendered_scene_') || file.startsWith('scene_mixed_') || file.startsWith('scene_vid_')) {
                      const m = file.match(/_(\d+)/);
                      const num = m ? parseInt(m[1]) + 1 : 1;
                      promptDesc = `Video Render Fal.ai Adegan #${num}`;
                      inferredEngine = 'fal-ai/video-render';
                      inferredSource = 'fal-ai';
                    } else if (file.startsWith('scene_img_')) {
                      const m = file.match(/scene_img_(\d+)/);
                      promptDesc = m ? `Keyframe Adegan #${m[1]}` : 'Keyframe Adegan';
                    } else if (file.startsWith('studio_scene_')) {
                      promptDesc = 'Studio Live Generated Asset';
                    } else if (file.startsWith('sample-') || urlPrefix.includes('videos')) {
                      promptDesc = `Koleksi Video Contoh: ${file.replace(/\.[^/.]+$/, '').replace('sample-', '')}`;
                      inferredSource = 'preset';
                      inferredEngine = 'sample-video-clip';
                    }

                    assetMap.set(url, {
                      id: `asset_${file}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      type: isVid ? 'video' : 'image',
                      url,
                      thumbnailUrl: isVid ? undefined : url,
                      filename: file,
                      prompt: promptDesc,
                      engine: inferredEngine,
                      source: inferredSource,
                      size: stat.size,
                      createdAt: stat.mtime.toISOString()
                    });
                  }
                } catch (statErr) {
                  // ignore deleted temp files
                }
              }
            }
          }
        } catch (e) {
          console.warn('[handleGalleryAssets] Scan error:', e);
        }
      };

      // ONLY scan floating files (outputs directory & GCS) if the user is a founder
      // For regular users, floating assets without a project ID cannot be securely attributed to them.
      if (req.user?.role === 'founder' || req.user?.user_id === 'founder_root_001') {
        scanMediaDir(outputsDir, '/outputs');
        
        // NEW: Scan GCS Bucket if enabled and accessible
        if (process.env.GCS_BUCKET_NAME && GCSStreamService.isAvailable()) {
          try {
            const { Storage } = await import('@google-cloud/storage');
            const storage = new Storage({
              projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
              keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
            });
            const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
            const [files] = await bucket.getFiles({ prefix: 'assets/' });
            for (const file of files) {
              const url = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${file.name}`;
              if (!assetMap.has(url)) {
                const isImg = /\.(png|jpg|jpeg|webp)$/i.test(file.name);
                const isVid = /\.(mp4|mov|webm)$/i.test(file.name);
                if (isImg || isVid) {
                  let inferredSource = 'fal-ai';
                  let inferredEngine = isVid ? 'fal-ai/video-render' : 'fal-ai/flux/schnell';
                  let promptDesc = isVid ? 'GCS Video Asset' : 'GCS Image Asset';
                  
                  assetMap.set(url, {
                    id: `gcs_${file.name}_${Date.now()}`,
                    type: isVid ? 'video' : 'image',
                    url: url,
                    filename: url.split('/').pop(),
                    thumbnailUrl: url,
                    prompt: promptDesc,
                    engine: inferredEngine,
                    source: inferredSource,
                    projectId: 'floating',
                    projectTitle: 'Unassigned Asset',
                    createdAt: file.metadata.timeCreated || new Date().toISOString()
                  });
                }
              }
            }
          } catch (err: any) {
            if (!err.message?.includes('storage.objects.list access')) {
              console.warn('[handleGalleryAssets] Failed to scan GCS Bucket:', err);
            }
          }
        }
      }

      // const publicVideosDir = path.join(process.cwd(), 'public', 'videos');
      // scanMediaDir(publicVideosDir, '/videos');

      const allAssets = Array.from(assetMap.values()).sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });

      // Maintain backward-compatibility: 'images' contains all items, assets contains all items
      res.json({ success: true, count: allAssets.length, images: allAssets, assets: allAssets });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  app.get('/api/gallery/images', verifyToken, handleGalleryAssets);
  app.get('/api/gallery/assets', verifyToken, handleGalleryAssets);

  // POST upload an asset to the gallery library
  app.post('/api/gallery/images/upload', verifyToken, async (req: any, res) => {
    try {
      const { image, filename, prompt } = req.body;
      if (!image) return res.status(400).json({ success: false, error: 'Missing image data' });
      const { saveFileLocally } = await import('./server/orchestrator');
      
      let ext = 'png';
      if (image.startsWith('data:video/mp4')) ext = 'mp4';
      else if (image.startsWith('data:video/webm')) ext = 'webm';
      else if (image.startsWith('data:image/jpeg')) ext = 'jpg';
      else if (image.startsWith('data:image/webp')) ext = 'webp';

      const localUrl = await saveFileLocally(image, filename || 'custom_gallery_asset', ext);
      res.json({ success: true, url: localUrl });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE a gallery asset from disk
  app.delete('/api/gallery/images/:filename', verifyToken, async (req: any, res: express.Response) => {
    try {
      const filename = path.basename(req.params.filename);
      const isFounder = req.user?.role === 'founder' || req.user?.user_id === 'founder_root_001';
      
      // Ownership Check & Database Cleanup
      let isOwner = false;
      let projectModified = false;
      
      for (const p of Array.from(projects.values())) {
        let isProjectModified = false;
        if ((p as any).userId === req.user?.user_id || isFounder) {
          if (p.storyboard && Array.isArray(p.storyboard.scenes)) {
            for (const scene of p.storyboard.scenes) {
              const imgUrl = scene.imageUrl || scene.assetUrl || scene.remoteUrl || scene.falUrl || '';
              const vidUrl = scene.videoUrl || '';
              
              if (imgUrl.includes(filename)) {
                isOwner = true;
                scene.imageUrl = '';
                scene.assetUrl = '';
                scene.remoteUrl = '';
                scene.falUrl = '';
                isProjectModified = true;
              }
              if (vidUrl.includes(filename)) {
                isOwner = true;
                scene.videoUrl = '';
                (scene as any).remoteVideoUrl = '';
                isProjectModified = true;
              }
            }
          }
          if (p.finalVideoUrl && p.finalVideoUrl.includes(filename)) {
            isOwner = true;
            p.finalVideoUrl = '';
            (p as any).remoteFinalVideoUrl = '';
            isProjectModified = true;
          }
        }
        if (isProjectModified) {
          projectModified = true;
        }
      }
      
      if (!isOwner && !isFounder) {
        return res.status(403).json({ success: false, error: 'Access denied. You do not own this asset or the asset is not tied to your project.' });
      }

      if (projectModified) {
        
        saveProjects(); // This syncs the memory Map to SQLite
      }

      let deleted = false;

      // 1. Delete from local /outputs/
      const filePath = path.join(process.cwd(), 'outputs', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
      }
      
      // 2. Delete from GCS
      if (process.env.GCS_BUCKET_NAME && GCSStreamService.isAvailable()) {
        try {
          const { Storage } = await import('@google-cloud/storage');
          const storage = new Storage({
            projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
          });
          const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
          const file = bucket.file(`assets/${filename}`);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            deleted = true;
          }
        } catch (err) {
          console.warn('[DELETE Asset] GCS deletion error:', err);
        }
      }

      if (deleted) {
        res.json({ success: true });
      } else {
        // If it was removed from DB but not found physically, still count as success
        res.json({ success: projectModified, message: projectModified ? 'Removed from database, but file not found on disk.' : 'Not found.' });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/gallery/:id', (req, res) => {
    try {
      projects.delete(req.params.id);
      saveProjects();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Safe Project Video Validator: Never blindly delete user video URLs if remote backup exists
  function checkAndValidateProjectVideo(project: any) {
    if (!project) return;
    // Keep project.finalVideoUrl intact to protect user credits & render persistence
  }

  
  // Soft Delete Project
  app.delete('/api/projects/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    
    if (project.showcaseEligible) {
      return res.status(400).json({ success: false, error: "Project sedang dalam status Showcase. Nonaktifkan status Showcase di Founder Dashboard sebelum menghapus." });
    }

    project.status = 'deleted';
    project.deletedAt = new Date().toISOString();
    
    // Log audit
    
    if (typeof appendLog === 'function') {
      appendLog(project, 'FOUNDER', `User soft-deleted project ${project.id} (${project.title})`, 'WARN');
    }

    saveProjects();
    res.json({ success: true, message: "Project berhasil dipindahkan ke folder 'Baru Dihapus'." });
  });

  // Restore Project
  app.post('/api/projects/:id/restore', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    
    project.status = 'COMPLETED'; // or previous status
    delete project.deletedAt;
    
    
    if (typeof appendLog === 'function') {
      appendLog(project, 'FOUNDER', `User restored project ${project.id} (${project.title})`, 'SUCCESS');
    }

    saveProjects();
    res.json({ success: true, message: "Project berhasil dipulihkan." });
  });

  // Hard Delete Project
  app.delete('/api/projects/:id/hard', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    
    if (project.showcaseEligible) {
      return res.status(400).json({ success: false, error: "Project sedang dalam status Showcase. Tidak dapat dihapus permanen." });
    }

    // Attempt to delete local files associated with project
    try {
      
      
      if (project.finalVideoUrl && project.finalVideoUrl.startsWith('/outputs/')) {
         const filename = project.finalVideoUrl.replace('/outputs/', '');
         const filePath = path.join(process.cwd(), 'outputs', filename);
         if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      if (project.storyboard && project.storyboard.scenes) {
         project.storyboard.scenes.forEach((s) => {
            if (s.videoUrl && s.videoUrl.startsWith('/outputs/')) {
               const filename = s.videoUrl.replace('/outputs/', '');
               const filePath = path.join(process.cwd(), 'outputs', filename);
               if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            if (s.imageUrl && s.imageUrl.startsWith('/outputs/')) {
               const filename = s.imageUrl.replace('/outputs/', '');
               const filePath = path.join(process.cwd(), 'outputs', filename);
               if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
         });
      }
    } catch (e) {
      console.error("Error deleting local files:", e);
    }

    
    if (typeof appendLog === 'function') {
      appendLog(project, 'FOUNDER', `User hard-deleted project ${project.id} (${project.title})`, 'ERROR');
    }

    projects.delete(req.params.id);
    saveProjects();
    res.json({ success: true, message: "Project dan semua file terkait berhasil dihapus permanen." });
  });

  
  app.get('/api/projects/deleted', (req, res) => {
    const deletedProjects = Array.from(projects.values()).filter((p: any) => p.status === 'deleted');
    res.json(deletedProjects);
  });

  
  app.post('/api/test-fal-model', async (req, res) => {
    try {
      const { endpoint } = req.body;
      const keyRotator = (await import('./server/keyRotator.ts')).keyRotator;
      const key = await keyRotator.getNextFalKey();
      if (!key) return res.status(500).json({ error: "No fal key" });

      const response = await fetch(`https://fal.run/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: "A beautiful cinematic shot of a glowing forest",
          image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbeaEAAAAAElFTkSuQmCC"
        })
      });
      
      if (!response.ok) {
         const text = await response.text();
         return res.status(response.status).json({ error: text });
      }
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/projects', (req, res) => {
    const allProjects = Array.from(projects.values()).filter((p: any) => p.status !== 'deleted');
    allProjects.forEach(checkAndValidateProjectVideo);
    res.json(allProjects);
  });

  app.get('/api/config/client', (req, res) => {
    res.json({
      qaMinScoreThreshold: FounderService.qaMinScoreThreshold || 70,
      qaAutoFixThreshold: FounderService.qaAutoFixThreshold || 80
    });
  });

  // Showcase API endpoint for Landing Page
  app.get('/api/showcase/videos', (req, res) => {
    const allProjects = Array.from(projects.values());
    const showcaseProjects = allProjects.filter((p: any) => p.showcaseEligible === true && (p.finalVideoUrl || p.storyboard?.scenes?.some((s: any) => s.videoUrl)));
    
    // Sort by showcaseOrder if specified, otherwise by createdAt desc
    showcaseProjects.sort((a: any, b: any) => {
      if (typeof a.showcaseOrder === 'number' && typeof b.showcaseOrder === 'number') {
        return a.showcaseOrder - b.showcaseOrder;
      }
      if (typeof a.showcaseOrder === 'number') return -1;
      if (typeof b.showcaseOrder === 'number') return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const items = showcaseProjects.map((p: any) => {
      const firstSceneWithVideo = p.storyboard?.scenes?.find((s: any) => s.videoUrl);
      const url = p.finalVideoUrl || firstSceneWithVideo?.videoUrl || '';
      const totalSec = p.storyboard?.scenes?.reduce((acc: number, s: any) => acc + (Number(s.duration) || 5), 0) || 15;
      const model = p.videoModel || (p.data && typeof p.data === 'string' && p.data.includes('wan') ? 'Wan 2.1' : 'AI Video Model');
      return {
        id: p.id,
        projectId: p.id,
        title: p.title || p.brief?.product || 'AI Masterpiece',
        prompt: p.brief?.angle || p.storyboard?.scenes?.[0]?.visualDescription || 'Visual AI Video',
        videoUrl: url,
        aspectRatio: p.aspectRatio || '9:16',
        duration: `${totalSec}s`,
        niche: p.videoType || 'AFFILIATE',
        videoModel: model,
        showcaseEligible: true,
        showcaseOrder: p.showcaseOrder ?? null,
        createdAt: p.createdAt
      };
    });

    res.json({ success: true, count: items.length, data: items });
  });

  // Toggle Showcase status for Founder Dashboard
  app.post('/api/projects/:id/toggle-showcase', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    const { showcaseEligible, showcaseOrder } = req.body;
    if (typeof showcaseEligible === 'boolean') {
      (project as any).showcaseEligible = showcaseEligible;
    } else {
      (project as any).showcaseEligible = !(project as any).showcaseEligible;
    }

    if (typeof showcaseOrder === 'number') {
      (project as any).showcaseOrder = showcaseOrder;
    }

    saveProjects();
    res.json({
      success: true,
      projectId: project.id,
      showcaseEligible: (project as any).showcaseEligible,
      showcaseOrder: (project as any).showcaseOrder
    });
  });

  app.get('/api/projects/:id', async (req, res) => {
     let project = projects.get(req.params.id);
     if (!project) {
        // Fallback to SQLite
        try {
          const row = db.select().from(dbProjects).where(eq(dbProjects.id, req.params.id)).get();
          if (row && row.data) {
             project = JSON.parse(row.data);
             if (project) {
               projects.set(req.params.id, project);
             }
          }
        } catch (e) {
          console.warn('[GET Project] SQLite fallback error:', e);
        }
     }
     if (!project) return res.status(404).json({error: "Not found"});
     if (project.overallProgress !== undefined && project.progress === undefined) {
       project.progress = project.overallProgress;
     } else if (project.progress !== undefined && project.overallProgress === undefined) {
       project.overallProgress = project.progress;
     }
     checkAndValidateProjectVideo(project);
     res.json(project);
  });

  // Client API v1 endpoint for projects
  app.get('/api/v1/client/projects/:projectId', (req, res) => {
    const project = projects.get(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    checkAndValidateProjectVideo(project);
    res.json({
      success: true,
      data: {
        id: project.id,
        title: project.title,
        status: project.status,
        videoUrl: project.finalVideoUrl || '',
        audioUrl: project.audioResponseUrl || '',
        caption: project.marketingCopy?.caption || '',
        hashtags: project.marketingCopy?.hashtags || [],
        voiceProfile: project.marketingCopy?.voiceProfile || project.ttsVoiceConfig?.voiceName || 'Citra Kirana',
        scenes: project.storyboard?.scenes || [],
        scriptExcerpt: project.storyboard?.scenes?.map(s => s.voiceOver).filter(Boolean).join('\n') || ''
      },
      project
    });
  });

  const handleSse = (req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const id = req.params.id;
    const project = projects.get(id);
    if (project) {
      res.write(`data: ${JSON.stringify(project)}\n\n`);
    }

    const listener = (updatedProject: any) => {
      res.write(`data: ${JSON.stringify(updatedProject)}\n\n`);
    };

    projectEvents.on(`update:${id}`, listener);

    req.on('close', () => {
      projectEvents.off(`update:${id}`, listener);
    });
  };

  app.get('/api/projects/:id/stream', handleSse);
  app.get('/api/projects/:id/events', handleSse);

  // Global API error fallback middleware
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API ERROR HANDLER]', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error occurred'
    });
  });

  // Image Proxy Route for safe cross-origin fetching
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        return res.status(400).json({ error: 'Valid URL is required' });
      }

      const isSafe = await validateProxyUrl(url);
      if (!isSafe) {
        return res.status(403).json({ error: 'Forbidden: Unauthorized proxy destination or blocked IP' });
      }
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch upstream image' });
      }
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Image proxy error' });
    }
  });

  // Resilient /outputs handler: serves disk file or dynamically restores from remote CDN (Fal.ai, GCS)
  app.get(['/outputs/:filename', '/api/outputs/:filename'], async (req, res) => {
    const filename = req.params.filename;
    const outputsDir = path.join(process.cwd(), 'outputs');
    const filePath = path.join(outputsDir, filename);

    // 1. If file exists on disk and is not empty, serve directly with CORS & cache headers
    if (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          if (filename.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
          else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
          else if (filename.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
          else if (filename.endsWith('.mp4')) res.setHeader('Content-Type', 'video/mp4');
          return res.sendFile(filePath);
        }
      } catch (statErr) {
        console.warn(`[Outputs Handler] Error checking stat for ${filename}:`, statErr);
      }
    }

    // 2. If file does NOT exist on disk (e.g. deployed container restart / Cloud Run instance),
    // search for known remote URL in persistent map or active project storyboard
    let remoteUrl = getRemoteUrlForFilename(filename);
    if (!remoteUrl) {
      for (const p of projects.values()) {
        if (p.storyboard && Array.isArray(p.storyboard.scenes)) {
          for (const s of p.storyboard.scenes) {
            if ((s.imageUrl && s.imageUrl.includes(filename)) || (s.assetUrl && s.assetUrl.includes(filename))) {
              remoteUrl = s.remoteUrl || s.falUrl || (s.imageUrl?.startsWith('http') ? s.imageUrl : undefined);
              if (remoteUrl) break;
            }
            if (s.videoUrl && s.videoUrl.includes(filename)) {
              remoteUrl = (s as any).remoteVideoUrl || (s.videoUrl.startsWith('http') ? s.videoUrl : undefined);
              if (remoteUrl) break;
            }
          }
        }
        if (remoteUrl) break;
      }
    }

    // 3. If remote URL found, fetch and auto-restore to disk cache
    if (remoteUrl && (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://'))) {
      try {
        console.log(`[Outputs Handler] Restoring missing asset '${filename}' from remote URL: ${remoteUrl}`);
        const response = await fetch(remoteUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          if (!fs.existsSync(outputsDir)) {
            fs.mkdirSync(outputsDir, { recursive: true });
          }
          fs.writeFileSync(filePath, buffer);
          setRemoteUrlForFilename(filename, remoteUrl);

          return res.sendFile(filePath, {
            headers: {
              'Cross-Origin-Resource-Policy': 'cross-origin',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400'
            }
          });
        } else {
          return res.redirect(remoteUrl);
        }
      } catch (fetchErr: any) {
        console.warn(`[Outputs Handler] Failed to fetch remote asset for ${filename}:`, fetchErr.message);
        return res.redirect(remoteUrl);
      }
    }

    // 4. Fallback if not found anywhere
    if (filename.endsWith('.mp4')) {
      const fallbackPath = path.join(process.cwd(), 'public', 'videos', 'sample-ocean.mp4');
      if (fs.existsSync(fallbackPath)) {
        return res.sendFile(fallbackPath, {
          headers: {
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      return res.status(404).send('File video tidak ditemukan di server.');
    }
    return res.status(404).send('File gambar tidak ditemukan di server.');
  });

  // Ensure ANY unhandled /api/* route ALWAYS returns a structured JSON 404, NEVER HTML index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint tidak ditemukan: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler for API routes to guarantee JSON responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path && req.path.startsWith('/api/')) {
      console.error('[API Global Error Handler]:', err);
      return res.status(err.status || 500).json({
        error: err.message || 'Terjadi kesalahan internal pada server.',
        status: err.status || 500
      });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        ...(isHmrDisabled ? { hmr: false, ws: false } : {}),
      },
      appType: "spa",
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : (typeof __dirname !== 'undefined' && fs.existsSync(path.join(__dirname, 'index.html'))
          ? __dirname
          : path.join(process.cwd(), 'dist'));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        const fallback = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(fallback)) {
          res.sendFile(fallback);
        } else {
          res.status(200).send('<!doctype html><html lang="en"><head><title>NEURONA</title></head><body><div id="root"></div></body></html>');
        }
      }
    });
  }

  let activeServer: http.Server | null = null;
  let listeningAttempts = 0;
  const MAX_ATTEMPTS = 15;
  const RETRY_DELAY_MS = 500;

  function tryListen() {
    listeningAttempts++;
    const srv = http.createServer(app);
    activeServer = srv;

    srv.on("listening", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    srv.on("error", (err: any) => {
      if (err && err.code === "EADDRINUSE") {
        if (listeningAttempts < MAX_ATTEMPTS) {
          console.warn(`[PORT RECOVERY] Port ${PORT} busy. Retrying in ${RETRY_DELAY_MS}ms (attempt ${listeningAttempts}/${MAX_ATTEMPTS})...`);
          setTimeout(() => {
            tryListen();
          }, RETRY_DELAY_MS);
        } else {
          console.error(`[PORT FATAL] Port ${PORT} busy after ${MAX_ATTEMPTS} attempts.`);
          process.exit(1);
        }
      } else {
        console.error("[SERVER FATAL ERROR]", err);
        process.exit(1);
      }
    });

    srv.listen(PORT, "0.0.0.0");
  }

  const cleanupAndExit = (signal: string) => {
    console.log(`[SYSTEM] ${signal} received. Closing server gracefully...`);
    if (activeServer) {
      activeServer.close(() => {
        console.log(`[SYSTEM] Closed server on port ${PORT}.`);
      });
    }
    setTimeout(() => {
      process.exit(0);
    }, 1000).unref();
  };

  process.on("SIGTERM", () => cleanupAndExit("SIGTERM"));
  process.on("SIGINT", () => cleanupAndExit("SIGINT"));

  tryListen();
}

startServer().catch((err) => {
  console.error('[CRITICAL] Failed to start server:', err);
  process.exit(1);
});
