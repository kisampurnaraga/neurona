import React, { useState, useEffect } from 'react';
import { 
  Clapperboard, 
  Play, 
  RefreshCw, 
  ListVideo,
  Settings,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const FounderVideoInspector: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mt-6">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400">
          <Layers size={18} />
          <h2 className="font-bold">Video Assembly & Inspector Panel (Founder)</h2>
        </div>
        <button 
          onClick={fetchProjects}
          className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="p-4 flex flex-col md:flex-row gap-4 h-[600px] overflow-hidden">
        {/* Sidebar: Projects List */}
        <div className="w-full md:w-1/3 bg-slate-950 rounded-lg border border-slate-800 overflow-y-auto">
          <div className="p-3 border-b border-slate-800 sticky top-0 bg-slate-950 z-10 font-medium text-slate-300 flex items-center gap-2">
            <ListVideo size={16} /> Rendered Projects
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Loading history...</div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No projects found.</div>
          ) : (
            <div className="flex flex-col">
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => {
                    setSelectedProject(proj);
                    setExpandedScene(null);
                  }}
                  className={`p-3 text-left border-b border-slate-800 hover:bg-slate-800 transition-colors ${selectedProject?.id === proj.id ? 'bg-indigo-900/30 border-l-2 border-l-indigo-500' : ''}`}
                >
                  <div className="text-sm font-bold text-slate-200 truncate">{proj.title || 'Untitled Project'}</div>
                  <div className="text-xs text-slate-500 mt-1 flex justify-between">
                    <span>{proj.status}</span>
                    <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Area: Inspector */}
        <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-y-auto relative">
          {!selectedProject ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 flex-col gap-3">
              <Settings size={32} className="opacity-20" />
              <p>Select a project to inspect assembly assets</p>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white mb-2">{selectedProject.title}</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-slate-800 rounded text-slate-300">ID: {selectedProject.id}</span>
                  <span className="px-2 py-1 bg-indigo-900/50 text-indigo-300 rounded">Status: {selectedProject.status}</span>
                  <span className="px-2 py-1 bg-emerald-900/50 text-emerald-300 rounded">Type: {selectedProject.videoType}</span>
                </div>
              </div>

              {/* Assembly Timeline */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Clapperboard size={14} /> Scene Assembly Pipeline
                </h4>
                
                <div className="flex flex-col gap-3">
                  {selectedProject.storyboard?.scenes?.map((scene: any, idx: number) => {
                    const isExpanded = expandedScene === idx;
                    return (
                      <div key={idx} className="border border-slate-800 bg-slate-900/50 rounded-lg overflow-hidden">
                        <div 
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                          onClick={() => setExpandedScene(isExpanded ? null : idx)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-slate-800 text-xs flex items-center justify-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </div>
                            <span className="text-sm font-medium text-slate-300 truncate max-w-[200px]">
                              {scene.visualDirection?.substring(0, 40) || `Scene ${idx + 1}`}...
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {scene.videoUrl && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Video Rendered"></span>}
                            {scene.ttsAudioUrl && <span className="w-2 h-2 rounded-full bg-blue-500" title="Audio Generated"></span>}
                            {isExpanded ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 border-t border-slate-800 bg-slate-950 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Visual Asset */}
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-slate-500 uppercase">Visual Asset (Veo / I2V)</span>
                              {scene.videoUrl ? (
                                <video src={scene.videoUrl} controls className="w-full rounded-md border border-slate-700 bg-black" />
                              ) : scene.imageUrl ? (
                                <img src={scene.imageUrl} alt="Keyframe" className="w-full rounded-md border border-slate-700" />
                              ) : (
                                <div className="w-full aspect-video rounded-md border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-600">No Visual Asset</div>
                              )}
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2" title={scene.promptImageToVideo || scene.visualDirection}>{scene.promptImageToVideo || scene.visualDirection}</p>
                            </div>

                            {/* Audio Asset */}
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-slate-500 uppercase">Audio & Subtitles (TTS)</span>
                              <div className="bg-slate-900 border border-slate-800 rounded-md p-3 h-full flex flex-col gap-3">
                                {scene.ttsAudioUrl ? (
                                  <audio src={scene.ttsAudioUrl} controls className="w-full h-8" />
                                ) : (
                                  <div className="text-xs text-slate-600 py-2">No Audio Asset</div>
                                )}
                                
                                <div className="flex-1 bg-black/50 rounded border border-slate-800 p-2 overflow-y-auto">
                                  <span className="text-[10px] text-indigo-400 font-mono block mb-1">Voiceover Script:</span>
                                  <p className="text-xs text-slate-300 italic">"{scene.voiceover_script || scene.voiceOver}"</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Final Assembled Video */}
              {selectedProject.finalVideoUrl && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                   <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <Play size={14} /> Final Assembled Video
                  </h4>
                  <video src={selectedProject.finalVideoUrl} controls className="w-full max-w-lg rounded-xl border-2 border-indigo-500/30 bg-black" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
