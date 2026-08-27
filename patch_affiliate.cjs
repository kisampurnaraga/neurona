const fs = require('fs');

const file = 'src/components/AffiliateConfigModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// We want to replace the div with "Mesin Generator Video AI"
// from `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#121216] border border-amber-500/20 rounded-xl">`
// to the closing tag of that div, wait, we just want to remove the video model, but keep TTS!

const searchStr = `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#121216] border border-amber-500/20 rounded-xl">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                <Video size={12} />
                <span>Mesin Generator Video AI</span>
              </label>
              <select
                defaultValue={localStorage.getItem('neurona_video_model') || 'byteplus'}
                onChange={(e) => localStorage.setItem('neurona_video_model', e.target.value)}
                className="w-full bg-black/60 border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
              >
                <option value="byteplus">BytePlus ModelArk (PixelDance/Doubao - Baru & Rekomendasi)</option>
                <option value="veo">Google Veo 3.1 (Rekomendasi Utama & API Ready)</option>
                <option value="runway">Runway Gen-3 Alpha (Fallback Tier 1 & API Ready)</option>
                <option value="sora" disabled>OpenAI Sora Turbo (Disabled - No Public API)</option>
                <option value="luma" disabled>Luma Dream Machine (Perlu API Key)</option>
                <option value="kling" disabled>Kling AI 1.5 HD (Perlu API Key)</option>
              </select>
            </div>
            <div className="space-y-1">`;

const replaceStr = `<div className="grid grid-cols-1 sm:grid-cols-1 gap-3 p-3 bg-[#121216] border border-rose-500/20 rounded-xl">
            <div className="space-y-1">`;

code = code.replace(searchStr, replaceStr);
code = code.replace('{/* 6. Mesin Generator Video AI & Pengisi Suara (TTS) */}', '{/* 6. Pengisi Suara (TTS) */}');

fs.writeFileSync(file, code);
