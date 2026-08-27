const fs = require('fs');
const path = require('path');

const file = 'src/FounderControlCenter.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the Model Identifier input rendering for fal
if (!code.includes("editingProvider.id === 'fal'")) {
  const replaceTarget = `{(editingProvider.id === 'veo' || editingProvider.id === 'google_veo') ? (`;
  const replacement = `{(editingProvider.id === 'fal') ? (
                  <div className="relative">
                    <select
                      id="fcc-fal-model-select"
                      value={inputModel || 'fal-ai/hunyuan-video'}
                      onChange={e => setInputModel(e.target.value)}
                      className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-medium text-white outline-none transition-colors appearance-none cursor-pointer pr-10"
                    >
                      <option value="fal-ai/wan-v2.1" className="bg-[#1a1a1a] text-white py-2">
                        Wan 2.1 (Sangat efisien & hemat)
                      </option>
                      <option value="fal-ai/seedance-2.5" className="bg-[#1a1a1a] text-white py-2">
                        Seedance 2.5 (Audio & sinematik)
                      </option>
                      <option value="fal-ai/seedance-2.0" className="bg-[#1a1a1a] text-white py-2">
                        Seedance 2.0 (Cepat & stabil)
                      </option>
                      <option value="fal-ai/sora-3" className="bg-[#1a1a1a] text-white py-2">
                        Sora 3 (Realistis & natural)
                      </option>
                      <option value="fal-ai/hunyuan-video" className="bg-[#1a1a1a] text-white py-2">
                        Hunyuan Video (Default)
                      </option>
                      <option value="fal-ai/kling-1.5" className="bg-[#1a1a1a] text-white py-2">
                        Kling 1.5 (Kreatif)
                      </option>
                      <option value="fal-ai/minimax-h3" className="bg-[#1a1a1a] text-white py-2">
                        MiniMax H3 (Karakter presisi)
                      </option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                ) : (editingProvider.id === 'veo' || editingProvider.id === 'google_veo') ? (`;

  code = code.replace(replaceTarget, replacement);
  fs.writeFileSync(file, code);
  console.log("Patched FounderControlCenter.tsx for Fal model dropdown!");
}
