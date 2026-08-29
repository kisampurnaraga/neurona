const fs = require('fs');
const content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

const startIndex = content.indexOf('{/* Stitching Orchestrator Terminal Modal */}');
const endIndex = content.indexOf('{/* Nano Banana Token Quota Alert & Fallback Dialog */}');

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = `      {/* Stitching Orchestrator Terminal Modal (Replaced Timeline) */}
      {showStitchModal && (
        <div className="fixed inset-0 z-[80] bg-[#0c0d12] text-slate-200 flex flex-col font-sans select-none overflow-hidden h-screen w-screen animate-in fade-in duration-300">
          
          {/* TOP NAV BAR */}
          <div className="h-14 border-b border-white/5 bg-[#0e0f14] px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowStitchModal(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-semibold border border-transparent hover:border-white/10"
              >
                <ArrowRight size={14} className="rotate-180" />
                <span>Tutup Orchestrator</span>
              </button>
            </div>
            
            <div className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
               <Bot size={14} className="text-purple-400" />
               Orchestrator AI
            </div>

            <div className="flex items-center gap-3">
               {/* Avatars */}
               <div className="flex items-center -space-x-1.5">
                 <div className="w-7 h-7 rounded-full border border-purple-500 bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shadow-purple-500/20">
                   JN
                 </div>
               </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative p-6">
             {/* Central Hub Status */}
             <div className="max-w-xl w-full flex flex-col items-center">
                {stitchProgress === 100 && finalVideoUrl ? (
                   <div className="flex flex-col items-center w-full animate-in zoom-in-95 duration-500">
                      <div className={\`w-full max-w-xs \${getProjectAspectRatioClass(project)} rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)] mb-6\`}>
                        <video src={finalVideoUrl} controls autoPlay loop playsInline className="w-full h-full object-contain bg-black" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2 text-center">Video Berhasil Dijahit!</h2>
                      <p className="text-slate-400 text-sm text-center mb-6">
                        Semua adegan, subtitle bergaya <strong className="text-amber-400">"{subtitleStyle}"</strong>, dan audio latar telah digabungkan dengan sempurna.
                      </p>
                      
                      <button 
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = finalVideoUrl;
                          a.download = \`stitched-film-\${project?.id.substring(0,6) || 'movie'}.mp4\`;
                          a.target = '_blank';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition hover:scale-105 active:scale-95"
                      >
                        <Download size={18} /> Unduh File MP4
                      </button>
                   </div>
                ) : (
                   <div className="flex flex-col items-center w-full">
                      <div className="w-24 h-24 rounded-full bg-purple-900/30 border-2 border-purple-500/50 flex items-center justify-center mb-6 relative shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                         <div className="absolute inset-0 rounded-full border border-purple-400 animate-ping opacity-20"></div>
                         <Bot size={40} className="text-purple-400 animate-bounce" />
                         {/* Floating active agent tooltip bubble named "Jane" */}
                         <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                           <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                           <span>Jane</span>
                         </div>
                      </div>
                      
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">Jane sedang menjahit video kamu...</h2>
                      
                      <div className="w-full max-w-md h-2 bg-slate-900 rounded-full overflow-hidden mb-2 mt-4">
                        <div className="h-full bg-gradient-to-r from-purple-600 to-cyan-400 transition-all duration-500" style={{ width: \`\${stitchProgress}%\` }}></div>
                      </div>
                      <div className="text-xs font-mono text-purple-400 mb-8">{stitchProgress}% Selesai</div>

                      {/* Task Checklist */}
                      <div className="w-full max-w-md space-y-3">
                         <div className={\`p-3.5 rounded-xl border flex items-center gap-3 transition-colors duration-500 \${stitchProgress >= 25 ? 'bg-emerald-950/40 border-emerald-500/30' : stitchProgress > 0 ? 'bg-purple-950/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-slate-900/50 border-slate-800'}\`}>
                            {stitchProgress >= 25 ? <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" /> : stitchProgress > 0 ? <Loader2 className="text-purple-400 w-5 h-5 animate-spin shrink-0" /> : <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />}
                            <span className={\`text-sm font-semibold truncate \${stitchProgress >= 25 ? 'text-emerald-100' : stitchProgress > 0 ? 'text-purple-100' : 'text-slate-500'}\`}>🎬 Menggabungkan {scenes.length} scene video</span>
                         </div>
                         <div className={\`p-3.5 rounded-xl border flex items-center gap-3 transition-colors duration-500 \${stitchProgress >= 50 ? 'bg-emerald-950/40 border-emerald-500/30' : stitchProgress >= 25 ? 'bg-purple-950/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-slate-900/50 border-slate-800'}\`}>
                            {stitchProgress >= 50 ? <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" /> : stitchProgress >= 25 ? <Loader2 className="text-purple-400 w-5 h-5 animate-spin shrink-0" /> : <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />}
                            <span className={\`text-sm font-semibold truncate \${stitchProgress >= 50 ? 'text-emerald-100' : stitchProgress >= 25 ? 'text-purple-100' : 'text-slate-500'}\`}>🎵 Menyelaraskan audio & BGM</span>
                         </div>
                         <div className={\`p-3.5 rounded-xl border flex items-center gap-3 transition-colors duration-500 \${stitchProgress >= 80 ? 'bg-emerald-950/40 border-emerald-500/30' : stitchProgress >= 50 ? 'bg-purple-950/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-slate-900/50 border-slate-800'}\`}>
                            {stitchProgress >= 80 ? <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" /> : stitchProgress >= 50 ? <Loader2 className="text-purple-400 w-5 h-5 animate-spin shrink-0" /> : <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />}
                            <span className={\`text-sm font-semibold truncate \${stitchProgress >= 80 ? 'text-emerald-100' : stitchProgress >= 50 ? 'text-purple-100' : 'text-slate-500'}\`}>✍️ Menyusun subtitle (Gaya: {subtitleStyle})</span>
                         </div>
                         <div className={\`p-3.5 rounded-xl border flex items-center gap-3 transition-colors duration-500 \${stitchProgress >= 100 ? 'bg-emerald-950/40 border-emerald-500/30' : stitchProgress >= 80 ? 'bg-purple-950/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-slate-900/50 border-slate-800'}\`}>
                            {stitchProgress >= 100 ? <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" /> : stitchProgress >= 80 ? <Loader2 className="text-purple-400 w-5 h-5 animate-spin shrink-0" /> : <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />}
                            <span className={\`text-sm font-semibold truncate \${stitchProgress >= 100 ? 'text-emerald-100' : stitchProgress >= 80 ? 'text-purple-100' : 'text-slate-500'}\`}>📦 Finalisasi ekspor MP4</span>
                         </div>
                      </div>
                   </div>
                )}
             </div>

             {/* Tech Logs Panel (Hidden by Default) */}
             <div className="absolute bottom-6 left-6 right-6 flex justify-center">
                <details className="group w-full max-w-2xl bg-black/60 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
                   <summary className="p-3 cursor-pointer text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-2 select-none outline-none">
                      <Bot size={14} className="text-slate-500" />
                      <span>Log Teknis (Asisten Director: Jane)</span>
                      <ArrowRight size={12} className="ml-auto transition-transform group-open:rotate-90" />
                   </summary>
                   <div className="p-3 border-t border-white/5 max-h-48 overflow-y-auto space-y-2 bg-black/80">
                     {stitchLogs.length === 0 ? (
                       <div className="text-[10px] text-slate-600 font-mono italic">Menunggu log sistem...</div>
                     ) : (
                       stitchLogs.map((log, i) => (
                         <div key={i} className="text-[10px] text-slate-400 font-mono flex items-start gap-2">
                           <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                           <span>{log}</span>
                         </div>
                       ))
                     )}
                   </div>
                </details>
             </div>
          </div>
        </div>
      )}

      `;
  
  const finalContent = content.substring(0, startIndex) + newContent + content.substring(endIndex);
  fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', finalContent);
  console.log('Replaced successfully');
} else {
  console.log('Not found');
}
