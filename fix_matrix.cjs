const fs = require('fs');
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

const imgOptionsEnd = `  {
    id: 'nano-asli',
    name: 'Image Banana Resmi Google (Nano Asli - 10 Kredit)',
    shortName: 'Nano Asli (10 Cr)',
    costPerImage: 10,
    badge: '10 Kredit',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    desc: 'Google Gemini Imagen 3 Resmi - Pipeline Google AI Studio'
  }
];`;

const newImgOptions = `  {
    id: 'nano-asli',
    name: 'Image Banana Resmi Google (Nano Asli - 10 Kredit)',
    shortName: 'Nano Asli (10 Cr)',
    costPerImage: 10,
    badge: '10 Kredit',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    desc: 'Google Gemini Imagen 3 Resmi - Pipeline Google AI Studio'
  },
  {
    id: 'nano-asli-pro',
    name: 'Google Gemini Imagen 3 Pro (Nano Asli Pro - 15 Kredit)',
    shortName: 'Nano Asli Pro (15 Cr)',
    costPerImage: 15,
    badge: '15 Kredit',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    desc: 'Resolusi Tinggi & Kualitas Premium Google Imagen 3'
  },
  {
    id: 'nano-asli-premium',
    name: 'Google Gemini Imagen 3 Premium (Nano Asli Premium - 25 Kredit)',
    shortName: 'Nano Asli Prem (25 Cr)',
    costPerImage: 25,
    badge: '25 Kredit',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    desc: 'Ultra High Quality & Presisi Maksimal Google Imagen 3'
  }
];`;
content = content.replace(imgOptionsEnd, newImgOptions);

const vidOptionsEnd = `  { id: 'byteplus', name: 'BytePlus PixelDance (15 Cr)', shortName: 'BytePlus PixelDance (15 Cr)', desc: 'BytePlus PixelDance — Komersial dinamis', costPerVideo: 15 }
];`;

const newVidOptions = `  { id: 'byteplus', name: 'BytePlus PixelDance (15 Cr)', shortName: 'BytePlus PixelDance (15 Cr)', desc: 'BytePlus PixelDance — Komersial dinamis', costPerVideo: 15 },
  { id: 'veo-asli', name: 'Google Veo Asli Standard (15 Cr)', shortName: 'Veo Asli Std (15 Cr)', desc: 'Google Veo Resmi — Kualitas Standard', costPerVideo: 15 },
  { id: 'veo-asli-pro', name: 'Google Veo Asli Pro (25 Cr)', shortName: 'Veo Asli Pro (25 Cr)', desc: 'Google Veo Resmi — Kualitas Pro/Premium', costPerVideo: 25 }
];`;
content = content.replace(vidOptionsEnd, newVidOptions);

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
