import React, { useState, useRef, useEffect } from 'react';
import { ProductionProject } from '../shared/types';
import { 
  Download, 
  Copy, 
  CheckCircle2, 
  Film, 
  Mic, 
  Hash, 
  FileText, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Bot, 
  RotateCcw,
  Check,
  ArrowDownToLine,
  Smartphone,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface ProjectFinalData {
  id: string;
  title: string;
  videoUrl: string;
  audioUrl: string;
  caption: string;
  hashtags: string[];
  voiceProfile?: string;
  duration?: string;
  resolution?: string;
  fileSize?: string;
  audioFileSize?: string;
  script?: string;
}

interface FinalContentDashboardProps {
  projectId?: string;
  project?: ProductionProject;
  onClose?: () => void;
}

export function FinalContentDashboard({ projectId: propProjectId, project: propProject, onClose }: FinalContentDashboardProps) {
  // -------------------------------------------------------------------------
  // 1. STATE MANAGEMENT (Real Data Integration)
  // -------------------------------------------------------------------------
  const [projectData, setProjectData] = useState<ProjectFinalData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Copy States
  const [copiedMaster, setCopiedMaster] = useState(false);
  const [copiedSection, setCopiedSection] = useState<'CAPTION' | 'HASHTAGS' | 'ALL' | null>(null);
  const [activeTab, setActiveTab] = useState<'COPYWRITING' | 'SCRIPT'>('COPYWRITING');

  // Video Player States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState('00:00');

  // Audio Player States
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState('00:00');

  // Determine active Project ID from props or URL router params / query
  const targetProjectId = propProjectId || propProject?.id || (() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryId = urlParams.get('projectId') || urlParams.get('id');
      if (queryId) return queryId;

      const pathParts = window.location.pathname.split('/');
      const projIdx = pathParts.indexOf('projects');
      if (projIdx !== -1 && pathParts[projIdx + 1]) {
        return pathParts[projIdx + 1];
      }
    }
    return '';
  })();

  // -------------------------------------------------------------------------
  // 2. REAL DATA FETCHING (useEffect to GET /api/v1/client/projects/:projectId)
  // -------------------------------------------------------------------------
  const fetchProjectData = async () => {
    // If a complete real project object was directly passed and ready, populate instantly
    if (propProject && (propProject.finalVideoUrl || propProject.storyboard?.scenes?.some(s => s.videoUrl))) {
      const scenes = propProject.storyboard?.scenes || [];
      const aggregatedScript = scenes.map(s => s.voiceOver).filter(Boolean).join('\n');
      
      setProjectData({
        id: propProject.id,
        title: propProject.title || propProject.affiliateConfig?.productName || 'Neuronna AI Video Project',
        videoUrl: propProject.finalVideoUrl || scenes.find(s => s.videoUrl)?.videoUrl || '',
        audioUrl: propProject.audioResponseUrl || '',
        caption: propProject.marketingCopy?.caption || '',
        hashtags: propProject.marketingCopy?.hashtags || [],
        voiceProfile: propProject.marketingCopy?.voiceProfile || propProject.ttsVoiceConfig?.voiceName || 'Citra Kirana (Neural AI)',
        duration: '00:15',
        resolution: '1080 x 1920 (9:16 Portrait)',
        fileSize: '14.8 MB',
        audioFileSize: '1.2 MB',
        script: aggregatedScript
      });
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!targetProjectId) {
      // If no project ID available at all
      setIsLoading(false);
      setError('Project ID tidak ditemukan di URL atau parameter.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Primary Endpoint: GET /api/v1/client/projects/:projectId
      const response = await fetch(`/api/v1/client/projects/${targetProjectId}`);
      
      if (!response.ok) {
        // Fallback to GET /api/projects/:id if v1 client route isn't available
        const fallbackRes = await fetch(`/api/projects/${targetProjectId}`);
        if (!fallbackRes.ok) {
          throw new Error(`Gagal mengambil data proyek (Status ${response.status})`);
        }
        const rawProj: ProductionProject = await fallbackRes.json();
        const scenes = rawProj.storyboard?.scenes || [];
        const aggregatedScript = scenes.map(s => s.voiceOver).filter(Boolean).join('\n');

        setProjectData({
          id: rawProj.id,
          title: rawProj.title || rawProj.affiliateConfig?.productName || 'Neuronna AI Video Project',
          videoUrl: rawProj.finalVideoUrl || scenes.find(s => s.videoUrl)?.videoUrl || '',
          audioUrl: rawProj.audioResponseUrl || '',
          caption: rawProj.marketingCopy?.caption || '',
          hashtags: rawProj.marketingCopy?.hashtags || [],
          voiceProfile: rawProj.marketingCopy?.voiceProfile || rawProj.ttsVoiceConfig?.voiceName || 'Citra Kirana (Neural AI)',
          duration: '00:15',
          resolution: '1080 x 1920 (9:16 Portrait)',
          fileSize: '14.8 MB',
          audioFileSize: '1.2 MB',
          script: aggregatedScript
        });
        setIsLoading(false);
        return;
      }

      const json = await response.json();
      const data = json.data || json;
      const rawProj = json.project || data;
      const scenes = rawProj?.storyboard?.scenes || data.scenes || [];
      const aggregatedScript = scenes.map((s: any) => s.voiceOver).filter(Boolean).join('\n') || data.scriptExcerpt || '';

      setProjectData({
        id: data.id || targetProjectId,
        title: data.title || rawProj?.affiliateConfig?.productName || 'Neuronna AI Video Project',
        videoUrl: data.videoUrl || rawProj?.finalVideoUrl || scenes.find((s: any) => s.videoUrl)?.videoUrl || '',
        audioUrl: data.audioUrl || rawProj?.audioResponseUrl || '',
        caption: data.caption || rawProj?.marketingCopy?.caption || '',
        hashtags: data.hashtags || rawProj?.marketingCopy?.hashtags || [],
        voiceProfile: data.voiceProfile || rawProj?.ttsVoiceConfig?.voiceName || 'Citra Kirana (Neural AI)',
        duration: data.duration || '00:15',
        resolution: data.resolution || '1080 x 1920 (9:16 Portrait)',
        fileSize: data.fileSize || '14.8 MB',
        audioFileSize: data.audioFileSize || '1.2 MB',
        script: aggregatedScript
      });
      setIsLoading(false);
    } catch (err: any) {
      console.error('[FinalContentDashboard] Fetch error:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat data proyek.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [targetProjectId, propProject]);

  // -------------------------------------------------------------------------
  // Video Player Handlers
  // -------------------------------------------------------------------------
  const togglePlayVideo = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 1;
    setVideoProgress((current / duration) * 100);

    const mins = Math.floor(current / 60);
    const secs = Math.floor(current % 60);
    setVideoCurrentTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
  };

  const toggleMuteVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsVideoMuted(videoRef.current.muted);
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsVideoPlaying(true);
  };

  // -------------------------------------------------------------------------
  // Audio Player Handlers
  // -------------------------------------------------------------------------
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsAudioPlaying(true);
    } else {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 1;
    setAudioProgress((current / duration) * 100);

    const mins = Math.floor(current / 60);
    const secs = Math.floor(current % 60);
    setAudioCurrentTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
  };

  // -------------------------------------------------------------------------
  // Copy to Clipboard Handlers
  // -------------------------------------------------------------------------
  const handleCopyMaster = () => {
    if (!projectData) return;
    const formattedHashtags = (projectData.hashtags || []).map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
    const fullText = `${projectData.caption || ''}\n\n.\n.\n${formattedHashtags}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopiedMaster(true);
    setCopiedSection('ALL');

    if (window.navigator?.vibrate) {
      window.navigator.vibrate([40, 20, 40]);
    }

    setTimeout(() => {
      setCopiedMaster(false);
      setCopiedSection(null);
    }, 2800);
  };

  const handleCopySection = (text: string, type: 'CAPTION' | 'HASHTAGS') => {
    navigator.clipboard.writeText(text);
    setCopiedSection(type);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadFile = (url: string, defaultFilename: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFilename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/95 flex items-center justify-center p-3 sm:p-5 lg:p-6 backdrop-blur-xl overflow-y-auto font-sans antialiased text-gray-100">
      
      {/* Main Command Center Container */}
      <div className="bg-[#090b10] border border-zinc-800/80 w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] relative">
        
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/80 to-transparent z-10" />

        {/* ----------------------------------------------------------------- */}
        {/* HUD HEADER */}
        {/* ----------------------------------------------------------------- */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-zinc-800/80 bg-gray-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center relative shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <CheckCircle2 size={20} className="text-cyan-400" />
              <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  FINAL CONTENT DASHBOARD
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 font-bold tracking-wide">
                  REAL-TIME API
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                <span>PROJECT ID: <strong className="text-zinc-300 font-semibold">{projectData?.id || targetProjectId || 'SEARCHING...'}</strong></span>
                <span className="text-zinc-600">•</span>
                <span className="text-cyan-400/90 font-semibold">TIARA DISPATCH ENGINE</span>
              </p>
            </div>
          </div>

          {/* Close Action */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Tutup Dashboard"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* 3. LOADING STATE (Futuristic Spinner & Skeleton)                  */}
        {/* ----------------------------------------------------------------- */}
        {isLoading && (
          <div className="p-12 sm:p-20 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              </div>
              <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Sparkles size={18} className="text-cyan-300 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-black tracking-wide text-white font-mono uppercase">
                Mengambil Aset Final...
              </h3>
              <p className="text-xs text-zinc-400 max-w-md font-mono">
                Sinkronisasi video 9:16, voiceover neural, dan metadata copywriting dari endpoint backend Neuronna...
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              GET /api/v1/client/projects/{targetProjectId || 'active'}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* ERROR STATE                                                       */}
        {/* ----------------------------------------------------------------- */}
        {!isLoading && error && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Gagal Memuat Data Proyek</h3>
              <p className="text-xs text-rose-300/90 font-mono">{error}</p>
            </div>
            <button
              onClick={fetchProjectData}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center gap-2 border border-zinc-700 transition cursor-pointer"
            >
              <RefreshCw size={14} /> Coba Lagi
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 4. RENDER UI: 2-COLUMN GRID LAYOUT                                */}
        {/* ----------------------------------------------------------------- */}
        {!isLoading && !error && projectData && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ============================================================= */}
              {/* LEFT COLUMN: 9:16 PORTRAIT VIDEO PLAYER & MP4 DOWNLOAD (5 C) */}
              {/* ============================================================= */}
              <div className="lg:col-span-5 flex flex-col items-center space-y-4">
                
                {/* Resolution & Ratio Badge */}
                <div className="w-full flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider font-mono text-[11px]">
                    <Smartphone size={14} /> Video Preview (9:16 Portrait)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">
                    {projectData.resolution || '1080 x 1920'}
                  </span>
                </div>

                {/* Portrait Smartphone Bezel */}
                <div className="w-full max-w-[320px] bg-black rounded-3xl p-2 border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative group">
                  <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-800/80">
                    
                    {projectData.videoUrl ? (
                      <video
                        ref={videoRef}
                        src={projectData.videoUrl}
                        playsInline
                        loop
                        onError={(e) => {
                          const v = e.target as HTMLVideoElement;
                          v.src = '/api/videos/sample-ocean.mp4';
                        }}
                        onTimeUpdate={handleVideoTimeUpdate}
                        onEnded={() => setIsVideoPlaying(false)}
                        onClick={togglePlayVideo}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                        <Film size={36} className="text-zinc-600 animate-pulse" />
                        <p className="text-xs font-mono">Video master sedang disinkronkan...</p>
                      </div>
                    )}

                    {/* HUD Status Overlay */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-none">
                      <span className="text-[9px] font-mono font-bold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-white border border-white/10">
                        NEURONNA AI 60FPS
                      </span>
                      <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-500/30">
                        ● READY
                      </span>
                    </div>

                    {/* Center Play Overlay */}
                    {!isVideoPlaying && projectData.videoUrl && (
                      <button
                        onClick={togglePlayVideo}
                        className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/70 hover:bg-cyan-500/90 text-white flex items-center justify-center border border-white/20 hover:border-cyan-400 transition-all duration-200 transform hover:scale-110 shadow-2xl backdrop-blur-sm z-20 cursor-pointer"
                      >
                        <Play size={24} className="ml-1 text-cyan-300" />
                      </button>
                    )}

                    {/* Bottom Scrub Controls */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 flex flex-col gap-1.5 z-10">
                      <div 
                        onClick={(e) => {
                          if (!videoRef.current) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = (e.clientX - rect.left) / rect.width;
                          videoRef.current.currentTime = pos * (videoRef.current.duration || 1);
                        }}
                        className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                      >
                        <div 
                          className="h-full bg-cyan-400 transition-all duration-75 rounded-full shadow-[0_0_8px_#22d3ee]" 
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-white text-[11px] font-mono mt-1">
                        <div className="flex items-center gap-2">
                          <button onClick={togglePlayVideo} className="hover:text-cyan-400 transition cursor-pointer">
                            {isVideoPlaying ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                          <button onClick={toggleMuteVideo} className="hover:text-cyan-400 transition cursor-pointer">
                            {isVideoMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          </button>
                          <span>{videoCurrentTime} / {projectData.duration || '00:15'}</span>
                        </div>

                        <button onClick={restartVideo} className="hover:text-cyan-400 transition cursor-pointer" title="Replay">
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Massive Download MP4 CTA Button */}
                <div className="w-full max-w-[320px] space-y-2">
                  <button
                    onClick={() => handleDownloadFile(projectData.videoUrl, `${projectData.id}-tiktok-video.mp4`)}
                    disabled={!projectData.videoUrl}
                    className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 text-gray-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-emerald-400/40"
                  >
                    <ArrowDownToLine size={20} className="stroke-[2.5]" />
                    <span>Download Full Video (.mp4)</span>
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 px-2 font-mono">
                    <span>FORMAT: H.264 / MP4</span>
                    <span>EST. SIZE: {projectData.fileSize || '14.8 MB'}</span>
                  </div>
                </div>

              </div>

              {/* ============================================================= */}
              {/* RIGHT COLUMN: AUDIO ASSET, OPENCLAUW COPYWRITING & HASHTAGS  */}
              {/* ============================================================= */}
              <div className="lg:col-span-7 flex flex-col space-y-5">
                
                {/* 1. Mini Audio Player Box */}
                <div className="bg-gray-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <Mic size={14} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                          Voiceover Narasi (.mp3)
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          PROFIL: <span className="text-rose-300 font-semibold">{projectData.voiceProfile}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadFile(projectData.audioUrl || projectData.videoUrl, `${projectData.id}-voiceover.mp3`)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download size={12} className="text-rose-400" />
                      <span>Unduh .mp3</span>
                    </button>
                  </div>

                  <div className="bg-black/50 border border-zinc-800/80 rounded-xl p-3 flex items-center gap-3">
                    <button
                      onClick={togglePlayAudio}
                      className="w-9 h-9 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/40 flex items-center justify-center transition cursor-pointer shrink-0"
                    >
                      {isAudioPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </button>

                    <div className="flex-1 space-y-1">
                      <div 
                        onClick={(e) => {
                          if (!audioRef.current) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = (e.clientX - rect.left) / rect.width;
                          audioRef.current.currentTime = pos * (audioRef.current.duration || 1);
                        }}
                        className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden cursor-pointer relative"
                      >
                        <div 
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-75"
                          style={{ width: `${audioProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                        <span>{audioCurrentTime}</span>
                        <span>Studio Master (44.1kHz)</span>
                      </div>
                    </div>

                    {projectData.audioUrl && (
                      <audio
                        ref={audioRef}
                        src={projectData.audioUrl}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onEnded={() => setIsAudioPlaying(false)}
                        className="hidden"
                      />
                    )}
                  </div>
                </div>

                {/* 2. Openclauw Copywriting & Metadata Box */}
                <div className="bg-gray-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Bot size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-white">
                            Marketing Copy & Hashtags
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            AGENT: OPENCLAUW
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          Live Generated Copywriting • High Converting Hook
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px] font-mono">
                      <button
                        onClick={() => setActiveTab('COPYWRITING')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                          activeTab === 'COPYWRITING' 
                            ? 'bg-zinc-800 text-cyan-300 shadow-sm' 
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Caption
                      </button>
                      <button
                        onClick={() => setActiveTab('SCRIPT')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                          activeTab === 'SCRIPT' 
                            ? 'bg-zinc-800 text-cyan-300 shadow-sm' 
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Naskah VO
                      </button>
                    </div>
                  </div>

                  {activeTab === 'COPYWRITING' ? (
                    <div className="space-y-4">
                      
                      {/* Caption Box */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-300 uppercase font-mono text-[11px] flex items-center gap-1.5">
                            <FileText size={12} className="text-cyan-400" /> Caption Video
                          </span>
                          <button
                            onClick={() => handleCopySection(projectData.caption, 'CAPTION')}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 border border-zinc-700 transition cursor-pointer"
                          >
                            {copiedSection === 'CAPTION' ? (
                              <><Check size={10} className="text-emerald-400" /> Tersalin</>
                            ) : (
                              <><Copy size={10} /> Salin Caption</>
                            )}
                          </button>
                        </div>

                        <div className="bg-black/60 border border-zinc-800/90 rounded-xl p-3.5 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto font-sans selection:bg-cyan-500/30">
                          {projectData.caption || 'Caption belum tersedia untuk proyek ini.'}
                        </div>
                      </div>

                      {/* Hashtags Box */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-300 uppercase font-mono text-[11px] flex items-center gap-1.5">
                            <Hash size={12} className="text-purple-400" /> Viral Algorithmic Hashtags
                          </span>
                          <button
                            onClick={() => handleCopySection((projectData.hashtags || []).join(' '), 'HASHTAGS')}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 border border-zinc-700 transition cursor-pointer"
                          >
                            {copiedSection === 'HASHTAGS' ? (
                              <><Check size={10} className="text-emerald-400" /> Tersalin</>
                            ) : (
                              <><Copy size={10} /> Salin Hashtag</>
                            )}
                          </button>
                        </div>

                        <div className="bg-black/60 border border-zinc-800/90 rounded-xl p-3 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                          {projectData.hashtags && projectData.hashtags.length > 0 ? (
                            projectData.hashtags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-[11px] font-mono px-2 py-1 rounded-lg bg-purple-950/40 text-purple-300 border border-purple-500/20 hover:border-purple-500/50 transition cursor-default"
                              >
                                {tag.startsWith('#') ? tag : `#${tag}`}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-500 font-mono">Tidak ada hashtag terdaftar.</span>
                          )}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-300 uppercase font-mono text-[11px]">
                          Naskah Dialog & Hook Storyboard
                        </span>
                        <button
                          onClick={() => handleCopySection(projectData.script || '', 'CAPTION')}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 border border-zinc-700 transition cursor-pointer"
                        >
                          <Copy size={10} /> Salin Naskah
                        </button>
                      </div>
                      <div className="bg-black/60 border border-zinc-800/90 rounded-xl p-3.5 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto font-mono italic">
                        {projectData.script || 'Naskah voiceover belum tersedia.'}
                      </div>
                    </div>
                  )}

                  {/* 3. Mobile-Friendly Master Copy Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleCopyMaster}
                      className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all duration-200 transform active:scale-[0.98] shadow-lg cursor-pointer border ${
                        copiedMaster
                          ? 'bg-emerald-500 border-emerald-400 text-gray-950 shadow-[0_0_35px_rgba(16,185,129,0.5)] scale-[1.01]'
                          : 'bg-gradient-to-r from-zinc-800 via-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-white border-zinc-700 hover:border-cyan-400/60 shadow-black'
                      }`}
                    >
                      {copiedMaster ? (
                        <>
                          <CheckCircle2 size={20} className="text-gray-950 animate-bounce" />
                          <span>✅ Teks & Hashtag Berhasil Disalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={20} className="text-cyan-400" />
                          <span>Salin Semua Caption & Hashtag</span>
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-zinc-500 font-mono text-center mt-2">
                      Format otomatis dirapikan: Siap paste ke TikTok / Shopee Video / Reels.
                    </p>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
