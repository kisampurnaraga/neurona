import fetch from 'node-fetch';
import { buildFalPayload, getFalModel, FAL_MODELS, FAL_TIER_DEFAULTS } from './falModelConfig';
import { buildFalImagePayload, getFalImageModel, FAL_IMAGE_MODELS } from './falModelConfig';
import { keyRotator } from './keyRotator';

export interface FalLiveTestItemResult {
  testId: string;
  name: string;
  modelId: string;
  type: 'image' | 'video';
  tier?: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  durationSec: number;
  resultUrl?: string;
  error?: string;
  logs: string[];
}

export interface FalLiveTestSuiteResult {
  success: boolean;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  apiKeyUsed: string; // Masked for security
  results: FalLiveTestItemResult[];
}

const SAMPLE_TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1024&auto=format&fit=crop&q=80';

/**
 * Execute real Live Test Render for Fal.ai models using provided or saved API Key
 */
export async function executeFalLiveTest(params: {
  apiKey?: string;
  target?: 'all' | 'image_4k' | 'video_budget' | 'video_balanced' | 'video_premium' | string;
  customPrompt?: string;
}): Promise<FalLiveTestSuiteResult> {
  const customKey = params.apiKey ? params.apiKey.trim() : '';
  const effectiveKey = customKey || keyRotator.getNextFalKey() || '';

  if (!effectiveKey) {
    throw new Error('API Key Fal.ai tidak ditemukan. Masukkan API Key pada input form atau konfigurasi Key Rotator terlebih dahulu.');
  }

  const maskedKey = effectiveKey.length > 8
    ? `${effectiveKey.substring(0, 4)}...${effectiveKey.substring(effectiveKey.length - 4)}`
    : '***';

  const target = params.target || 'all';
  const testDefs: {
    testId: string;
    name: string;
    modelId: string;
    type: 'image' | 'video';
    tier: string;
    resolution?: string;
    prompt: string;
  }[] = [];

  if (target === 'all' || target === 'image_4k') {
    testDefs.push({
      testId: 'image_4k',
      name: 'Keyframe Presisi 4K UHD (Nano Banana Pro Edit)',
      modelId: 'fal-ai/nano-banana-pro/edit',
      type: 'image',
      tier: 'precision',
      resolution: '4K',
      prompt: params.customPrompt || 'Ultra-realistic cinematic shot of a luxury obsidian wristwatch on velvet, 4K UHD, volumetric lighting, photorealistic, sharp focus'
    });
  }

  if (target === 'all' || target === 'video_budget') {
    testDefs.push({
      testId: 'video_budget',
      name: 'Video Tier Budget (Google Veo 3.1 Lite)',
      modelId: 'fal-ai/veo3.1/lite/image-to-video',
      type: 'video',
      tier: 'budget',
      prompt: params.customPrompt || 'Slow cinematic push-in camera movement towards the subject, soft atmospheric golden light'
    });
  }

  if (target === 'all' || target === 'video_balanced') {
    testDefs.push({
      testId: 'video_balanced',
      name: 'Video Tier Balanced (Kling 2.1 Standard)',
      modelId: 'fal-ai/kling-video/v2.1/standard/image-to-video',
      type: 'video',
      tier: 'balanced',
      prompt: params.customPrompt || 'Smooth dynamic camera pan across the scene, cinematic motion blur, 1080p high fidelity'
    });
  }

  if (target === 'all' || target === 'video_premium') {
    testDefs.push({
      testId: 'video_premium',
      name: 'Video Tier Premium (Kling 3.0 Pro / HaiLuo)',
      modelId: 'fal-ai/kling-video/v3/pro/image-to-video',
      type: 'video',
      tier: 'premium',
      prompt: params.customPrompt || 'Master commercial shot, exquisite depth of field, fluid subject motion, studio lighting'
    });
  }

  // If a specific model ID was requested directly (e.g. fal-ai/minimax/video-01/image-to-video)
  if (target.startsWith('fal-ai/') || target.startsWith('bytedance/')) {
    const isImage = target.includes('banana') || target.includes('flux');
    testDefs.push({
      testId: `custom_${target}`,
      name: `Custom Live Test (${target})`,
      modelId: target,
      type: isImage ? 'image' : 'video',
      tier: 'custom',
      resolution: isImage ? '2K' : undefined,
      prompt: params.customPrompt || 'Cinematic high quality commercial scene, dramatic lighting, sharp details'
    });
  }

  const results: FalLiveTestItemResult[] = [];

  for (const test of testDefs) {
    const itemResult: FalLiveTestItemResult = {
      testId: test.testId,
      name: test.name,
      modelId: test.modelId,
      type: test.type,
      tier: test.tier,
      status: 'RUNNING',
      durationSec: 0,
      logs: []
    };

    const startTime = Date.now();
    itemResult.logs.push(`[${new Date().toLocaleTimeString()}] Menghubungi Fal.ai Queue endpoint untuk ${test.modelId}...`);

    try {
      if (test.type === 'image') {
        // IMAGE LIVE TEST (Nano Banana Pro Edit / Flux Schnell)
        const payload = buildFalImagePayload(test.modelId, {
          prompt: test.prompt,
          imageUrls: test.modelId.includes('/edit') ? [SAMPLE_TEST_IMAGE_URL] : undefined,
          aspectRatio: '16:9',
          resolution: test.resolution || '4K',
          safetyTolerance: '6'
        });

        itemResult.logs.push(`Submitting payload to https://queue.fal.run/${test.modelId} (Res: ${test.resolution || '4K'})...`);

        const queueRes = await fetch(`https://queue.fal.run/${test.modelId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${effectiveKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!queueRes.ok) {
          const errText = await queueRes.text().catch(() => '');
          throw new Error(`HTTP ${queueRes.status} Queue Submit Error: ${errText}`);
        }

        const queueJson: any = await queueRes.json();
        const requestId = queueJson.request_id;
        const statusUrl = queueJson.status_url || `https://queue.fal.run/${test.modelId}/requests/${requestId}/status`;
        const responseUrl = queueJson.response_url || `https://queue.fal.run/${test.modelId}/requests/${requestId}`;

        itemResult.logs.push(`Queue Request ID: ${requestId}. Polling status...`);

        let completed = false;
        const maxPollMs = 240000; // 4 minutes
        const pollInterval = 3000;

        while (Date.now() - startTime < maxPollMs) {
          await new Promise(r => setTimeout(r, pollInterval));
          const statusRes = await fetch(statusUrl, {
            headers: { 'Authorization': `Key ${effectiveKey}` }
          });

          if (statusRes.ok) {
            const statusJson: any = await statusRes.json();
            const status = (statusJson.status || '').toUpperCase();
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            itemResult.logs.push(`Status: ${status} (${elapsed}s)`);

            if (status === 'COMPLETED') {
              const resResult = await fetch(responseUrl, {
                headers: { 'Authorization': `Key ${effectiveKey}` }
              });
              if (resResult.ok) {
                const finalJson: any = await resResult.json();
                const imgUrl = finalJson?.images?.[0]?.url || finalJson?.images?.[0]?.image?.url || finalJson?.image?.url || finalJson?.output?.[0];
                if (imgUrl) {
                  itemResult.resultUrl = imgUrl;
                  itemResult.status = 'SUCCESS';
                  completed = true;
                  break;
                }
              }
            } else if (status === 'FAILED') {
              throw new Error(`Task FAILED: ${JSON.stringify(statusJson.error || statusJson.logs)}`);
            }
          }
        }

        if (!completed) {
          throw new Error(`Image 4K render timed out after ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        }

      } else {
        // VIDEO LIVE TEST
        const payload = buildFalPayload(test.modelId, {
          prompt: test.prompt,
          imageUrl: SAMPLE_TEST_IMAGE_URL,
          duration: 5,
          generateAudio: false
        });

        itemResult.logs.push(`Submitting video job to https://queue.fal.run/${test.modelId}...`);

        const queueRes = await fetch(`https://queue.fal.run/${test.modelId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${effectiveKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!queueRes.ok) {
          const errText = await queueRes.text().catch(() => '');
          throw new Error(`HTTP ${queueRes.status} Queue Submit Error: ${errText}`);
        }

        const queueJson: any = await queueRes.json();
        const requestId = queueJson.request_id;
        const statusUrl = queueJson.status_url || `https://queue.fal.run/${test.modelId}/requests/${requestId}/status`;
        const responseUrl = queueJson.response_url || `https://queue.fal.run/${test.modelId}/requests/${requestId}`;

        itemResult.logs.push(`Video Job Request ID: ${requestId}. Polling status...`);

        let completed = false;
        const maxPollMs = 300000; // 5 minutes
        const pollInterval = 4000;

        while (Date.now() - startTime < maxPollMs) {
          await new Promise(r => setTimeout(r, pollInterval));
          const statusRes = await fetch(statusUrl, {
            headers: { 'Authorization': `Key ${effectiveKey}` }
          });

          if (statusRes.ok) {
            const statusJson: any = await statusRes.json();
            const status = (statusJson.status || '').toUpperCase();
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const pos = statusJson.queue_position !== undefined ? ` (Queue Pos: ${statusJson.queue_position})` : '';
            itemResult.logs.push(`Status: ${status}${pos} (${elapsed}s)`);

            if (status === 'COMPLETED') {
              const resResult = await fetch(responseUrl, {
                headers: { 'Authorization': `Key ${effectiveKey}` }
              });
              if (resResult.ok) {
                const finalJson: any = await resResult.json();
                const videoUrl = finalJson?.video?.url || finalJson?.video_url || finalJson?.output?.[0] || finalJson?.file?.url;
                if (videoUrl) {
                  itemResult.resultUrl = videoUrl;
                  itemResult.status = 'SUCCESS';
                  completed = true;
                  break;
                }
              }
            } else if (status === 'FAILED') {
              throw new Error(`Video Task FAILED: ${JSON.stringify(statusJson.error || statusJson.logs)}`);
            }
          }
        }

        if (!completed) {
          throw new Error(`Video render timed out after ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        }
      }

      itemResult.durationSec = Number(((Date.now() - startTime) / 1000).toFixed(1));
      itemResult.status = 'SUCCESS';
      itemResult.logs.push(`[SELESAI] Hasil render sukses dalam ${itemResult.durationSec} detik: ${itemResult.resultUrl}`);
    } catch (err: any) {
      itemResult.durationSec = Number(((Date.now() - startTime) / 1000).toFixed(1));
      itemResult.status = 'FAILED';
      itemResult.error = err?.message || String(err);
      itemResult.logs.push(`[ERROR] ${itemResult.error}`);
    }

    results.push(itemResult);
  }

  const successfulCount = results.filter(r => r.status === 'SUCCESS').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;

  return {
    success: successfulCount > 0,
    totalTests: results.length,
    successfulTests: successfulCount,
    failedTests: failedCount,
    apiKeyUsed: maskedKey,
    results
  };
}
