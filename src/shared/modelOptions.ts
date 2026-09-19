/**
 * Model option lists shared by the studio UI and the storyboard matrix.
 *
 * SECURITY / CORRECTNESS: these are projections of the canonical catalog in
 * `modelCatalog.ts`. Routing always uses `provider + internalModelId`;
 * the `name` fields below are display strings only and must never be used as
 * a routing key.
 *
 * Kept in its own module (rather than inside StoryboardMatrixModal) so that
 * App.tsx can read these lists without pulling the entire 5k-line modal into
 * the initial bundle — the modal is lazy-loaded.
 */

import {
  getCanonicalImageModels,
  getCanonicalVideoModels,
  type UnifiedModelInfo,
} from './modelCatalog';

export type ImageModelId = 
  | 'standard' 
  | 'precision' 
  | 'draft' 
  | 'chatgpt-image-2' 
  | 'gemini-imagen-3' 
  | 'flux-diffusion' 
  | 'nano-asli-lite' 
  | 'nano-asli' 
  | 'nano-asli-pro' 
  | 'nano-asli-premium' 
  | 'nano-asli-ultra'
  | 'kling-3-omni'
  | 'nano-banana-pro'
  | 'byte-plus-seedream-5-pro'
  | 'gpt-image-2'
  | string;

export interface ImageModelOption {
  id: ImageModelId;
  name: string;
  shortName: string;
  costPerImage: number;
  badge: string;
  badgeColor: string;
  desc: string;
  providerGroup?: 'higgsfield' | 'openart' | 'fal' | 'google_veo';
}

export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = getCanonicalImageModels().map((m: UnifiedModelInfo) => ({
  id: m.internalModelId as ImageModelId,
  name: `${m.provider === 'higgsfield' ? '🚀 Higgsfield' : m.provider === 'openart' ? '🎨 OpenArt' : m.provider === 'google_veo' ? '🔷 Google Imagen' : '⚡ Fal.ai'} ${m.displayName} (${m.costCredits} Kredit)`,
  shortName: `${m.displayName} (${m.costCredits} Cr)`,
  costPerImage: m.costCredits,
  badge: m.provider === 'higgsfield' ? 'Higgsfield MCP' : m.provider === 'openart' ? 'OpenArt AI' : m.provider === 'google_veo' ? 'Google Imagen' : 'Fal.ai',
  badgeColor: m.provider === 'higgsfield'
    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    : m.provider === 'openart' 
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
    : m.provider === 'google_veo' 
    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
    : 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  desc: m.description,
  providerGroup: (m.provider === 'google_veo' ? 'google_veo' : m.provider) as 'higgsfield' | 'openart' | 'fal' | 'google_veo'
}));

export interface VideoModelOption {
  id: string;
  name: string;
  shortName: string;
  desc: string;
  costPerVideo: number;
  providerGroup?: 'higgsfield' | 'openart' | 'fal';
}

export const VIDEO_MODEL_OPTIONS: VideoModelOption[] = getCanonicalVideoModels().map((m: UnifiedModelInfo) => ({
  id: m.internalModelId,
  name: `${m.provider === 'higgsfield' ? '🚀 Higgsfield' : m.provider === 'openart' ? '🎨 OpenArt' : '⚡ Fal.ai'} ${m.displayName} (${m.costCredits} Cr)`,
  shortName: `${m.displayName} (${m.costCredits} Cr)`,
  desc: m.description,
  costPerVideo: m.costCredits,
  providerGroup: (m.provider === 'higgsfield' ? 'higgsfield' : m.provider === 'openart' ? 'openart' : 'fal') as 'higgsfield' | 'openart' | 'fal'
}));
