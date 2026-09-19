import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { QueueService, RenderTaskPayload } from '../services/queueService';

const router = Router();

/** Constant-time string comparison that never leaks length via early exit. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Worker Endpoint invoked by Google Cloud Tasks
 * POST /api/v1/tasks/process-render
 *
 * SECURITY: previously this route computed the expected secret but never
 * compared it, so the endpoint was fully unauthenticated. It now fails closed
 * when WORKER_SECRET is not configured and uses a timing-safe comparison.
 */
router.post('/process-render', async (req: Request, res: Response) => {
  const payload: RenderTaskPayload = req.body;

  const configuredSecret = (process.env.WORKER_SECRET || '').trim();
  if (!configuredSecret) {
    console.error('[WorkerRoute] WORKER_SECRET is not configured; refusing worker request.');
    return res.status(503).json({
      error: 'WORKER_NOT_CONFIGURED',
      message: 'Endpoint worker dinonaktifkan karena WORKER_SECRET belum dikonfigurasi.'
    });
  }

  const rawHeader = req.headers['x-worker-auth'] || req.headers['authorization'];
  const presented = String(rawHeader || '').replace(/^Bearer\s+/i, '').trim();

  if (!presented || !safeEqual(presented, configuredSecret)) {
    console.warn('[WorkerRoute] Rejected unauthorized worker request.');
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Worker secret tidak valid.' });
  }

  console.log(`[WorkerRoute] Received Cloud Tasks worker request for Task ID: ${payload?.taskId || 'unknown'}`);

  if (!payload || !payload.promptText) {
    return res.status(400).json({ error: 'Payload tidak valid: promptText harus diisi.' });
  }

  try {
    // Process heavy rendering
    const result = await QueueService.executeRenderJob(payload);
    
    if (result.status === 'failed') {
      return res.status(500).json({
        success: false,
        error: result.error,
        taskId: result.taskId
      });
    }

    return res.status(200).json({
      success: true,
      taskId: result.taskId,
      status: result.status,
      videoUrl: result.videoUrl,
      message: 'Render video selesai diproses.'
    });

  } catch (err: any) {
    console.error('[WorkerRoute] Error executing worker task:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memproses task render.'
    });
  }
});

export default router;
