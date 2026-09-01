import fs from "fs";
import path from "path";

export type FalTier = 'budget' | 'balanced' | 'premium';

export interface FalModelDefinition {
  id: string; // Exact endpoint name used in queue.fal.run
  name: string;
  shortName: string;
  tier: FalTier;
  description: string;
  costUsd: number; // Base cost in USD for standard generation
  isTokenBased?: boolean;
  costPerSecondUsd?: number;
  durationOptions: string[];
  defaultDuration: string;
  resolutionOptions?: string[];
  defaultResolution?: string;
  supportsAudio?: boolean;
}

/**
 * 11 Single Source of Truth VALID Image-to-Video models on fal.ai / bytedance
 */
export const FAL_MODELS: FalModelDefinition[] = [

  // BUDGET TIER
  {
    id: 'fal-ai/veo3.1/lite/image-to-video',
    name: 'Google Veo 3.1 Lite (Bisu)',
    shortName: 'Veo 3.1 Lite (Bisu)',
    tier: 'budget',
    description: 'Video 720p termurah dari Google. Catatan: Video BISU (tanpa audio).',
    costUsd: 0.15,
    isTokenBased: false,
    durationOptions: ['5'],
    defaultDuration: '5',
    supportsAudio: false
  },
  {
    id: 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
    name: 'ByteDance Seedance 1.0 Lite',
    shortName: 'Seedance 1.0 Lite',
    tier: 'budget',
    description: 'Model budget dari ByteDance dengan kualitas baik dan native audio.',
    costUsd: 0.18,
    isTokenBased: false,
    durationOptions: ['5'],
    defaultDuration: '5',
    supportsAudio: true
  },
  {
    id: 'fal-ai/wan-i2v',
    name: 'Wan 2.1 Image-to-Video',
    shortName: 'Wan 2.1',
    tier: 'budget',
    description: 'Model ultra efisien & hemat, gerakan natural untuk visual umum.',
    costUsd: 0.30,
    isTokenBased: false,
    durationOptions: ['5'],
    defaultDuration: '5',
    supportsAudio: false
  },
  {
    id: 'bytedance/seedance-2.0/fast/image-to-video',
    name: 'ByteDance Seedance 2.0 Fast',
    shortName: 'Seedance 2.0 Fast',
    tier: 'budget',
    description: 'Generasi video super cepat & murah dari ByteDance.',
    costUsd: 0.075,
    isTokenBased: true,
    costPerSecondUsd: 0.015,
    durationOptions: ['5', '10'],
    defaultDuration: '5',
    resolutionOptions: ['480p', '720p'],
    defaultResolution: '720p',
    supportsAudio: true
  },
  {
    id: 'fal-ai/hunyuan-video-image-to-video',
    name: 'Tencent Hunyuan Image-to-Video',
    shortName: 'Hunyuan I2V',
    tier: 'budget',
    description: 'Model open-source Tencent dengan resolusi tinggi & stabil.',
    costUsd: 0.08,
    isTokenBased: false,
    durationOptions: ['5'],
    defaultDuration: '5',
    supportsAudio: false
  },

  // BALANCED TIER
  {
    id: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    name: 'Kling 2.1 Standard Image-to-Video',
    shortName: 'Kling 2.1 Standard',
    tier: 'balanced',
    description: 'Keseimbangan terbaik antara kualitas visual, konsistensi & biaya.',
    costUsd: 0.15,
    isTokenBased: false,
    durationOptions: ['5', '10'],
    defaultDuration: '5',
    supportsAudio: false
  },
  {
    id: 'fal-ai/kling-video/o3/standard/image-to-video',
    name: 'Kling O3 Standard Image-to-Video',
    shortName: 'Kling O3 Standard',
    tier: 'balanced',
    description: 'Model Kling generasi O3 untuk rendering fisika dan gerakan dinamis.',
    costUsd: 0.18,
    isTokenBased: false,
    durationOptions: ['5', '10'],
    defaultDuration: '5',
    supportsAudio: false
  },
  {
    id: 'fal-ai/minimax/video-01/image-to-video',
    name: 'MiniMax Video-01 Image-to-Video',
    shortName: 'MiniMax Video-01',
    tier: 'balanced',
    description: 'Karakter wajah konsisten & gerakan manusia yang sangat ekspresif.',
    costUsd: 0.16,
    isTokenBased: false,
    durationOptions: ['5', '10'],
    defaultDuration: '5',
    supportsAudio: false
  },
  {
    id: 'fal-ai/minimax/video-01-live/image-to-video',
    name: 'MiniMax Video-01 Live Image-to-Video',
    shortName: 'MiniMax 01 Live',
    tier: 'balanced',
    description: 'Render cepat dengan dynamic range tinggi untuk adegan hidup.',
    costUsd: 0.17,
    isTokenBased: false,
    durationOptions: ['5'],
    defaultDuration: '5',
    supportsAudio: false
  },
  {
    id: 'bytedance/seedance-2.0/image-to-video',
    name: 'ByteDance Seedance 2.0 Standard',
    shortName: 'Seedance 2.0 Standard',
    tier: 'balanced',
    description: 'Kualitas video 720p sinematik dengan durasi hingga 15 detik.',
    costUsd: 0.18,
    isTokenBased: true,
    costPerSecondUsd: 0.025,
    durationOptions: ['5', '10', '15'],
    defaultDuration: '10',
    resolutionOptions: ['480p', '720p', '1080p'],
    defaultResolution: '720p',
    supportsAudio: true
  },

  // PREMIUM TIER
  {
    id: 'bytedance/seedance-2.5/image-to-video',
    name: 'ByteDance Seedance 2.5 Image-to-Video',
    shortName: 'Seedance 2.5 Sinematik',
    tier: 'premium',
    description: 'Kualitas tertinggi, native hingga 30s, audio synchrony & prompt adherence terbaik.',
    costUsd: 0.35,
    isTokenBased: true,
    costPerSecondUsd: 0.035,
    durationOptions: ['5', '10', '15', '30'],
    defaultDuration: '10',
    resolutionOptions: ['720p', '1080p'],
    defaultResolution: '720p',
    supportsAudio: true
  },
  {
    id: 'fal-ai/kling-video/v3/pro/image-to-video',
    name: 'Kling 3.0 Pro Image-to-Video',
    shortName: 'Kling 3.0 Pro',
    tier: 'premium',
    description: 'Tingkat detail tertinggi untuk produksi iklan dan video profesional.',
    costUsd: 0.30,
    isTokenBased: false,
    durationOptions: ['5', '10'],
    defaultDuration: '5',
    supportsAudio: false
  },
  {
    id: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
    name: 'MiniMax Hailuo-02 Standard',
    shortName: 'Hailuo-02 Standard',
    tier: 'premium',
    description: 'Generasi sinematik generasi terbaru dengan kejernihan 1080p.',
    costUsd: 0.28,
    isTokenBased: false,
    durationOptions: ['5', '10'],
    defaultDuration: '5',
    supportsAudio: false
  }
];

