import fetch from "node-fetch";
import { FounderService } from "../src/server/fcc/FounderService";
import { VideoEditor } from "./VideoEditor";
import { projects, saveFileLocally } from "./orchestrator";
import { keyRotator } from "./keyRotator";
import { getFalModel, buildFalPayload, FAL_TIER_DEFAULTS, FalTier, resolveToDataUriOrPublic } from "./falModelConfig";
import { renderWithFalQueue } from "./falQueueRunner";
import { CreditService } from "./creditService";
import { ImageGenerationService } from "./imageService";

export interface SceneItem {
  id?: string;
  scene_number?: number;
  duration?: string;
  visual_direction?: string;
  visualDirection?: string;
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
  featuresProduct?: boolean;
  productLock?: boolean;
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
  modelId?: string;
  tier?: FalTier;
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
  const featuresProduct = scene.featuresProduct !== false && (scene as any)?.productLock !== false;
  let rawPrompt = scene.promptImageToVideo || scene.promptTextToImage || scene.visual_direction || scene.visualDirection || 'High quality commercial video scene';

  let prompt = rawPrompt;
  if (!featuresProduct) {
    if (!prompt.includes("NO PRODUCT VISIBLE")) {
      prompt = `Character Locked. NO PRODUCT VISIBLE. The character's hands are empty. Do not add, render, or hallucinate any product, object, or item in the scene. Scene Action: ${rawPrompt}`;
    }
  } else {
    if (!prompt.includes("Product Consistency Lock")) {
      prompt = `Product Consistency Lock: Keep product packaging, shape, color, and label text exactly identical to the reference product image. Do not alter or reinterpret the product design. ${rawPrompt}`;
    }
  }

  const imageUrl = scene.imageUrl || scene.assetUrl || (featuresProduct ? (scene as any)?.masterProductImageUrl : undefined);

  console.log(`[BYTEPLUS ENGINE] Rendering Scene ${sceneIdx + 1} with ${modelName}...`);
  engineLogs.push(`[BYTEPLUS ENGINE] Requesting Scene ${sceneIdx + 1} video generation via BytePlus ${modelName}...`);

