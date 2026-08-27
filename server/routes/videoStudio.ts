import { Router, Response } from 'express';
import { verifyToken, requireRole, AuthenticatedRequest, userDatabase } from '../middleware/auth';
import { QueueService } from '../services/queueService';
import { GoogleVeoService } from '../services/googleVeoService';
import { SUPPORTED_VOICE_PRESETS } from '../services/ttsService';
import { QAAuditAgent, QAAuditInput } from '../services/qaAuditAgent';
import { MultiNicheDirector, MultiNicheInput } from '../services/multiNicheDirector';

const router = Router();

const REQUIRED_CREDITS_PER_RENDER = 15;

/**
 * GET /api/v1/studio/voices
 * List all available Google Cloud TTS & Natural Voice options
 */
router.get('/voices', (req, res) => {
  res.json({
    success: true,
    voices: SUPPORTED_VOICE_PRESETS
  });
});

/**
 * POST /api/v1/studio/audit
 * Explicit QA Audit endpoint to score and auto-refine director script & prompts
 */
router.post(
  '/audit',
  verifyToken,
  requireRole(['user', 'founder', 'admin', 'creator']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload: QAAuditInput = req.body || {};
      const auditResult = await QAAuditAgent.auditAndRefine(payload);
      return res.json({
        success: true,
        audit: auditResult
      });
    } catch (err: any) {
      console.error('[VideoStudioRoute] Error during explicit QA audit:', err);
      return res.status(500).json({
        error: 'AUDIT_FAILED',
        message: err?.message || 'Gagal menjalankan QA Audit Agen.'
      });
    }
  }
);

/**
 * POST /api/v1/studio/render-video
 * Initiates an AI video render using Google Veo + Google Cloud TTS with Cloud Tasks queue
 */
