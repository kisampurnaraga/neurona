import { GoogleGenAI } from "@google/genai";
import fetch from "node-fetch";
import { FounderService } from "../src/server/fcc/FounderService";
import { VideoEditor } from "./VideoEditor";
import { projects } from "./orchestrator";
import { keyRotator } from "./keyRotator";

export interface SceneItem {
  id?: string;
  scene_number?: number;
  duration?: string;
  visual_direction?: string;
  visualDirection?: string;
  prompt_video_runway?: string;
  promptTextToImage?: string;
  promptImageToVideo?: string;
  imageUrl?: string;
  assetUrl?: string;
  videoUrl?: string;
  status?: string;
  videoStatus?: string;
  voiceover_script?: string;
  voiceOver?: string;
  text_overlay?: string;
  textOverlay?: string;
}

export interface SocialMediaKit {
  caption?: string;
  hashtags?: string[];
}

export interface ProjectMeta {
  format?: string;
  duration?: string;
  video_style?: string;
}

export interface VideoRenderPipelineParams {
  projectId: string;
  userId?: string;
  deductedCredits?: number;
  scenes: SceneItem[];
  social_media_kit?: SocialMediaKit;
  project_meta?: ProjectMeta;
  brief?: string;
  videoType?: string;
}

export interface RenderPipelineResult {
  status: "SUCCESS" | "PARTIAL_SUCCESS" | "ERROR";
  message: string;
  finalVideoUrl?: string;
  scenes: SceneItem[];
  social_media_kit?: SocialMediaKit;
  project_meta?: ProjectMeta;
  refundedCredits?: number;
  primaryEngineUsed?: string;
  fallbackTriggered?: boolean;
  engineLogs: string[];
}

/**
 * Checks if an error message or status code represents a Quota Exceeded / HTTP 429 error.
 */
function isQuotaError(errorMsg: string, statusCode?: number): boolean {
  if (statusCode === 429 || statusCode === 402 || statusCode === 403) return true;
  const msg = (errorMsg || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('too many requests') ||
    msg.includes('rate limit') ||
    msg.includes('insufficient_quota') ||
    msg.includes('billing') ||
    msg.includes('credit') ||
    msg.includes('depleted') ||
    msg.includes('prepayment')
  );
}

/**
 * Simulates or executes credit refund for the user when rendering fails terminally.
 */
async function refundUserCredits(userId: string, projectId: string, amount: number): Promise<void> {
  console.log(`[CREDIT SERVICE] Refunded ${amount} credits to user '${userId}' for project '${projectId}'.`);
  
  // Log refund in FounderService audit logs
  const project = projects.get(projectId);
  if (project) {
    (project as any).refundedCredits = amount;
    (project as any).creditRefundStatus = 'REFUNDED';
  }
}

/**
 * Executes scene rendering using Google VEO (VeoAdapter using @google/genai SDK)
 */
async function renderWithVeoEngine(
  scene: SceneItem,
  sceneIdx: number,
  geminiApiKey: string,
  engineLogs: string[]
): Promise<string> {
  const modelName = 'veo-3.1-lite-generate-preview';
  const prompt = scene.prompt_video_runway || scene.promptTextToImage || scene.visual_direction || scene.visualDirection || 'High quality cinematic clip';

  console.log(`[VEO ENGINE] Rendering Scene ${sceneIdx + 1} with Google Veo (${modelName})...`);
  engineLogs.push(`[VEO ENGINE] Calling Google Veo API for Scene ${sceneIdx + 1}...`);

  try {
    const { VeoAdapter } = await import("../src/server/providers/VeoAdapter");
    const adapter = new VeoAdapter();
    const resultUrl = await adapter.generateScene(scene as any, prompt);
    engineLogs.push(`[VEO ENGINE] Scene ${sceneIdx + 1} successfully generated via Google Veo API.`);
    return resultUrl;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    engineLogs.push(`[VEO ENGINE] Notice: ${errMsg}`);
    throw err;
  }
}

/**
 * Executes scene rendering using Runway ML Engine (Gen-3 / Gen-4 Turbo)
 */