  if (apiKey) {
    try {
      const baseUrl = endpoint.replace(/\/$/, '');
      const taskEndpoint = `${baseUrl}/contents/generations/tasks`;
      const rawImageUrl = imageUrl || scene.videoUrl || undefined;
      const resolvedImageUrl = rawImageUrl ? resolveToDataUriOrPublic(rawImageUrl) : undefined;
      const res = await fetch(taskEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          prompt,
          image_url: resolvedImageUrl,
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
 * Executes scene rendering using Single Source of Truth Fal.ai Video Engine
 */
async function renderWithFalVideoEngine(
  scene: SceneItem,
  sceneIdx: number,
  engineLogs: string[],
  overrideModelId?: string
): Promise<string> {
  const falApiKey = keyRotator.getNextFalKey();
  const featuresProduct = scene.featuresProduct !== false && (scene as any)?.productLock !== false;
  let rawPrompt = scene.promptImageToVideo || scene.promptTextToImage || scene.visual_direction || scene.visualDirection || 'High quality cinematic clip';

  let prompt = rawPrompt;
  if (!featuresProduct) {
    if (!prompt.includes("NO PRODUCT VISIBLE")) {
      prompt = `Character Locked. NO PRODUCT VISIBLE. The character's hands are empty. Do not add, render, or hallucinate any product, object, or item in the scene. Scene Action: ${rawPrompt}`;
    }
  } else {
    if (!prompt.includes("Product Consistency Lock")) {
      prompt = `Product Consistency Lock: Keep product packaging, shape, color, and label text exactly identical to the reference product image. Do not alter or reinterpret the product design. ${rawPrompt}`;
    }
  }

  const rawImageUrl = scene.imageUrl || scene.assetUrl || (featuresProduct ? (scene as any)?.masterProductImageUrl : undefined);
  let imageUrl = rawImageUrl || '';
  if (rawImageUrl) {
    imageUrl = (await ImageGenerationService.ensurePublicFalImageUrl(rawImageUrl, falApiKey)) || resolveToDataUriOrPublic(rawImageUrl);
  }

  console.log(`[FAL.AI VIDEO ENGINE] Rendering Scene ${sceneIdx + 1} with Fal.ai...`);
  engineLogs.push(`[FAL.AI VIDEO ENGINE] Calling Fal.ai Queue API for Scene ${sceneIdx + 1}...`);

  if (!falApiKey) {
    throw new Error(`HTTP 429 Quota Exceeded / Missing FAL_KEY for Fal.ai Video Engine.`);
  }

  const falConfig: any = FounderService.getFalConfig() || {};
  const activeModelId = overrideModelId || falConfig.model || FAL_TIER_DEFAULTS.budget;
  const modelDef = getFalModel(activeModelId);
  const modelPath = modelDef.id;

  console.log(`[FAL.AI VIDEO ENGINE] Dispatching Scene ${sceneIdx + 1} to model: ${modelPath}`);
  engineLogs.push(`[FAL.AI VIDEO ENGINE] Model: ${modelDef.name} (${modelPath})`);

  const payload = await buildFalPayload(modelPath, {
    prompt,
    imageUrl: imageUrl || '',
    duration: scene.duration || modelDef.defaultDuration,
    aspectRatio: (scene as any).metadata?.aspectRatio || (scene as any).aspectRatio || '16:9',
    generateAudio: modelDef.supportsAudio
  });

  try {
    const videoUrl = await renderWithFalQueue(modelPath, payload, falApiKey, (msg) => {
      engineLogs.push(`[FAL.AI] ${msg}`);
    });
    engineLogs.push(`[FAL.AI VIDEO ENGINE] Scene ${sceneIdx + 1} completed! URL: ${videoUrl}`);
    return videoUrl;
  } catch (err: any) {
    console.error(`[FAL.AI VIDEO ENGINE] Model ${modelPath} failed:`, err.message);
    keyRotator.reportKeyError('fal', falApiKey, err);
    throw err;
  }
}

/**
 * Helper to render all scenes with a specific engine ('fal' or 'byteplus')
 */
async function renderScenesWithEngine(
  engine: 'fal' | 'byteplus',
  scenes: SceneItem[],
  engineLogs: string[],
  overrideModelId?: string,
  projectId?: string
): Promise<SceneItem[]> {
  const falApiKey = keyRotator.getNextFalKey();

  if (engine === 'fal' && !falApiKey) {
    throw new Error("HTTP 429 Quota Exceeded: FAL_KEY missing for Fal.ai Video Engine.");
  }

  const renderedScenes: SceneItem[] = [];
  const project = projectId ? projects.get(projectId) : undefined;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let videoUrl = '';

    if (engine === 'fal') {
      videoUrl = await renderWithFalVideoEngine(scene, i, engineLogs, overrideModelId);
    } else {
      videoUrl = await renderWithBytePlusEngine(scene, i, engineLogs);
    }

    console.log(`[VideoRenderService] Securing scene ${i + 1} video to local permanent storage...`);
    const localVideoUrl = await saveFileLocally(videoUrl, `studio_scene_${i + 1}`, 'mp4', project);

    renderedScenes.push({
      ...scene,
      status: 'COMPLETED',
      videoStatus: 'COMPLETED',
      videoUrl: localVideoUrl,
      assetUrl: localVideoUrl
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
      console.error(`[Video Stitcher] Gagal menggabungkan video: ${e.message}`);
      throw e;
    }
  }
  throw new Error("Project tidak ditemukan untuk digabungkan.");
}

export class VideoRenderService {
  /**
   * Main Pipeline Execution function with Dynamic Credit Management & Dual-Tier Failover
   */
  static async executeVideoRenderPipeline(
    params: VideoRenderPipelineParams
  ): Promise<RenderPipelineResult> {
    const {
      projectId,
      userId = 'default-user',
      deductedCredits = 15,
      modelId,
      tier,
      scenes,
      social_media_kit,
      project_meta
    } = params;

    const engineLogs: string[] = [];

    // 1. Determine dynamic credit cost from model / tier
    const targetModelId = modelId || (tier ? FAL_TIER_DEFAULTS[tier] : undefined) || FounderService.getFalConfig()?.model || FAL_TIER_DEFAULTS.budget;
    const calculatedCost = CreditService.calculateCreditCost(targetModelId, {
      duration: scenes[0]?.duration ? Number(scenes[0].duration) : 5
    });
    const creditAmount = calculatedCost.credits || deductedCredits || 15;

    // 2. Pre-execution Credit Hold
    console.log(`[VIDEO RENDER PIPELINE] Initiating Credit Hold for user '${userId}': ${creditAmount} credits (Model: ${targetModelId})`);
    const holdResult = await CreditService.holdCredits(userId, creditAmount, projectId);
    if (!holdResult.success) {
      return {
        status: 'ERROR',
        message: holdResult.message || 'Kredit Anda tidak mencukupi untuk melakukan render.',
        scenes,
        social_media_kit,
        project_meta,
        engineLogs: [`[CREDIT ERROR] ${holdResult.message}`]
      };
    }

    const holdId = holdResult.holdId;

    // 3. Step 1: Check Global Config from Founder Dashboard / system_configs
    const rawEngine = FounderService.getPrimaryVideoEngine(); // 'fal' | 'byteplus'
    const primaryEngine: 'fal' | 'byteplus' = rawEngine === 'byteplus' ? 'byteplus' : 'fal';
    const secondaryEngine: 'fal' | 'byteplus' = primaryEngine === 'fal' ? 'byteplus' : 'fal';

    console.log(`[VIDEO RENDER PIPELINE] System Config Primary Engine: '${primaryEngine.toUpperCase()}'. Secondary Fallback Engine: '${secondaryEngine.toUpperCase()}'. Project ID: ${projectId}`);
    engineLogs.push(`[SYSTEM CONFIG] Primary Engine set to '${primaryEngine.toUpperCase()}'. Model: '${targetModelId}'`);

    let primaryFailedDueToQuota = false;
    let primaryErrorMsg = '';

    // Step 2: Attempt Primary Engine Execution
    try {
      console.log(`[VIDEO RENDER PIPELINE] Executing Primary Engine (${primaryEngine.toUpperCase()})...`);
      engineLogs.push(`[PRIMARY EXECUTION] Launching video render on '${primaryEngine.toUpperCase()}'...`);

      const renderedScenes = await renderScenesWithEngine(primaryEngine, scenes, engineLogs, targetModelId, projectId);
      const finalVideoUrl = await stitchVideoScenes(projectId, renderedScenes);

      console.log(`[VIDEO RENDER PIPELINE] Primary Engine (${primaryEngine.toUpperCase()}) rendering succeeded!`);
      engineLogs.push(`[SUCCESS] Master video rendering completed via ${primaryEngine.toUpperCase()}.`);

      // Commit hold on success
      await CreditService.commitHold(userId, creditAmount, holdId);

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
      engineLogs.push(`[FOUNDER ALERT - FALLBACK 1] Primary engine '${primaryEngine.toUpperCase()}' encountered error (${primaryErrorMsg}). Auto-failing over to secondary engine '${secondaryEngine.toUpperCase()}'...`);
    }

    // Step 3: Fallback Tier 1 (Execute Secondary Engine)
    try {
      console.log(`[VIDEO RENDER PIPELINE] Executing Fallback 1 with Secondary Engine (${secondaryEngine.toUpperCase()})...`);
      engineLogs.push(`[FALLBACK 1 EXECUTION] Launching video render on secondary engine '${secondaryEngine.toUpperCase()}'...`);

      const renderedScenes = await renderScenesWithEngine(secondaryEngine, scenes, engineLogs, targetModelId, projectId);
      const finalVideoUrl = await stitchVideoScenes(projectId, renderedScenes);

      console.log(`[VIDEO RENDER PIPELINE] Fallback Engine (${secondaryEngine.toUpperCase()}) rendering succeeded!`);
      engineLogs.push(`[SUCCESS] Master video rendering completed via fallback engine ${secondaryEngine.toUpperCase()}.`);

      // Commit hold on success
      await CreditService.commitHold(userId, creditAmount, holdId);

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
      engineLogs.push(`[FOUNDER ALERT - TERMINAL FALLBACK] Both '${primaryEngine.toUpperCase()}' and '${secondaryEngine.toUpperCase()}' engines failed.`);

      // Step 4: Terminal Failover -> Refund user credits
      await CreditService.refundCredits(userId, creditAmount, `Terminal video pipeline failure: ${secondaryErrorMsg}`);

      console.log(`[VIDEO RENDER PIPELINE] Terminal Fail-Safe Activated. Process cancelled, FFmpeg skipped, ${creditAmount} credits refunded to user '${userId}'.`);
      engineLogs.push(`[TERMINAL PROTOCOL] Render process canceled. ${creditAmount} credits refunded to user balance. Returning Phase 1 Storyboard images & Social Media Kit.`);

      return {
        status: "PARTIAL_SUCCESS",
        message: "Sistem video sedang dalam kapasitas penuh atau mengalami kendala jaringan. Kredit Anda telah dikembalikan secara utuh. Berikut adalah aset gambar Storyboard, Copywriting, dan Hashtag yang tetap bisa Anda simpan.",
        scenes: scenes.map(s => ({
          ...s,
          status: 'COMPLETED',
          videoStatus: 'SKIPPED',
          assetUrl: s.imageUrl || s.assetUrl
        })),
        social_media_kit,
        project_meta,
        refundedCredits: creditAmount,
        primaryEngineUsed: 'NONE',
        fallbackTriggered: true,
        engineLogs
      };
    }
  }
}