router.post(
  '/render-video',
  verifyToken,
  requireRole(['user', 'founder', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sesi Anda tidak valid. Silakan login kembali.' });
      }

      // Check User Credits
      const currentCredits = user.credits ?? 0;
      if (currentCredits < REQUIRED_CREDITS_PER_RENDER && user.role !== 'founder') {
        return res.status(402).json({
          error: 'INSUFFICIENT_CREDITS',
          message: `Saldo kredit tidak mencukupi. Render video membutuhkan ${REQUIRED_CREDITS_PER_RENDER} kredit (Sisa saldo Anda: ${currentCredits} kredit).`,
          requiredCredits: REQUIRED_CREDITS_PER_RENDER,
          currentCredits
        });
      }

      const {
        promptText,
        prompt,
        voiceoverScript,
        voiceType,
        referenceImageUrl,
        productImage,
        aspectRatio,
        format,
        durationSeconds,
        syncMode
      } = req.body || {};

      const cleanPrompt = (promptText || prompt || '').trim();
      if (!cleanPrompt) {
        return res.status(400).json({
          error: 'INVALID_PROMPT',
          message: 'Prompt deskripsi video wajib diisi.'
        });
      }

      const cleanRefImage = referenceImageUrl || productImage;
      const cleanAspect = (aspectRatio || (format === '16:9' ? '16:9' : '9:16')) as '9:16' | '16:9';
      const cleanVoice = voiceType || 'id-ID-Journey-O';
      const cleanDuration = durationSeconds || 5;

      // Automated QA Audit Agent Inspection & Refinement
      console.log(`[VideoStudioRoute] Running QA Audit Agent on video prompts & narrative script...`);
      const qaAudit = await QAAuditAgent.auditAndRefine({
        promptText: cleanPrompt,
        videoPrompt: cleanPrompt,
        voiceoverScript: voiceoverScript || '',
        referenceImageUrl: cleanRefImage,
        aspectRatio: cleanAspect,
        durationSeconds: cleanDuration
      });

      // Use refined prompt/script if auto-corrected for superior Veo cinematic quality
      const finalPrompt = (qaAudit.autoCorrected && qaAudit.correctedVideoPrompt) ? qaAudit.correctedVideoPrompt : cleanPrompt;
      const finalScript = (qaAudit.autoCorrected && qaAudit.correctedScript) ? qaAudit.correctedScript : (voiceoverScript || '');

      console.log(`[VideoStudioRoute] QA Audit score: ${qaAudit.score}/100 (Passed: ${qaAudit.passed}, AutoCorrected: ${qaAudit.autoCorrected})`);

      // Synchronous Direct Render Mode (Optional fallback parameter)
      if (syncMode === true) {
        console.log(`[VideoStudioRoute] Running synchronous direct Veo render for ${user.email}...`);
        const result = await GoogleVeoService.generateVeoVideo(finalPrompt, cleanRefImage, {
          aspectRatio: cleanAspect,
          durationSeconds: cleanDuration,
          uploadToStorage: true
        });

        // Deduct credits
        if (user.role !== 'founder') {
          user.credits = Math.max(0, currentCredits - REQUIRED_CREDITS_PER_RENDER);
          await userDatabase.adjustCredits(user.user_id, -REQUIRED_CREDITS_PER_RENDER, true);
          // Handled by adjustCredits
        }

        return res.json({
          success: true,
          videoUrl: result.videoUrl,
          modelUsed: result.modelUsed,
          remainingCredits: user.credits,
          fallbackUsed: result.fallbackUsed,
          notice: result.notice,
          qaAudit,
          message: 'Render video berhasil selesai.'
        });
      }

      // Asynchronous Queue Mode (via Google Cloud Tasks / Background Worker)
      const taskResult = await QueueService.createRenderTask({
        taskId: `veo_task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.user_id || user.email,
        promptText: finalPrompt,
        voiceoverScript: finalScript,
        voiceType: cleanVoice,
        referenceImageUrl: cleanRefImage,
        aspectRatio: cleanAspect,
        durationSeconds: cleanDuration,
        creditsToDeduct: user.role === 'founder' ? 0 : REQUIRED_CREDITS_PER_RENDER
      });

      return res.status(202).json({
        success: true,
        taskId: taskResult.taskId,
        status: taskResult.status,
        requiredCredits: REQUIRED_CREDITS_PER_RENDER,
        remainingCredits: user.credits,
        qaAudit,
        pollUrl: `/api/v1/studio/task/${taskResult.taskId}`,
        message: 'Tugas render video berhasil diaudit dan diterima oleh antrean AI.'
      });

    } catch (err: any) {
      console.error('[VideoStudioRoute] Error handling render-video request:', err);
      return res.status(500).json({
        error: 'RENDER_FAILED',
        message: err?.message || 'Gagal memulai render video Google Veo.'
      });
    }
  }
);

/**
 * GET /api/v1/studio/task/:taskId
 * Check rendering task progress and get the final public Google Cloud Storage URL
 */
router.get('/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = QueueService.getTaskStatus(taskId);

  if (!task) {
    return res.status(404).json({
      error: 'TASK_NOT_FOUND',
      message: 'Task ID tidak ditemukan atau telah kadaluarsa.'
    });
  }

  return res.json({
    success: true,
    task: {
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      videoUrl: task.videoUrl,
      audioUrl: task.audioUrl,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt
    }
  });
});

/**
 * POST /api/v1/studio/task/:taskId/cancel
 * Cancel a rendering task to prevent token/credit waste
 */
router.post('/task/:taskId/cancel', verifyToken, (req, res) => {
  const { taskId } = req.params;
  const success = QueueService.cancelTask(taskId);
  if (success) {
    return res.json({
      success: true,
      message: 'Tugas render berhasil dibatalkan.'
    });
  } else {
    return res.status(400).json({
      success: false,
      message: 'Gagal membatalkan tugas. Tugas mungkin sudah selesai atau tidak ditemukan.'
    });
  }
});


router.post(
  '/multi-niche-director',
  verifyToken,
  requireRole(['user', 'founder', 'admin', 'creator']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload: MultiNicheInput = req.body || {};
      const result = await MultiNicheDirector.analyze(payload);
      return res.json({
        success: true,
        directorPlan: result
      });
    } catch (err: any) {
      console.error('[VideoStudioRoute] Error during Multi-Niche Director analysis:', err);
      return res.status(500).json({
        error: 'MULTI_NICHE_FAILED',
        message: err?.message || 'Gagal menjalankan Multi-Niche Director.'
      });
    }
  }
);

export default router;
