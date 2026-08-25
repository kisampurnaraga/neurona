import React, { useEffect, useState } from 'react';
import { X, Play, Trash2, Film, Download } from 'lucide-react';
import { ProductionProject } from '../shared/types';
import { getProjectAspectRatioClass } from '../utils/aspectRatio';

interface GalleryModalProps {
  onClose: () => void;
  onSelectProject?: (projectId: string) => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ onClose, onSelectProject }) => {
  const [projects, setProjects] = useState<ProductionProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const res = await fetch('/api/gallery');
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Hapus video ini dari galeri?')) return;
    try {
      await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 text-cyan-400">
            <Film size={20} />
            <h2 className="font-bold uppercase tracking-wider text-sm">Galeri Video (Storage Persisten)</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center text-slate-400 py-10">Memuat galeri...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <Film size={48} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-400 font-medium">Galeri Kosong</p>
              <p className="text-slate-500 text-sm mt-1">Video yang selesai di-render akan otomatis tersimpan di sini dan tidak hilang saat di-refresh.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projects.map((proj) => {
                const cover = proj.finalVideoUrl || proj.storyboard?.scenes?.[0]?.videoUrl || proj.storyboard?.scenes?.[0]?.imageUrl || '';
                const isFailed = proj.status === 'FAILED';
                
                return (
                  <div 
                    key={proj.id} 
                    onClick={() => {
                        if (!isFailed && onSelectProject) {
                            onSelectProject(proj.id);
                            onClose();
                        }
                    }}
                    className={`group relative bg-slate-950 border ${isFailed ? 'border-rose-900/50' : 'border-slate-800 hover:border-cyan-500/50'} rounded-xl overflow-hidden transition-all duration-300 ${!isFailed ? 'cursor-pointer hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:-translate-y-1' : 'opacity-75'}`}
                  >
                    {/* Thumbnail Area */}
                    <div className={`bg-black relative flex items-center justify-center overflow-hidden ${getProjectAspectRatioClass(proj)}`}>
                      {cover ? (
                         cover.includes('.mp4') ? (
                            <video src={cover} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-500" />
                         ) : (
                            <img src={cover} alt="Cover" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-500" />
                         )
                      ) : (
                        <Film className="text-slate-800" size={32} />
                      )}
                      
                      {!isFailed && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                          <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400/50 text-cyan-300">
                            <Play size={20} className="ml-1" />
                          </div>
                        </div>
                      )}

                      {isFailed && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-rose-900 border border-rose-500 text-[10px] text-white font-bold">
                          FAILED
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-slate-200 line-clamp-1" title={proj.brief}>
                        {proj.brief || 'Video Project'}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {proj.id.substring(0, 8)}
                        </span>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          {proj.finalVideoUrl && (
                            <a 
                              href={proj.finalVideoUrl} 
                              download 
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded hover:bg-cyan-900/50 text-cyan-400 hover:text-cyan-300 transition"
                              title="Download Final Video"
                            >
                              <Download size={14} />
                            </a>
                          )}
                          <button 
                            onClick={(e) => handleDelete(e, proj.id)}
                            className="p-1.5 rounded hover:bg-rose-900/50 text-rose-500 hover:text-rose-400 transition"
                            title="Hapus Video"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
