import { FalVideoAdapter } from "./FalVideoAdapter";
import { BytePlusAdapter } from "./BytePlusAdapter";
import { GoogleVeoAdapter } from "./GoogleVeoAdapter";
import { MockVideoProvider } from "./MockVideoProvider";
import { OpenArtMCPAdapter } from "./OpenArtMCPAdapter";
import { VideoGenerationProvider } from "./VideoProvider";
import { FAL_MODELS } from "../../../server/falModelConfig";
import { MediaProviderRouter } from "./MediaProviderRouter";
import { MediaProviderRegistry } from "./mediaProviderRegistry";

let activeProviderType: string = process.env.VIDEO_PROVIDER || 'fal';

export function setActiveVideoProvider(type: string) {
  activeProviderType = type.toLowerCase();
}

export function getAvailableVideoProviders() {
  return FAL_MODELS.map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    tier: m.tier,
    costUsd: m.costUsd
  }));
}

export function getVideoProvider(preferredType?: string): VideoGenerationProvider {
  const providerType = (preferredType || activeProviderType || process.env.VIDEO_PROVIDER || 'fal').toLowerCase();
  
  // 1. OpenArt MCP
  if (
    providerType === 'openart' || 
    providerType.startsWith('openart-') || 
    providerType.includes('openart') ||
    providerType === 'veo3-1' ||
    providerType === 'byte-plus-seedance-2-fast' ||
    providerType === 'wan2-7' ||
    providerType === 'kling-3-omni' ||
    providerType === 'nano-banana-pro' ||
    providerType === 'byte-plus-seedream-5-pro' ||
    providerType === 'gpt-image-2'
  ) {
    return new OpenArtMCPAdapter();
  }

  // 2. Fal.ai Hosted models (including Fal-hosted Veo, Seedance, Wan, Kling, Luma, Minimax, Hunyuan)
  if (
    providerType.startsWith('fal') || 
    providerType.includes('fal-ai') || 
    providerType.includes('fal.run') || 
    providerType.includes('fal.ai')
  ) {
    return new FalVideoAdapter();
  }

  // 3. Direct Google Veo Generative Language API
  if (
    providerType === 'google_veo' || 
    providerType === 'google-veo' || 
    providerType === 'veo-asli' || 
    providerType.startsWith('veo-asli') || 
    providerType === 'google'
  ) {
    return new GoogleVeoAdapter();
  }

  // 4. BytePlus / Doubao native SDK
  if (providerType.includes('byteplus') || providerType.includes('pixeldance') || providerType.includes('doubao')) {
    return new BytePlusAdapter();
  }
  
  if (providerType === 'mock') {
    return new MockVideoProvider();
  }
  
  // Default to FalVideoAdapter for all verified Fal.ai & ByteDance models
  return new FalVideoAdapter();
}

export * from './VideoProvider';
export * from './FalVideoAdapter';
export * from './BytePlusAdapter';
export * from './GoogleVeoAdapter';
export * from './OpenArtMCPAdapter';
export * from './MediaProviderRouter';
export * from './mediaProviderRegistry';
