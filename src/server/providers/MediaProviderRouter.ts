import { Scene, ProductionProject, ProviderStatus } from '../../shared/types';
import { VideoGenerationProvider } from './VideoProvider';
import { MediaProviderRegistry, ProviderRegistration } from './mediaProviderRegistry';
import { OpenArtMCPAdapter, OPENART_DEFAULT_MODELS } from './OpenArtMCPAdapter';
import { FalVideoAdapter } from './FalVideoAdapter';
import { GoogleVeoAdapter } from './GoogleVeoAdapter';
import { BytePlusAdapter } from './BytePlusAdapter';
import { CostTrackingService } from '../../../server/services/costTrackingService';
import { FounderService } from '../fcc/FounderService';

export type GenerationMode = 'ECONOMY' | 'BALANCED' | 'PREMIUM' | 'AUTO';

export interface RouteResolution {
  providerId: string;
  providerName: string;
  model: string;
  tier: 'economy' | 'balanced' | 'premium';
  estimatedCostUsd: number;
  reason: string;
  fallbackChain: string[];
  allowFallback?: boolean;
}

export interface VideoRouteOptions {
  project?: ProductionProject;
  scene: Scene;
  sceneIdx: number;
  mode?: GenerationMode;
  preferredModel?: string;
  preferredProvider?: string;
  onProgress?: (msg: string) => void;
  onLog?: (agent: string, message: string, level?: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS') => void;
}

export interface ImageRouteOptions {
  prompt: string;
  project?: ProductionProject;
  sceneId?: string | number;
  mode?: GenerationMode;
  preferredEngine?: string;
  resolution?: string;
  aspectRatio?: string;
  referenceImages?: string[];
  userId?: string;
  studio?: string;
}

export class MediaProviderRouter {
  /**
   * Determine optimal provider & model based on operation, mode, user preferences and system availability
   */
  static resolveRoute(operation: 'IMAGE' | 'VIDEO', options: {
    mode?: GenerationMode;
    preferredModelOrEngine?: string;
    preferredProvider?: string;
    studio?: string;
    resolution?: string;
  }): RouteResolution {
    const mode = options.mode || 'AUTO';
    const preferredModel = (options.preferredModelOrEngine || '').trim();
    const preferredModelLower = preferredModel.toLowerCase();
    const preferredProvider = (options.preferredProvider || '').trim().toLowerCase();

    // -------------------------------------------------------------
    // EXACT MODEL/PROVIDER CONTEXT RESOLUTION (No heuristics first!)
    // -------------------------------------------------------------
    
    // Check if the requested model is an EXACT known OpenArt Model ID or Alias
    const knownOpenArtModels = [
      'veo3-1', 'wan2-7', 'byte-plus-seedance-2', 'byte-plus-seedance-2-fast', 'byte-plus-seedance-2-5',
      'kling-3-omni', 'nano-banana-2-lite', 'nano-banana-2', 'nano-banana-pro',
      'byte-plus-seedream-5-lite', 'byte-plus-seedream-5-pro', 'gpt-image-2', 'wan2-7-image', 'gemini-omni-flash',
      'openart-sdxl', 'openart-flux-schnell', 'openart-flux-pro', 'openart-photoreal-v2',
      'openart-video-fast', 'openart-video-pro', 'openart-wan2.1', 'openart-wan21', 'openart-veo2'
    ];

    const isExplicitOpenArt = 
      preferredProvider === 'openart' ||
      knownOpenArtModels.includes(preferredModelLower) ||
      preferredModelLower.startsWith('openart-') ||
      preferredModelLower.includes('openart');

    if (isExplicitOpenArt) {
      const isImg = operation === 'IMAGE';
      const resolvedModel = preferredModel || (isImg ? 'kling-3-omni' : 'byte-plus-seedance-2-fast');
      return {
        providerId: 'openart',
        providerName: 'OpenArt MCP Media Provider',
        model: resolvedModel,
        tier: 'balanced',
        estimatedCostUsd: isImg ? 0.010 : 0.050,
        reason: 'Explicitly configured OpenArt MCP Provider (Exact Match)',
        fallbackChain: [],
        allowFallback: false
      };
    }

    // Check if the requested model is Google Veo (direct)
    const knownGoogleModels = [
      'google-veo-2.0', 'google-veo', 'veo-2.0-generate-video', 'gemini-3.1-flash-image', 'veo-asli', 'google'
    ];
    const isExplicitGoogle = 
      preferredProvider === 'google' || 
      preferredProvider === 'google_veo' ||
      knownGoogleModels.includes(preferredModelLower);

    if (isExplicitGoogle) {
      const isImg = operation === 'IMAGE';
      const resolvedModel = preferredModel || (isImg ? 'gemini-3.1-flash-image' : 'veo-2.0-generate-video');
      return {
        providerId: 'google_veo',
        providerName: 'Google Veo / Imagen 3',
        model: resolvedModel,
        tier: 'premium',
        estimatedCostUsd: isImg ? 0.03 : 0.20,
        reason: 'Selected Google Cinematic Veo / Imagen engine (Exact Match)',
        fallbackChain: [],
        allowFallback: false
      };
    }

    // Check if the requested model/provider is Fal AI
    const knownFalModels = [
      'fal-ai/veo3.1/lite/image-to-video', 'fal-ai/flux/schnell'
    ];
    const isExplicitFal = 
      preferredProvider === 'fal' || 
      preferredProvider === 'fal-ai' ||
      knownFalModels.includes(preferredModelLower) ||
      preferredModelLower.startsWith('fal') ||
      preferredModelLower.includes('fal-ai') ||
      preferredModelLower.includes('fal.run') ||
      preferredModelLower.includes('fal.ai');

    if (isExplicitFal) {
      const isImg = operation === 'IMAGE';
      const resolvedModel = preferredModel || (isImg ? 'fal-ai/flux/schnell' : 'fal-ai/veo3.1/lite/image-to-video');
      return {
        providerId: 'fal',
        providerName: 'Fal.ai Universal Media Engine',
        model: resolvedModel,
        tier: 'balanced',
        estimatedCostUsd: isImg ? 0.01 : 0.12,
        reason: 'Selected Fal.ai universal media pipeline (Exact Match)',
        fallbackChain: [],
        allowFallback: false
      };
    }

    // Check if the requested model/provider is BytePlus
    const knownBytePlusModels = [
      'dreamina-seedance-2-0-mini-260615'
    ];
    const isExplicitBytePlus = 
      preferredProvider === 'byteplus' ||
      knownBytePlusModels.includes(preferredModelLower) ||
      preferredModelLower.includes('byteplus') ||
      preferredModelLower.includes('pixeldance') ||
      preferredModelLower.includes('doubao');

    if (isExplicitBytePlus) {
      return {
        providerId: 'byteplus',
        providerName: 'BytePlus ModelArk',
        model: preferredModel || 'dreamina-seedance-2-0-mini-260615',
        tier: 'balanced',
        estimatedCostUsd: 0.08,
        reason: 'Selected BytePlus ModelArk seedance engine (Exact Match)',
        fallbackChain: [],
        allowFallback: false
      };
    }

    // -------------------------------------------------------------
    // HEURISTIC RESOLUTION / FALLBACK ROUTING (Only for non-explicit requests)
    // -------------------------------------------------------------
    const preferred = preferredModelLower;
    
    // Explicit provider / engine routing
    if (
      preferred.includes('openart') || 
      preferred.includes('kling-3') || 
      preferred.includes('banana') || 
      preferred.includes('seedream') ||
      preferred.includes('gpt-image')
    ) {
      const isImg = operation === 'IMAGE';
      return {
        providerId: 'openart',
        providerName: 'OpenArt MCP Media Provider',
        model: preferred || (isImg ? 'kling-3-omni' : 'byte-plus-seedance-2-fast'),
        tier: 'balanced',
        estimatedCostUsd: isImg ? 0.010 : 0.050,
        reason: 'Explicitly configured OpenArt MCP Provider',
        fallbackChain: ['fal', 'google_veo'],
        allowFallback: false
      };
    }

    if (preferred.includes('veo') || preferred.includes('google')) {
      const isImg = operation === 'IMAGE';
      return {
        providerId: 'google_veo',
        providerName: 'Google Veo / Imagen 3',
        model: isImg ? 'gemini-3.1-flash-image' : 'veo-2.0-generate-video',
        tier: 'premium',
        estimatedCostUsd: isImg ? 0.03 : 0.20,
        reason: 'Selected Google Cinematic Veo / Imagen engine',
        fallbackChain: ['fal', 'openart'],
        allowFallback: false
      };
    }

    if (preferred.includes('byteplus') || preferred.includes('seedance') || preferred.includes('doubao')) {
      return {
        providerId: 'byteplus',
        providerName: 'BytePlus ModelArk',
        model: 'dreamina-seedance-2-0-mini-260615',
        tier: 'balanced',
        estimatedCostUsd: 0.08,
        reason: 'Selected BytePlus ModelArk seedance engine',
        fallbackChain: ['fal', 'openart', 'google_veo'],
        allowFallback: false
      };
    }

    if (preferred.includes('fal') || preferred.includes('flux') || preferred.includes('kling') || preferred.includes('wan')) {
      const isImg = operation === 'IMAGE';
      return {
        providerId: 'fal',
        providerName: 'Fal.ai Universal Media Engine',
        model: preferred || (isImg ? 'fal-ai/flux/schnell' : 'fal-ai/veo3.1/lite/image-to-video'),
        tier: 'balanced',
        estimatedCostUsd: isImg ? 0.01 : 0.12,
        reason: 'Selected Fal.ai universal media pipeline',
        fallbackChain: ['openart', 'google_veo'],
        allowFallback: false
      };
    }

    // Dynamic mode-based routing
    if (mode === 'ECONOMY') {
      if (operation === 'IMAGE') {
        return {
          providerId: 'openart',
          providerName: 'OpenArt MCP Media Provider',
          model: 'openart-flux-schnell',
          tier: 'economy',
          estimatedCostUsd: 0.005,
          reason: 'Economy Mode: Ultra fast, lowest-cost generation via OpenArt MCP',
          fallbackChain: ['fal', 'google_veo']
        };
      } else {
        return {
          providerId: 'openart',
          providerName: 'OpenArt MCP Media Provider',
          model: 'openart-video-fast',
          tier: 'economy',
          estimatedCostUsd: 0.06,
          reason: 'Economy Mode: Fast social media video motion via OpenArt MCP',
          fallbackChain: ['fal', 'byteplus']
        };
      }
    }

    if (mode === 'PREMIUM') {
      if (operation === 'IMAGE') {
        return {
          providerId: 'openart',
          providerName: 'OpenArt MCP Media Provider',
          model: 'openart-flux-pro',
          tier: 'premium',
          estimatedCostUsd: 0.04,
          reason: 'Premium Mode: Ultra detail & dynamic lighting via OpenArt Flux 1.1 Pro',
          fallbackChain: ['google_veo', 'fal']
        };
      } else {
        return {
          providerId: 'google_veo',
          providerName: 'Google Veo Asli',
          model: 'veo-2.0-generate-video',
          tier: 'premium',
          estimatedCostUsd: 0.25,
          reason: 'Premium Mode: Hollywood-grade cinematic video via Google Veo',
          fallbackChain: ['openart', 'fal']
        };
      }
    }

    // Default: BALANCED Mode
    if (operation === 'IMAGE') {
      return {
        providerId: 'openart',
        providerName: 'OpenArt MCP Media Provider',
        model: 'openart-sdxl',
        tier: 'balanced',
        estimatedCostUsd: 0.015,
        reason: 'Balanced Mode: Commercial grade photorealism via OpenArt MCP',
        fallbackChain: ['fal', 'google_veo']
      };
    } else {
      return {
        providerId: 'fal',
        providerName: 'Fal.ai Universal Engine',
        model: 'fal-ai/veo3.1/lite/image-to-video',
        tier: 'balanced',
        estimatedCostUsd: 0.12,
        reason: 'Balanced Mode: Verified multi-model video rendering via Fal.ai',
        fallbackChain: ['openart', 'byteplus', 'google_veo']
      };
    }
  }

