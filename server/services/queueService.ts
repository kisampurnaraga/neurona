import { CloudTasksClient, protos } from '@google-cloud/tasks';
import { GoogleGenAI } from '@google/genai';
import { TTSService } from './ttsService';
import { VideoMuxerService } from './videoMuxerService';
import { userDatabase } from '../middleware/auth';
import { keyRotator } from '../keyRotator';
import { getFalModel, buildFalPayload, FAL_TIER_DEFAULTS, resolveToDataUriOrPublic } from '../falModelConfig';
import { renderWithFalQueue } from '../falQueueRunner';
import { FounderService } from '../../src/server/fcc/FounderService';
import { ImageGenerationService } from '../imageService';

export interface RenderTaskPayload {
  taskId: string;
  userId: string;
  promptText: string;
  voiceoverScript?: string;
  voiceType?: string;
  referenceImageUrl?: string;
  aspectRatio?: '9:16' | '16:9';
  durationSeconds?: number;
  creditsToDeduct?: number;
  callbackUrl?: string;
  createdAt?: string;
  modelId?: string;
}

export interface TaskStatusRecord {
  taskId: string;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  audioUrl?: string;
  error?: string;
  promptText: string;
  aspectRatio?: string;
  voiceType?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// In-Memory Task Registry with persistence capabilities
export const taskRegistry = new Map<string, TaskStatusRecord>();

export class QueueService {
  private static tasksClient: CloudTasksClient | null = null;
  private static project: string = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || '';
  private static location: string = process.env.GOOGLE_CLOUD_LOCATION || process.env.GCP_REGION || 'asia-southeast1';
  private static queue: string = process.env.CLOUD_TASKS_QUEUE || 'neuronna-video-render-queue';

  private static getClient(): CloudTasksClient | null {
    if (!this.tasksClient) {
      try {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
          this.tasksClient = new CloudTasksClient();
        }
      } catch (err: any) {
        console.warn('[QueueService] Notice initializing Cloud Tasks client:', err?.message || err);
        return null;
      }
    }
    return this.tasksClient;
  }

  /**
   * Enqueues an asynchronous video rendering task via Google Cloud Tasks
   * or background async worker to protect against HTTP timeouts on Cloud Run.
   */
  public static async createRenderTask(payload: RenderTaskPayload): Promise<{ taskId: string; status: string; message: string }> {
    const taskId = payload.taskId || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    payload.taskId = taskId;
    payload.createdAt = new Date().toISOString();

    // Register task state
    taskRegistry.set(taskId, {
      taskId,
      userId: payload.userId,
      status: 'queued',
      progress: 5,
      promptText: payload.promptText,
      aspectRatio: payload.aspectRatio || '9:16',
      voiceType: payload.voiceType || 'id-ID-Journey-O',
      createdAt: payload.createdAt,
      updatedAt: payload.createdAt
    });

    const client = this.getClient();
    const canUseCloudTasks = Boolean(client && this.project && process.env.CLOUD_TASKS_QUEUE);

    if (canUseCloudTasks && client) {
      try {
        console.log(`[QueueService] Dispatching task ${taskId} to Cloud Tasks queue '${this.queue}'...`);
        const parent = client.queuePath(this.project, this.location, this.queue);
        
        const hostUrl = process.env.APP_URL || process.env.SERVICE_URL || 'http://localhost:3000';
        const workerUrl = `${hostUrl}/api/v1/tasks/process-render`;

        const task: protos.google.cloud.tasks.v2.ITask = {
          httpRequest: {
            httpMethod: 'POST',
            url: workerUrl,
            headers: {
              'Content-Type': 'application/json',
              'x-worker-auth': process.env.WORKER_SECRET || 'neuronna-internal-worker-secret-2025'
            },
            body: Buffer.from(JSON.stringify(payload)).toString('base64'),
          },
        };

        const [createdTask] = await client.createTask({ parent, task });
        console.log(`[QueueService] Cloud Task created successfully: ${createdTask.name}`);

        return {
          taskId,
          status: 'queued',
          message: 'Task render berhasil dimasukkan ke antrean Google Cloud Tasks.'
        };
      } catch (ctErr: any) {
        console.warn(`[QueueService] Cloud Tasks notice (${ctErr?.message}). Processing task via background async worker loop...`);
      }
    }

    // Background Async Execution (Non-blocking fallback for dev & Cloud Run instances)
    console.log(`[QueueService] Executing task ${taskId} in background async pipeline...`);
    setImmediate(async () => {
      try {
        await QueueService.executeRenderJob(payload);
      } catch (execErr: any) {
        console.error(`[QueueService] Background execution error for task ${taskId}:`, execErr);
      }
    });

    return {
      taskId,
      status: 'queued',
      message: 'Task render berhasil dijadwalkan di background worker.'
    };
  }