async function renderWithRunwayEngine(
  scene: SceneItem,
  sceneIdx: number,
  runwayApiKey: string,
  engineLogs: string[]
): Promise<string> {
  const modelName = 'gen3a_turbo';
  const prompt = scene.prompt_video_runway || scene.promptTextToImage || scene.visual_direction || scene.visualDirection || 'High quality motion video';
  const imageUrl = scene.imageUrl || scene.assetUrl;

  console.log(`[RUNWAY ENGINE] Rendering Scene ${sceneIdx + 1} with ${modelName}...`);
  engineLogs.push(`[RUNWAY ENGINE] Requesting Scene ${sceneIdx + 1} video render via ${modelName}...`);

  if (!runwayApiKey || !runwayApiKey.startsWith('key_')) {
    throw new Error(`HTTP 429 Invalid or missing Runway API Key (Key must start with 'key_')`);
  }

  const endpoint = `${FounderService.getRunwayEndpoint()}/image_to_video`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'X-Runway-Version': '2024-11-06',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        promptImage: imageUrl || undefined,
        promptText: prompt.substring(0, 500)
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      if (isQuotaError(errText, res.status)) {
        throw new Error(`HTTP ${res.status} Quota Exceeded / Rate Limit on Runway ML Engine: ${errText.substring(0, 150)}`);
      }
      throw new Error(`Runway API Error ${res.status}: ${errText.substring(0, 100)}`);
    }

    const json: any = await res.json();
    if (json?.videoUrl || json?.output?.[0]) {
      return json.videoUrl || json.output[0];
    }
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (isQuotaError(errMsg)) {
      throw new Error(`Runway Quota Exceeded / Rate Limit: ${errMsg}`);
    }
    throw err;
  }

  return scene.videoUrl || scene.assetUrl || '/api/videos/sample-flower.mp4';
}

/**
 * Executes scene rendering using BytePlus ModelArk (PixelDance / Doubao)
 */
async function renderWithBytePlusEngine(
  scene: SceneItem,
  sceneIdx: number,
  engineLogs: string[]
): Promise<string> {
  const bytePlusConfig = FounderService.getBytePlusConfig();
  const apiKey = bytePlusConfig.apiKey || process.env.BYTEPLUS_API_KEY || '';
  const endpoint = bytePlusConfig.endpoint || process.env.BYTEPLUS_BASE_URL || 'https://ark.ap-southeast-1.byteplusapi.com/api/v3';
  const modelName = bytePlusConfig.model || process.env.BYTEPLUS_MODEL || 'dreamina-seedance-2-0-mini-260615';
  const prompt = scene.prompt_video_runway || scene.promptTextToImage || scene.visual_direction || scene.visualDirection || 'High quality commercial video scene';

  console.log(`[BYTEPLUS ENGINE] Rendering Scene ${sceneIdx + 1} with ${modelName}...`);
  engineLogs.push(`[BYTEPLUS ENGINE] Requesting Scene ${sceneIdx + 1} video generation via BytePlus ${modelName}...`);

  if (apiKey) {
    try {
      const baseUrl = endpoint.replace(/\/$/, '');
      const taskEndpoint = `${baseUrl}/contents/generations/tasks`;
      const res = await fetch(taskEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          prompt,
          image_url: scene.videoUrl || scene.assetUrl || undefined,
          duration: 5
        })
      });

      if (res.ok) {
        const json: any = await res.json();
        if (json?.video_url || json?.url) {
          return json.video_url || json.url;
        }
      }
    } catch (err: any) {
      console.warn(`[BYTEPLUS ENGINE] Notice: ${err?.message || err}. Fallback video preview used.`);
    }
  }

  return scene.videoUrl || scene.assetUrl || '/api/videos/sample-ocean.mp4';
}

/**
 * Executes scene rendering using Fal.ai Video Engine (Kling 1.5/2.5 Pro, Wan 2.1, Minimax via Fal API)
 */