  /**
   * Render Scene Video with intelligent multi-provider fallback and cost awareness
   */
  static async renderSceneVideoWithRouter(options: VideoRouteOptions): Promise<string> {
    const { project, scene, sceneIdx, onProgress, onLog } = options;
    const context = (project?.brief || '') + ' TYPE:' + (project?.videoType || '');

    // Check scene explicit preference or project model
    const scenePreferred = (scene as any)?.videoModel || (scene as any)?.metadata?.model;
    const scenePreferredProvider = (scene as any)?.videoProvider || (scene as any)?.metadata?.provider || options.preferredProvider;
    const projectPreferred = project?.videoModel || FounderService.getPrimaryVideoEngine() || 'fal';
    const projectPreferredProvider = (project as any)?.videoProvider || options.preferredProvider;

    const effectivePreferred = scenePreferred || projectPreferred;
    const effectivePreferredProvider = scenePreferredProvider || projectPreferredProvider;

    const route = this.resolveRoute('VIDEO', {
      mode: options.mode,
      preferredModelOrEngine: effectivePreferred,
      preferredProvider: effectivePreferredProvider,
      studio: project?.videoType
    });

    onLog?.('GATOTKACA', `Media Provider Router: Routing Scene ${sceneIdx + 1} to [${route.providerName}] (${route.model})...`, 'INFO');

    // Build execution candidates in priority order: Primary -> Fallbacks (only if allowed)
    const candidateProviderIds = route.allowFallback !== false
      ? [route.providerId, ...route.fallbackChain.filter(id => id !== route.providerId)]
      : [route.providerId];

    let lastError: any = null;

    for (let i = 0; i < candidateProviderIds.length; i++) {
      const providerId = candidateProviderIds[i];
      const isPrimary = i === 0;

      try {
        let provider: VideoGenerationProvider | null = null;

        if (providerId === 'openart') {
          provider = new OpenArtMCPAdapter();
        } else if (providerId === 'fal') {
          provider = new FalVideoAdapter();
        } else if (providerId === 'google_veo' || providerId === 'veo') {
          provider = new GoogleVeoAdapter();
        } else if (providerId === 'byteplus') {
          provider = new BytePlusAdapter();
        }

        if (!provider) continue;

        if (!isPrimary) {
          onLog?.('GATOTKACA', `Failover: Mencoba provider cadangan [${provider.name}] untuk adegan ${sceneIdx + 1}...`, 'WARN');
          onProgress?.(`Failover ke ${provider.name}...`);
        }

        console.log(`[Media Provider Router] Scene ${sceneIdx + 1}: Attempting ${provider.name}...`);
        const resultUrl = await provider.generateScene(scene, context, onProgress);

        if (resultUrl) {
          onLog?.('GATOTKACA', `Berhasil render adegan ${sceneIdx + 1} via [${provider.name}]`, 'SUCCESS');
          return resultUrl;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Media Provider Router] Scene ${sceneIdx + 1} provider [${providerId}] failed:`, err?.message || err);
        onLog?.('GATOTKACA', `Provider [${providerId}] mengalami kendala: ${err?.message || err}`, 'WARN');
      }
    }

    const failMsg = `Gagal me-render video adegan ${sceneIdx + 1} pada semua provider. Terakhir: ${lastError?.message || 'Unknown error'}`;
    onLog?.('GATOTKACA', failMsg, 'ERROR');
    throw new Error(failMsg);
  }

  /**
   * Astra Creative Director: Recommend provider & model for project storyboard
   */
  static getAstraRecommendation(project: ProductionProject): {
    recommendedProvider: string;
    recommendedModel: string;
    mode: GenerationMode;
    estimatedTotalCostUsd: number;
    reason: string;
  } {
    const videoType = project.videoType || 'AFFILIATE';
    const sceneCount = project.storyboard?.scenes?.length || 4;

    if (videoType === 'AFFILIATE') {
      return {
        recommendedProvider: 'openart',
        recommendedModel: 'openart-video-pro',
        mode: 'BALANCED',
        estimatedTotalCostUsd: Number((0.015 * sceneCount + 0.14 * sceneCount).toFixed(3)),
        reason: 'Studio Affiliate: OpenArt MCP memberikan tekstur produk komersial yang tajam dan gerak dinamis viral dengan rasio biaya optimal.'
      };
    } else if (videoType === 'ANIMATION' || (videoType as string) === 'ANIMASI') {
      return {
        recommendedProvider: 'fal',
        recommendedModel: 'fal-ai/veo3.1/lite/image-to-video',
        mode: 'BALANCED',
        estimatedTotalCostUsd: Number((0.02 * sceneCount + 0.12 * sceneCount).toFixed(3)),
        reason: 'Studio Animasi: Universal Fal.ai engine menjamin konsistensi karakter kartun/anime dan rendering fisika adegan 2D/3D.'
      };
    } else {
      return {
        recommendedProvider: 'google_veo',
        recommendedModel: 'veo-2.0-generate-video',
        mode: 'PREMIUM',
        estimatedTotalCostUsd: Number((0.03 * sceneCount + 0.20 * sceneCount).toFixed(3)),
        reason: 'Studio Edukasi: Google Veo memberikan kejelasan diagram visual tinggi, kestabilan teks grafis, dan estetika sinematik profesional.'
      };
    }
  }
}