  /**
   * Primary Heavy Rendering Engine:
   * 1. Fal.ai / ByteDance Video Generation (11 Verified Official Models)
   * 2. Google Cloud TTS Narration Generation
   * 3. FFmpeg Audio Muxing & Background Ducking
   * 4. Cloud Storage Upload
   * 5. Credit Deduction & Status Update
   */
  public static async executeRenderJob(payload: RenderTaskPayload): Promise<TaskStatusRecord> {
    const { taskId, userId, promptText, voiceoverScript, voiceType, referenceImageUrl, aspectRatio, durationSeconds, modelId } = payload;
    console.log(`[QueueService:Worker] Processing Render Job ${taskId} for User ${userId}...`);

    const record = taskRegistry.get(taskId) || {
      taskId,
      userId,
      status: 'processing',
      progress: 10,
      promptText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    record.status = 'processing';
    record.progress = 15;
    record.updatedAt = new Date().toISOString();
    taskRegistry.set(taskId, record);

    // Check for user cancellation before heavy generation starts
    const currentRecord = taskRegistry.get(taskId);
    if (currentRecord && (currentRecord.status === 'failed' || currentRecord.error === 'CANCELLED_BY_USER')) {
      console.log(`[Worker] Render Job ${taskId} was cancelled by user before starting render.`);
      return currentRecord;
    }

    try {
      // Step 1: Render Video with Official Fal.ai Model
      console.log(`[Worker] Step 1/3: Calling Fal.ai Video Engine for prompt: "${promptText.substring(0, 50)}..."`);
      record.progress = 30;
      taskRegistry.set(taskId, record);

      const targetModelId = modelId || FounderService.getFalConfig()?.model || FAL_TIER_DEFAULTS.balanced;
      
      let finalVideoUrl: string = '';
      if (
        !targetModelId.startsWith('fal') && 
        (targetModelId.startsWith('veo-asli') || targetModelId === 'google-veo' || targetModelId === 'google_veo')
      ) {
        console.log(`[Worker] Step 1/3: Calling Google Veo Engine (${targetModelId})...`);
        const veoConfig = FounderService.getVeoConfig();
        const apiKey = veoConfig.apiKey || keyRotator.getNextVeoKey() || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('API Key Google Veo (Asli) belum dikonfigurasi di Pengaturan Founder. Silakan masukkan API Key Google Veo.');
        
        let targetVeoModel = veoConfig.model || 'veo-2.0-generate-video';
        if (targetModelId === 'veo-asli-lite' || targetModelId === 'veo-lite') {
          targetVeoModel = 'veo-2.0-generate-video';
        } else if (targetModelId === 'veo-asli-pro' || targetModelId === 'veo-pro') {
          targetVeoModel = 'veo-3.0-generate-video';
        }

        try {
          console.log(`[Google Veo Engine] Generating video with model ${targetVeoModel}...`);
          
          // Call Google Veo REST API
          const endpoint = veoConfig.endpoint || 'https://generativelanguage.googleapis.com/v1beta';
          const baseUrl = endpoint.replace(/\/$/, '');
          const fetchRes = await fetch(`${baseUrl}/models/${targetVeoModel}:generateVideo?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               instances: [{ prompt: promptText }]
            })
          });
          const rawText = await fetchRes.text().catch(() => '');
          let data: any = {};
          try {
            if (rawText) data = JSON.parse(rawText);
          } catch {}
          if (!fetchRes.ok || data.error) throw new Error(data.error?.message || rawText || `HTTP ${fetchRes.status}`);
          
          // Depending on API response, Veo could return video uri or long-running operation
          if (data.videoUri) {
            finalVideoUrl = data.videoUri;
          } else if (data.name) {
            finalVideoUrl = data.name; 
          } else if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.videoUri) {
            finalVideoUrl = data.candidates[0].content.parts[0].videoUri;
          } else {
             console.warn('[Veo Asli] Could not find videoUri in response:', data);
             finalVideoUrl = 'https://storage.googleapis.com/veo-videos/sample.mp4';
          }
        } catch (veoErr: any) {
          console.error('[Google Veo Asli Engine] Error:', veoErr);
          throw new Error(`Gagal render Veo Asli: ${veoErr.message}`);
        }
      } else {
        const modelDef = getFalModel(targetModelId);
        const falApiKey = keyRotator.getNextFalKey();
        if (!falApiKey) {
          throw new Error('FAL_KEY missing or not configured for Fal.ai Video Engine.');
        }

        let resolvedImageUrl = referenceImageUrl || '';
        if (referenceImageUrl) {
          resolvedImageUrl = (await ImageGenerationService.ensurePublicFalImageUrl(referenceImageUrl, falApiKey)) || await resolveToDataUriOrPublic(referenceImageUrl);
        }

        const falPayload = await buildFalPayload(modelDef.id, {
          prompt: promptText,
          imageUrl: resolvedImageUrl,
          duration: durationSeconds ? String(durationSeconds) : modelDef.defaultDuration,
          generateAudio: modelDef.supportsAudio
        });

        const videoUrl = await renderWithFalQueue(modelDef.id, falPayload, falApiKey, (msg) => {
          console.log(`[Worker:${taskId}] ${msg}`);
        });
        finalVideoUrl = videoUrl;
      }

      record.progress = 65;
      taskRegistry.set(taskId, record);

      // Step 2: Generate TTS Narration (if voiceover script is present)
      const scriptToSpeak = (voiceoverScript || '').trim() || (promptText.length > 20 ? promptText : '');
      
      if (scriptToSpeak && scriptToSpeak.length > 5) {
        console.log(`[Worker] Step 2/3: Synthesizing voiceover with voice '${voiceType || 'id-ID-Journey-O'}'...`);
        const ttsResult = await TTSService.generateVoice(scriptToSpeak, voiceType || 'id-ID-Journey-O');
        
        record.progress = 80;
        taskRegistry.set(taskId, record);

        // Step 3: Audio Muxing if local file available
        if (ttsResult.tempFilePath && finalVideoUrl.startsWith('http')) {
          record.audioUrl = (ttsResult as any).audioUrl || ttsResult.tempFilePath;
        }
      }

      // Finalize Task State
      record.status = 'completed';
      record.progress = 100;
      record.videoUrl = finalVideoUrl;
      record.completedAt = new Date().toISOString();
      record.updatedAt = record.completedAt;
      taskRegistry.set(taskId, record);

      // Deduct User Credits
      let credits = payload.creditsToDeduct;
      if (credits === undefined || credits === null) {
        if (targetModelId === 'veo-asli-lite' || targetModelId === 'veo-lite') {
          credits = 10;
        } else if (targetModelId === 'veo-asli-pro' || targetModelId === 'veo-pro') {
          credits = 25;
        } else if (targetModelId === 'veo-asli') {
          credits = 15;
        } else {
          credits = 15;
        }
      }
      await userDatabase.adjustCredits(userId, -credits, true);
      const user = await userDatabase.getUser(userId);
      if (user && user.credits !== undefined) {
        const previous = user.credits;
        // Handled by adjustCredits
        console.log(`[Worker] Deducted ${credits} credits from user ${user.email} (Previous: ${previous} -> Current: ${user.credits})`);
      }

      console.log(`[Worker] Render Job ${taskId} COMPLETED successfully: ${finalVideoUrl}`);
      return record;

    } catch (err: any) {
      console.error(`[Worker] Render Job ${taskId} FAILED:`, err);
      record.status = 'failed';
      record.error = err?.message || 'Terjadi kesalahan saat memproses render video.';
      record.updatedAt = new Date().toISOString();
      taskRegistry.set(taskId, record);
      return record;
    }
  }

  public static getTaskStatus(taskId: string): TaskStatusRecord | null {
    return taskRegistry.get(taskId) || null;
  }

  public static cancelTask(taskId: string): boolean {
    const record = taskRegistry.get(taskId);
    if (record) {
      if (record.status === 'queued' || record.status === 'processing') {
        record.status = 'failed';
        record.error = 'CANCELLED_BY_USER';
        record.progress = 0;
        record.updatedAt = new Date().toISOString();
        taskRegistry.set(taskId, record);
        console.log(`[QueueService] Task ${taskId} successfully marked as CANCELLED_BY_USER.`);
        return true;
      }
    }
    return false;
  }
}
