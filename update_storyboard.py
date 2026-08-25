import sys
content = open('src/components/StoryboardMatrixModal.tsx').read()

old_accordian_end = """                            </div>
                          </div>
                        </div>
                      </div>
                    </div>"""

new_accordian_end = """                            </div>
                          </div>
                          
                          {/* AFFILIATE UGC RENDER BUTTON (Shown only if left column is hidden) */}
                          {project?.videoType === 'AFFILIATE' && !scene.videoUrl && scene.videoStatus !== 'COMPLETED' && (
                            <div className="pt-2">
                              <button
                                onClick={() => handleGenerateSingleVideo(scene.id, scene.videoCreditCost || 15)}
                                disabled={isVideoGenerating}
                                className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20`}
                              >
                                {isVideoGenerating ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Merender Video Runway...</span>
                                  </>
                                ) : (
                                  <>
                                    <Play size={13} fill="currentColor" />
                                    <span>Mulai Render Video UGC (15 Kredit)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          
                        </div>
                      </div>
                    </div>"""

content = content.replace(old_accordian_end, new_accordian_end)

with open('src/components/StoryboardMatrixModal.tsx', 'w') as f:
    f.write(content)
print('Affiliate render button added properly.')
