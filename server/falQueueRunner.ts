import fetch from 'node-fetch';

export interface FalQueueResult {
  success: boolean;
  videoUrl?: string;
  requestId?: string;
  error?: string;
  rawResponse?: any;
  durationMs?: number;
}

/**
 * Executes an asynchronous video generation request to fal.ai Queue API and polls until completion.
 */
export async function renderWithFalQueue(
  modelPath: string,
  payload: any,
  falApiKey: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  const cleanKey = falApiKey ? falApiKey.trim() : '';
  if (!cleanKey) {
    throw new Error('[FAL.AI 401] FAL_KEY is missing or not configured.');
  }

  // 1. Submit to queue
  const queueUrl = `https://queue.fal.run/${modelPath}`;
  console.log(`[FAL QUEUE RUNNER] Submitting job to ${queueUrl}...`);
  if (onProgress) onProgress(`Submitting to fal.ai queue [${modelPath}]...`);

  const queueRes = await fetch(queueUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${cleanKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!queueRes.ok) {
    const errText = await queueRes.text().catch(() => '');
    if (queueRes.status === 401) {
      throw new Error(`[FAL.AI 401] Unauthorized: Invalid FAL_KEY or format (expected key_id:key_secret). Server said: ${errText}`);
    }
    if (queueRes.status === 402) {
      throw new Error(`[FAL.AI 402] Payment Required: Quota / Saldo fal.ai habis. Silakan isi ulang saldo fal.ai Anda.`);
    }
    if (queueRes.status === 404) {
      throw new Error(`[FAL.AI 404] Model endpoint '${modelPath}' not found on fal.ai.`);
    }
    if (queueRes.status === 422) {
      throw new Error(`[FAL.AI 422] Unprocessable Entity: Parameter payload tidak valid untuk model '${modelPath}'. Detail: ${errText}`);
    }
    throw new Error(`[FAL.AI HTTP ${queueRes.status}] Failed submitting to queue: ${errText}`);
  }

  const queueJson: any = await queueRes.json();
  const requestId = queueJson.request_id;
  
  // If response came back synchronously with direct video URL
  const directVideoUrl = queueJson?.video?.url || queueJson?.video_url || queueJson?.url || queueJson?.file?.url || (Array.isArray(queueJson?.output) ? (queueJson.output[0]?.url || queueJson.output[0]) : queueJson?.output?.url) || (typeof queueJson?.output === 'string' ? queueJson.output : null);
  if (directVideoUrl && typeof directVideoUrl === 'string' && !requestId) {
    return directVideoUrl;
  }

  if (!requestId) {
    throw new Error(`[FAL.AI] No request_id returned from queue endpoint for model '${modelPath}'.`);
  }

  const statusUrl = queueJson.status_url || `https://queue.fal.run/${modelPath}/requests/${requestId}/status`;
  const responseUrl = queueJson.response_url || `https://queue.fal.run/${modelPath}/requests/${requestId}`;

  console.log(`[FAL QUEUE RUNNER] Request ${requestId} queued for ${modelPath}. Polling status...`);

  // 2. Poll for completion (Max 60 attempts * 5s = 300 seconds / 5 mins)
  const maxAttempts = 60;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, 5000));

    try {
      const statusRes = await fetch(statusUrl, {
        headers: { 'Authorization': `Key ${cleanKey}` }
      });

      if (!statusRes.ok) {
        // Transient network error or 5xx, retry
        continue;
      }

      const statusJson: any = await statusRes.json();
      const status = statusJson.status;

      if (status === 'COMPLETED') {
        const resResult = await fetch(responseUrl, {
          headers: { 'Authorization': `Key ${cleanKey}` }
        });
        if (resResult.ok) {
          const resultJson: any = await resResult.json();
          const videoUrl = resultJson?.video?.url || resultJson?.video_url || resultJson?.url || resultJson?.file?.url || (Array.isArray(resultJson?.output) ? (resultJson.output[0]?.url || resultJson.output[0]) : resultJson?.output?.url) || (typeof resultJson?.output === 'string' ? resultJson.output : null);
          if (videoUrl && typeof videoUrl === 'string') {
            console.log(`[FAL QUEUE RUNNER] Video generated successfully for ${modelPath}: ${videoUrl}`);
            return videoUrl;
          }
          throw new Error(`[FAL.AI] Generation COMPLETED but failed to extract video URL. Payload keys: ${Object.keys(resultJson || {}).join(',')}. Payload: ${JSON.stringify(resultJson).substring(0, 300)}`);
        } else {
          const errText = await resResult.text();
          throw new Error(`[FAL.AI] Generation COMPLETED but failed to fetch responseUrl (${resResult.status}). Body: ${errText}`);
        }
      } else if (status === 'IN_PROGRESS' || status === 'IN_QUEUE') {
        const queuePos = statusJson.queue_position !== undefined ? ` (Queue Pos: ${statusJson.queue_position})` : '';
        const msg = `fal.ai [${modelPath}] ${status}${queuePos} (${attempt * 5}s)`;
        console.log(`[FAL QUEUE RUNNER] ${msg}`);
        if (onProgress) onProgress(msg);
      } else if (status === 'FAILED') {
        const errMsg = JSON.stringify(statusJson.error || statusJson.logs || 'Generation task failed');
        throw new Error(`[FAL.AI FAILED] Runner task failed: ${errMsg}`);
      }
    } catch (pollErr: any) {
      if (pollErr.message && pollErr.message.includes('[FAL.AI')) {
        throw pollErr;
      }
      // Otherwise temporary poll error, continue loop
    }
  }

  throw new Error(`[FAL.AI TIMEOUT] Video generation for model '${modelPath}' timed out after 5 minutes.`);
}

/**
 * Lightweight tester that submits a job and checks immediate response (HTTP 200/202, 401, 402, 404, 422)
 */
export async function submitTestJob(
  modelPath: string,
  payload: any,
  falApiKey: string
): Promise<FalQueueResult> {
  const cleanKey = falApiKey ? falApiKey.trim() : '';
  const startTime = Date.now();

  try {
    const queueUrl = `https://queue.fal.run/${modelPath}`;
    const res = await fetch(queueUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${cleanKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const durationMs = Date.now() - startTime;
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (res.status === 200 || res.status === 201 || res.status === 202) {
      return {
        success: true,
        requestId: json?.request_id,
        videoUrl: json?.video?.url || json?.output?.[0],
        rawResponse: json,
        durationMs
      };
    } else {
      return {
        success: false,
        error: `HTTP ${res.status}: ${text.substring(0, 300)}`,
        rawResponse: json,
        durationMs
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Network Error: ${err.message}`,
      durationMs: Date.now() - startTime
    };
  }
}