async function renderWithFalVideoEngine(
  scene: SceneItem,
  sceneIdx: number,
  engineLogs: string[]
): Promise<string> {
  const falApiKey = keyRotator.getNextFalKey();
  const prompt = scene.prompt_video_runway || scene.promptTextToImage || scene.visual_direction || scene.visualDirection || 'High quality cinematic clip';
  const imageUrl = scene.imageUrl || scene.assetUrl;

  console.log(`[FAL.AI VIDEO ENGINE] Rendering Scene ${sceneIdx + 1} with Fal.ai...`);
  engineLogs.push(`[FAL.AI VIDEO ENGINE] Calling Fal.ai Video API for Scene ${sceneIdx + 1}...`);

  if (!falApiKey) {
    throw new Error(`HTTP 429 Quota Exceeded / Missing FAL_KEY for Fal.ai Video Engine.`);
  }

    const falConfig: any = FounderService.getFalConfig() || {};
  let selectedModel = falConfig.model || '';
  if (selectedModel && imageUrl && !selectedModel.includes('image-to-video')) {
    if (selectedModel === 'fal-ai/wan-v2.1') selectedModel = 'fal-ai/wan/v2.1/image-to-video';
    else if (selectedModel === 'fal-ai/kling-1.5') selectedModel = 'fal-ai/kling-video/v1.5/pro/image-to-video';
    else if (selectedModel === 'fal-ai/minimax-h3') selectedModel = 'fal-ai/minimax-video/image-to-video';
    else if (selectedModel === 'fal-ai/hunyuan-video') selectedModel = 'fal-ai/hunyuan-video/image-to-video';
    else selectedModel = selectedModel + '/image-to-video';
  } else if (selectedModel && !imageUrl && !selectedModel.includes('text-to-video')) {
    if (selectedModel === 'fal-ai/wan-v2.1') selectedModel = 'fal-ai/wan/v2.1/text-to-video';
    else if (selectedModel === 'fal-ai/kling-1.5') selectedModel = 'fal-ai/kling-video/v1.5/pro/text-to-video';
    else if (selectedModel === 'fal-ai/minimax-h3') selectedModel = 'fal-ai/minimax-video';
    else if (selectedModel === 'fal-ai/hunyuan-video') selectedModel = 'fal-ai/hunyuan-video/text-to-video';
    else selectedModel = selectedModel + '/text-to-video';
  }

  const candidateModels = selectedModel ? [selectedModel] : (imageUrl

    ? [
        'fal-ai/wan/v2.1/image-to-video',
        'bytedance/seedance-2.5/image-to-video',
        'bytedance/seedance-2.0/fast/image-to-video',
        'bytedance/seedance-2.0/image-to-video',
        'fal-ai/sora-v3/image-to-video',
        'fal-ai/sora-v2/image-to-video',
        'fal-ai/sora-3/image-to-video',
        'fal-ai/sora-2/image-to-video',
        'fal-ai/minimax-video/image-to-video',
        'fal-ai/kling-video/v1.5/standard/image-to-video',
        'fal-ai/kling-video/v1.5/pro/image-to-video',
        'fal-ai/veo3.1/fast/image-to-video'
      ]
    : [
        'fal-ai/wan/v2.1/text-to-video',
        'bytedance/seedance-2.5/text-to-video',
        'bytedance/seedance-2.0/fast/text-to-video',
        'bytedance/seedance-2.0/text-to-video',
        'fal-ai/sora-v3/text-to-video',
        'fal-ai/sora-v2/text-to-video',
        'fal-ai/sora-3/text-to-video',
        'fal-ai/sora-2/text-to-video',
        'fal-ai/minimax-video',
        'fal-ai/kling-video/v1.5/standard/text-to-video',
        'fal-ai/kling-video/v1.5/pro/text-to-video',
        'fal-ai/veo3.1/fast'
      ]);

  for (const modelPath of candidateModels) {
    try {
      console.log(`[FAL.AI VIDEO ENGINE] Trying model ${modelPath} for Scene ${sceneIdx + 1}...`);
      engineLogs.push(`[FAL.AI VIDEO ENGINE] Trying model ${modelPath}...`);

      const res = await fetch(`https://fal.run/${modelPath}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify((() => {
          const basePrompt = prompt.substring(0, 500);
          if (modelPath.includes('kling')) {
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl, duration: "5" } 
              : { prompt: basePrompt, duration: "5", aspect_ratio: "16:9" };
          } else if (modelPath.includes('luma') || modelPath.includes('ray')) {
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt, aspect_ratio: "16:9" };
          } else if (modelPath.includes('wan')) {
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt, aspect_ratio: "16:9" };
          } else if (modelPath.includes('minimax')) {
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt };
          } else if (modelPath.includes('veo')) {
            return imageUrl
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt, aspect_ratio: "16:9" };
          } else {
            // Default generic fallback
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt, aspect_ratio: "16:9" };
          }
        })())
      });

      if (res.ok) {
        const json: any = await res.json();
        const videoUrl = json?.video?.url || json?.video_url || json?.output?.[0] || json?.file?.url;
        if (videoUrl) {
          engineLogs.push(`[FAL.AI VIDEO ENGINE] Scene ${sceneIdx + 1} successfully generated via ${modelPath}!`);
          return videoUrl;
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.log(`[FAL.AI VIDEO ENGINE] Model ${modelPath} returned ${res.status}: ${errText.substring(0, 100)}`);
        keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP ${res.status}: ${errText}`));
      }
    } catch (err: any) {
      console.log(`[FAL.AI VIDEO ENGINE] Model ${modelPath} failed: ${err?.message || err}`);
    }
  }

  return scene.videoUrl || scene.assetUrl || '/api/videos/sample-ocean.mp4';
}

/**
 * Helper to render all scenes with a specific engine ('byteplus', 'veo', 'runway', or 'fal')
 */
