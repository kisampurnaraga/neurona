import { SoraAdapter } from "./SoraAdapter";
import { MockVideoProvider } from "./MockVideoProvider";
import { RunwayAdapter } from "./RunwayAdapter";
import { BytePlusAdapter } from "./BytePlusAdapter";
import { VeoAdapter } from "./VeoAdapter";
import { LumaDreamMachineAdapter, KlingAIAdapter } from "./MoreVideoAdapters";
import { VideoGenerationProvider } from "./VideoProvider";
import { FalVideoAdapter } from "./FalVideoAdapter";

let activeProviderType: string = process.env.VIDEO_PROVIDER || 'veo';

export function setActiveVideoProvider(type: string) {
  activeProviderType = type.toLowerCase();
}

export function getAvailableVideoProviders() {
  return [
    { id: 'veo', name: 'Google Veo 3.1 (Google DeepMind)', description: 'Engine video sinematik Google DeepMind (veo-3.1-lite / veo-3.1). Terhubung langsung via @google/genai SDK.' },
    { id: 'byteplus', name: 'BytePlus ModelArk (PixelDance/Doubao)', description: 'Engine video komersial bertenaga BytePlus / SeaDance (PixelDance/Doubao). Product Lock & gerakan dinamis.' },
    { id: 'runway', name: 'Runway Gen-3 Alpha / Gen-4', description: 'Ultra-high-fidelity motion capture, cinematic lighting & speed ramping.' },
    { id: 'sora', name: 'OpenAI Sora Turbo (Disabled)', description: 'Belum ada API publik - Gunakan Google Veo / BytePlus / Runway' },
    { id: 'luma', name: 'Luma Dream Machine (Disabled)', description: 'Memerlukan API Key Luma' },
    { id: 'kling', name: 'Kling AI 1.5 HD (Disabled)', description: 'Memerlukan API Key Kling' }
  ];
}

export function getVideoProvider(preferredType?: string): VideoGenerationProvider {
  const providerType = (preferredType || activeProviderType || process.env.VIDEO_PROVIDER || 'veo').toLowerCase();
  
  if (providerType.includes('fal') || providerType.includes('hunyuan') || providerType.includes('wan') || providerType.includes('seedance') || providerType.includes('minimax') || providerType.includes('bytedance')) {
    return new FalVideoAdapter();
  }
  
  if (providerType.includes('veo') || providerType.includes('google') || providerType.includes('deepmind')) {
    return new VeoAdapter();
  }
  if (providerType.includes('byteplus') || providerType.includes('pixeldance') || providerType.includes('seadance') || providerType.includes('doubao')) {
    return new BytePlusAdapter();
  }
  if (providerType.includes('runway') || providerType.includes('gen3') || providerType.includes('gen4')) {
    return new RunwayAdapter();
  }
  if (providerType.includes('sora')) {
    return new SoraAdapter();
  }
  if (providerType.includes('luma')) {
    return new LumaDreamMachineAdapter();
  }
  if (providerType.includes('kling')) {
    return new KlingAIAdapter();
  }
  if (providerType === 'mock') {
    return new MockVideoProvider();
  }
  return new VeoAdapter();
}

export * from './VideoProvider';
export * from './VeoAdapter';
export * from './SoraAdapter';
export * from './RunwayAdapter';
export * from './BytePlusAdapter';
export * from './MoreVideoAdapters';
export * from './MockVideoProvider';
export * from './FalVideoAdapter';
