import { Router, Request, Response } from 'express';
import { QueueService, RenderTaskPayload } from '../services/queueService';

const router = Router();

/**
 * Worker Endpoint invoked by Google Cloud Tasks
 * POST /api/v1/tasks/process-render
 */
router.post('/process-render', async (req: Request, res: Response) => {
  const payload: RenderTaskPayload = req.body;
  const workerAuth = req.headers['x-worker-auth'] || req.headers['authorization'];
  const expectedSecret = process.env.WORKER_SECRET || 'neuronna-internal-worker-secret-2025';

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
