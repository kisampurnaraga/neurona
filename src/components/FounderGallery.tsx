import React, { useEffect, useState } from 'react';
import { Play, Download, Calendar, Activity, Info, Film, Star } from 'lucide-react';
import { ProductionProject } from '../shared/types';

interface GalleryVideo {
  id: string;
  projectId: string;
  url: string;
  title: string;
  description: string;
  type: string;
  date: string;
  downloadName: string;
  showcaseEligible?: boolean;
}

export const FounderGallery: React.FC = () => {
  const [projects, setProjects] = useState<ProductionProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.reverse());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleToggleShowcase = async (projectId: string, currentEligible: boolean) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/toggle-showcase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showcaseEligible: !currentEligible })
      });
      if (res.ok) {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, showcaseEligible: !currentEligible } : p));
      }
    } catch (err) {
      console.error('Failed to toggle showcase:', err);
    }
  };

  const allVideos: GalleryVideo[] = [];

  projects.forEach(proj => {
    // Master video
    if (proj.finalVideoUrl) {
      allVideos.push({
        id: proj.id + '-master',
        projectId: proj.id,
        url: proj.finalVideoUrl,
        title: proj.brief?.product || 'Untitled Master Video',
        description: proj.brief?.angle || 'Master stitched video.',
        type: proj.videoType || 'MASTER',
        date: 'Completed',
        downloadName: `master-${proj.id}.mp4`,
        showcaseEligible: Boolean((proj as any).showcaseEligible)
      });
    }

    // Individual Scene videos
    if (proj.storyboard?.scenes) {
      proj.storyboard.scenes.forEach((scene, idx) => {
        if (scene.videoUrl && scene.videoUrl !== proj.finalVideoUrl) {
          allVideos.push({
            id: scene.id || `${proj.id}-scene-${idx}`,
            projectId: proj.id,
            url: scene.videoUrl,
            title: `Scene ${idx + 1}: ${(scene as any).subject || scene.visualDirection?.slice(0, 25) || 'Video'}`,
            description: (scene as any).visualDescription || scene.visualDirection || (scene as any).generationPrompt || scene.promptImageToVideo || 'Individual scene video.',
            type: 'SCENE CLIP',
            date: 'Rendered',
            downloadName: `scene-${idx + 1}-${proj.id}.mp4`,
            showcaseEligible: Boolean((proj as any).showcaseEligible)
          });
        }
      });
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-indigo-400">
        <Activity className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-5 bg-[#080808] border border-[#1a1a1a] rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Film className="text-emerald-400" size={18} />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Semua Video Render</h2>
          </div>
          <span className="bg-emerald-900/50 text-emerald-300 px-3 py-1 rounded-full text-xs font-mono border border-emerald-700/50">
            TOTAL: {allVideos.length} VIDEO
          </span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mb-6">
          Koleksi seluruh video final dan potongan scene adegan yang telah sukses dirender untuk keperluan demonstrasi Landing Page.
        </p>

        {allVideos.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center bg-[#111] rounded-xl border border-dashed border-gray-700">
            <Info size={32} className="text-gray-500 mb-3" />
            <h3 className="text-gray-400 text-sm">Belum Ada Video Rendered</h3>
            <p className="text-gray-600 text-xs mt-1">Video atau adegan yang berhasil di-render akan otomatis muncul di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {allVideos.map((video) => (
              <div key={video.id} className="bg-black/80 rounded-xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col">
                <div className="aspect-video bg-gray-900 relative group overflow-hidden flex items-center justify-center">
                  <video 
                    src={video.url} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    controls
                    preload="metadata"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-[9px] font-mono px-2 py-0.5 rounded text-white border border-white/10 uppercase">
                    {video.type}
                  </div>
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-white text-sm truncate mb-1" title={video.title}>
                    {video.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed flex-1">
                    {video.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleShowcase(video.projectId, Boolean(video.showcaseEligible))}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition cursor-pointer ${
                        video.showcaseEligible
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 font-bold'
                          : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-gray-200'
                      }`}
                      title="Tampilkan video ini sebagai Showcase di Landing Page"
                    >
                      <Star size={12} className={video.showcaseEligible ? 'fill-amber-400 text-amber-400' : ''} />
                      <span className="text-[10px]">{video.showcaseEligible ? 'Tampil di Landing' : '+ Pajang di Landing'}</span>
                    </button>
                    <a 
                      href={video.url} 
                      download={video.downloadName}
                      className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all cursor-pointer shrink-0"
                    >
                      <Download size={14} />
                      Unduh
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
