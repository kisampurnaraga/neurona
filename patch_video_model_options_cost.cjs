const fs = require('fs');

const file = 'src/components/StoryboardMatrixModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const searchStr = `export interface VideoModelOption {
  id: string;
  name: string;
  shortName: string;
  desc: string;
}

export const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
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

const replaceStr = `export interface VideoModelOption {
  id: string;
  name: string;
  shortName: string;
  desc: string;
  costPerVideo: number;
}

export const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  { id: 'fal-wan21', name: 'Wan 2.1', shortName: 'Wan 2.1', desc: 'Sangat efisien & hemat', costPerVideo: 5 },
  { id: 'fal-seedance25', name: 'Seedance 2.5', shortName: 'Seedance 2.5', desc: 'Audio & sinematik', costPerVideo: 15 },
  { id: 'fal-seedance20', name: 'Seedance 2.0', shortName: 'Seedance 2.0', desc: 'Cepat & stabil', costPerVideo: 10 },
  { id: 'fal-sora3', name: 'Sora 3', shortName: 'Sora 3', desc: 'Realistis & natural', costPerVideo: 20 },
  { id: 'fal-sora2', name: 'Sora 2', shortName: 'Sora 2', desc: 'Generasi sebelumnya', costPerVideo: 15 },
  { id: 'fal-kling15', name: 'Kling 1.5', shortName: 'Kling 1.5', desc: 'Kreatif', costPerVideo: 15 },
  { id: 'fal-minimax', name: 'MiniMax H3', shortName: 'MiniMax H3', desc: 'Karakter presisi', costPerVideo: 15 },
  { id: 'byteplus', name: 'PixelDance', shortName: 'PixelDance', desc: 'Komersial', costPerVideo: 15 },
  { id: 'veo', name: 'Google Veo 3.1', shortName: 'Veo 3.1', desc: 'Ultra HD', costPerVideo: 15 },
  { id: 'runway', name: 'Runway Gen-3', shortName: 'Runway Gen-3', desc: 'Sinematik', costPerVideo: 15 }
];`;

code = code.replace(searchStr, replaceStr);
fs.writeFileSync(file, code);
