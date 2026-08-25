import { GalleryModal } from './components/GalleryModal';
import { Wallet, Key, Coins } from 'lucide-react';

import React, { useState, useEffect, useRef } from 'react';
import { VideoPreviewPlayer } from './components/VideoPreviewPlayer';
import { 
  Mic, 
  Zap, 
  Play, 
  Pause,
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Film, 
  Download, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sliders,
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  ShoppingBag,
  X,
  Copy,
  Check,
  Tag,
  Flame,
  Layers,
  FileText,
  BookOpen,
  GraduationCap,
  Palette,
  Globe,
  Radio,
  Tv,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { 
  ProductionProject, 
  Scene, 
  ProductAsset, 
  AffiliateConfig, 
  AnimationConfig, 
  EducationalConfig,
  VideoType 
} from './shared/types';
import FounderControlCenter from './FounderControlCenter';
import VideoTimeline from './components/VideoTimeline';
import AffiliateConfigModal from './components/AffiliateConfigModal';
import { AnimationConfigModal } from './components/AnimationConfigModal';
import { EducationalConfigModal } from './components/EducationalConfigModal';
import { HolographicHudNode } from './components/HolographicHudNode';
import { LandingPage } from './components/LandingPage';
import { AuthModal, UserSessionData } from './components/AuthModal';
import { neuronaVoice } from './utils/speechSynthesis';

type CoreState = 'IDLE' | 'AWAKENING' | 'LISTENING' | 'THINKING' | 'EXECUTING' | 'WAITING_FOR_USER' | 'SUCCESS' | 'ERROR';

// Feature Flag
const ENABLE_CLAP_ACTIVATION = false;

function useClapDetector(onClap: () => void) {
  useEffect(() => {
    if (!ENABLE_CLAP_ACTIVATION) return;
    
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let dataArray: Uint8Array;
    let animationId: number;

    const startDetection = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        let lastClapTime = 0;
        let clapCount = 0;

        const detect = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;

          if (average > 75) {
            const now = Date.now();
            if (now - lastClapTime < 400 && now - lastClapTime > 60) {
              clapCount++;
              if (clapCount >= 1) {
                onClap();
                clapCount = 0;
              }
            } else {
              clapCount = 1;
            }
            lastClapTime = now;
          }

          animationId = requestAnimationFrame(detect);
        };
        detect();

      } catch (err) {
        console.warn("Microphone access denied or unavailable for clap detection.");
      }
    };

    startDetection();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext) audioContext.close();
    };
  }, [onClap]);
}

import { FinalContentDashboard } from './components/FinalContentDashboard';

