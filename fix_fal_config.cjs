const fs = require('fs');
let content = fs.readFileSync('server/falModelConfig.ts', 'utf8');

// Replace FAL_IMAGE_MODELS
const newModels = `export const FAL_IMAGE_MODELS: FalImageModelDefinition[] = [
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
    id: 'fal-ai/flux/dev',
    name: 'FLUX.1 Dev (Standard T2I)',
    shortName: 'Flux Dev',
    tier: 'balanced',
    category: 't2i',
    description: 'Text-to-Image resolusi tinggi 1K-4K untuk generate base character & konsep awal.',
    costUsd: 0.025, // Flux Dev cost
    defaultAspectRatio: '16:9',
    defaultResolution: '1K',
    supportsReferenceImages: false,
    maxReferenceImages: 0
  },
  {
    id: 'fal-ai/flux-general/image-to-image',
    name: 'FLUX.1 Dev Edit (Character Consistency Engine)',
    shortName: 'Flux Dev Edit',
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
    id: 'fal-ai/flux-pro/v1.1',
    name: 'FLUX.1 Pro (Multi-Image UGC & Product Lock)',
    shortName: 'Flux Pro',
    tier: 'premium',
    category: 'edit',
    description: 'Model Pro Multimodal WAJIB untuk Studio Affiliate (Kunci Produk + Wajah Kreator).',
    costUsd: 0.05, 
    defaultAspectRatio: '9:16',
    defaultResolution: '1K',
    supportsReferenceImages: true,
    maxReferenceImages: 14
  }
];`;

content = content.replace(/export const FAL_IMAGE_MODELS: FalImageModelDefinition\[\] = \[[\s\S]*?\];/, newModels);

// Replace IMAGE_MODEL_TIERS
const newTiers = `export const IMAGE_MODEL_TIERS: Record<FalImageTierKey, ImageTierDefinition> = {
  draft: {
    key: 'draft',
    model: 'fal-ai/flux/schnell',
    label: 'Hemat / Draft (FLUX.1 Schnell)',
    useCase: 'Eksplorasi gaya visual cepat tanpa konsistensi karakter (Pure Text-to-Image)'
  },
  standard: {
    key: 'standard',
    baseModel: 'fal-ai/flux/dev',       // untuk generate master/scene pertama
    editModel: 'fal-ai/flux-general/image-to-image',  // untuk scene lanjutan pakai referensi
    label: 'Standar (FLUX.1 Dev & Edit)',
    useCase: 'Konsistensi karakter memadai untuk volume tinggi (animasi, edukasi)'
  },
  precision: {
    key: 'precision',
    baseModel: 'fal-ai/flux-pro/v1.1',
    editModel: 'fal-ai/flux-pro/v1.1',
    label: 'Presisi Tinggi (FLUX.1 Pro)',
    useCase: 'Wajib untuk produk/wajah yang harus 100% identik (affiliate), opsional upgrade untuk scene kompleks di animasi/edukasi'
  }
};`;

content = content.replace(/export const IMAGE_MODEL_TIERS: Record<FalImageTierKey, ImageTierDefinition> = \{[\s\S]*?\};/, newTiers);

// Fix buildFalImagePayload logic 
// the old logic checked 'fal-ai/nano-banana-pro/edit' and 'fal-ai/nano-banana-2/edit'
content = content.replace(/'fal-ai\/nano-banana-pro\/edit'/g, "'fal-ai/flux-pro/v1.1'");
content = content.replace(/'fal-ai\/nano-banana-2\/edit'/g, "'fal-ai/flux-general/image-to-image'");

fs.writeFileSync('server/falModelConfig.ts', content);
