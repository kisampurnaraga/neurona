const fs = require('fs');
let content = fs.readFileSync('src/components/AnimationConfigModal.tsx', 'utf8');

const oldSelect = `<option value="standard" className="bg-slate-900 text-slate-200">🍌 Nano Banana 2 (Standard - 15 CR)</option>
                    <option value="draft" className="bg-slate-900 text-slate-200">⚡ FLUX.1 Schnell (Draft - 5 CR)</option>
                    <option value="precision" className="bg-slate-900 text-slate-200">💎 Nano Banana Pro Edit (Precision - 25 CR)</option>`;

const newSelect = `<option value="standard" className="bg-slate-900 text-slate-200">🍌 Nano Banana 2 (Standard - 15 CR)</option>
                    <option value="draft" className="bg-slate-900 text-slate-200">⚡ FLUX.1 Schnell (Draft - 5 CR)</option>
                    <option value="precision" className="bg-slate-900 text-slate-200">💎 Nano Banana Pro Edit (Precision - 25 CR)</option>
                    <option value="nano-asli" className="bg-slate-900 text-slate-200">Google Gemini (Nano Asli - 10 CR)</option>`;

content = content.replace(oldSelect, newSelect);
fs.writeFileSync('src/components/AnimationConfigModal.tsx', content);
