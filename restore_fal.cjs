const fs = require('fs');

let content = fs.readFileSync('server/falModelConfig.ts', 'utf8');

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
];`;

content = content.replace(/export const FAL_IMAGE_MODELS: FalImageModelDefinition\[\] = \[[\s\S]*?\];/, newModels);

const newTiers = `export const IMAGE_MODEL_TIERS: Record<FalImageTierKey, ImageTierDefinition> = {
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
};`;

content = content.replace(/export const IMAGE_MODEL_TIERS: Record<FalImageTierKey, ImageTierDefinition> = \{[\s\S]*?\};/, newTiers);

content = content.replace(/'fal-ai\/flux-pro\/v1.1'/g, "'fal-ai/nano-banana-pro/edit'");
content = content.replace(/'fal-ai\/flux-general\/image-to-image'/g, "'fal-ai/nano-banana-2/edit'");

fs.writeFileSync('server/falModelConfig.ts', content);