export const FAL_TIER_DEFAULTS: Record<FalTier, string> = {
  budget: 'fal-ai/veo3.1/lite/image-to-video',
  balanced: 'fal-ai/kling-video/v2.1/standard/image-to-video',
  premium: 'bytedance/seedance-2.5/image-to-video'
};

export const FAL_TIER_META: Record<FalTier, { label: string; name: string; desc: string; defaultModel: string; badge: string; estimatedCostCredits: number }> = {
  budget: {
    label: 'Hemat (Veo Lite)',
    name: 'Budget Tier',
    desc: 'Pilihan paling ekonomis & cepat menggunakan Google Veo 3.1 Lite ($0.15).',
    defaultModel: 'fal-ai/veo3.1/lite/image-to-video',
    badge: 'HEMAT / 5 KREDIT',
    estimatedCostCredits: 5
  },
  balanced: {
    label: 'Seimbang',
    name: 'Balanced Tier',
    desc: 'Keseimbangan ideal antara kejernihan visual, kelancaran gerakan, dan efisiensi biaya.',
    defaultModel: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    badge: 'POPULER / 15 KREDIT',
    estimatedCostCredits: 15
  },
  premium: {
    label: 'Premium',
    name: 'Premium Tier',
    desc: 'Kualitas sinematik tertinggi, audio otomatis & kepatuhan prompt presisi studio.',
    defaultModel: 'bytedance/seedance-2.5/image-to-video',
    badge: 'ULTRA HD / 25 KREDIT',
    estimatedCostCredits: 25
  }
};

