const fs = require('fs');
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

// Insert nano-asli into IMAGE_MODEL_OPTIONS
const imgOptionsEnd = `    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'fal-ai/flux/schnell — Eksplorasi gaya visual cepat & preview storyboard kilat'
  }`;
const newImgOption = `,
  {
    id: 'nano-asli',
    name: 'Image Banana Resmi Google (Nano Asli - 10 Kredit)',
    shortName: 'Nano Asli (10 Cr)',
    costPerImage: 10,
    badge: '10 Kredit',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    desc: 'Google Gemini Imagen 3 Resmi - Pipeline Google AI Studio'
  }`;
content = content.replace(imgOptionsEnd, imgOptionsEnd + newImgOption);

// Find VIDEO_MODEL_OPTIONS and add veo-asli
const vidOptionsEnd = `  { id: 'fal-kling30-pro', shortName: 'Kling 3.0 Pro' }`;
const newVidOption = `,
  { id: 'veo-asli', shortName: 'Veo Asli (Google)' }`;
content = content.replace(vidOptionsEnd, vidOptionsEnd + newVidOption);

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);

// Also modify App.tsx to include veo-asli in Video Engine Selection
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
const oldAppVideoOpts = `<option value="fal-wan21">Wan 2.1 (Budget)</option>`;
const newAppVideoOpts = `<option value="fal-wan21">Wan 2.1 (Budget)</option>
                          <option value="veo-asli">Veo Asli (Google Resmi)</option>`;
appContent = appContent.replace(oldAppVideoOpts, newAppVideoOpts);
fs.writeFileSync('src/App.tsx', appContent);

// And FounderControlCenter.tsx
let fccContent = fs.readFileSync('src/FounderControlCenter.tsx', 'utf8');
const oldFccVideoOpts = `<option value="fal-ai/wan-i2v" className="bg-[#1a1a1a] text-white py-2">fal-ai/wan-i2v (Wan 2.1 Standard - Budget)</option>`;
const newFccVideoOpts = `<option value="fal-ai/wan-i2v" className="bg-[#1a1a1a] text-white py-2">fal-ai/wan-i2v (Wan 2.1 Standard - Budget)</option>
<option value="veo-asli" className="bg-[#1a1a1a] text-white py-2">veo-asli (Veo Asli Google Resmi)</option>`;
fccContent = fccContent.replace(oldFccVideoOpts, newFccVideoOpts);

// add nano-asli to Founder image engine options
const oldFccImgOpts = `<div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button`;
const newFccImgOpts = `<div className="mt-3 flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={() => updateEngine('imageEngine', 'nano-asli')}
                          className={\`flex-1 rounded-xl p-3 border \${config.imageEngine === 'nano-asli' ? 'bg-indigo-900/40 border-indigo-500' : 'bg-transparent border-[#2a2a2a] hover:border-gray-500'} flex flex-col items-center text-center gap-1 transition-all\`}
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mb-1">
                            <ImageIcon size={16} className="text-blue-400" />
                          </div>
                          <span className="text-xs font-bold text-white">Nano Asli</span>
                          <span className="text-[10px] text-gray-400">Google Gemini</span>
                        </button>
                      </div>\n` + oldFccImgOpts;

// Oh wait, FCC image engine is defined with an array or mapped maybe. Let's see how they are defined.
