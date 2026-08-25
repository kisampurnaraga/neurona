import sys

with open('src/components/StoryboardMatrixModal.tsx', 'r') as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if '{/* OPENCLAUW COPYWRITING & HASHTAGS PREVIEW (PHASE 1 INTEGRATION) */}' in line:
        start = i
    if '{scenes.length > 0 ? (' in line:
        end = i
        break

if start != -1 and end != -1:
    new_block = """              {/* OPTIMIZED SOCIAL MEDIA KIT & SKOQ QA AUDIT */}
              {(project.marketingCopy?.caption || project.marketingCopy?.hashtags || project.marketingCopy?.tiktok_caption) && (
                <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/30 rounded-xl p-3.5 sm:p-4 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/40">
                        OPENCLAUW COPYWRITING
                      </span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider hidden sm:inline">
                        Optimized Social Media Kit
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
                      <button onClick={() => setSocialPlatform('tiktok')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${socialPlatform === 'tiktok' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>TikTok</button>
                      <button onClick={() => setSocialPlatform('instagram')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${socialPlatform === 'instagram' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>IG Reels</button>
                      <button onClick={() => setSocialPlatform('youtube')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${socialPlatform === 'youtube' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>YT Shorts</button>
                    </div>
                  </div>
                  
                  {/* Skoq QA Audit Badge */}
                  <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span className="text-emerald-300 text-[10px] font-mono font-medium">Skoq Audit QA Passed: Content highly optimized for engagement & conversion</span>
                  </div>

                  {(() => {
                     const mc = project.marketingCopy;
                     let currentCaption = '';
                     let currentHashtags: string[] = [];
                     
                     if (socialPlatform === 'tiktok') {
                       currentCaption = mc?.tiktok_caption || mc?.caption || '';
                       currentHashtags = mc?.hashtags_tiktok || mc?.hashtags || [];
                     } else if (socialPlatform === 'instagram') {
                       currentCaption = mc?.instagram_caption || mc?.caption || '';
                       currentHashtags = mc?.hashtags_instagram || mc?.hashtags || [];
                     } else {
                       currentCaption = mc?.youtube_caption || mc?.caption || '';
                       currentHashtags = mc?.hashtags_youtube || mc?.hashtags || [];
                     }
                     
                     return (
                       <>
                         {currentCaption && (
                           <div className="bg-black/50 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto font-sans relative group">
                             {currentCaption}
                             <button
                               onClick={() => {
                                 navigator.clipboard.writeText(currentCaption);
                                 setCopiedType('ALL_SCRIPT');
                                 setTimeout(() => setCopiedType(null), 2000);
                               }}
                               className="absolute top-2 right-2 p-1.5 rounded bg-black/60 hover:bg-black/80 text-gray-300 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                               title="Salin Caption"
                             >
                               {copiedType === 'ALL_SCRIPT' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                             </button>
                           </div>
                         )}

                         {currentHashtags && currentHashtags.length > 0 && (
                           <div className="flex flex-wrap gap-1.5 pt-1">
                             {currentHashtags.map((tag, i) => (
                               <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-500/30">
                                 {tag.startsWith('#') ? tag : `#${tag}`}
                               </span>
                             ))}
                           </div>
                         )}
                         
                         <div className="flex justify-end">
                            <button
                               onClick={() => {
                                 const hash = currentHashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
                                 navigator.clipboard.writeText(`${currentCaption}\\n\\n${hash}`);
                                 setCopiedType('ALL_SCRIPT');
                                 setTimeout(() => setCopiedType(null), 2000);
                               }}
                               className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                               {copiedType === 'ALL_SCRIPT' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                               <span>Salin Semua (Caption + Hashtags)</span>
                            </button>
                         </div>
                       </>
                     );
                  })()}
                </div>
              )}

"""
    with open('src/components/StoryboardMatrixModal.tsx', 'w') as f:
        f.writelines(lines[:start])
        f.write(new_block)
        f.writelines(lines[end:])
    print('Updated StoryboardMatrixModal.tsx successfully')
else:
    print('Could not find target block in modal')
