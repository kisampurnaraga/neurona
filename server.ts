import express from "express";
import fs from "fs";
import { StitcherAgent } from './src/server/core/StitcherAgent';

import path from "path";
import { createServer as createViteServer } from "vite";
import { ProductionOrchestrator, projectEvents, projects, loadProjects } from "./server/orchestrator";
import { getVideoProvider } from "./src/server/providers";
import { ConversationalIntentRouter } from "./src/server/core/IntentRouter";
import { FounderService } from "./src/server/fcc/FounderService";
import { verifyToken, requireRole, generateUserToken, userDatabase, AuthenticatedRequest, UserSession } from "./server/middleware/auth";
import videoStudioRouter from "./server/routes/videoStudio";
import workerRouter from "./server/routes/workerRoute";
import founderPaymentRouter from "./server/routes/founderPayment";

async function startServer() {
  // Load existing projects from local db
  loadProjects();

  const app = express();
  const PORT = 3000;
  
  // Increase payload limit to support base64 product images / attachments
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API routes FIRST
  
  app.post('/api/stitch', async (req, res) => {
    try {
      const { projectId, scenes } = req.body;
      if (projectId) {
          const project = projects.get(projectId);
          if (!project) return res.status(404).json({ error: 'Project not found.' });
          
          console.log(`[Stitcher API] Processing full project merge for project ${projectId}...`);
          const finalUrl = await (await import('./server/VideoEditor')).VideoEditor.processProject(project);
          res.json({ success: true, url: finalUrl });
      } else {
          if (!scenes || !Array.isArray(scenes)) {
            return res.status(400).json({ error: 'scenes array is required.' });
          }
          console.log(`[Stitcher API] Received request to stitch ${scenes.length} videos via basic Stitcher`);
          const finalUrl = await StitcherAgent.stitchVideos(scenes);
          res.json({ success: true, url: finalUrl });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mount Google Cloud Veo Studio & Cloud Tasks Worker routes
  app.use('/api/v1/studio', videoStudioRouter);
  app.use('/api/v1/tasks', workerRouter);
  app.use('/api/v1/founder/payment', founderPaymentRouter);

  // RBAC Authentication & Session Endpoints
  app.get("/api/auth/me", verifyToken, (req: AuthenticatedRequest, res) => {
    res.json({
      user: req.user,
      authenticated: true
    });
  });

  // User Login Endpoint (Email + 6-digit PIN / Password)
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password/PIN harus diisi.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();

    // Check if founder credentials
    const founderMasterKey = process.env.FOUNDER_ACCESS_KEY || 'NEURONNA_FOUNDER_MASTER_2025';
    if (
      (cleanEmail === 'ia.asep12@gmail.com' || cleanEmail === 'founder@neuronna.ai' || cleanEmail === 'founder') &&
      (cleanPass === 'ia12aS87!' || cleanPass === founderMasterKey || cleanPass === 'NEURONNA_FOUNDER_MASTER_2025' || cleanPass === 'founder2026')
    ) {
      const founderUser = userDatabase.getUserByEmail('ia.asep12@gmail.com') || userDatabase.getUser('founder_root_001')!;
      const token = generateUserToken(founderUser, 720);
      return res.json({
        success: true,
        token,
        user: founderUser,
        message: 'Login Founder Berhasil. Selamat datang Master Architect.'
      });
    }

    const user = userDatabase.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'Email belum terdaftar. Silakan lakukan pemesanan Paket Early Bird Rp 150.000 via WhatsApp untuk mendapatkan akun aktif.'
      });
    }

    // Verify Password / PIN
    if (user.password_plain && user.password_plain !== cleanPass) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Password atau PIN 6 digit yang Anda masukkan salah. Cek kembali pesan WhatsApp dari Admin.'
      });
    }

    // Check if active
    if (!user.status_aktif) {
      return res.status(403).json({
        error: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda belum aktif. Harap konfirmasi pembayaran Rp 150.000 ke WhatsApp Admin untuk aktivasi instan.',
        activation_url: `https://wa.me/6281234567890?text=${encodeURIComponent(
          `Halo Admin Neuronna, saya ingin mengaktifkan akun saya (${user.email}). Berikut bukti transfer Rp 150.000:`
        )}`
      });
    }

    const token = generateUserToken(user, 720);
    res.json({
      success: true,
      token,
      user,
      message: `Selamat datang kembali, ${user.name}!`
    });
  });

  // Founder Direct Login Gate Endpoint
  app.post("/api/auth/founder-login", (req, res) => {
    const { key, email } = req.body || {};
    const founderMasterKey = process.env.FOUNDER_ACCESS_KEY || 'NEURONNA_FOUNDER_MASTER_2025';
    const cleanKey = String(key || '').trim();
    
    if (
      cleanKey === founderMasterKey || 
      cleanKey === 'NEURONNA_FOUNDER_MASTER_2025' || 
      cleanKey === 'ia12aS87!' || 
      cleanKey === 'founder2026' || 
      cleanKey === 'neuronna2026'
    ) {
      const founderUser = userDatabase.getUserByEmail('ia.asep12@gmail.com') || userDatabase.getUser('founder_root_001')!;
      const token = generateUserToken(founderUser, 720);
      return res.json({
        success: true,
        token,
        user: founderUser,
        message: 'Akses Founder Terverifikasi. Selamat Datang Founder.'
      });
    }

    return res.status(401).json({
      error: 'INVALID_FOUNDER_KEY',
      message: 'Kunci Otorisasi Founder tidak valid.'
    });
  });

  // Admin: Get all users
  app.get("/api/admin/users", verifyToken, requireRole(['founder', 'admin']), (req: AuthenticatedRequest, res) => {
    const users = userDatabase.getAllUsers();
    res.json({ users });
  });

  // Admin: Create & Activate User Manual
  app.post("/api/admin/users/create", verifyToken, requireRole(['founder', 'admin']), (req: AuthenticatedRequest, res) => {
    const { name, email, phone_wa, credits = 150, role = 'user', password } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ error: 'Nama dan Email harus diisi.' });
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
    const pin = password || Math.floor(100000 + Math.random() * 900000).toString();

    const newUser: UserSession = {
      user_id: userId,
      email: String(email).trim().toLowerCase(),
      name: String(name).trim(),
      role: (role as any) || 'user',
      credits: Number(credits) || 150,
      status_aktif: true,
      password_plain: pin,
      phone_wa: phone_wa ? String(phone_wa).trim() : undefined,
      package_tier: 'early_bird_lifetime',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    userDatabase.setUser(userId, newUser);
    res.json({
      success: true,
      user: newUser,
      pin,
      message: `Pengguna '${newUser.name}' berhasil didaftarkan dan diaktifkan dengan PIN: ${pin}`
    });
  });

  // Admin / Founder: Activate User & Top-up Credits
  app.post("/api/admin/users/:id/activate", verifyToken, requireRole(['founder', 'admin']), (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { credits = 150, role = 'user' } = req.body;
    
    console.log(`[RBAC ADMIN] Founder/Admin '${req.user?.user_id}' activating user '${id}' with +${credits} credits...`);
    const updated = userDatabase.activateUser(id, credits);
    
    if (!updated) {
      return res.status(404).json({ error: 'User not found in registry.' });
    }
    
    res.json({
      success: true,
      message: `User '${id}' berhasil diaktifkan dengan ${credits} kredit render.`,
      user: updated
    });
  });

  // Utility: Generate Sample Token
  app.get("/api/auth/token-sample", (req, res) => {
    const sample = {
      user_id: 'user_pioneer_' + Math.random().toString(36).substring(2, 7),
      email: (req.query.email as string) || 'kreator@neuronna.ai',
      name: (req.query.name as string) || 'Kreator Neuronna',
      role: ((req.query.role as any) || 'user'),
      credits: 150,
      status_aktif: true,
      package_tier: 'early_bird_lifetime' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    userDatabase.setUser(sample.user_id, sample);
    const token = generateUserToken(sample, 720);
    res.json({ token, user: sample });
  });

  app.get("/api/providers/status", async (req, res) => {
    try {
      const provider = getVideoProvider();
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
        videoType 
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
           educationalConfig: educationalConfig || (finalType === 'EDUCATIONAL' ? result.quickConfig : undefined)
         });
      } else if (result.action === 'APPROVE' && projectId) {
         await ProductionOrchestrator.approveStoryboard(projectId);
      }
      
      res.json({ ...result, projectId: newProjectId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  app.post('/api/chat', handleInteraction);
  app.post('/api/interact', handleInteraction);

  app.post('/api/tts', async (req, res) => {
    try {
      const { text, provider, voiceName, voiceGender, model } = req.body;
      const { TTSService } = await import('./server/ttsService');
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

  // Founder Control Center API
  app.get('/api/fcc/config', (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden. Founder access required.'});
     res.json(FounderService.getPlatformConfig());
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
      const { sceneId, imageEngine } = req.body;
      await ProductionOrchestrator.generateSceneImage(req.params.id, sceneId, imageEngine);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects/:id/generate-all-images', async (req, res) => {
    try {
      const { imageEngine } = req.body;
      await ProductionOrchestrator.generateAllSceneImages(req.params.id, imageEngine);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/projects/:id/generate-scene-video', async (req, res) => {
    try {
      const { sceneId } = req.body;
      await ProductionOrchestrator.generateSceneVideo(req.params.id, sceneId);
      res.json({ success: true });
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

  app.get('/api/gallery', (req, res) => {
    try {
      const allProjects = Array.from(projects.values())
        .filter(p => (p.status as string) !== 'ACTIVE')
        .sort((a, b) => {
           // Sort by creation time if exists, or randomly for now
           return 0;
        });
      res.json(allProjects);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/gallery/:id', (req, res) => {
    try {
      projects.delete(req.params.id);
      // Let's import saveProjects from orchestrator if we need, but for now we can just require it
      const { saveProjects } = require('./server/orchestrator');
      saveProjects();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/projects/:id', (req, res) => {
     const project = projects.get(req.params.id);
     if (!project) return res.status(404).json({error: "Not found"});
     res.json(project);
  });

  // Client API v1 endpoint for projects
  app.get('/api/v1/client/projects/:projectId', (req, res) => {
    const project = projects.get(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    res.json({
      success: true,
      data: {
        id: project.id,
        title: project.title,
        status: project.status,
        videoUrl: project.finalVideoUrl || project.storyboard?.scenes?.find(s => s.videoUrl)?.videoUrl || '',
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

  app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
