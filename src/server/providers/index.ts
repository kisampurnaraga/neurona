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

export function getVideoProvider(preferredType?: string, preferredProvider?: string): VideoGenerationProvider {
  const typeClean = (preferredType || '').trim().toLowerCase();
  const providerClean = (preferredProvider || '').trim().toLowerCase();

  // 1. Explicit provider precedence (MUST ALWAYS WIN FIRST!)
  if (providerClean === 'openart') {
    return new OpenArtMCPAdapter();
  }
  if (providerClean === 'google_veo' || providerClean === 'google-veo' || providerClean === 'google') {
    return new GoogleVeoAdapter();
  }
  if (providerClean === 'fal' || providerClean === 'fal-ai') {
    return new FalVideoAdapter();
  }
  if (providerClean === 'byteplus') {
    return new BytePlusAdapter();
  }
  if (providerClean === 'mock') {
    return new MockVideoProvider();
  }

  // 2. Implicit provider resolution by model ID
  if (
    typeClean === 'openart' || 
    typeClean.startsWith('openart-') || 
    typeClean.includes('openart')
  ) {
    return new OpenArtMCPAdapter();
  }

  // Known OpenArt models (only when no explicit provider is specified)
  const knownOpenArtModels = [
    'veo3-1', 'wan2-7', 'byte-plus-seedance-2', 'byte-plus-seedance-2-fast', 'byte-plus-seedance-2-5',
    'kling-3-omni', 'nano-banana-2-lite', 'nano-banana-2', 'nano-banana-pro',
    'byte-plus-seedream-5-lite', 'byte-plus-seedream-5-pro', 'gpt-image-2', 'wan2-7-image', 'gemini-omni-flash',
    'openart-sdxl', 'openart-flux-schnell', 'openart-flux-pro', 'openart-photoreal-v2',
    'openart-video-fast', 'openart-video-pro', 'openart-wan2.1', 'openart-wan21', 'openart-veo2'
  ];
  if (knownOpenArtModels.includes(typeClean)) {
    return new OpenArtMCPAdapter();
  }

  if (
    typeClean.startsWith('fal') || 
    typeClean.includes('fal-ai') || 
    typeClean.includes('fal.run') || 
    typeClean.includes('fal.ai')
  ) {
    return new FalVideoAdapter();
  }

  if (
    typeClean === 'google_veo' || 
    typeClean === 'google-veo' || 
    typeClean === 'veo-asli' || 
    typeClean.startsWith('veo-asli') || 
    typeClean === 'google'
  ) {
    return new GoogleVeoAdapter();
  }

  if (typeClean.includes('byteplus') || typeClean.includes('pixeldance') || typeClean.includes('doubao')) {
    return new BytePlusAdapter();
  }

  if (typeClean === 'mock') {
    return new MockVideoProvider();
  }

  // Otherwise, check activeProviderType
  const fallbackProvider = (activeProviderType || process.env.VIDEO_PROVIDER || 'fal').toLowerCase();
  if (fallbackProvider === 'openart') return new OpenArtMCPAdapter();
  if (fallbackProvider === 'google_veo' || fallbackProvider === 'google-veo' || fallbackProvider === 'google') return new GoogleVeoAdapter();
  if (fallbackProvider === 'byteplus') return new BytePlusAdapter();
  if (fallbackProvider === 'mock') return new MockVideoProvider();

  return new FalVideoAdapter();
}

export * from './VideoProvider';
export * from './FalVideoAdapter';
export * from './BytePlusAdapter';
export * from './GoogleVeoAdapter';
export * from './OpenArtMCPAdapter';
export * from './MediaProviderRouter';
export * from './mediaProviderRegistry';
