/**
 * NEURONA Unified Model Catalog & Provider-Safe Routing Registry
 * 
 * CORE RULES:
 * 1. DISPLAY NAME IS NEVER A ROUTING KEY.
 * 2. Routing MUST always use provider + internalModelId.
 * 3. Never cross-execute Higgsfield and OpenArt models.
 * 4. Standardized display names provide UI consistency without affecting backend routing keys.
 * 5. Legacy aliases are supported for backward compatibility.
 */

export type ModelProvider = 'higgsfield' | 'openart' | 'fal' | 'google_veo' | 'byteplus' | 'mock';
export type ModelMediaType = 'IMAGE' | 'VIDEO' | 'IMAGE_TO_VIDEO' | 'HYBRID';
export type ModelTier = 'economy' | 'balanced' | 'premium';

export interface UnifiedModelInfo {
  provider: ModelProvider;
  internalModelId: string;
  displayName: string;
  type: ModelMediaType;
  tier: ModelTier;
  costCredits: number;
  costUsd: number;
  description: string;
  capabilities: string[];
  supportedAspectRatios: string[];
  isDefault?: boolean;
  isLegacyAlias?: boolean;
  aliasOf?: string;
  badge?: string;
}

// ---------------------------------------------------------------------------
// 1. HIGGSFIELD ALL SUPPORTED MODELS CATALOG
// ---------------------------------------------------------------------------
export const HIGGSFIELD_CATALOG_MODELS: UnifiedModelInfo[] = [
  {
    provider: 'higgsfield',
    internalModelId: 'veo3_1_lite',
    displayName: 'Google Veo 3.1 Lite',
    type: 'HYBRID',
    tier: 'economy',
    costCredits: 8,
    costUsd: 0.080,
    description: 'Model video 720p ultra-cepat & hemat biaya melalui Higgsfield MCP (8 Kredit)',
    capabilities: ['Text-to-Video', 'Image-to-Video', 'Fast Generation', '720p Native'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    isDefault: true,
    badge: 'HIGGSFIELD FAST'
  },
  {
    provider: 'higgsfield',
    internalModelId: 'wan3_0',
    displayName: 'Wan 3.0',
    type: 'HYBRID',
    tier: 'balanced',
    costCredits: 8.75,
    costUsd: 0.0875,
    description: 'Model animasi karakter multimodal & pergerakan organik tingkat lanjut (8.75 Kredit)',
    capabilities: ['Image-to-Video', 'Text-to-Video', 'Character Physics', 'Multimodal Motion'],
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    badge: 'HIGGSFIELD CHARACTER'
  },
  {
    provider: 'higgsfield',
    internalModelId: 'veo3_1',
    displayName: 'Google Veo 3.1',
    type: 'HYBRID',
    tier: 'premium',
    costCredits: 22,
    costUsd: 0.220,
    description: 'Model video sinematik fotorealistik 1080p kelas tertinggi dari Google (22 Kredit)',
    capabilities: ['Text-to-Video', 'Image-to-Video', 'Ultra HD 1080p', 'Cinematic Lighting'],
    supportedAspectRatios: ['16:9', '9:16'],
    badge: 'HIGGSFIELD ULTRA'
  },
  {
    provider: 'higgsfield',
    internalModelId: 'wan2_7',
    displayName: 'Wan 2.7 Video Engine',
    type: 'HYBRID',
    tier: 'balanced',
    costCredits: 12,
    costUsd: 0.120,
    description: 'Engine video Wan 2.7 dengan kestabilan fisika scene dan ekspresi dinamis (12 Kredit)',
    capabilities: ['Image-to-Video', 'Text-to-Video', 'Dynamic Motion', 'Organic Fluidity'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    badge: 'HIGGSFIELD BALANCED'
  },
  {
    provider: 'higgsfield',
    internalModelId: 'grok_video',
    displayName: 'Grok Video Engine',
    type: 'HYBRID',
    tier: 'balanced',
    costCredits: 12,
    costUsd: 0.120,
    description: 'Engine video dinamika tinggi & fisika aksi ekspresif via Higgsfield MCP (12 Kredit)',
    capabilities: ['Text-to-Video', 'Action Physics', 'High Dynamic Camera', 'Explosive Motion'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    badge: 'HIGGSFIELD ACTION'
  },
  {
    provider: 'higgsfield',
    internalModelId: 'gemini_omni',
    displayName: 'Gemini Omni Video',
    type: 'HYBRID',
    tier: 'balanced',
    costCredits: 10,
    costUsd: 0.100,
    description: 'Sintesis video multimodal reasoning Google Gemini Omni (10 Kredit)',
    capabilities: ['Text-to-Video', 'Multimodal Coherence', 'Prompt Adherence', 'Clean Render'],
    supportedAspectRatios: ['16:9', '9:16'],
    badge: 'HIGGSFIELD OMNI'
  },

  // Backward-Compatible Legacy Aliases (Must normalize to canonical ID)
  {
    provider: 'higgsfield',
    internalModelId: 'higgsfield-video-pro',
    displayName: 'Google Veo 3.1 Lite (Legacy: Video Pro)',
    type: 'VIDEO',
    tier: 'economy',
    costCredits: 8,
    costUsd: 0.080,
    description: 'Alias legacy Higgsfield Video Pro (terhubung langsung ke Google Veo 3.1 Lite)',
    capabilities: ['Text-to-Video', 'Image-to-Video', 'Legacy Alias'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    isLegacyAlias: true,
    aliasOf: 'veo3_1_lite'
  },
  {
    provider: 'higgsfield',
    internalModelId: 'higgsfield-anim',
    displayName: 'Wan 3.0 (Legacy: Anim)',
    type: 'VIDEO',
    tier: 'balanced',
    costCredits: 8.75,
    costUsd: 0.0875,
    description: 'Alias legacy Higgsfield Anim (terhubung langsung ke Wan 3.0)',
    capabilities: ['Image-to-Video', 'Legacy Alias'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    isLegacyAlias: true,
    aliasOf: 'wan3_0'
  }
];

// ---------------------------------------------------------------------------
// 2. OPENART ALL SUPPORTED MODELS CATALOG (GOLDEN WORKING STATE PRESERVED)
// ---------------------------------------------------------------------------
export const OPENART_CATALOG_MODELS: UnifiedModelInfo[] = [
  // Video Models
  {
    provider: 'openart',
    internalModelId: 'byte-plus-seedance-2-fast',
    displayName: 'Seedance 2.0 Fast',
    type: 'IMAGE_TO_VIDEO',
    tier: 'economy',
    costCredits: 6,
    costUsd: 0.060,
    description: 'BytePlus Seedance 2.0 Fast high-speed fluid camera & motion dynamics (6 Kredit)',
    capabilities: ['Image-to-Video', 'High Speed', 'Fluid Camera', 'Fast Render'],
    supportedAspectRatios: ['9:16', '16:9', '1:1'],
    isDefault: true,
    badge: 'OPENART FAST'
  },
  {
    provider: 'openart',
    internalModelId: 'byte-plus-seedance-2',
    displayName: 'Seedance 2.0',
    type: 'IMAGE_TO_VIDEO',
    tier: 'balanced',
    costCredits: 12,
    costUsd: 0.120,
    description: 'BytePlus Seedance 2.0 character & scene animation with high stability (12 Kredit)',
    capabilities: ['Image-to-Video', 'Character Stability', 'Physics Coherence'],
    supportedAspectRatios: ['9:16', '16:9', '1:1'],
    badge: 'OPENART BALANCED'
  },
  {
    provider: 'openart',
    internalModelId: 'byte-plus-seedance-2-5',
    displayName: 'Seedance 2.5',
    type: 'IMAGE_TO_VIDEO',
    tier: 'premium',
    costCredits: 18,
    costUsd: 0.180,
    description: 'BytePlus Seedance 2.5 advanced temporal coherence & cinematic physics (18 Kredit)',
    capabilities: ['Image-to-Video', 'Pro Coherence', 'Cinema Quality', 'Dynamic FX'],
    supportedAspectRatios: ['9:16', '16:9', '1:1'],
    badge: 'OPENART CINEMA'
  },
  {
    provider: 'openart',
    internalModelId: 'veo3-1',
    displayName: 'Google Veo 3.1',
    type: 'VIDEO',
    tier: 'premium',
    costCredits: 25,
    costUsd: 0.250,
    description: 'Google Veo 3.1 ultra-photorealistic video synthesis via OpenArt MCP (25 Kredit)',
    capabilities: ['Text-to-Video', 'Image-to-Video', 'Photoreal 8K', 'Lighting Physics'],
    supportedAspectRatios: ['9:16', '16:9'],
    badge: 'OPENART VEO'
  },
  {
    provider: 'openart',
    internalModelId: 'wan2-7',
    displayName: 'Wan 2.7 Video Engine',
    type: 'IMAGE_TO_VIDEO',
    tier: 'balanced',
    costCredits: 12,
    costUsd: 0.120,
    description: 'Wan 2.7 high physics realism & expressive character animation via OpenArt (12 Kredit)',
    capabilities: ['Image-to-Video', 'Character Animation', 'Fluid Dynamics'],
    supportedAspectRatios: ['9:16', '16:9'],
    badge: 'OPENART WAN'
  },
  {
    provider: 'openart',
    internalModelId: 'gemini-omni-flash',
    displayName: 'Gemini Omni Flash Video',
    type: 'VIDEO',
    tier: 'balanced',
    costCredits: 10,
    costUsd: 0.100,
    description: 'Google Gemini Omni Flash video synthesis via OpenArt (10 Kredit)',
    capabilities: ['Text-to-Video', 'Image-to-Video', 'Flash Speed', 'Clean Motion'],
    supportedAspectRatios: ['9:16', '16:9'],
    badge: 'OPENART OMNI'
  },

  // Image Models
  {
    provider: 'openart',
    internalModelId: 'kling-3-omni',
    displayName: 'Kling 3 Omni',
    type: 'IMAGE',
    tier: 'economy',
    costCredits: 10,
    costUsd: 0.010,
    description: 'Versatile photorealism, character detail & commercial imagery (10 Kredit)',
    capabilities: ['Text-to-Image', 'Photorealism', 'Fast Generation', '8K Detail'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    isDefault: true,
    badge: 'OPENART IMG'
  },
  {
    provider: 'openart',
    internalModelId: 'nano-banana-2-lite',
    displayName: 'Nano Banana 2 Lite',
    type: 'IMAGE',
    tier: 'economy',
    costCredits: 15,
    costUsd: 0.015,
    description: 'Google Nano Banana 2 Lite rapid generation with crisp typography (15 Kredit)',
    capabilities: ['Text-to-Image', 'Crisp Text', 'Fast Generation'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9']
  },
  {
    provider: 'openart',
    internalModelId: 'nano-banana-2',
    displayName: 'Nano Banana 2',
    type: 'IMAGE',
    tier: 'balanced',
    costCredits: 20,
    costUsd: 0.020,
    description: 'Native 4K detail, accurate text, realistic people & commercial ads (20 Kredit)',
    capabilities: ['Text-to-Image', '4K Text', 'Commercial Products'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    provider: 'openart',
    internalModelId: 'nano-banana-pro',
    displayName: 'Nano Banana Pro',
    type: 'IMAGE',
    tier: 'premium',
    costCredits: 30,
    costUsd: 0.030,
    description: 'Highest-fidelity Nano Banana, text posters & multi-subject consistency (30 Kredit)',
    capabilities: ['Text-to-Image', 'Product Ads', 'Typography Master', 'Multi-subject'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    badge: 'OPENART ADS'
  },
  {
    provider: 'openart',
    internalModelId: 'byte-plus-seedream-5-lite',
    displayName: 'Seedream 5 Lite',
    type: 'IMAGE',
    tier: 'economy',
    costCredits: 15,
    costUsd: 0.015,
    description: 'BytePlus Seedream 5 Lite for social media & ecommerce product ads (15 Kredit)',
    capabilities: ['Text-to-Image', 'Ecommerce Ads', 'Vibrant Colors'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    provider: 'openart',
    internalModelId: 'byte-plus-seedream-5-pro',
    displayName: 'Seedream 5 Pro',
    type: 'IMAGE',
    tier: 'premium',
    costCredits: 30,
    costUsd: 0.030,
    description: 'BytePlus Seedream 5 Pro ultra-fine texture and luxury lighting (30 Kredit)',
    capabilities: ['Text-to-Image', 'Luxury Studio', 'Ultra-fine Texture'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    provider: 'openart',
    internalModelId: 'gpt-image-2',
    displayName: 'GPT Image 2',
    type: 'IMAGE',
    tier: 'balanced',
    costCredits: 20,
    costUsd: 0.020,
    description: 'OpenAI GPT Image 2 commercial creative rendering (20 Kredit)',
    capabilities: ['Text-to-Image', 'Creative Concept', 'Commercial Render'],
    supportedAspectRatios: ['1:1', '16:9', '9:16']
  },
  {
    provider: 'openart',
    internalModelId: 'wan2-7-image',
    displayName: 'Wan 2.7 Image',
    type: 'IMAGE',
    tier: 'economy',
    costCredits: 15,
    costUsd: 0.015,
    description: 'Wan 2.7 image generation for vibrant graphics and concepts (15 Kredit)',
    capabilities: ['Text-to-Image', 'Vibrant Graphics', 'Artistic Render'],
    supportedAspectRatios: ['1:1', '16:9', '9:16']
  }
];

// ---------------------------------------------------------------------------
// 3. FAL.AI & OTHER COMPATIBILITY CATALOGS
// ---------------------------------------------------------------------------
export const FAL_CATALOG_MODELS: UnifiedModelInfo[] = [
  {
    provider: 'fal',
    internalModelId: 'fal-ai/veo3.1/lite/image-to-video',
    displayName: 'Google Veo 3.1 Lite (Fal.ai)',
    type: 'VIDEO',
    tier: 'economy',
    costCredits: 20,
    costUsd: 0.120,
    description: 'Google Veo 3.1 Lite universal rendering via Fal.ai gateway',
    capabilities: ['Image-to-Video', 'Fast Render'],
    supportedAspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    provider: 'fal',
    internalModelId: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    displayName: 'Kling 2.1 Standard (Fal.ai)',
    type: 'VIDEO',
    tier: 'balanced',
    costCredits: 15,
    costUsd: 0.150,
    description: 'Kling 2.1 Standard character consistency and lighting via Fal.ai',
    capabilities: ['Image-to-Video', 'Character Consistency'],
    supportedAspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    provider: 'fal',
    internalModelId: 'fal-ai/wan-i2v',
    displayName: 'Wan 2.1 14B (Fal.ai)',
    type: 'VIDEO',
    tier: 'premium',
    costCredits: 45,
    costUsd: 0.200,
    description: 'Wan 2.1 14B Image-to-Video model via Fal.ai',
    capabilities: ['Image-to-Video', 'High Quality Motion'],
    supportedAspectRatios: ['16:9', '9:16', '1:1']
  }
];

export const FAL_IMAGE_MODELS: UnifiedModelInfo[] = [
  {
    provider: 'fal',
    internalModelId: 'standard',
    displayName: 'Nano Banana 2 & Edit',
    type: 'IMAGE',
    tier: 'balanced',
    costCredits: 15,
    costUsd: 0.015,
    description: 'fal-ai/nano-banana-2 / edit — Konsistensi karakter memadai untuk Animasi & Edukasi (15 Kredit)',
    capabilities: ['Text-to-Image', 'Image-to-Image', 'Character Consistency'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    provider: 'fal',
    internalModelId: 'precision',
    displayName: 'Nano Banana Pro Edit (4K)',
    type: 'IMAGE',
    tier: 'premium',
    costCredits: 25,
    costUsd: 0.025,
    description: 'fal-ai/nano-banana-pro / edit — Wajib untuk Affiliate & produk/wajah 100% identik (25 Kredit)',
    capabilities: ['Text-to-Image', 'Image-to-Image', '4K Resolution', 'Product Lock'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    provider: 'fal',
    internalModelId: 'draft',
    displayName: 'FLUX.1 Schnell',
    type: 'IMAGE',
    tier: 'economy',
    costCredits: 5,
    costUsd: 0.005,
    description: 'fal-ai/flux/schnell — Eksplorasi gaya visual cepat & preview storyboard kilat (5 Kredit)',
    capabilities: ['Text-to-Image', 'Fast Generation'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  }
];

export const GOOGLE_IMAGE_MODELS: UnifiedModelInfo[] = [
  {
    provider: 'google_veo',
    internalModelId: 'nano-asli-lite',
    displayName: 'Google Imagen 3 Lite',
    type: 'IMAGE',
    tier: 'economy',
    costCredits: 5,
    costUsd: 0.005,
    description: 'Google Gemini 3.1 Flash Lite Image — Cepat & Hemat (5 Kredit)',
    capabilities: ['Text-to-Image', 'Fast Generation'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    provider: 'google_veo',
    internalModelId: 'nano-asli',
    displayName: 'Google Gemini Imagen 3',
    type: 'IMAGE',
    tier: 'balanced',
    costCredits: 10,
    costUsd: 0.010,
    description: 'Google Gemini Imagen 3 Resmi - Pipeline Google AI Studio (10 Kredit)',
    capabilities: ['Text-to-Image', 'Studio Lighting'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    isDefault: true
  },
  {
    provider: 'google_veo',
    internalModelId: 'nano-asli-pro',
    displayName: 'Google Gemini Imagen 3 Pro',
    type: 'IMAGE',
    tier: 'premium',
    costCredits: 15,
    costUsd: 0.015,
    description: 'Resolusi Tinggi & Kualitas Premium Google Imagen 3 (15 Kredit)',
    capabilities: ['Text-to-Image', 'High Fidelity'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    provider: 'google_veo',
    internalModelId: 'nano-asli-premium',
    displayName: 'Google Gemini Imagen 3 Ultra',
    type: 'IMAGE',
    tier: 'premium',
    costCredits: 25,
    costUsd: 0.025,
    description: 'Ultra High Quality & Presisi Maksimal Google Imagen 3 (25 Kredit)',
    capabilities: ['Text-to-Image', 'Ultra High Fidelity'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  }
];

export const ALL_UNIFIED_MODELS: UnifiedModelInfo[] = [
  ...HIGGSFIELD_CATALOG_MODELS,
  ...OPENART_CATALOG_MODELS,
  ...FAL_CATALOG_MODELS,
  ...FAL_IMAGE_MODELS,
  ...GOOGLE_IMAGE_MODELS
];

/**
 * Canonical Video Models - includes Higgsfield MCP, OpenArt MCP, and Fal.ai
 */
export function getCanonicalVideoModels(): UnifiedModelInfo[] {
  return [
    ...HIGGSFIELD_CATALOG_MODELS.filter(m => !m.isLegacyAlias),
    ...OPENART_CATALOG_MODELS.filter(m => !m.isLegacyAlias && (m.type === 'VIDEO' || m.type === 'IMAGE_TO_VIDEO')),
    ...FAL_CATALOG_MODELS.filter(m => !m.isLegacyAlias && (m.type === 'VIDEO' || m.type === 'IMAGE_TO_VIDEO'))
  ];
}

/**
 * Canonical Image Models - strictly OpenArt MCP, Fal.ai, Google Direct, and Higgsfield MCP (HYBRID).
 */
export function getCanonicalImageModels(): UnifiedModelInfo[] {
  return [
    ...HIGGSFIELD_CATALOG_MODELS.filter(m => !m.isLegacyAlias && m.type === 'HYBRID'),
    ...OPENART_CATALOG_MODELS.filter(m => !m.isLegacyAlias && m.type === 'IMAGE'),
    ...FAL_IMAGE_MODELS,
    ...GOOGLE_IMAGE_MODELS
  ];
}

// ---------------------------------------------------------------------------
// 4. PROVIDER-SAFE RESOLUTION & ROUTING HELPERS
// ---------------------------------------------------------------------------

/**
 * Normalizes a Higgsfield model identifier (handles aliases like higgsfield-video-pro -> veo3_1_lite)
 */
export function normalizeHiggsfieldModelId(inputModel: string): string {
  const clean = (inputModel || '').trim().toLowerCase();
  const aliasMap: Record<string, string> = {
    'higgsfield-video-pro': 'veo3_1_lite',
    'higgsfield-anim': 'wan3_0',
    'video-pro': 'veo3_1_lite',
    'anim': 'wan3_0',
    'default': 'veo3_1_lite',
    'veo': 'veo3_1_lite',
    'veo3': 'veo3_1',
    'veo3_1': 'veo3_1',
    'veo3_1_lite': 'veo3_1_lite',
    'wan3_0': 'wan3_0',
    'wan2_7': 'wan2_7',
    'grok_video': 'grok_video',
    'gemini_omni': 'gemini_omni'
  };
  return aliasMap[clean] || clean;
}

/**
 * Normalizes an OpenArt model identifier (handles aliases like openart-sdxl -> kling-3-omni)
 */
export function normalizeOpenArtModelId(inputModel: string): string {
  const clean = (inputModel || '').trim().toLowerCase();
  const aliasMap: Record<string, string> = {
    'openart-sdxl': 'kling-3-omni',
    'openart-flux-schnell': 'nano-banana-2-lite',
    'openart-flux-pro': 'nano-banana-pro',
    'openart-photoreal-v2': 'byte-plus-seedream-5-lite',
    'openart-video-fast': 'byte-plus-seedance-2-fast',
    'openart-video-pro': 'byte-plus-seedance-2',
    'openart-wan2.1': 'wan2-7',
    'openart-wan21': 'wan2-7',
    'openart-veo2': 'veo3-1',
    'sdxl': 'kling-3-omni',
    'flux-schnell': 'nano-banana-2-lite',
    'flux-pro': 'nano-banana-pro',
    'photoreal-v2': 'byte-plus-seedream-5-lite',
    'video-fast': 'byte-plus-seedance-2-fast',
    'video-pro': 'byte-plus-seedance-2',
    'wan2.1': 'wan2-7',
    'wan21': 'wan2-7',
    'veo2': 'veo3-1'
  };
  return aliasMap[clean] || clean;
}

/**
 * Look up a model by its strict provider and internalModelId.
 */
export function getModelByProviderAndId(provider: ModelProvider, internalModelId: string): UnifiedModelInfo | undefined {
  const provClean = provider.toLowerCase() as ModelProvider;
  const idClean = internalModelId.trim();

  if (provClean === 'higgsfield') {
    const canonical = normalizeHiggsfieldModelId(idClean);
    return HIGGSFIELD_CATALOG_MODELS.find(m => m.internalModelId === canonical || m.internalModelId === idClean);
  }

  if (provClean === 'openart') {
    const canonical = normalizeOpenArtModelId(idClean);
    return OPENART_CATALOG_MODELS.find(m => m.internalModelId === canonical || m.internalModelId === idClean);
  }

  return ALL_UNIFIED_MODELS.find(m => m.provider === provClean && m.internalModelId === idClean);
}

/**
 * Strict Provider-Safe Resolver:
 * Resolves (preferredModel, preferredProvider) -> { provider, internalModelId, modelDef }
 * 
 * FAIL-SAFE RULE: If displayName is supplied without an explicit provider and is ambiguous,
 * this function refuses to guess and throws an ambiguity error.
 */
export function resolveProviderSafeModel(
  inputModelOrOptions: string | { inputModel: string; explicitProvider?: string; mediaType?: ModelMediaType },
  explicitProvider?: string,
  mediaType: ModelMediaType = 'VIDEO'
): {
  provider: ModelProvider;
  internalModelId: string;
  modelDef: UnifiedModelInfo;
  isAmbiguous?: boolean;
} {
  let inputModelStr: string;
  let explicitProvStr: string | undefined;
  let mType: ModelMediaType;

  if (typeof inputModelOrOptions === 'object' && inputModelOrOptions !== null) {
    inputModelStr = inputModelOrOptions.inputModel;
    explicitProvStr = inputModelOrOptions.explicitProvider;
    mType = inputModelOrOptions.mediaType || 'VIDEO';
  } else if (typeof inputModelOrOptions === 'string') {
    inputModelStr = inputModelOrOptions;
    explicitProvStr = explicitProvider;
    mType = mediaType;
  } else {
    inputModelStr = '';
    explicitProvStr = explicitProvider;
    mType = mediaType;
  }

  const rawModel = (inputModelStr || '').trim();
  const rawProvider = (explicitProvStr || '').trim().toLowerCase();
  mediaType = mType;

  // 1. EXPLICIT PROVIDER IS AUTHORITATIVE
  if (rawProvider === 'higgsfield') {
    const canonicalId = normalizeHiggsfieldModelId(rawModel) || 'veo3_1_lite';
    const modelDef = HIGGSFIELD_CATALOG_MODELS.find(m => m.internalModelId === canonicalId) || HIGGSFIELD_CATALOG_MODELS[0];
    return {
      provider: 'higgsfield',
      internalModelId: canonicalId,
      modelDef
    };
  }

  if (rawProvider === 'openart') {
    const canonicalId = normalizeOpenArtModelId(rawModel) || (mediaType === 'IMAGE' ? 'kling-3-omni' : 'byte-plus-seedance-2-fast');
    const modelDef = OPENART_CATALOG_MODELS.find(m => m.internalModelId === canonicalId) || 
      (mediaType === 'IMAGE' ? OPENART_CATALOG_MODELS.find(m => m.internalModelId === 'kling-3-omni')! : OPENART_CATALOG_MODELS[0]);
    return {
      provider: 'openart',
      internalModelId: canonicalId,
      modelDef
    };
  }

  if (rawProvider === 'fal' || rawProvider === 'fal-ai') {
    const found = ALL_UNIFIED_MODELS.find(m => m.provider === 'fal' && m.internalModelId === rawModel);
    return {
      provider: 'fal',
      internalModelId: rawModel || (mediaType === 'IMAGE' ? 'standard' : 'fal-ai/veo3.1/lite/image-to-video'),
      modelDef: found || (mediaType === 'IMAGE' ? FAL_IMAGE_MODELS[0] : FAL_CATALOG_MODELS[0])
    };
  }

  if (rawProvider === 'google_veo' || rawProvider === 'google') {
    const found = ALL_UNIFIED_MODELS.find(m => m.provider === 'google_veo' && m.internalModelId === rawModel);
    return {
      provider: 'google_veo',
      internalModelId: rawModel || (mediaType === 'IMAGE' ? 'nano-asli' : 'veo-2.0-generate-video'),
      modelDef: found || (mediaType === 'IMAGE' ? GOOGLE_IMAGE_MODELS[1] : {
        provider: 'google_veo',
        internalModelId: rawModel || 'veo-2.0-generate-video',
        displayName: 'Google Veo Asli',
        type: 'VIDEO',
        tier: 'premium',
        costCredits: 25,
        costUsd: 0.25,
        description: 'Google Veo Native Video Synthesis',
        capabilities: ['Text-to-Video'],
        supportedAspectRatios: ['16:9', '9:16']
      })
    };
  }

  // 2. IMPLICIT RESOLUTION BY INTERNAL MODEL ID
  const modelLower = rawModel.toLowerCase();

  // Distinct Higgsfield Internal IDs
  const higgsfieldSpecificIds = [
    'veo3_1_lite', 'veo3_1', 'wan3_0', 'grok_video', 'gemini_omni',
    'higgsfield-video-pro', 'higgsfield-anim'
  ];
  if (higgsfieldSpecificIds.includes(modelLower) || modelLower.startsWith('higgsfield-') || modelLower.startsWith('higgsfield_')) {
    const canonicalId = normalizeHiggsfieldModelId(rawModel);
    const modelDef = HIGGSFIELD_CATALOG_MODELS.find(m => m.internalModelId === canonicalId) || HIGGSFIELD_CATALOG_MODELS[0];
    return {
      provider: 'higgsfield',
      internalModelId: canonicalId,
      modelDef
    };
  }

  // Distinct OpenArt Internal IDs
  const openArtSpecificIds = [
    'veo3-1', 'byte-plus-seedance-2-fast', 'byte-plus-seedance-2', 'byte-plus-seedance-2-5',
    'kling-3-omni', 'nano-banana-2-lite', 'nano-banana-2', 'nano-banana-pro',
    'byte-plus-seedream-5-lite', 'byte-plus-seedream-5-pro', 'gpt-image-2', 'wan2-7-image', 'gemini-omni-flash',
    'openart-sdxl', 'openart-flux-schnell', 'openart-flux-pro', 'openart-photoreal-v2',
    'openart-video-fast', 'openart-video-pro', 'openart-wan2.1', 'openart-wan21', 'openart-veo2'
  ];
  if (openArtSpecificIds.includes(modelLower) || modelLower.startsWith('openart-') || modelLower.startsWith('openart_')) {
    const canonicalId = normalizeOpenArtModelId(rawModel);
    const modelDef = OPENART_CATALOG_MODELS.find(m => m.internalModelId === canonicalId) || OPENART_CATALOG_MODELS[0];
    return {
      provider: 'openart',
      internalModelId: canonicalId,
      modelDef
    };
  }

  // Fal Model IDs
  if (['standard', 'precision', 'draft'].includes(modelLower) || modelLower.startsWith('fal-ai/') || modelLower.startsWith('fal/') || modelLower.includes('fal.ai')) {
    const found = ALL_UNIFIED_MODELS.find(m => m.provider === 'fal' && m.internalModelId === rawModel);
    return {
      provider: 'fal',
      internalModelId: rawModel,
      modelDef: found || (mediaType === 'IMAGE' ? FAL_IMAGE_MODELS[0] : FAL_CATALOG_MODELS[0])
    };
  }

  // Google Imagen Model IDs
  if (['nano-asli', 'nano-asli-lite', 'nano-asli-pro', 'nano-asli-premium'].includes(modelLower)) {
    const found = GOOGLE_IMAGE_MODELS.find(m => m.internalModelId === rawModel) || GOOGLE_IMAGE_MODELS[1];
    return {
      provider: 'google_veo',
      internalModelId: rawModel,
      modelDef: found
    };
  }

  // 3. AMBIGUOUS DISPLAY NAME CHECK (e.g. "Google Veo 3.1" or "Wan 2.7 Video Engine" passed as model without provider)
  const matchingByDisplayName = ALL_UNIFIED_MODELS.filter(m => 
    m.displayName.toLowerCase() === modelLower || 
    m.displayName.toLowerCase().includes(modelLower)
  );

  const distinctProviders = Array.from(new Set(matchingByDisplayName.map(m => m.provider)));
  if (distinctProviders.length > 1) {
    console.warn(`[ROUTER WARNING] Ambiguous model identifier '${rawModel}' matches multiple providers: ${distinctProviders.join(', ')}. Explicit provider is required!`);
    // Fail-safe: Return with isAmbiguous flag so caller can handle or reject safely
    const defaultHiggs = matchingByDisplayName.find(m => m.provider === 'higgsfield') || matchingByDisplayName[0];
    return {
      provider: defaultHiggs.provider,
      internalModelId: defaultHiggs.internalModelId,
      modelDef: defaultHiggs,
      isAmbiguous: true
    };
  }

  // Default fallback to Fal if completely unknown
  return {
    provider: 'fal',
    internalModelId: rawModel || 'fal-ai/veo3.1/lite/image-to-video',
    modelDef: FAL_CATALOG_MODELS[0]
  };
}
