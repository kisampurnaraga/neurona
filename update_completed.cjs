const fs = require('fs');

let content = fs.readFileSync('src/components/NeuronaDirectorCore.tsx', 'utf8');

// Update isStoryboardReady
content = content.replace(
  "const isStoryboardReady = project?.status === 'AWAITING_APPROVAL' || (project?.progress || 0) >= 50 || Boolean(project?.storyboard?.scenes && project.storyboard.scenes.length > 0);",
  "const isCompleted = project?.status === 'COMPLETED';\n  const isStoryboardReady = !isCompleted && (project?.status === 'AWAITING_APPROVAL' || (project?.progress || 0) >= 50 || Boolean(project?.storyboard?.scenes && project.storyboard.scenes.length > 0));"
);
content = content.replace(
  "const isCompleted = project?.status === 'COMPLETED';\n  const isVisualGenerating",
  "const isVisualGenerating"
);


// Update hub center styling for COMPLETED
content = content.replace(
  "                      : (hubState === 'THINKING' || hubState === 'WRITING')",
  "                      : hubState === 'COMPLETED'\n                      ? 'border-emerald-400 shadow-[0_0_50px_#10b981]'\n                      : (hubState === 'THINKING' || hubState === 'WRITING')"
);

content = content.replace(
  "                      : (hubState === 'THINKING' || hubState === 'WRITING')\n                      ? 'from-amber-500 to-orange-600 shadow-[0_0_20px_#f59e0b]'",
  "                      : hubState === 'COMPLETED'\n                      ? 'from-emerald-500 to-teal-600 shadow-[0_0_20px_#10b981]'\n                      : (hubState === 'THINKING' || hubState === 'WRITING')\n                      ? 'from-amber-500 to-orange-600 shadow-[0_0_20px_#f59e0b]'"
);

content = content.replace(
  "                    {hubState === 'THINKING' ? (",
  "                    {hubState === 'COMPLETED' ? (\n                      <Check className=\"w-5 h-5 text-white\" />\n                    ) : hubState === 'THINKING' ? ("
);

content = content.replace(
  "                    {isHypeActive ? 'STORYBOARD READY!' : hubState === 'THINKING' ? 'IDEATING' : hubState === 'WRITING' ? 'WRITING SCRIPT' : hubState === 'STORYBOARDING' ? 'STORYBOARD 50%' : isSpeaking ? 'NEURONA SPEAKING' : 'AI DIRECTOR CORE'}",
  "                    {isHypeActive ? 'STORYBOARD READY!' : hubState === 'COMPLETED' ? 'VIDEO COMPLETED' : hubState === 'THINKING' ? 'IDEATING' : hubState === 'WRITING' ? 'WRITING SCRIPT' : hubState === 'STORYBOARDING' ? 'STORYBOARD 50%' : isSpeaking ? 'NEURONA SPEAKING' : 'AI DIRECTOR CORE'}"
);

content = content.replace(
  "{isHypeActive ? 'HYPE SUCCESS' : hubState === 'WRITING' ? 'AGENT 1 ACTIVE' : isStoryboardReady ? 'REVIEW 50%' : 'READY'}",
  "{isHypeActive ? 'HYPE SUCCESS' : hubState === 'COMPLETED' ? '100% DONE' : hubState === 'WRITING' ? 'AGENT 1 ACTIVE' : isStoryboardReady ? 'REVIEW 50%' : 'READY'}"
);

content = content.replace(
  "{isHypeActive ? 'Membuka Storyboard...' : hubState === 'WRITING' ? 'SINTA menyusun naskah...' : isStoryboardReady ? 'Klik untuk tinjau' : 'What shall we create today?'}",
  "{isHypeActive ? 'Membuka Storyboard...' : hubState === 'COMPLETED' ? 'Video final siap ditonton.' : hubState === 'WRITING' ? 'SINTA menyusun naskah...' : isStoryboardReady ? 'Klik untuk tinjau' : 'What shall we create today?'}"
);

content = content.replace(
  ": isStoryboardReady \n                      ? 'Naskah dan Storyboard telah selesai disusun! Silakan periksa adegan dan setujui untuk merender video utuh.' \n                      : 'NEURONA Director Core Online. Pilih salah satu studio (Animasi, Affiliate, Edukasi) atau masukkan ide cerita Anda di bawah.'}",
  ": hubState === 'COMPLETED'\n                      ? 'Render keseluruhan telah selesai. Video master hasil jahitan orkestrator siap untuk ditonton dan diunduh. Silakan putar hasil akhir Anda.'\n                      : isStoryboardReady \n                      ? 'Naskah dan Storyboard telah selesai disusun! Silakan periksa adegan dan setujui untuk merender video utuh.' \n                      : 'NEURONA Director Core Online. Pilih salah satu studio (Animasi, Affiliate, Edukasi) atau masukkan ide cerita Anda di bawah.'}"
);

content = content.replace(
  "{(hubState === 'THINKING' || hubState === 'WRITING') ? 'ORCHESTRATING SCRIPT' : hubState === 'STORYBOARDING' ? 'BUILDING SCENES' : isStoryboardReady ? 'STORYBOARD 50%' : 'READY'}",
  "{(hubState === 'COMPLETED') ? 'RENDERED 100%' : (hubState === 'THINKING' || hubState === 'WRITING') ? 'ORCHESTRATING SCRIPT' : hubState === 'STORYBOARDING' ? 'BUILDING SCENES' : isStoryboardReady ? 'STORYBOARD 50%' : 'READY'}"
);

// Add the COMPLETED overlay banner instead of READY banner if completed
content = content.replace(
  "                {/* Floating Loading / Readiness Indicator */}",
  "                {/* Completed Action Banner */}\n                {hubState === 'COMPLETED' && (\n                  <div className=\"absolute top-[80%] sm:top-[75%] left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500 shadow-[0_0_40px_rgba(16,185,129,0.3)]\">\n                    <div className=\"flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white\">\n                      <Check className=\"w-5 h-5\" />\n                    </div>\n                    <div className=\"flex flex-col text-left\">\n                      <span className=\"text-xs font-bold uppercase tracking-widest text-emerald-100\">\n                        Video Selesai Dibuat!\n                      </span>\n                      <span className=\"text-[9px] font-mono text-emerald-400\">\n                        Seluruh scene berhasil dirender dan digabungkan.\n                      </span>\n                    </div>\n                    <div className=\"flex items-center gap-2 ml-2\">\n                      <button\n                        onClick={onOpenStoryboard}\n                        className=\"px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg transition-colors flex items-center gap-1\"\n                      >\n                        <Play size={12} fill=\"currentColor\" /> Lihat Hasil\n                      </button>\n                      {onResetProject && (\n                        <button\n                          onClick={onResetProject}\n                          className=\"px-3 py-1.5 bg-slate-900 border border-emerald-500/50 hover:bg-slate-800 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors\"\n                        >\n                          Proyek Baru\n                        </button>\n                      )}\n                    </div>\n                  </div>\n                )}\n\n                {/* Floating Loading / Readiness Indicator */}"
);

fs.writeFileSync('src/components/NeuronaDirectorCore.tsx', content);
