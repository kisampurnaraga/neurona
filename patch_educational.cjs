const fs = require('fs');

const file = 'src/components/EducationalConfigModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const searchStr = `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" />
                Mesin Generator Visual Edukasi
              </label>
              <select
                id="select-edu-video-engine"
                defaultValue={localStorage.getItem('neurona_video_model') || 'byteplus'}
                onChange={(e) => localStorage.setItem('neurona_video_model', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 text-xs text-white outline-none"
              >
                <option value="byteplus">BytePlus ModelArk (PixelDance/Doubao - Baru & Rekomendasi)</option>
                <option value="veo">Google Veo 3.1 (Rekomendasi Utama & API Ready)</option>
                <option value="runway">Runway Gen-3 Alpha (Fallback Tier 1 & API Ready)</option>
                <option value="sora" disabled>OpenAI Sora Turbo (Disabled - No Public API)</option>
                <option value="luma" disabled>Luma Dream Machine (Perlu API Key)</option>
                <option value="kling" disabled>Kling AI 1.5 HD (Perlu API Key)</option>
              </select>
            </div>
            <div>`;

const replaceStr = `<div className="grid grid-cols-1 md:grid-cols-1 gap-4 p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20">
            <div>`;

code = code.replace(searchStr, replaceStr);
code = code.replace('{/* Mesin Video AI & Pengisi Suara Edukasi */}', '{/* Pengisi Suara Edukasi (TTS) */}');

fs.writeFileSync(file, code);
