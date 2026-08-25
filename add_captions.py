import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

caption_ui = """
                {project?.marketingCopy && (
                  <div className="mt-4 p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-indigo-300 uppercase">
                      <span>Caption Media Sosial</span>
                      <button 
                        onClick={() => {
                            const textToCopy = `${project.marketingCopy?.caption || project.marketingCopy?.tiktok_caption || ''}\\n\\n${(project.marketingCopy?.hashtags || project.marketingCopy?.hashtags_tiktok || []).map(t => t.startsWith('#') ? t : '#' + t).join(' ')}`;
                            navigator.clipboard.writeText(textToCopy);
                            const prev = copiedScript;
                            setCopiedScript(true);
                            setTimeout(() => setCopiedScript(prev), 2000);
                        }}
                        className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/40 rounded transition"
                      >Salin</button>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {project.marketingCopy.caption || project.marketingCopy.tiktok_caption || project.marketingCopy.instagram_caption}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(project.marketingCopy.hashtags || project.marketingCopy.hashtags_tiktok || []).map((t, i) => (
                        <span key={i} className="text-[10px] text-indigo-400 bg-indigo-950/50 px-1.5 py-0.5 rounded">
                          {t.startsWith('#') ? t : `#${t}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
"""

content = content.replace("              </div>\n\n            </div>\n\n            {/* Video Production Metadata */}", "              </div>\n" + caption_ui + "\n            </div>\n\n            {/* Video Production Metadata */}")

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Added captions UI")
