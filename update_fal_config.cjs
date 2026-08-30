const fs = require('fs');
let content = fs.readFileSync('server/falModelConfig.ts', 'utf8');

const newBudgetModels = `
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
  },`;

content = content.replace(/  \/\/ BUDGET TIER\s+\{\s+id: 'fal-ai\/wan-i2v'[\s\S]*?supportsAudio: false\s+\},/, newBudgetModels);

fs.writeFileSync('server/falModelConfig.ts', content);
