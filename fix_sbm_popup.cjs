const fs = require('fs');

let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

// Add the state
content = content.replace(
  'const [showStitchModal, setShowStitchModal] = useState<boolean>(false);',
  'const [showStitchModal, setShowStitchModal] = useState<boolean>(false);\n  const [showStitchStylePopup, setShowStitchStylePopup] = useState<boolean>(false);'
);

// Replace the button onClick
content = content.replace(
  '<button\n                  onClick={handleStitchVideos}',
  '<button\n                  onClick={() => setShowStitchStylePopup(true)}'
);

// Add the Popup JSX right before {showStitchModal && (
const popupJsx = `
      {/* Stitch Style Selection Popup */}
      {showStitchStylePopup && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Film size={20} className="text-cyan-400" /> Pengaturan Final Video
            </h3>
            <p className="text-slate-400 text-sm mb-6">Pilih gaya subtitle animasi yang akan disatukan dengan video. Proses ini tidak membutuhkan kredit.</p>
            
            <div className="space-y-3 mb-6">
              {['Bold Pop', 'Clean Minimal', 'Neon Glow'].map((style) => (
                <button
                  key={style}
                  onClick={() => setSubtitleStyle(style as any)}
                  className={\`w-full p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer \${
                    subtitleStyle === style 
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }\`}
                >
                  <div className="flex items-center gap-3">
                    <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center \${
                      subtitleStyle === style ? 'border-cyan-400' : 'border-slate-500'
                    }\`}>
                      {subtitleStyle === style && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
                    </div>
                    <span className={\`font-bold \${subtitleStyle === style ? 'text-cyan-300' : 'text-slate-300'}\`}>{style}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowStitchStylePopup(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setShowStitchStylePopup(false);
                  handleStitchVideos();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold transition shadow-lg shadow-emerald-500/25"
              >
                Mulai Gabung
              </button>
            </div>
          </div>
        </div>
      )}

`;

content = content.replace(
  "{showStitchModal && (",
  popupJsx + "{showStitchModal && ("
);

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
