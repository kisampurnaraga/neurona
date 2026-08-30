const fs = require('fs');
let content = fs.readFileSync('src/components/ModelSelectorModal.tsx', 'utf8');

const newBudgetModels = `  {
    id: 'fal-ai/veo3.1/lite/image-to-video',
    name: 'Google Veo 3.1 Lite (Bisu)',
    tag: 'Cheapest & Fastest',
    badge: 'PALING MURAH',
    disabled: false,
    color: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300 font-bold',
    description: 'Model video 720p termurah dari Google. Sangat cepat tetapi menghasilkan video tanpa audio (Bisu).',
    capabilities: ['Veo 3.1 Engine', 'Ultra Fast', 'No Audio', 'Cost Efficient']
  },
  {
    id: 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
    name: 'Seedance 1.0 Lite',
    tag: 'Budget with Audio',
    badge: 'BUDGET + AUDIO',
    disabled: false,
    color: 'border-teal-500/60 bg-teal-950/40 text-teal-300 font-bold',
    description: 'Model budget dari ByteDance. Lebih murah dari Wan, dengan kualitas baik dan native audio.',
    capabilities: ['Seedance 1.0', 'Native Audio', 'Good Motion', 'Budget Friendly']
  },
  {
    id: 'fal-ai/wan-i2v',
    name: 'Wan 2.1 Image-to-Video',
    tag: 'Classic Budget',
    badge: 'FAL.AI BUDGET',
    disabled: false,
    color: 'border-green-500/60 bg-green-950/40 text-green-300 font-bold',
    description: 'Model video hemat dan efisien dari Fal.ai dengan gerakan natural untuk scene umum.',
    capabilities: ['Wan 2.1 Engine', 'High Efficiency', 'Natural Motion', 'Fast Generation']
  },`;

content = content.replace(/\{\s*id: 'fal-ai\/wan-i2v'[\s\S]*?capabilities: \['Wan 2.1 Engine', 'High Efficiency', 'Natural Motion', 'Fast Generation'\]\s*\},/, newBudgetModels);

fs.writeFileSync('src/components/ModelSelectorModal.tsx', content);
