const fs = require('fs');

const file = 'src/components/StoryboardMatrixModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace VIDEO_MODEL_OPTIONS to remove (Fal.ai)
const searchStr = `export const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  { id: 'fal-wan21', name: 'Wan 2.1 (Fal.ai)', shortName: 'Wan 2.1', desc: 'Sangat efisien & hemat' },
  { id: 'fal-seedance25', name: 'Seedance 2.5 (Fal.ai)', shortName: 'Seedance 2.5', desc: 'Audio & sinematik' },
  { id: 'fal-seedance20', name: 'Seedance 2.0 (Fal.ai)', shortName: 'Seedance 2.0', desc: 'Cepat & stabil' },
  { id: 'fal-sora3', name: 'Sora 3 (Fal.ai)', shortName: 'Sora 3', desc: 'Realistis & natural' },
  { id: 'fal-sora2', name: 'Sora 2 (Fal.ai)', shortName: 'Sora 2', desc: 'Generasi sebelumnya' },
  { id: 'fal-kling15', name: 'Kling 1.5 (Fal.ai)', shortName: 'Kling 1.5', desc: 'Kreatif' },
  { id: 'fal-minimax', name: 'MiniMax H3 (Fal.ai)', shortName: 'MiniMax H3', desc: 'Karakter presisi' },
  { id: 'byteplus', name: 'PixelDance (BytePlus Ark)', shortName: 'PixelDance', desc: 'Komersial' },
  { id: 'veo', name: 'Google Veo 3.1', shortName: 'Google Veo 3.1', desc: 'Ultra HD' },
  { id: 'runway', name: 'Runway Gen-3', shortName: 'Runway Gen-3', desc: 'Sinematik' }
];`;

const replacement = `export const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  { id: 'fal-wan21', name: 'Wan 2.1', shortName: 'Wan 2.1', desc: 'Sangat efisien & hemat' },
  { id: 'fal-seedance25', name: 'Seedance 2.5', shortName: 'Seedance 2.5', desc: 'Audio & sinematik' },
  { id: 'fal-seedance20', name: 'Seedance 2.0', shortName: 'Seedance 2.0', desc: 'Cepat & stabil' },
  { id: 'fal-sora3', name: 'Sora 3', shortName: 'Sora 3', desc: 'Realistis & natural' },
  { id: 'fal-sora2', name: 'Sora 2', shortName: 'Sora 2', desc: 'Generasi sebelumnya' },
  { id: 'fal-kling15', name: 'Kling 1.5', shortName: 'Kling 1.5', desc: 'Kreatif' },
  { id: 'fal-minimax', name: 'MiniMax H3', shortName: 'MiniMax H3', desc: 'Karakter presisi' },
  { id: 'byteplus', name: 'PixelDance', shortName: 'PixelDance', desc: 'Komersial' },
  { id: 'veo', name: 'Google Veo 3.1', shortName: 'Veo 3.1', desc: 'Ultra HD' },
  { id: 'runway', name: 'Runway Gen-3', shortName: 'Runway Gen-3', desc: 'Sinematik' }
];`;

code = code.replace(searchStr, replacement);
fs.writeFileSync(file, code);
console.log("Patched VIDEO_MODEL_OPTIONS in StoryboardMatrixModal.tsx!");