export default function App() {
  const [showGallery, setShowGallery] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname || '/');
  const [currentView, setCurrentView] = useState<'STUDIO' | 'HUD_NODE' | 'TIMELINE'>('HUD_NODE');
  const [prompt, setPrompt] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<ProductionProject | null>(null);
  const [providerInfo, setProviderInfo] = useState<{provider: string, isMock: boolean, status: string} | null>(null);

  // User Authentication & Session State
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(() => {
    try {
      const saved = localStorage.getItem('neuronna_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'user' | 'founder' | 'buy'>('user');

  const handleLoginSuccess = (user: UserSessionData, token: string) => {
    setCurrentUser(user);
    if (user.role === 'founder' && authModalMode === 'founder') {
      window.history.pushState({}, '', '/founder');
      setCurrentRoute('/founder');
    } else {
      window.history.pushState({}, '', '/studio');
      setCurrentRoute('/studio');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('neuronna_user_session');
    localStorage.removeItem('neuronna_auth_token');
    setCurrentUser(null);
    window.history.pushState({}, '', '/');
    setCurrentRoute('/');
  };
  
  const [isAwake, setIsAwake] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [conversationalMessage, setConversationalMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(neuronaVoice.getMuted());

  // Modal states
  const [attachedAssets, setAttachedAssets] = useState<ProductAsset[]>([]);
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [isAnimationModalOpen, setIsAnimationModalOpen] = useState(false);
  const [isEducationalModalOpen, setIsEducationalModalOpen] = useState(false);
  const [isFinalDashboardOpen, setIsFinalDashboardOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Video Player state
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Voice synthesis subscriber
  useEffect(() => {
    const unsub = neuronaVoice.subscribe((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => unsub();
  }, []);

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        const nextRoute = currentRoute === '/founder' ? '/' : '/founder';
        window.history.pushState({}, '', nextRoute);
        setCurrentRoute(nextRoute);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'H' || e.key === 'h')) {
        e.preventDefault();
        setCurrentView(prev => prev === 'HUD_NODE' ? 'STUDIO' : 'HUD_NODE');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRoute]);
  
  useClapDetector(() => {
    if (!isAwake && !project) {
      setIsAwake(true);
      const msg = "Hello Bos. Ada yang bisa saya bantu?";
      setConversationalMessage(msg);
      neuronaVoice.speak(msg);
    }
  });

  useEffect(() => {
    fetch('/api/providers/status')
      .then(r => r.json())
      .then(setProviderInfo)
      .catch(console.error);
  }, []);

  const handleDownloadAsset = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const newAsset: ProductAsset = {
          id: Math.random().toString(36).substring(2, 9),
          type: isVideo ? 'VIDEO' : 'IMAGE',
          url,
          name: file.name,
          size: file.size
        };
        setAttachedAssets(prev => [...prev, newAsset]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachedAsset = (id: string) => {
    setAttachedAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleInteract = async (
    overridePrompt?: string, 
    overrideAssets?: ProductAsset[], 
    affiliateConfig?: AffiliateConfig,
    animationConfig?: AnimationConfig,
    educationalConfig?: EducationalConfig,
    videoType?: VideoType
  ) => {
    const currentPrompt = overridePrompt !== undefined ? overridePrompt : prompt;
    const assetsToSend = overrideAssets !== undefined ? overrideAssets : attachedAssets;
    
    if (!currentPrompt.trim() && assetsToSend.length === 0) return;
    
    setPrompt("");
    setIsThinking(true);
    setConversationalMessage(null);

    try {
      const savedVideoModel = localStorage.getItem('neurona_video_model') || 'runway';
      const savedVoiceId = localStorage.getItem('neurona_voice_id') || 'tryaudio-female-citra';
      const currentVoice = neuronaVoice.getCurrentVoice();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: currentPrompt || (assetsToSend.length > 0 ? "Buatkan video affiliate untuk produk terlampir" : "Buatkan video produksi baru"), 
          projectId,
          videoModel: savedVideoModel,
          ttsVoiceConfig: {
            provider: currentVoice.provider || (savedVoiceId.includes('eleven') ? 'elevenlabs' : 'tryaudio'),
            voiceGender: currentVoice.gender || (savedVoiceId.includes('male') ? 'male' : 'female'),
            voiceId: savedVoiceId,
            voiceName: currentVoice.name
          },
          attachedAssets: assetsToSend,
          affiliateConfig,
          animationConfig,
          educationalConfig,
          videoType: videoType || (animationConfig ? 'ANIMATION' : educationalConfig ? 'EDUCATIONAL' : affiliateConfig ? 'AFFILIATE' : undefined)
        })
      });
      const data = await res.json();
      
      if (data.response) {
        setConversationalMessage(data.response);
        neuronaVoice.speak(data.response);
      }
      
      if (data.action === 'OPEN_FOUNDER') {
        setTimeout(() => {
          window.history.pushState({}, '', '/founder');
          setCurrentRoute('/founder');
        }, 500);
      }

      if (data.action === 'TOGGLE_HUD') {
        setCurrentView('HUD_NODE');
      }

      if (data.projectId && data.projectId !== projectId) {
        setProjectId(data.projectId);
      }
    } catch (e) {
      console.error(e);
      const errMsg = "Maaf, terjadi gangguan komunikasi dengan Core.";
      setConversationalMessage(errMsg);
      neuronaVoice.speak(errMsg);
    } finally {
      setIsThinking(false);
    }
  };

  const handleApprove = async () => {
    if (!projectId) return;
    setIsThinking(true);
    try {
      await fetch(`/api/projects/${projectId}/approve`, { method: 'POST' });
      neuronaVoice.speak("Izin disetujui. Tim Agen AI Indonesia sedang merender video.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsThinking(false);
    }
  };

  const handleRetry = async () => {
    if (!projectId) return;
    setIsThinking(true);
    try {
      await fetch(`/api/projects/${projectId}/retry`, { method: 'POST' });
      neuronaVoice.speak("Mengulang eksekusi pada tahapan produksi...");
    } catch (e) {
      console.error(e);
    } finally {
      setIsThinking(false);
    }
  };

  const handleGenerateImage = async (sceneId: string) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/generate-scene-image`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId })
      });
      neuronaVoice.speak("Generate gambar adegan sedang diproses.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateAllImages = async () => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/generate-all-images`, { method: 'POST' });
      neuronaVoice.speak("Generate semua gambar adegan sedang diproses.");
    } catch (e) {
      console.error(e);
    }
  };

  // SSE Stream with auto-reconnect & interval polling fallback
  useEffect(() => {
    if (!projectId) return;
    let es: EventSource | null = null;
    let pollInterval: any = null;

    const connectSSE = () => {
      es = new EventSource(`/api/projects/${projectId}/events`);
      
      es.onmessage = (e) => {
        try {
          const update = JSON.parse(e.data);
          setProject(update);

          // Vocal alert on key milestones
          if (update.status === 'AWAITING_APPROVAL') {
            neuronaVoice.playChime('ALERT');
          } else if (update.status === 'COMPLETED') {
            neuronaVoice.playChime('SUCCESS');
          }
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };

      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
      };
    };

    connectSSE();

    // Fallback polling every 2.5 seconds to ensure UI is never stuck if SSE connection drops
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const update = await res.json();
          setProject(prev => {
            if (!prev || JSON.stringify(prev) !== JSON.stringify(update)) {
              return update;
            }
            return prev;
          });
        }
      } catch (err) {
        // ignore background poll errors
      }
    }, 2500);

    return () => {
      if (es) es.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [projectId]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const copyFullVoiceoverScript = () => {
    if (!project?.storyboard?.scenes) return;
    const script = project.storyboard.scenes
      .map((s, idx) => `[Adegan ${idx + 1} (${s.duration})]\nVisual: ${s.visualDirection}\nText Overlay: ${s.textOverlay || '-'}\nVoiceover: "${s.voiceOver || '-'}"`)
      .join('\n\n');
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Routing after all hooks are declared
  // 1. Founder Dashboard Route (Protected: only role === 'founder')
  if (currentRoute === '/founder') {
    if (currentUser?.role === 'founder') {
      return (
        <FounderControlCenter 
          onExit={() => {
            window.history.pushState({}, '', '/');
            setCurrentRoute('/');
          }} 
        />
      );
    }

    // If not founder, show Landing Page with Founder Login Modal open
    return (
      <>
        <LandingPage 
          currentUser={currentUser}
          onEnterStudio={() => {
            if (currentUser) {
              window.history.pushState({}, '', '/studio');
              setCurrentRoute('/studio');
            } else {
              setAuthModalMode('user');
              setIsAuthModalOpen(true);
            }
          }}
          onOpenFounder={() => {
            setAuthModalMode('founder');
            setIsAuthModalOpen(true);
          }}
          onOpenLogin={(mode) => {
            setAuthModalMode(mode || 'user');
            setIsAuthModalOpen(true);
          }}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={true}
          initialMode="founder"
          onClose={() => {
            window.history.pushState({}, '', '/');
            setCurrentRoute('/');
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  // 2. Default Initial / Front Page (Landing Page with WhatsApp Checkout & Rp 150.000 Pass)
  // When user opens root '/' or '/landing' or '/pricing' or when attempting to access '/studio' while unauthenticated:
  if (currentRoute !== '/studio' || !currentUser) {
    return (
      <>
        <LandingPage 
          currentUser={currentUser}
          onEnterStudio={() => {
            if (currentUser) {
              window.history.pushState({}, '', '/studio');
              setCurrentRoute('/studio');
            } else {
              setAuthModalMode('user');
              setIsAuthModalOpen(true);
            }
          }}
          onOpenFounder={() => {
            if (currentUser?.role === 'founder') {
              window.history.pushState({}, '', '/founder');
              setCurrentRoute('/founder');
            } else {
              setAuthModalMode('founder');
              setIsAuthModalOpen(true);
            }
          }}
          onOpenLogin={(mode) => {
            setAuthModalMode(mode || 'user');
            setIsAuthModalOpen(true);
          }}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={isAuthModalOpen || (currentRoute === '/studio' && !currentUser)}
          initialMode={authModalMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            if (currentRoute === '/studio' && !currentUser) {
              window.history.pushState({}, '', '/');
              setCurrentRoute('/');
            }
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  const getCoreState = (): CoreState => {
    if (isThinking) return 'THINKING';
    if (!project) return isAwake ? 'AWAKENING' : 'IDLE';
    if (project.providerError || project.error) return 'ERROR';
    if (project.status === 'COMPLETED') return 'SUCCESS';
    if (project.status === 'AWAITING_APPROVAL') return 'WAITING_FOR_USER';
    return 'EXECUTING';
  };

  const getNeuronaMessage = () => {
    if (conversationalMessage) return conversationalMessage;
    if (isThinking) return "Sedang menganalisis brief dan merancang formula visual...";
    if (!project) {
      return isAwake 
        ? "Saya siap. Pilih studio Animasi 3D, Video Edukasi, atau Affiliate di atas." 
        : "NEURONA siap memproduksi Video Animasi, Edukasi, dan Affiliate.";
    }
    
    if (project.providerError) {
      return `Kendala pada provider ${project.providerError.provider}: ${project.providerError.message}`;
    }

    switch (project.status) {
      case 'BRIEFING':
        return project.videoType === 'ANIMATION'
          ? "Creative Strategist & World Architect sedang merancang alur cerita animasi..."
          : project.videoType === 'EDUCATIONAL'
          ? "Master Pedagogy sedang merancang konsep pembelajaran & analogi visual..."
          : "Creative Strategist sedang merumuskan strategi konversi & formula hook affiliate...";
      case 'STORYBOARDING':
        return project.videoType === 'ANIMATION'
          ? "Storyboard Director sedang merancang adegan 3D/Anime, sudut kamera, dan dialog karakter..."
          : project.videoType === 'EDUCATIONAL'
          ? "Storyboard Director sedang menyusun diagram infografis & teks bab pembelajaran..."
          : "Storyboard Director sedang merancang adegan, sticker caption, dan script voiceover...";
      case 'AWAITING_APPROVAL':
        return "Storyboard & naskah adegan siap ditinjau. Tekan 'Mulai Render' untuk memproses adegan video.";
      case 'PRODUCING':
        return "Sora Video Director sedang merender visual adegan demi adegan...";
      case 'COMPLETED':
        return `Selesai, Bos. Video ${project.videoType?.toLowerCase()} sudah siap diputar & diunduh!`;
      case 'FAILED':
        return "Terjadi kendala dalam proses produksi.";
      default:
        return "Memproses orchestrasi multi-agent...";
    }
  };

  const completedScenes = project?.storyboard?.scenes?.filter(s => s.status === 'COMPLETED' && (s.videoUrl || s.assetUrl)) || [];
  const currentScene = project?.storyboard?.scenes?.[selectedSceneIndex];
  const activeVideoSrc = currentScene?.videoUrl || currentScene?.assetUrl || project?.finalVideoUrl || (completedScenes.length > 0 ? (completedScenes[0].videoUrl || completedScenes[0].assetUrl) : null);

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-full bg-[#030303] text-[#E0E0E0] font-sans overflow-hidden selection:bg-indigo-500/30 relative"
    >
      {/* Modals */}
      <AffiliateConfigModal
        isOpen={isAffiliateModalOpen}
        onClose={() => setIsAffiliateModalOpen(false)}
        onSubmit={(config, assets, p) => handleInteract(p, assets, config, undefined, undefined, 'AFFILIATE')}
      />

      <AnimationConfigModal
        isOpen={isAnimationModalOpen}
        onClose={() => setIsAnimationModalOpen(false)}
        onSubmit={(config, p) => handleInteract(p, undefined, undefined, config, undefined, 'ANIMATION')}
      />

      <EducationalConfigModal
        isOpen={isEducationalModalOpen}
        onClose={() => setIsEducationalModalOpen(false)}
        onSubmit={(config, p) => handleInteract(p, undefined, undefined, undefined, config, 'EDUCATIONAL')}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-indigo-950/80 backdrop-blur-md border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <ImageIcon size={48} className="text-indigo-400 mb-3 animate-bounce" />
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Lepaskan File Foto / Video di Sini</h2>
          <p className="text-xs text-indigo-300 mt-1">Aset akan otomatis ditambahkan ke brief produksi AI</p>
        </div>
      )}

      {/* VIEW CONTENT */}
      {currentView === 'TIMELINE' ? (
        <VideoTimeline onBack={() => setCurrentView('STUDIO')} />
      ) : currentView === 'HUD_NODE' ? (
        <HolographicHudNode 
          project={project} 
          prompt={prompt}
          setPrompt={setPrompt}
          isThinking={isThinking}
          conversationalMessage={conversationalMessage}
          attachedAssets={attachedAssets}
          onUploadAssets={handleFileUpload}
          onRemoveAsset={removeAttachedAsset}
          onInteract={handleInteract}
          onApprove={handleApprove}
          onRetry={handleRetry}
          onOpenAffiliateModal={() => setIsAffiliateModalOpen(true)}
          onOpenAnimationModal={() => setIsAnimationModalOpen(true)}
          onOpenEducationalModal={() => setIsEducationalModalOpen(true)}
          onOpenFounder={() => {
            window.history.pushState({}, '', '/founder');
            setCurrentRoute('/founder');
          }}
          onOpenLanding={() => {
            window.history.pushState({}, '', '/');
            setCurrentRoute('/');
          }}
          onSwitchToStudio={() => setCurrentView('STUDIO')}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      ) : (
        /* STANDARD WORKSPACE VIEW */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* TOP HEADER / STATUS BAR */}
          <div className="h-14 shrink-0 flex items-center justify-between px-6 z-20 border-b border-white/5 bg-[#080808]/90 backdrop-blur-md">
            
            {/* Left: Brand & Active Mode Badge */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  setCurrentRoute('/');
                }}
                className="text-xs uppercase tracking-widest font-bold text-white flex items-center gap-1.5 hover:text-indigo-300 transition-colors cursor-pointer"
                title="Kembali ke Landing Page (Halaman Utama)"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                NEURONA
              </button>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                AI Video OS
              </span>

              {project?.videoType === 'ANIMATION' && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>Animasi Studio</span>
                </span>
              )}

              {project?.videoType === 'EDUCATIONAL' && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1">
                  <BookOpen size={11} />
                  <span>Edukasi Studio</span>
                </span>
              )}

              {project?.videoType === 'AFFILIATE' && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1">
                  <ShoppingBag size={11} />
                  <span>Affiliate Studio</span>
                </span>
              )}
            </div>
            
            {/* Center: Quick Studio Launchers */}
            <div className="hidden md:flex items-center gap-2">
              <button
                id="btn-open-anim-studio"
                onClick={() => setIsAnimationModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400 text-[10px] font-mono uppercase text-cyan-300 transition-all cursor-pointer shadow-sm"
              >
                <Palette size={12} className="text-cyan-400" />
                <span>Studio Animasi</span>
              </button>

              <button
                id="btn-open-edu-studio"
                onClick={() => setIsEducationalModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 hover:border-emerald-400 text-[10px] font-mono uppercase text-emerald-300 transition-all cursor-pointer shadow-sm"
              >
                <GraduationCap size={12} className="text-emerald-400" />
                <span>Studio Edukasi</span>
              </button>

              <button
                id="btn-open-aff-studio"
                onClick={() => setIsAffiliateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 hover:border-amber-400 text-[10px] font-mono uppercase text-amber-300 transition-all cursor-pointer shadow-sm"
              >
                <ShoppingBag size={12} className="text-amber-400" />
                <span>Studio Affiliate</span>
              </button>

              {/* Timeline Editor Switcher */}
              <button
                id="btn-toggle-timeline-view"
                onClick={() => setCurrentView('TIMELINE')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 text-[10px] font-mono uppercase transition-all cursor-pointer shadow-sm"
              >
                <Layers size={12} />
                <span>Timeline Editor</span>
              </button>

              {/* Holographic HUD Node Switcher */}
              <button
                id="btn-toggle-hud-view"
                onClick={() => setCurrentView('HUD_NODE')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/40 bg-slate-900 hover:bg-slate-800 text-cyan-400 text-[10px] font-mono uppercase transition-all cursor-pointer shadow-sm"
              >
                <Radio size={12} />
                <span>Kembali ke Node Matrix</span>
              </button>
            </div>

            {/* Right: Sound / Founder / Provider Info */}
            <div className="flex items-center gap-2.5">
              <button
                id="btn-voice-toggle-global"
                onClick={() => {
                  const muted = neuronaVoice.toggleMute();
                  setVoiceMuted(muted);
                  if (!muted) {
                    neuronaVoice.speak("Suara respon NEURONA aktif.");
                  }
                }}
                className={`p-1.5 rounded-full border transition-colors ${
                  !voiceMuted 
                    ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300' 
                    : 'bg-[#111] border-[#222] text-gray-500'
                }`}
                title={voiceMuted ? "Aktifkan Respon Suara AI" : "Matikan Respon Suara AI"}
              >
                {!voiceMuted ? <Volume2 size={13} className="text-indigo-400" /> : <VolumeX size={13} />}
              </button>

              {providerInfo && (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-gray-400 bg-[#0A0A0A] border border-[#222] px-2.5 py-1 rounded-full">
                  <span className={`w-1.5 h-1.5 rounded-full ${providerInfo.status === 'READY' ? 'bg-indigo-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span className="uppercase">{providerInfo.provider}</span>
                </div>
              )}
              
              <button 
                id="btn-landing-pricing-access"
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  setCurrentRoute('/');
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-[10px] font-mono font-bold uppercase text-amber-300 transition-all cursor-pointer shadow-sm"
                title="Buka Landing Page"
              >
                <Flame size={12} className="text-amber-400 fill-amber-400" />
                <span>Beranda</span>
              </button>

              <button 
                onClick={() => setShowGallery(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A0A0A] hover:bg-[#141414] border border-[#222] hover:border-cyan-500/40 text-[10px] font-mono uppercase text-gray-400 hover:text-cyan-300 transition-colors"
                title="Buka Galeri Video"
              >
                <Film size={11} />
                <span className="hidden sm:inline">Galeri</span>
              </button>

              {currentUser && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono">
                  <span className="text-gray-300 truncate max-w-[100px]">{currentUser.name}</span>
                  <span className="text-cyan-400 font-bold">
                    {currentUser.role === 'founder' ? '👑' : `${currentUser.credits} Cr`}
                  </span>
                </div>
              )}
              
              {currentUser?.role === 'founder' && (
                <button 
                  id="btn-founder-access"
                  onClick={() => {
                    window.history.pushState({}, '', '/founder');
                    setCurrentRoute('/founder');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-[10px] font-mono uppercase text-purple-200 hover:text-white transition-colors"
                  title="Founder Control Center"
                >
                  <Sliders size={11} className="text-purple-400" />
                  <span className="hidden sm:inline">Founder</span>
                </button>
              )}

              <button
                id="btn-workspace-logout"
                onClick={handleLogout}
                className="p-1.5 rounded-full bg-[#0A0A0A] hover:bg-red-950/40 border border-[#222] hover:border-red-500/40 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Logout / Keluar"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* LEFT: ORCHESTRATION PIPELINE & CHAT INTERACTION */}
          <div className="flex-1 flex flex-col justify-between p-6 md:p-8 max-w-3xl overflow-y-auto">
            
            {/* Top Interactive Area */}
            <div className="space-y-6">
              
              {/* Neurona Core Avatar & Status */}
              <div className="flex items-start space-x-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    isThinking 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 animate-pulse' 
                      : project?.status === 'COMPLETED'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20'
                      : 'bg-gradient-to-br from-indigo-600 to-slate-800 border border-indigo-500/30'
                  }`}>
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  {isSpeaking && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white tracking-wide">NEURONA Core</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
                      {getCoreState()}
                    </span>
                  </div>

                  {/* Conversational Message with Voice Replay */}
                  <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 rounded-2xl p-4 text-sm text-gray-200 leading-relaxed shadow-lg backdrop-blur-sm">
                    <p>{getNeuronaMessage()}</p>
                    
                    {/* Voice Replay Button */}
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                      <button
                        onClick={() => neuronaVoice.speak(getNeuronaMessage())}
                        className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                      >
                        <Volume2 size={12} className={isSpeaking ? 'animate-bounce' : ''} />
                        <span>{isSpeaking ? 'Sedang Berbicara...' : 'Dengarkan Respon Suara'}</span>
                      </button>

                      {project?.title && (
                        <span className="text-[10px] font-mono text-gray-500 truncate max-w-[200px]">
                          {project.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Agent Orchestration Chain */}
              {project && (
                <div className="space-y-3 bg-black/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <span>Autonomous Agents Pipeline</span>
                    <span className="text-[10px] font-mono text-indigo-400">
                      {project.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {Object.entries(project.agentStatus || {}).map(([name, status]) => {
                      const isActive = status === 'WORKING';
                      const isDone = status === 'COMPLETE';
                      const isFailed = status === 'FAILED';

                      return (
                        <div 
                          key={name}
                          className={`p-2 rounded-xl border flex items-center justify-between transition ${
                            isActive 
                              ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200 shadow-md shadow-indigo-950' 
                              : isDone 
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                              : isFailed
                              ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                              : 'bg-white/[0.02] border-white/5 text-gray-500'
                          }`}
                        >
                          <span className="truncate font-medium text-[11px]">{name}</span>
                          {isActive ? (
                            <RefreshCw size={11} className="animate-spin text-indigo-400 shrink-0 ml-1" />
                          ) : isDone ? (
                            <CheckCircle2 size={11} className="text-emerald-400 shrink-0 ml-1" />
                          ) : isFailed ? (
                            <AlertCircle size={11} className="text-rose-400 shrink-0 ml-1" />
                          ) : (
                            <Clock size={11} className="text-gray-600 shrink-0 ml-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Storyboard Approval Gate */}
              {project?.status === 'AWAITING_APPROVAL' && project.storyboard && (
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Storyboard Ready for Review
                      </span>
                    </div>
                    <button
                      onClick={copyFullVoiceoverScript}
                      className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/40 text-[10px] text-amber-300 hover:text-white flex items-center gap-1 transition"
                    >
                      {copiedScript ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedScript ? 'Tersalin' : 'Salin Semua Naskah'}</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {project.storyboard.scenes.map((sc, idx) => {
                      const imgSource = sc.imageUrl; // only use generated imageUrl, not assetUrl which might be product lock
                      return (
                      <div key={sc.id || idx} className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs flex flex-col md:flex-row gap-3">
                        {/* Thumbnail Container */}
                        <div className="shrink-0 w-full md:w-32 aspect-video md:aspect-[4/3] bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col relative group">
                          {imgSource ? (
                            <>
                              <img src={imgSource} alt={`Scene ${idx+1}`} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => handleDownloadAsset(imgSource, `Scene_${idx+1}_Visual.jpg`)}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Download Gambar"
                              >
                                <div className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700">
                                  <Download size={14} />
                                </div>
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1 bg-black/50">
                              <ImageIcon size={14} className="opacity-50" />
                              {sc.imageStatus === 'GENERATING' ? (
                                <span className="text-[8px] uppercase tracking-wider font-bold animate-pulse text-indigo-400">Generating...</span>
                              ) : (
                                <>
                                  <span className="text-[8px] uppercase tracking-wider font-bold">Visual Pending</span>
                                  <button onClick={() => handleGenerateImage(sc.id)} className="mt-1 px-2 py-0.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 rounded border border-indigo-500/30 text-[8px] font-bold">
                                    Generate
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Content Container */}
                        <div className="flex-1 space-y-1.5 flex flex-col justify-center">
                          <div className="flex items-center justify-between text-gray-400 text-[10px]">
                            <span className="font-bold text-amber-400">Adegan {idx + 1} ({sc.duration})</span>
                            {sc.textOverlay && <span className="text-indigo-300 font-mono">[{sc.textOverlay}]</span>}
                          </div>
                          <p className="text-gray-300 text-[11px] leading-relaxed">{sc.visualDirection}</p>
                          {sc.voiceOver && (
                            <p className="text-emerald-400/90 text-[11px] italic mt-1">🎙️ "{sc.voiceOver}"</p>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>

                  <div className="pt-2 flex flex-wrap justify-end gap-2">
                    <button
                      onClick={handleGenerateAllImages}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ImageIcon size={13} />
                      Generate Semua Gambar
                    </button>
                    <button
                      id="btn-approve-storyboard"
                      onClick={() => handleInteract("lanjut")}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-indigo-500 hover:from-amber-300 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Play size={13} fill="currentColor" />
                      Mulai Render Video
                    </button>
                  </div>
                </div>
              )}

              {/* Error & Retry Gate */}
              {project?.status === 'FAILED' && (
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-center justify-between text-xs text-rose-200">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{project.error || project.providerError?.message || "Terjadi kesalahan pada tahap produksi."}</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 transition"
                  >
                    <RotateCcw size={12} />
                    Coba Lagi
                  </button>
                </div>
              )}

            </div>

            {/* Bottom Prompt Input Bar */}
            <div className="pt-4 space-y-2">
              
              {/* Attached Assets Chips */}
              {attachedAssets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachedAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300">
                      {asset.type === 'IMAGE' ? <ImageIcon size={11} className="text-indigo-400" /> : <VideoIcon size={11} className="text-amber-400" />}
                      <span className="truncate max-w-[120px]">{asset.name}</span>
                      <button onClick={() => removeAttachedAsset(asset.id)} className="text-gray-500 hover:text-white">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative flex items-center bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-xl focus-within:border-indigo-500 transition">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files)}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-gray-400 hover:text-white transition"
                  title="Unggah Foto/Video Produk"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  id="chat-prompt-input"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isThinking && handleInteract()}
                  placeholder="Ketik instruksi video (misal: 'buat video animasi 3D robot', 'video edukasi fisika', 'lanjut')..."
                  className="flex-1 bg-transparent px-2 py-3.5 text-sm text-white placeholder-gray-500 outline-none"
                  disabled={isThinking}
                />

                <button
                  id="chat-send-btn"
                  onClick={() => handleInteract()}
                  disabled={isThinking || (!prompt.trim() && attachedAssets.length === 0)}
                  className="mr-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white transition shadow-md shadow-indigo-600/30"
                >
                  <Zap size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                <span>Tekan <kbd className="font-mono text-[10px] bg-white/5 px-1 py-0.5 rounded">Enter</kbd> untuk mengeksekusi</span>
                <button 
                  onClick={() => setCurrentView('HUD_NODE')} 
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Radio size={10} />
                  Buka Tampilan Holographic HUD Node
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT: VIDEO STAGE & SCENE BROWSER */}
          <div className="w-full md:w-[420px] lg:w-[480px] shrink-0 border-l border-white/5 bg-[#060606] p-6 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-4">
              
              {/* Video Player Display */}
              <VideoPreviewPlayer
                src={activeVideoSrc}
                posterImage={currentScene?.imageUrl || currentScene?.assetUrl}
                title={currentScene?.title || `Adegan ${(selectedSceneIndex || 0) + 1}`}
                subtitle={currentScene?.subtitle || currentScene?.textOverlay}
                voiceoverText={currentScene?.voiceOver}
                status={project?.status}
                activeAgent={project?.activeAgent || 'GATOTKACA SORA'}
                progressPercentage={project?.overallProgress || 0}
                currentPhaseName={project?.currentPhaseName}
                scenes={project?.storyboard?.scenes}
                activeSceneIndex={selectedSceneIndex}
                onSelectScene={(idx) => setSelectedSceneIndex(idx)}
                onRetry={handleRetry}
              />

              {/* Scene Breakdown & Script */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <span>Adegan Storyboard ({project?.storyboard?.scenes?.length || 0})</span>
                  {project?.videoType && (
                    <span className="text-[10px] text-indigo-400 font-mono">
                      {project.videoType}
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {project?.storyboard?.scenes?.map((scene, idx) => {
                    const isSelected = selectedSceneIndex === idx;
                    const imgSource = scene.imageUrl; // only use generated imageUrl
                    return (
                      <div
                        key={scene.id || idx}
                        onClick={() => setSelectedSceneIndex(idx)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row gap-3 ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-gray-400'
                        }`}
                      >
                        {/* Thumbnail Container */}
                        <div className="shrink-0 w-full sm:w-24 aspect-video sm:aspect-[4/3] bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col relative group">
                          {imgSource ? (
                            <>
                              <img src={imgSource} alt={`Scene ${idx+1}`} className="w-full h-full object-cover" />
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadAsset(imgSource, `Scene_${idx+1}_Visual.jpg`); }}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Download Gambar"
                              >
                                <div className="p-1.5 bg-slate-800 rounded-full text-white hover:bg-slate-700">
                                  <Download size={12} />
                                </div>
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1 bg-black/50">
                              <ImageIcon size={12} className="opacity-50" />
                              <span className="text-[7px] uppercase tracking-wider font-bold">Pending</span>
                            </div>
                          )}
                        </div>

                        {/* Content Container */}
                        <div className="flex-1 flex flex-col justify-center min-w-0">
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span className={`font-semibold truncate ${isSelected ? 'text-indigo-300' : 'text-gray-300'}`}>
                              Adegan {idx + 1} ({scene.duration})
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                              scene.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                              scene.status === 'GENERATING' ? 'bg-indigo-950 text-indigo-300 animate-pulse' :
                              'bg-gray-900 text-gray-500'
                            }`}>
                              {scene.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed mb-1">
                            {scene.visualDirection}
                          </p>
                          {scene.voiceOver && (
                            <p className="text-[11px] text-emerald-400/90 italic truncate mt-1">
                              🎙️ {scene.voiceOver}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!project?.storyboard && (
                    <div className="text-center py-6 text-xs text-gray-600">
                      Belum ada adegan yang dirancang. Mulai dengan prompt di samping.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Video Production Metadata */}
            {project && (
              <div className="pt-4 border-t border-white/5 space-y-3">
                {project.status === 'COMPLETED' && (
                  <button 
                    onClick={() => setIsFinalDashboardOpen(true)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition animate-pulse-glow"
                  >
                    <FileText size={14} /> Buka Final Content Dashboard
                  </button>
                )}
                <div className="text-[11px] text-gray-500 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Project ID:</span>
                    <span className="text-gray-400">{project.id.substring(0, 12)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Engine Model:</span>
                    <span className="text-gray-400">Gemini 2.5 Flash + Sora Video</span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
        </div>
      )}

      {/* Modals */}
      {showGallery && (
        <GalleryModal 
          onClose={() => setShowGallery(false)}
          onSelectProject={(id) => {
            setProjectId(id);
            setCurrentView('STUDIO');
          }}
        />
      )}
      {isFinalDashboardOpen && project && (
        <FinalContentDashboard 
          project={project} 
          onClose={() => setIsFinalDashboardOpen(false)} 
        />
      )}

    </div>
  );
}
