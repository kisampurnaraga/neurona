import React, { useEffect, useState } from 'react';
import { X, Play, AlertTriangle, Download, Calendar, Trash2 } from 'lucide-react';
import type { ProductionProject } from '../shared/types';

interface RenderGalleryModalProps {
  onClose: () => void;
}

export const RenderGalleryModal: React.FC<RenderGalleryModalProps> = ({ onClose }) => {

  const [projects, setProjects] = useState<ProductionProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [projectToDelete, setProjectToDelete] = useState<ProductionProject | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);


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


  const handleDeleteClick = (e: React.MouseEvent, proj: ProductionProject) => {
    e.stopPropagation();
    if (proj.showcaseEligible) {
      alert('Project sedang dalam status Showcase. Nonaktifkan status Showcase di Founder Dashboard sebelum menghapus.');
      return;
    }
    setProjectToDelete(proj);
    setDeleteConfirmText('');
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Gagal menghapus project');
      } else {
        setProjects(projects.filter(p => p.id !== projectToDelete.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };


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
                      poster={(proj as any).thumbnail || proj.storyboard?.scenes?.[0]?.imageUrl}
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
                      <button 
                        onClick={(e) => handleDeleteClick(e, proj)}
                        className="text-rose-500 hover:text-rose-400 flex items-center gap-1 p-1 hover:bg-rose-950/50 rounded transition"
                        title="Hapus Project"
                      >
                        <Trash2 size={12} />
                      </button>
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

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setProjectToDelete(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 to-red-500"></div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30 text-rose-500">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-white">Hapus Project Permanen?</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Semua gambar, video, dan naskah untuk project <strong className="text-white">"{projectToDelete.title || projectToDelete.brief}"</strong> akan dihapus dan <span className="text-rose-400 font-bold">TIDAK BISA</span> dikembalikan.
                </p>
                <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-900/50 mt-2">
                  <p className="text-xs text-rose-300">
                    <strong>Peringatan:</strong> Kredit saldo yang sudah terpakai untuk project ini TIDAK akan di-refund.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-xs font-medium text-slate-400">Ketik "HAPUS" untuk konfirmasi:</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="HAPUS"
                className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-lg px-4 py-2 text-white outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== 'HAPUS' || isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center gap-2 transition cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};