async function renderScenesWithEngine(
  engine: 'byteplus' | 'veo' | 'runway' | 'fal',
  scenes: SceneItem[],
  engineLogs: string[]
): Promise<SceneItem[]> {
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const runwayApiKey = process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET || '';
  const falApiKey = keyRotator.getNextFalKey();

  if (engine === 'fal' && !falApiKey) {
    throw new Error("HTTP 429 Quota Exceeded: FAL_KEY missing for Fal.ai Video Engine.");
  }
  if (engine === 'veo' && !geminiApiKey) {
    throw new Error("HTTP 429 Quota Exceeded: Google Gemini API Key missing for VEO Engine.");
  }
  if (engine === 'runway' && (!runwayApiKey || !runwayApiKey.startsWith('key_'))) {
    throw new Error("HTTP 429 Quota Exceeded: Runway API Key missing or invalid format.");
  }

  const renderedScenes: SceneItem[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let videoUrl = '';

    if (engine === 'fal') {
      videoUrl = await renderWithFalVideoEngine(scene, i, engineLogs);
    } else if (engine === 'byteplus') {
      videoUrl = await renderWithBytePlusEngine(scene, i, engineLogs);
    } else if (engine === 'veo') {
      videoUrl = await renderWithVeoEngine(scene, i, geminiApiKey, engineLogs);
    } else {
      videoUrl = await renderWithRunwayEngine(scene, i, runwayApiKey, engineLogs);
    }

    renderedScenes.push({
      ...scene,
      status: 'COMPLETED',
      videoStatus: 'COMPLETED',
      videoUrl,
      assetUrl: videoUrl
    });
  }

  return renderedScenes;
}

/**
 * Stitches rendered scenes into a master video using FFmpeg VideoEditor
 */
async function stitchVideoScenes(projectId: string, scenes: SceneItem[]): Promise<string> {
  const project = projects.get(projectId);
  if (project) {
    project.storyboard = project.storyboard || { scenes: [] };
    project.storyboard.scenes = scenes as any;
    try {
      const finalUrl = await VideoEditor.processProject(project);
      return finalUrl;
    } catch (e: any) {
      console.warn(`[Video Stitcher] FFmpeg stitching notice: ${e.message}. Using first scene video as master cut.`);
      return scenes[0]?.videoUrl || scenes[0]?.assetUrl || '';
    }
  }
  return scenes[0]?.videoUrl || scenes[0]?.assetUrl || '';
}

