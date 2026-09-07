import { VideoGenerationProvider } from './VideoProvider';
import { FalVideoAdapter } from './FalVideoAdapter';
import { GoogleVeoAdapter } from './GoogleVeoAdapter';
import { BytePlusAdapter } from './BytePlusAdapter';
import { MockVideoProvider } from './MockVideoProvider';
import { OpenArtMCPAdapter } from './OpenArtMCPAdapter';
import { FounderService } from '../fcc/FounderService';

export interface ProviderRegistration {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'HYBRID';
  tier: 'economy' | 'balanced' | 'premium';
  adapter: VideoGenerationProvider | any;
  supportsImageGen: boolean;
  supportsVideoGen: boolean;
  supportsImageToVideo: boolean;
  defaultImageModel?: string;
  defaultVideoModel?: string;
  baseCostUsd: number;
}

export class MediaProviderRegistry {
  private static providers: Map<string, ProviderRegistration> = new Map();
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. OpenArt MCP
    const openArtAdapter = new OpenArtMCPAdapter();
    this.register({
      id: 'openart',
      name: 'OpenArt MCP Media Provider',
      type: 'HYBRID',
      tier: 'balanced',
      adapter: openArtAdapter,
      supportsImageGen: true,
      supportsVideoGen: true,
      supportsImageToVideo: true,
      defaultImageModel: 'openart-sdxl',
      defaultVideoModel: 'openart-video-pro',
      baseCostUsd: 0.015
    });

    // 2. Fal.ai Universal
    const falAdapter = new FalVideoAdapter();
    this.register({
      id: 'fal',
      name: 'Fal.ai Universal Media Engine',
      type: 'HYBRID',
      tier: 'balanced',
      adapter: falAdapter,
      supportsImageGen: true,
      supportsVideoGen: true,
      supportsImageToVideo: true,
      defaultImageModel: 'fal-ai/flux/schnell',
      defaultVideoModel: 'fal-ai/veo3.1/lite/image-to-video',
      baseCostUsd: 0.05
    });

    // 3. Google Veo & Imagen (Asli)
    const veoAdapter = new GoogleVeoAdapter();
    this.register({
      id: 'google_veo',
      name: 'Google Veo / Imagen 3',
      type: 'HYBRID',
      tier: 'premium',
      adapter: veoAdapter,
      supportsImageGen: true,
      supportsVideoGen: true,
      supportsImageToVideo: true,
      defaultImageModel: 'gemini-3.1-flash-image',
      defaultVideoModel: 'veo-2.0-generate-video',
      baseCostUsd: 0.15
    });

    // 4. BytePlus ModelArk
    const bytePlusAdapter = new BytePlusAdapter();
    this.register({
      id: 'byteplus',
      name: 'BytePlus ModelArk (Seedance/Doubao)',
      type: 'VIDEO',
      tier: 'balanced',
      adapter: bytePlusAdapter,
      supportsImageGen: false,
      supportsVideoGen: true,
      supportsImageToVideo: true,
      defaultVideoModel: 'dreamina-seedance-2-0-mini-260615',
      baseCostUsd: 0.08
    });

    // 5. Mock Provider (for offline development/tests)
    const mockAdapter = new MockVideoProvider();
    this.register({
      id: 'mock',
      name: 'Mock Neural Simulator',
      type: 'HYBRID',
      tier: 'economy',
      adapter: mockAdapter,
      supportsImageGen: true,
      supportsVideoGen: true,
      supportsImageToVideo: true,
      defaultImageModel: 'mock-img-v1',
      defaultVideoModel: 'mock-vid-v1',
      baseCostUsd: 0.00
    });
  }

  static register(reg: ProviderRegistration) {
    this.providers.set(reg.id.toLowerCase(), reg);
  }

  static get(providerId: string): ProviderRegistration | undefined {
    this.initialize();
    return this.providers.get(providerId.toLowerCase());
  }

  static getAll(): ProviderRegistration[] {
    this.initialize();
    return Array.from(this.providers.values());
  }

  static getAvailableVideoProviders(): ProviderRegistration[] {
    this.initialize();
    return Array.from(this.providers.values()).filter(p => p.supportsVideoGen || p.supportsImageToVideo);
  }

  static getAvailableImageProviders(): ProviderRegistration[] {
    this.initialize();
    return Array.from(this.providers.values()).filter(p => p.supportsImageGen);
  }
}