export function getFalModel(modelId?: string): FalModelDefinition {
  if (!modelId) {
    return FAL_MODELS[0];
  }
  const cleanId = modelId.trim();
  const match = FAL_MODELS.find(m => m.id === cleanId || m.shortName.toLowerCase() === cleanId.toLowerCase());
  return match || FAL_MODELS[0];
}

export function getDefaultModelForTier(tier: FalTier): string {
  return FAL_TIER_DEFAULTS[tier] || FAL_TIER_DEFAULTS.balanced;
}

export function getTierForModel(modelId: string): FalTier {
  const model = FAL_MODELS.find(m => m.id === modelId);
  return model ? model.tier : 'balanced';
}

/**
 * Resolves local file paths or relative URLs (/outputs/..., outputs/..., public/..., etc.) to real filesystem paths.
 */
export function resolveLocalFilePath(filePathOrUrl?: string): string | null {
  if (!filePathOrUrl || typeof filePathOrUrl !== 'string') return null;
  const trimmed = filePathOrUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return null; // Not a local path
  }

  const cwd = process.cwd();
  const cleanRel = trimmed.replace(/^\//, '');

  const candidates = [
    path.join(cwd, cleanRel),
    path.join(cwd, 'outputs', path.basename(trimmed)),
    path.join(cwd, 'public', path.basename(trimmed)),
    path.isAbsolute(trimmed) ? trimmed : path.join(cwd, trimmed)
  ];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return c;
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Synchronously converts a local image path to a base64 data URI if it's not already a public URL or data URI.
 * This guarantees Fal.ai and BytePlus APIs never receive local relative /outputs/... paths.
 */
export function resolveToDataUriOrPublic(imageUrl?: string): string {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  const trimmed = imageUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const localFile = resolveLocalFilePath(trimmed);
  if (localFile) {
    try {
      const ext = path.extname(localFile).toLowerCase().replace('.', '') || 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
      const buf = fs.readFileSync(localFile);
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (e) {
      console.warn(`[resolveToDataUriOrPublic] Could not read local file ${localFile}:`, e);
    }
  }

  return trimmed;
}

export interface FalPayloadParams {
  prompt: string;
  imageUrl: string;
  duration?: string | number;
  resolution?: '480p' | '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  endImageUrl?: string;
  generateAudio?: boolean;
}

/**
 * Payload builder matching official schema for each valid model
 */
export function buildFalPayload(modelId: string, params: FalPayloadParams): any {
  const cleanPrompt = (params.prompt || 'Cinematic video scene with smooth camera movement').slice(0, 1000);
  const imageUrl = resolveToDataUriOrPublic(params.imageUrl);
  const endImageUrl = params.endImageUrl ? resolveToDataUriOrPublic(params.endImageUrl) : undefined;

  // 1. ByteDance Seedance 2.0 / 2.5
  if (modelId.includes('seedance')) {
    const is25 = modelId.includes('2.5');
    const durStr = params.duration ? String(params.duration) : (is25 ? "10" : "5");
    const payload: any = {
      prompt: cleanPrompt,
      image_url: imageUrl,
      duration: durStr,
      aspect_ratio: params.aspectRatio || "16:9",
      generate_audio: params.generateAudio !== undefined ? params.generateAudio : true
    };
    if (params.resolution) {
      payload.resolution = params.resolution;
    } else if (modelId.includes('fast')) {
      payload.resolution = '720p';
    } else {
      payload.resolution = '720p';
    }
    if (endImageUrl) {
      payload.end_image_url = endImageUrl;
    }
    return payload;
  }

  // 2. Google Veo 3.1 Lite / Veo on Fal
  if (modelId.includes('veo')) {
    return {
      prompt: cleanPrompt,
      image_url: imageUrl,
      duration: params.duration ? String(params.duration) : "5",
      aspect_ratio: params.aspectRatio || "16:9"
    };
  }

  // 2. Kling family (kling-video/v2.1, kling-video/v3/pro, kling-video/o3)
  if (modelId.includes('kling')) {
    const durStr = params.duration ? String(params.duration) : "5";
    return {
      prompt: cleanPrompt,
      image_url: imageUrl,
      duration: durStr === "10" ? "10" : "5"
    };
  }

  // 3. Wan / MiniMax / Hunyuan
  // Official schema: image_url + prompt only, no aspect_ratio
  return {
    prompt: cleanPrompt,
    image_url: imageUrl
  };
}

/**
 * =========================================================================
 * SINGLE SOURCE OF TRUTH: TEXT-TO-IMAGE & IMAGE-EDIT MODELS
 * =========================================================================
 */
export interface FalImageModelDefinition {
  id: string; // Exact endpoint name used in fal.run or queue.fal.run
  name: string;
  shortName: string;
  tier: FalTier;
  category: 't2i' | 'edit';
  description: string;
  costUsd: number;
  defaultAspectRatio: string;
  defaultResolution: string;
  supportsReferenceImages: boolean;
  maxReferenceImages: number;
}

export const FAL_IMAGE_MODELS: FalImageModelDefinition[] = [
  {
    id: 'fal-ai/flux/schnell',
    name: 'FLUX.1 Schnell (Fast T2I)',
    shortName: 'Flux Schnell',
    tier: 'budget',
    category: 't2i',
    description: 'Generasi gambar cepat 4-step untuk konsep & thumbnail kilat ($0.003/MP).',
    costUsd: 0.003, // $0.003 per megapixel
    defaultAspectRatio: '16:9',
    defaultResolution: '1K',
    supportsReferenceImages: false,
    maxReferenceImages: 0
  },
  {
    id: 'fal-ai/nano-banana-2',
    name: 'Nano Banana 2 (Gemini 3.1 Flash Image T2I)',
    shortName: 'Nano Banana 2 T2I',
    tier: 'balanced',
    category: 't2i',
    description: 'Text-to-Image resolusi tinggi 1K-4K untuk generate base character & konsep awal.',
    costUsd: 0.025, 
    defaultAspectRatio: '16:9',
    defaultResolution: '1K',
    supportsReferenceImages: false,
    maxReferenceImages: 0
  },
  {
    id: 'fal-ai/nano-banana-2/edit',
    name: 'Nano Banana 2 Edit (Character Consistency Engine)',
    shortName: 'Nano Banana 2 Edit',
    tier: 'balanced',
    category: 'edit',
    description: 'Image-to-Image & Character Lock untuk studio Animasi dan Edukasi.',
    costUsd: 0.025, 
    defaultAspectRatio: '16:9',
    defaultResolution: '1K',
    supportsReferenceImages: true,
    maxReferenceImages: 14
  },
  {
    id: 'fal-ai/nano-banana-pro/edit',
    name: 'Nano Banana Pro Edit (Multi-Image UGC & Product Lock)',
    shortName: 'Nano Banana Pro Edit',
    tier: 'premium',
    category: 'edit',
    description: 'Model Pro Multimodal WAJIB untuk Studio Affiliate (Kunci Produk + Wajah Kreator).',
    costUsd: 0.05, 
    defaultAspectRatio: '9:16',
    defaultResolution: '1K',
    supportsReferenceImages: true,
    maxReferenceImages: 14
  }
];

export type FalImageTierKey = 'draft' | 'standard' | 'precision';

export interface ImageTierDefinition {
  key: FalImageTierKey;
  label: string;
  useCase: string;
  model?: string;
  baseModel?: string;
  editModel?: string;
}

/**
 * Single Source of Truth for Image Generation Model Tiers
 */
export const IMAGE_MODEL_TIERS: Record<FalImageTierKey, ImageTierDefinition> = {
  draft: {
    key: 'draft',
    model: 'fal-ai/flux/schnell',
    label: 'Hemat / Draft (FLUX.1 Schnell)',
    useCase: 'Eksplorasi gaya visual cepat tanpa konsistensi karakter (Pure Text-to-Image)'
  },
  standard: {
    key: 'standard',
    baseModel: 'fal-ai/nano-banana-2',       // untuk generate master/scene pertama
    editModel: 'fal-ai/nano-banana-2/edit',  // untuk scene lanjutan pakai referensi
    label: 'Standar (Nano Banana 2 & Edit)',
    useCase: 'Konsistensi karakter memadai untuk volume tinggi (animasi, edukasi)'
  },
  precision: {
    key: 'precision',
    baseModel: 'fal-ai/nano-banana-pro/edit',
    editModel: 'fal-ai/nano-banana-pro/edit',
    label: 'Presisi Tinggi (Nano Banana Pro Edit)',
    useCase: 'Wajib untuk produk/wajah yang harus 100% identik (affiliate), opsional upgrade untuk scene kompleks di animasi/edukasi'
  }
};

export function getFalImageModel(modelId?: string): FalImageModelDefinition {
  if (!modelId) {
    return FAL_IMAGE_MODELS[1]; // Default to nano-banana-2
  }
  const cleanId = modelId.trim();
  const match = FAL_IMAGE_MODELS.find(m => m.id === cleanId || m.shortName.toLowerCase() === cleanId.toLowerCase());
  return match || FAL_IMAGE_MODELS[1];
}

/**
 * Route studio to the exact required model tier based on IMAGE_MODEL_TIERS
 * - ANIMASI & EDUKASI -> default 'standard', user can upgrade to 'precision' per scene or 'draft' for preview
 * - AFFILIATE -> locked permanently to 'precision'
 */
export function getFalImageModelForStudio(
  studioMode: 'ANIMATION' | 'EDUCATIONAL' | 'AFFILIATE' | string,
  options?: {
    isSubsequentScene?: boolean;
    hasReferenceImages?: boolean;
    forceModelId?: string;
    tier?: 'draft' | 'standard' | 'precision' | string;
  }
): FalImageModelDefinition {
  if (options?.forceModelId) {
    const forced = FAL_IMAGE_MODELS.find(m => m.id === options.forceModelId || m.shortName.toLowerCase() === options.forceModelId?.toLowerCase());
    if (forced) return forced;
  }

  const mode = (studioMode || 'ANIMATION').toUpperCase();

  // 1. STUDIO_AFFILIATE: Dikunci permanen ke tier "precision"
  if (mode === 'AFFILIATE') {
    const precisionModelId = IMAGE_MODEL_TIERS.precision.editModel!;
    return getFalImageModel(precisionModelId);
  }

  // 2. Opsi tier "draft" untuk mode eksplorasi/preview cepat dari studio manapun (Pure Text-to-Image Schnell)
  if (options?.tier === 'draft') {
    const draftModelId = IMAGE_MODEL_TIERS.draft.model!;
    return getFalImageModel(draftModelId);
  }

  // 3. Opsi upgrade manual ke tier "precision" per scene (climax/thumbnail)
  if (options?.tier === 'precision') {
    const precisionModelId = IMAGE_MODEL_TIERS.precision.editModel!;
    return getFalImageModel(precisionModelId);
  }

  // 4. STUDIO_ANIMASI & STUDIO_EDUKASI: Default ke tier "standard"
  const standardTier = IMAGE_MODEL_TIERS.standard;
  if (options?.hasReferenceImages || options?.isSubsequentScene) {
    return getFalImageModel(standardTier.editModel!);
  }

  // Base character initial creation (Scene 1): Pure T2I
  return getFalImageModel(standardTier.baseModel!);
}

export interface FalImagePayloadParams {
  prompt: string;
  imageUrls?: string[];
  aspectRatio?: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' | string;
  resolution?: '0.5K' | '1K' | '2K' | '4K' | string;
  outputFormat?: 'jpeg' | 'png' | 'webp' | string;
  safetyTolerance?: '1' | '2' | '3' | '4' | '5' | '6' | string;
  numInferenceSteps?: number;
}

/**
 * Validates and sanitizes image URLs: ensuring array format, valid URLs, max limit of 14
 */
export function sanitizeReferenceImageUrls(urls?: string | string[]): string[] {
  if (!urls) return [];
  const rawArray = Array.isArray(urls) ? urls : [urls];
  return rawArray
    .filter(u => typeof u === 'string' && u.trim().length > 0)
    .map(u => resolveToDataUriOrPublic(u.trim()))
    .filter(u => u.length > 0)
    .slice(0, 14); // fal limit is 14
}

/**
 * Specialized Payload Builder for FLUX.1 Schnell (Pure Text-to-Image / Draft Tier)
 * Notice: Flux Schnell does NOT support multi-image reference array (image_urls).
 */
export function buildFluxSchnellPayload(params: {
  prompt: string;
  aspectRatio?: string;
  numInferenceSteps?: number;
}): any {
  const cleanAspect = (params.aspectRatio || '16:9').toString();
  let imageSize: any = 'landscape_16_9';
  if (cleanAspect === '9:16') imageSize = 'portrait_16_9';
  else if (cleanAspect === '1:1') imageSize = 'square_hd';
  else if (cleanAspect === '4:3') imageSize = 'landscape_4_3';
  else if (cleanAspect === '3:4') imageSize = 'portrait_4_3';

  return {
    prompt: (params.prompt || '').trim(),
    image_size: imageSize,
    num_inference_steps: params.numInferenceSteps || 4,
    num_images: 1,
    enable_safety_checker: false
  };
}

/**
 * Specialized Payload Builder for Nano Banana 2 and Nano Banana Pro Edit
 */
export function buildNanoBananaPayload(
  modelId: string,
  params: {
    prompt: string;
    imageUrls?: string[];
    aspectRatio?: string;
    resolution?: string;
    outputFormat?: string;
    safetyTolerance?: string;
  }
): any {
  const cleanPrompt = (params.prompt || '').trim();
  const cleanAspect = (params.aspectRatio || '16:9').toString();
  const cleanResolution = (params.resolution || '1K').toString();
  const cleanFormat = (params.outputFormat || 'png').toString();
  const sanitizedUrls = sanitizeReferenceImageUrls(params.imageUrls);

  // Model-specific payload structure
  if (modelId === 'fal-ai/nano-banana-pro/edit') {
    return {
      prompt: cleanPrompt,
      image_urls: sanitizedUrls,
      aspect_ratio: cleanAspect,
      resolution: cleanResolution,
      output_format: cleanFormat,
      safety_tolerance: params.safetyTolerance || '6' // High tolerance for authentic human faces & products
    };
  }

  if (modelId === 'fal-ai/nano-banana-2/edit') {
    return {
      prompt: cleanPrompt,
      image_urls: sanitizedUrls,
      aspect_ratio: cleanAspect,
      resolution: cleanResolution,
      output_format: cleanFormat,
      safety_tolerance: params.safetyTolerance || '5'
    };
  }

  // Base Nano Banana 2 (Pure T2I - No image_urls allowed)
  return {
    prompt: cleanPrompt,
    aspect_ratio: cleanAspect,
    resolution: cleanResolution,
    output_format: cleanFormat,
    safety_tolerance: params.safetyTolerance || '5'
  };
}

/**
 * Builds standard compliant payload according to official Fal.ai schemas
 */
export function buildFalImagePayload(modelId: string, params: FalImagePayloadParams): any {
  // 1. FLUX SCHNELL (Pure Text-to-Image, strictly no image_urls)
  if (modelId === 'fal-ai/flux/schnell' || modelId.includes('flux')) {
    return buildFluxSchnellPayload({
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      numInferenceSteps: params.numInferenceSteps
    });
  }

  // 2. NANO BANANA MODELS (T2I & Multimodal Image-to-Image)
  return buildNanoBananaPayload(modelId, {
    prompt: params.prompt,
    imageUrls: params.imageUrls,
    aspectRatio: params.aspectRatio,
    resolution: params.resolution,
    outputFormat: params.outputFormat,
    safetyTolerance: params.safetyTolerance
  });
}