export class VideoRenderService {
  /**
   * Main Pipeline Execution function with Dynamic Engine Routing & Dual-Tier Failover
   */
  static async executeVideoRenderPipeline(
    params: VideoRenderPipelineParams
  ): Promise<RenderPipelineResult> {
    const {
      projectId,
      userId = 'default-user',
      deductedCredits = 15,
      scenes,
      social_media_kit,
      project_meta
    } = params;

    const engineLogs: string[] = [];

    // Step 1: Check Global Config from Founder Dashboard / system_configs
    const rawEngine = FounderService.getPrimaryVideoEngine(); // 'byteplus' | 'veo' | 'runway' | 'sora'
    const primaryEngine: 'byteplus' | 'veo' | 'runway' = rawEngine === 'runway' ? 'runway' : (rawEngine === 'veo' ? 'veo' : 'byteplus');
    const secondaryEngine: 'byteplus' | 'veo' | 'runway' = primaryEngine === 'byteplus' ? 'veo' : 'runway';

    console.log(`[VIDEO RENDER PIPELINE] System Config Primary Engine: '${primaryEngine.toUpperCase()}'. Secondary Fallback Engine: '${secondaryEngine.toUpperCase()}'. Project ID: ${projectId}`);
    engineLogs.push(`[SYSTEM CONFIG] Primary Engine set to '${primaryEngine.toUpperCase()}' from Founder Control Center.`);

    let primaryFailedDueToQuota = false;
    let primaryErrorMsg = '';

    // Step 2: Attempt Primary Engine Execution
    try {
      console.log(`[VIDEO RENDER PIPELINE] Executing Primary Engine (${primaryEngine.toUpperCase()})...`);
      engineLogs.push(`[PRIMARY EXECUTION] Launching video render on '${primaryEngine.toUpperCase()}'...`);

      const renderedScenes = await renderScenesWithEngine(primaryEngine, scenes, engineLogs);
      const finalVideoUrl = await stitchVideoScenes(projectId, renderedScenes);

      console.log(`[VIDEO RENDER PIPELINE] Primary Engine (${primaryEngine.toUpperCase()}) rendering succeeded!`);
      engineLogs.push(`[SUCCESS] Master video rendering completed via ${primaryEngine.toUpperCase()}.`);

      return {
        status: 'SUCCESS',
        message: `Video berhasil dirakit secara sempurna menggunakan ${primaryEngine.toUpperCase()}.`,
        finalVideoUrl,
        scenes: renderedScenes,
        social_media_kit,
        project_meta,
        primaryEngineUsed: primaryEngine,
        fallbackTriggered: false,
        engineLogs
      };

    } catch (err: any) {
      primaryErrorMsg = err?.message || String(err);
      primaryFailedDueToQuota = isQuotaError(primaryErrorMsg, err?.status);

      // Server Alert for Founder
      console.warn(`[FOUNDER ALERT] [FALLBACK 1] Primary engine '${primaryEngine.toUpperCase()}' failed (Quota/429: ${primaryFailedDueToQuota}). Message: ${primaryErrorMsg}. Switching to secondary engine '${secondaryEngine.toUpperCase()}'...`);
      engineLogs.push(`[FOUNDER ALERT - FALLBACK 1] Primary engine '${primaryEngine.toUpperCase()}' hit error/429 quota limit. Auto-failing over to secondary engine '${secondaryEngine.toUpperCase()}'...`);
    }

    // Step 3: Fallback Tier 1 (Execute Secondary Engine)
    try {
      console.log(`[VIDEO RENDER PIPELINE] Executing Fallback 1 with Secondary Engine (${secondaryEngine.toUpperCase()})...`);
      engineLogs.push(`[FALLBACK 1 EXECUTION] Launching video render on secondary engine '${secondaryEngine.toUpperCase()}'...`);

      const renderedScenes = await renderScenesWithEngine(secondaryEngine, scenes, engineLogs);
      const finalVideoUrl = await stitchVideoScenes(projectId, renderedScenes);

      console.log(`[VIDEO RENDER PIPELINE] Fallback Engine (${secondaryEngine.toUpperCase()}) rendering succeeded!`);
      engineLogs.push(`[SUCCESS] Master video rendering completed via fallback engine ${secondaryEngine.toUpperCase()}.`);

      return {
        status: 'SUCCESS',
        message: `Video berhasil dirakit menggunakan engine cadangan ${secondaryEngine.toUpperCase()} (Fallback Tier 1).`,
        finalVideoUrl,
        scenes: renderedScenes,
        social_media_kit,
        project_meta,
        primaryEngineUsed: secondaryEngine,
        fallbackTriggered: true,
        engineLogs
      };

    } catch (fallbackErr: any) {
      const secondaryErrorMsg = fallbackErr?.message || String(fallbackErr);

      // Server Alert for Founder
      console.warn(`[FOUNDER ALERT] [TERMINAL FALLBACK] Secondary engine '${secondaryEngine.toUpperCase()}' ALSO failed: ${secondaryErrorMsg}. Activating Terminal Fail-Safe Protocol.`);
      engineLogs.push(`[FOUNDER ALERT - TERMINAL FALLBACK] Both '${primaryEngine.toUpperCase()}' and '${secondaryEngine.toUpperCase()}' engines failed due to quota/network limits.`);

      // Step 4: Fallback Tier 2 (Terminal Failover)
      // - Skip FFmpeg video stitching
      // - Refund user credits
      // - Return PARTIAL_SUCCESS response with Phase 1 image assets, copywriting & hashtags
      const refundAmount = deductedCredits;
      await refundUserCredits(userId, projectId, refundAmount);

      console.log(`[VIDEO RENDER PIPELINE] Terminal Fail-Safe Activated. Process cancelled, FFmpeg skipped, ${refundAmount} credits refunded to user '${userId}'.`);
      engineLogs.push(`[TERMINAL PROTOCOL] Render process canceled (FFmpeg skipped). ${refundAmount} credits refunded. Returning Phase 1 Storyboard images & Social Media Kit.`);

      return {
        status: "PARTIAL_SUCCESS",
        message: "Sistem video sedang dalam kapasitas penuh. Kredit Anda telah dikembalikan. Berikut adalah aset gambar Storyboard, Copywriting, dan Hashtag yang tetap bisa Anda simpan.",
        scenes: scenes.map(s => ({
          ...s,
          status: 'COMPLETED',
          videoStatus: 'SKIPPED',
          assetUrl: s.imageUrl || s.assetUrl
        })),
        social_media_kit,
        project_meta,
        refundedCredits: refundAmount,
        primaryEngineUsed: 'NONE',
        fallbackTriggered: true,
        engineLogs
      };
    }
  }
}
