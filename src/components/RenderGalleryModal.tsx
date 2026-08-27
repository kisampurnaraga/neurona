import React, { useEffect, useState } from 'react';
import { X, Play, AlertTriangle, Download, Calendar } from 'lucide-react';
import type { ProductionProject } from '../shared/types';

interface RenderGalleryModalProps {
  onClose: () => void;
}

export const RenderGalleryModal: React.FC<RenderGalleryModalProps> = ({ onClose }) => {
  const [projects, setProjects] = useState<ProductionProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRenderedVideos = async () => {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        const completed = data.filter((p: ProductionProject) => 
          p.status === 'COMPLETED' && p.finalVideoUrl
        ).sort((a: ProductionProject, b: ProductionProject) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setProjects(completed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRenderedVideos();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl bg-[#0b1021] rounded-2xl shadow-2xl border border-indigo-500/30 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Play className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Video Render Gallery</h2>
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-medium mt-0.5">
                <AlertTriangle size={12} />
                <span>Temporary Storage: Video akan terhapus otomatis dalam 1x24 Jam</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                <Play className="text-slate-500" size={32} />
              </div>
              <div>
                <h3 className="text-slate-300 font-bold mb-1">Belum Ada Video Render</h3>
                <p className="text-slate-500 text-sm max-w-md">
                  Video yang berhasil digabungkan dan diproduksi secara final akan muncul di sini.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((proj) => (
                <div key={proj.id} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl group">
                  <div className="relative aspect-video bg-black flex items-center justify-center">
                    <video 
                      src={proj.finalVideoUrl} 
                      controls 
                      className="w-full h-full object-cover"
                      poster={proj.thumbnail}
                    />
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-white font-bold border border-white/10">
                      {proj.videoType || 'AI VIDEO'}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-white text-sm line-clamp-1 mb-2">{proj.title}</h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{new Date(proj.updatedAt).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    <a 
                      href={proj.finalVideoUrl}
                      download={`Render_${proj.id}.mp4`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition"
                    >
                      <Download size={14} />
                      Download MP4
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
