import React, { useState, useRef, useEffect } from 'react';
import { InteractiveProduct360Viewer } from './InteractiveProduct360Viewer';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  Film, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Maximize2,
  Volume1,
  RefreshCw,
  Zap,
  Subtitles,
  Layers,
  Box
} from 'lucide-react';
import { neuronaVoice } from '../utils/speechSynthesis';

interface VideoPreviewPlayerProps {
  src: string | null | undefined;
  posterImage?: string | null | undefined;
  title?: string;
  subtitle?: string;
  voiceoverText?: string;
  status?: 'PENDING' | 'GENERATING' | 'PRODUCING' | 'ASSEMBLING' | 'AUDIO' | 'EDITING' | 'QA' | 'COMPLETED' | 'FAILED' | string;
  activeAgent?: string;
  videoModel?: string;
  progressPercentage?: number;
  currentPhaseName?: string;
  scenes?: any[];
  activeSceneIndex?: number;
  onSelectScene?: (index: number) => void;
  onRetry?: () => void;
  className?: string;
}

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  src,
  posterImage,
  title,
  subtitle,
  voiceoverText,
  status = 'STANDBY',
  activeAgent = 'GATOTKACA SORA',
  videoModel,
  progressPercentage = 0,
  currentPhaseName,
  scenes,
  activeSceneIndex = 0,
  onSelectScene,
  onRetry,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [show360View, setShow360View] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [modelHealth, setModelHealth] = useState<'Pending' | 'Ready' | 'Failed' | 'Processing'>('Pending');

  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const fetchStatus = async () => {
      if (!videoModel) return;
      try {
        const res = await fetch(`/api/providers/status?model=${encodeURIComponent(videoModel)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.status === 'READY') {
              setModelHealth('Ready');
            } else if (data.status === 'UNAVAILABLE' || data.status === 'ERROR' || data.status === 'NOT_CONFIGURED') {
              setModelHealth('Failed');
            } else {
              setModelHealth('Processing');
            }
          }
        } else if (res.status >= 500) {
          if (isMounted) setModelHealth('Failed');
        }
      } catch (e) {
         if (isMounted) setModelHealth('Failed');
      }
    };
    
    // Initial fetch
    fetchStatus();
    
    // Poll every 10 seconds
    pollInterval = setInterval(fetchStatus, 10000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [videoModel]);

  const isVideoFile = Boolean(
    src && !videoError && (
      src.includes('.mp4') || 
      src.includes('.webm') || 
      src.includes('.mov') || 
      src.startsWith('data:video/') ||
      src.includes('/api/videos/') ||
      src.includes('/videos/') ||
      src.includes('googleapis.com')
    )
  );

  // Reset error when src changes and handle auto-play transition
  useEffect(() => {
    setVideoError(false);
    if (isPlaying && videoRef.current && isVideoFile) {
      videoRef.current.play().catch(e => console.log('Auto-play suppressed by browser:', e));
    }
  }, [src, isPlaying, isVideoFile]);

  const displayImage = posterImage || (src && !isVideoFile ? src : null);

  const isGenerating = ['PRODUCING', 'ASSEMBLING', 'AUDIO', 'EDITING', 'QA', 'GENERATING'].includes(status || '');
  const isCompleted = status === 'COMPLETED' || Boolean(src);
  const isFailed = status === 'FAILED';

  // Subtitle content prioritizing active scene subtitle or voiceover
  const currentCaption = subtitle || voiceoverText || title || '';

  const togglePlay = () => {
    if (videoRef.current && isVideoFile) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpeakVoice = () => {
    if (!voiceoverText && !subtitle && !title) return;
    const textToSpeak = voiceoverText || subtitle || title || "Narasi adegan video AI";
    if (isSpeaking) {
      neuronaVoice.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      neuronaVoice.speak(textToSpeak);
      const estDuration = Math.max(2000, (textToSpeak.split(' ').length / 2.5) * 1000);
      setTimeout(() => setIsSpeaking(false), estDuration);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${className || 'aspect-video'} w-full rounded-2xl bg-black border border-white/15 overflow-hidden group flex flex-col justify-between shadow-2xl `}
    >
      {/* Top Status & Agent Telemetry Overlay Bar */}
      <div className="absolute top-0 inset-x-0 z-20 p-2.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isGenerating ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse font-bold shadow-[0_0_10px_rgba(244,63,94,0.4)]">
              <Loader2 size={10} className="animate-spin" />
              <span>{status}: {progressPercentage}%</span>
            </span>
          ) : isFailed ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/80 flex items-center gap-1 font-bold">
              <AlertCircle size={10} />
              <span>STATUS: GAGAL</span>
            </span>
          ) : isCompleted ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <CheckCircle2 size={10} />
              <span>KESATUAN VIDEO READY</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700 flex items-center gap-1">
              <Film size={10} />
              <span>STANDBY</span>
            </span>
          )}

          <span className="text-cyan-400 font-semibold truncate max-w-[120px] sm:max-w-[180px]">
            {activeAgent}
          </span>
          {videoModel && (
            <span className={`px-2 py-0.5 flex items-center gap-1 rounded-full border text-[9px] font-bold ${
              modelHealth === 'Ready' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' : 
              modelHealth === 'Failed' ? 'bg-rose-950/80 text-rose-300 border-rose-500/50' :
              'bg-slate-900/80 text-slate-300 border-slate-500/50'
            }`}>
               {modelHealth === 'Processing' ? <Loader2 size={9} className="animate-spin" /> : 
                modelHealth === 'Failed' ? <AlertCircle size={9} /> : <Zap size={9} />}
               <span>Q: {modelHealth.toUpperCase()}</span>
            </span>
          )}
        </div>

        {/* Agent Editing Feature Badges */}
        <div className="flex items-center gap-1.5">
          <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-cyan-500/30 text-cyan-300 text-[9px]">
            <Layers size={9} />
            <span>BIMA: Multi-Scene Assembled</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-amber-500/30 text-amber-300 text-[9px]">
            <Subtitles size={9} />
            <span>BAYU: Kinetic Subtitles</span>
          </span>
          {src && (
            <a
              href={src}
              download="neurona-video-master.mp4"
              className="p-1 rounded bg-black/60 hover:bg-rose-900 border border-white/20 hover:border-rose-400 text-slate-200 hover:text-white transition cursor-pointer"
              title="Unduh MP4 Master Video"
            >
              <Download size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Main Video or Motion Image Display Area */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
        {show360View && displayImage ? (
          <InteractiveProduct360Viewer imageSrc={displayImage} />
        ) : isVideoFile ? (
          <video
            ref={videoRef}
            src={src!}
            autoPlay={isPlaying}
            loop={!(status === 'COMPLETED' && scenes && scenes.length > 1)}
            muted={isMuted}
            playsInline
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setVideoError(true)}
            onEnded={() => {
              if (status === 'COMPLETED' && scenes && scenes.length > 1) {
                const nextIdx = (activeSceneIndex + 1) % scenes.length;
                if (onSelectScene) onSelectScene(nextIdx);
              }
            }}
            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-100' : 'scale-102 opacity-90'}`}
          />
        ) : displayImage ? (
          /* Animated Motion Visual Frame for Images or Keyframe Motion */
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={displayImage}
              alt="Visual Adegan AI"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-all duration-1000 ${
                isPlaying ? 'scale-105 animate-pulse filter brightness-105' : 'scale-100 brightness-90'
              }`}
            />
            {/* Ambient Cyberpunk Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
            <div className="absolute top-12 left-3 p-1.5 rounded-lg bg-black/70 border border-cyan-500/30 backdrop-blur-md text-[10px] text-cyan-200 flex items-center gap-1.5 z-10">
              <Sparkles size={11} className="text-amber-400 animate-spin" />
              <span>Cinematic AI Motion Keyframe</span>
            </div>
          </div>
        ) : isGenerating ? (
          /* Processing Multi-Agent Pipeline Loader State */
          <div className="flex flex-col items-center justify-center text-center p-6 text-cyan-300 space-y-3 z-10">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-rose-500/30 border-t-rose-400 animate-spin" />
              <Zap size={22} className="text-amber-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="font-mono text-xs font-bold text-rose-300 uppercase tracking-widest flex items-center justify-center gap-1">
                <span>AGEN: {activeAgent}</span>
              </div>
              <div className="text-[11px] text-slate-200 max-w-sm font-medium">
                {currentPhaseName || 'Sedang memproses video & menyusun subtitle...'}
              </div>
            </div>
            {/* Smooth glowing progress bar */}
            <div className="w-56 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-rose-500/40 p-0.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 shadow-[0_0_14px_#f43f5e] transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        ) : isFailed ? (
          /* Failed State */
          <div className="flex flex-col items-center justify-center text-center p-6 text-rose-400 space-y-2 z-10">
            <AlertCircle className="w-10 h-10 stroke-[1.5] text-rose-500 animate-bounce" />
            <h4 className="font-bold text-xs text-white">Gagal Merender Video</h4>
            <p className="text-[10px] text-slate-400 max-w-xs">Terjadi kendala pada pipeline video AI. Silakan coba ulang eksekusi adegan.</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-lg shadow-rose-600/40 transition cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Coba Ulang (Retry)</span>
              </button>
            )}
          </div>
        ) : (
          /* Standby State */
          <div className="flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2 z-10">
            <Film className="w-10 h-10 stroke-[1.5] text-slate-600 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">Layar Kesatuan Video Master & Subtitle AI</span>
            <span className="text-[10px] text-slate-500 max-w-xs">
              Pilih adegan atau jalankan "Mulai Render Video" untuk membuat kesatuan video utuh lengkap dengan subtitle animasi.
            </span>
          </div>
        )}

        {/* 💬 Dynamic Kinetic Subtitle Banner Overlay (BAYU Viral Content Editor Engine) */}
        {showSubtitles && currentCaption && (isVideoFile || displayImage) && (
          <div className="absolute bottom-12 inset-x-4 z-20 flex justify-center pointer-events-none">
            <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-amber-400/50 backdrop-blur-md shadow-[0_0_20px_rgba(251,191,36,0.3)] text-center max-w-md transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs sm:text-sm font-extrabold text-amber-300 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase font-sans leading-tight">
                {currentCaption}
              </p>
              <div className="mt-0.5 text-[8px] font-mono text-cyan-400/80 flex items-center justify-center gap-1">
                <Subtitles size={8} />
                <span>BAYU SUBTITLE ENGINE • SCENE {(activeSceneIndex || 0) + 1}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Scene Timeline Assembly Playlist Selector */}
      {scenes && scenes.length > 1 && (
        <div className="absolute inset-x-0 bottom-10 z-20 px-2 py-1 bg-black/85 border-t border-white/10 backdrop-blur-md flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[9px] font-mono text-slate-400 hidden sm:inline flex items-center gap-1 pr-1">
            <Layers size={10} className="text-cyan-400" />
            <span>ALUR ADEGAN:</span>
          </span>
          {scenes.map((sc, idx) => (
            <button
              key={sc.id || idx}
              onClick={() => onSelectScene?.(idx)}
              className={`px-2 py-0.5 rounded text-[9px] font-mono transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeSceneIndex === idx
                  ? 'bg-rose-600 text-white font-bold border border-rose-400 shadow-[0_0_8px_#f43f5e]'
                  : sc.videoStatus === 'COMPLETED'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-900'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <span>{idx + 1}. {sc.title || `Adegan ${idx + 1}`}</span>
              {sc.videoStatus === 'COMPLETED' && <CheckCircle2 size={8} className="text-emerald-400" />}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Interactive Controls Bar */}
      {(isVideoFile || displayImage) && (
        <div className="absolute inset-x-0 bottom-0 z-20 p-2 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition duration-300">
          <div className="flex items-center gap-1.5">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition cursor-pointer"
              title={isPlaying ? "Jeda" : "Putar"}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>

            {isVideoFile && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition cursor-pointer"
                title={isMuted ? "Aktifkan Suara" : "Bisukan"}
              >
                {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
            )}

            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1 transition cursor-pointer ${
                showSubtitles 
                  ? 'bg-amber-950/90 text-amber-300 border-amber-500/50 font-bold' 
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Tampilkan / Sembunyikan Subtitle Animasi"
            >
              <Subtitles size={12} />
              <span className="hidden sm:inline">{showSubtitles ? 'Subtitle On' : 'Subtitle Off'}</span>
            </button>

            {displayImage && (
              <button
                onClick={() => setShow360View(!show360View)}
                className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1 transition cursor-pointer ${
                  show360View 
                    ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50 font-bold' 
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="360° Interactive Product View"
              >
                <Box size={12} />
                <span className="hidden sm:inline">360 View</span>
              </button>
            )}

            {voiceoverText && (
              <button
                onClick={handleSpeakVoice}
                className="p-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 transition cursor-pointer text-[10px] flex items-center gap-1"
                title="Dengarkan Suara Narasi AI"
              >
                <Volume1 size={12} className={isSpeaking ? 'animate-bounce text-rose-400' : ''} />
                <span className="hidden sm:inline">{isSpeaking ? 'Playing Voice...' : 'Narasi'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-300">
            {(title || subtitle) && (
              <span className="font-mono text-cyan-300 truncate max-w-[140px] sm:max-w-[200px]">
                {subtitle || title}
              </span>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition cursor-pointer"
              title="Layar Penuh"
            >
              <Maximize2 size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
