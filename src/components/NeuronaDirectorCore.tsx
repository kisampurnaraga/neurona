import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { 
  Zap, 
  Home, 
  Clapperboard, 
  Layers, 
  Tv, 
  FolderGit2, 
  Bot, 
  BarChart3, 
  Settings, 
  Crown, 
  Paperclip, 
  Mic, 
  Send, 
  Lightbulb, 
  ImageIcon, 
  Volume2, 
  Music, 
  Scissors, 
  Rocket, 
  Plus, 
  User, 
  Film,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Eye,
  Lock,
  Key,
  ArrowRight,
  Check,
  PenLine,
  Play
} from 'lucide-react';
import { motion } from 'motion/react';
import type { ProductionProject, ProductAsset } from '../shared/types';
import { neuronaVoice } from '../utils/speechSynthesis';
import { KeyRotatorModal } from './KeyRotatorModal';

interface NeuronaDirectorCoreProps {
  project: ProductionProject | null;
  prompt: string;
  setPrompt: (p: string) => void;
  isThinking: boolean;
  onInteract: (customPrompt?: string) => void;
  onUploadAssets: (files: FileList | null) => void;
  handleOpenStoryboard: () => void;
  onOpenStudioSelector?: () => void;
  onOpenVisualStudio: () => void;
  onOpenScriptWriter: () => void;
  onOpenAudioStudio: () => void;
  onOpenTimeline: () => void;
  onOpenRenderGallery: () => void;
  onOpenContentCreator: () => void;
  onOpenTopUp: () => void;
  onOpenLanding: () => void;
  onOpenFounder?: () => void;
  onOpenProfile?: () => void;
  currentUser?: any;
  userCredits?: number;
  onResetProject?: () => void;
}

export const NeuronaDirectorCore: React.FC<NeuronaDirectorCoreProps> = ({
  project,
  prompt,
  setPrompt,
  isThinking,
  onInteract,
  onUploadAssets,
  onOpenStoryboard,
  onOpenStudioSelector,
  onOpenVisualStudio,
  onOpenScriptWriter,
  onOpenAudioStudio,
  onOpenTimeline,
  onOpenRenderGallery,
  onOpenContentCreator,
  onOpenTopUp,
  onOpenLanding,
  onOpenFounder,
  onOpenProfile,
  currentUser,
  userCredits = 37,
  onResetProject
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'studio' | 'storyboard' | 'video_os' | 'assets' | 'projects' | 'ai_agents' | 'analytics' | 'settings'>('home');
  const [activeMobileTab, setActiveMobileTab] = useState<'home' | 'studio' | 'projects' | 'profile'>('home');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isRotatorOpen, setIsRotatorOpen] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Speech Recognition (Voice Input) & Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceRhythm, setVoiceRhythm] = useState(0);
  const [isHypeActive, setIsHypeActive] = useState(false);
  const prevSpeakingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isFounder = currentUser?.role === 'founder';

  // --- GRANULAR STATE MACHINE & REAL-TIME AUDIO ---
  type HubState = 'IDLE' | 'THINKING' | 'WRITING' | 'STORYBOARDING' | 'READY' | 'COMPLETED';
  const [hasDismissedBanner, setHasDismissedBanner] = useState(false);
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const [waveform, setWaveform] = useState<number[]>(Array(12).fill(0));

  const handleOpenStoryboard = () => {
    setHasDismissedBanner(true);
    setShowReadyBanner(false);
    onOpenStoryboard();
  };

  // Determine active production phase for live orbital nodes
  let hubState: HubState = 'IDLE';
  if (project?.status === 'COMPLETED') {
    hubState = 'COMPLETED';
  } else if (isThinking && !project) {
    hubState = 'THINKING';
  } else if (project) {
    if (project.status === 'FAILED') {
      hubState = 'IDLE';
    } else if (project.status === 'STORYBOARDING') {
      if (project.activeAgent === 'Creative Strategist') {
        hubState = 'THINKING';
      } else if (project.activeAgent === 'Storyboard Director') {
        // If progress is near 50 but not AWAITING_APPROVAL, it's storyboarding scenes
        if (project.overallProgress && project.overallProgress > 32) {
          hubState = 'STORYBOARDING';
        } else {
          hubState = 'WRITING';
        }
      } else {
        hubState = 'WRITING';
      }
    } else if (project.status === 'AWAITING_APPROVAL') {
      hubState = 'READY';
    } else if (project.status === 'QUOTA_FALLBACK_PENDING') {
      hubState = 'IDLE';
    } else if (project.status === 'PRODUCING' || project.status === 'ASSEMBLING' || project.status === 'AUDIO' || project.status === 'EDITING' || project.status === 'QA') {
      hubState = 'STORYBOARDING';
    } else {
      hubState = 'THINKING';
    }
  }

  const isCompleted = project?.status === 'COMPLETED';
  const currentProgress = project?.overallProgress ?? project?.progress ?? 0;
  const isStoryboardReady = !isCompleted && (project?.status === 'AWAITING_APPROVAL' || currentProgress >= 50 || Boolean(project?.storyboard?.scenes && project.storyboard.scenes.length > 0));
  const isVisualGenerating = project?.storyboard?.scenes?.some((s: any) => s.imageStatus === 'GENERATING') || false;
  const isVideoGenerating = project?.storyboard?.scenes?.some((s: any) => s.videoStatus === 'GENERATING') || false;
  const isRendering = (project?.status === 'IN_PROGRESS' && currentProgress >= 50) || isVideoGenerating;

  // Show banner when storyboard is ready
  useEffect(() => {
    if ((hubState === 'READY' || isStoryboardReady) && !hasDismissedBanner) {
      setShowReadyBanner(true);
    } else {
      setShowReadyBanner(false);
    }
  }, [hubState, isStoryboardReady, hasDismissedBanner]);

  // Voice subscription & Voice waveform simulation
  useEffect(() => {
    const unsub = neuronaVoice.subscribeDetailed((state) => {
      setIsSpeaking(state.isSpeaking);
      if (state.speechCompleted) {
        setIsHypeActive(true);
        neuronaVoice.playChime('SUCCESS');
        setTimeout(() => {
          setIsHypeActive(false);
          // Automatically trigger Storyboard modal when SINTA / speech completion hype finishes
          if (isStoryboardReady || hubState === 'READY' || project?.status === 'AWAITING_APPROVAL') {
            handleOpenStoryboard();
          }
        }, 1200);
      }
    });
    return () => unsub();
  }, [isStoryboardReady, hubState, project?.status]);

  // Real-time audio analyser loop
  useEffect(() => {
    let animId: number;
    const updateWaveform = () => {
      if (isSpeaking) {
        const wf = neuronaVoice.getRealtimeWaveform();
        setWaveform(wf);
      } else {
        // Decay to 0 when not speaking
        setWaveform((prev) => prev.map(v => Math.max(0, v - 0.05)));
      }
      animId = requestAnimationFrame(updateWaveform);
    };
    animId = requestAnimationFrame(updateWaveform);
    return () => cancelAnimationFrame(animId);
  }, [isSpeaking]);

  // Fallback for speech end transition
  useEffect(() => {
    if (prevSpeakingRef.current && !isSpeaking && !isHypeActive) {
      setIsHypeActive(true);
      neuronaVoice.playChime('SUCCESS');
      const timer = setTimeout(() => {
        setIsHypeActive(false);
        if (isStoryboardReady || hubState === 'READY' || project?.status === 'AWAITING_APPROVAL') {
          handleOpenStoryboard();
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
    prevSpeakingRef.current = isSpeaking;
  }, [isSpeaking, isHypeActive, isStoryboardReady, hubState, project?.status]);

  // Robust safeguard auto-opener: If SINTA finishes and project becomes ready, ensure Storyboard opens automatically
  const hasAutoTriggeredStoryboardRef = useRef<string | null>(null);
  useEffect(() => {
    if (isStoryboardReady && project?.id && hasAutoTriggeredStoryboardRef.current !== project.id) {
      hasAutoTriggeredStoryboardRef.current = project.id;
      setIsHypeActive(true);
      neuronaVoice.playChime('SUCCESS');
      const timer = setTimeout(() => {
        setIsHypeActive(false);
        handleOpenStoryboard();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isStoryboardReady, project?.id]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setPrompt(prompt ? `${prompt.trim()} ${transcript}` : transcript);
        }
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, [prompt, setPrompt]);

  const handleToggleVoiceInput = () => {
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch (e) {}
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser belum mendukung Speech Recognition. Gunakan Chrome atau Edge.");
      return;
    }
    try {
      if (!recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'id-ID';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            setPrompt(prompt ? `${prompt.trim()} ${transcript}` : transcript);
          }
          setIsListening(false);
        };
        recognitionRef.current = recognition;
      }
      recognitionRef.current.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  // 8 Orbital Nodes Configuration
  const orbitalNodes = [
    {
      id: 'idea',
      label: 'IDEA & NASKAH',
      desc: hubState === 'WRITING' ? 'SINTA Menulis Naskah...' : 'Sutradara & Konsep',
      color: '#f59e0b', // Amber/Yellow
      glow: (hubState === 'THINKING' || hubState === 'WRITING') ? 'rgba(245, 158, 11, 0.9)' : 'rgba(245, 158, 11, 0.5)',
      border: (hubState === 'THINKING' || hubState === 'WRITING') ? 'border-amber-400 ring-2 ring-amber-400 animate-pulse' : 'border-amber-400',
      bg: (hubState === 'THINKING' || hubState === 'WRITING') ? 'bg-amber-500/30 shadow-[0_0_30px_#f59e0b]' : 'bg-amber-500/15',
      icon: Lightbulb,
      angle: -90, // Top
      isActive: hubState === 'THINKING' || hubState === 'WRITING',
      isDone: hubState === 'STORYBOARDING' || hubState === 'READY' || isCompleted,
      badge: hubState === 'WRITING' ? 'ACTIVE PRODUCING' : undefined,
      action: () => {
        const text = "Brainstorm 3 ide konsep video viral dan susun naskah sinematik lengkap";
        setPrompt(text);
        onInteract(text);
        neuronaVoice.speak("Node Ideasi Sutradara aktif. Menyusun naskah dan alur visual.");
      }
    },
    {
      id: 'storyboard',
      label: 'STORYBOARD',
      desc: hubState === 'COMPLETED' ? '100% Selesai (Video Rendered)' : hubState === 'STORYBOARDING' ? 'GATOTKACA Scene Planning' : isStoryboardReady ? '50% Selesai (Klik Tinjau Adegan)' : 'Scene Planning',
      color: isStoryboardReady ? '#10b981' : '#c084fc',
      glow: isStoryboardReady ? 'rgba(16, 185, 129, 0.95)' : hubState === 'STORYBOARDING' ? 'rgba(192, 132, 252, 0.9)' : 'rgba(192, 132, 252, 0.5)',
      border: isStoryboardReady ? 'border-emerald-400 ring-4 ring-emerald-400/80 animate-pulse shadow-[0_0_35px_#10b981]' : hubState === 'STORYBOARDING' ? 'border-purple-400 ring-2 ring-purple-400 animate-pulse' : 'border-purple-400',
      bg: isStoryboardReady ? 'bg-emerald-500/30 shadow-[0_0_30px_#10b981]' : hubState === 'STORYBOARDING' ? 'bg-purple-500/30 shadow-[0_0_30px_#c084fc]' : 'bg-purple-500/15',
      icon: Layers,
      angle: -45, // Top Right
      isActive: hubState === 'STORYBOARDING' || isStoryboardReady,
      isDone: hubState === 'READY' || isCompleted,
      badge: hubState === 'COMPLETED' ? 'FINAL (100%)' : isStoryboardReady ? 'SIAP TINJAU (KLIK)' : undefined,
      action: handleOpenStoryboard
    },
    {
      id: 'visual',
      label: 'VISUAL STUDIO',
      desc: isVisualGenerating ? 'Generating Image...' : 'Pilih Animasi / Affiliate / Edukasi',
      color: '#06b6d4', // Cyan/Teal
      glow: isVisualGenerating ? 'rgba(6, 182, 212, 0.9)' : 'rgba(6, 182, 212, 0.6)',
      border: isVisualGenerating ? 'border-cyan-400 ring-2 ring-cyan-400 animate-pulse' : 'border-cyan-400',
      bg: isVisualGenerating ? 'bg-cyan-500/30 shadow-[0_0_30px_#06b6d4]' : 'bg-cyan-500/15',
      icon: ImageIcon,
      angle: 0, // Right
      isActive: isVisualGenerating,
      isDone: currentProgress >= 70,
      badge: isVisualGenerating ? 'GENERATING' : undefined,
      action: onOpenStudioSelector || onOpenVisualStudio
    },
    {
      id: 'voice',
      label: 'VOICE TTS',
      desc: 'Neural Narration & Actor',
      color: '#3b82f6', // Blue
      glow: 'rgba(59, 130, 246, 0.6)',
      border: 'border-blue-400',
      bg: 'bg-blue-500/15',
      icon: Mic,
      angle: 45, // Bottom Right
      isActive: false,
      action: onOpenAudioStudio
    },
    {
      id: 'sound',
      label: 'SOUND & SFX',
      desc: 'Cinematic BGM & Effects',
      color: '#10b981', // Emerald
      glow: 'rgba(16, 185, 129, 0.6)',
      border: 'border-emerald-400',
      bg: 'bg-emerald-500/15',
      icon: Music,
      angle: 90, // Bottom
      isActive: false,
      action: onOpenAudioStudio
    },
    {
      id: 'edit',
      label: 'EDIT TIMELINE',
      desc: 'Non-Linear Scene Studio',
      color: '#84cc16', // Lime
      glow: 'rgba(132, 204, 22, 0.6)',
      border: 'border-lime-400',
      bg: 'bg-lime-500/15',
      icon: Scissors,
      angle: 135, // Bottom Left
      isActive: false,
      action: onOpenTimeline
    },
    {
      id: 'render',
      label: 'VIDEO RENDER',
      desc: isRendering ? 'Rendering 60fps...' : isCompleted ? 'Master 100% Selesai' : 'Cloud Video Engine',
      color: '#f97316', // Orange
      glow: isRendering ? 'rgba(249, 115, 22, 0.9)' : 'rgba(249, 115, 22, 0.6)',
      border: isRendering ? 'border-orange-400 ring-2 ring-orange-400 animate-pulse' : 'border-orange-400',
      bg: isRendering ? 'bg-orange-500/30' : 'bg-orange-500/15',
      icon: Rocket,
      angle: 180, // Left
      isActive: isRendering,
      isDone: isCompleted,
      badge: isRendering ? 'RENDERING' : isCompleted ? 'DONE 100%' : undefined,
      action: onOpenRenderGallery
    },
    {
      id: 'social',
      label: 'CONTENT CREATOR',
      desc: 'AI Planner & YouTube Analytics',
      color: '#ec4899', // Pink
      glow: 'rgba(236, 72, 153, 0.6)',
      border: 'border-pink-400',
      bg: 'bg-pink-500/15',
      icon: Tv,
      angle: -135, // Top Left
      isActive: false,
      action: () => {
        onOpenContentCreator();
      }
    }
  ];

  const recentProjects = [
    {
      id: 'proj_anim_1',
      title: project?.title || 'Volleyball Championship Final (Anime)',
      type: 'ANIMATION',
      date: 'Hari ini',
      status: isCompleted ? 'Completed' : isStoryboardReady ? 'Storyboard Ready' : 'In Production',
      thumbnail: project?.storyboard?.scenes?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'proj_aff_2',
      title: 'Smartwatch Pro Ultra - UGC TikTok',
      type: 'AFFILIATE',
      date: 'Kemarin',
      status: 'Ready',
      thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'
    }
  ];

  return (
    <div className="flex h-screen w-full bg-[#05070E] text-slate-100 overflow-hidden select-none font-sans">
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP LEFT SIDEBAR */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#090D1A]/95 border-r border-slate-800/80 p-4 justify-between z-30 shrink-0">
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 px-2 pt-1 cursor-pointer" onClick={onOpenLanding}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wider text-white">NEURONA</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  OS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-tight">AI Director Intelligence</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {[
              { id: 'home', label: 'Home Matrix', icon: Home, action: () => setActiveTab('home') },
              { id: 'studio', label: '3 Studio Hub', icon: Clapperboard, action: onOpenStudioSelector || onOpenVisualStudio },
              { id: 'storyboard', label: 'Storyboard', icon: Layers, action: handleOpenStoryboard },
              { id: 'video_os', label: 'Timeline Editor', icon: Scissors, action: onOpenTimeline },
              { id: 'assets', label: 'Upload Aset', icon: FolderGit2, action: () => fileInputRef.current?.click() },
              { id: 'projects', label: 'Daftar Proyek', icon: Film, action: onOpenTimeline },
              { id: 'ai_agents', label: '8 Tim Agen AI', icon: Bot, action: () => onInteract("Tampilkan status dan orkestrasi tim 8 Agen AI Neuronna") },
              { id: 'analytics', label: 'Top-Up Saldo', icon: BarChart3, action: onOpenTopUp },
              { id: 'settings', label: 'Profil Saya', icon: User, action: onOpenProfile || onOpenTopUp }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User / Pro Profile Card */}
        <div 
          onClick={onOpenProfile || onOpenTopUp}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900/60 border border-purple-500/30 shadow-lg relative overflow-hidden cursor-pointer hover:border-purple-500/60 transition group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold tracking-wider text-white uppercase truncate max-w-[110px]">
                {currentUser?.name || 'Kreator Pro'}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
              {currentUser?.credits !== undefined ? currentUser.credits : userCredits} Cr
            </span>
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">Member Active</p>
          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>Klik untuk buka Profil</span>
            <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </aside>

      {/* Hidden file input for quick asset uploads */}
      <input 
        ref={fileInputRef} 
        type="file" 
        multiple 
        accept="image/*,video/*" 
        className="hidden" 
        onChange={(e) => onUploadAssets(e.target.files)} 
      />

      {/* ========================================================================= */}
      {/* 2. MAIN CENTER CONTENT AREA */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#05070E] relative">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between bg-[#080B16]/90 backdrop-blur-md sticky top-0 z-20 shrink-0">
          
          {/* Mobile Logo & Title */}
          <div className="flex items-center gap-3 lg:hidden" onClick={onOpenLanding}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-wider text-white">NEURONA</span>
          </div>

          {/* Quick Studio Selection Tabs in Header */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onOpenStudioSelector || onOpenVisualStudio}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 border border-indigo-500/40 text-xs font-semibold text-indigo-300 flex items-center gap-2 transition cursor-pointer"
            >
              <Clapperboard size={14} className="text-indigo-400" />
              <span>3 Studio Produksi</span>
            </button>

            <button
              onClick={handleOpenStoryboard}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                isStoryboardReady 
                  ? 'bg-purple-600/40 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(192,132,252,0.4)] animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers size={14} className={isStoryboardReady ? 'text-purple-300' : 'text-slate-400'} />
              <span>Storyboard Matrix</span>
              {isStoryboardReady && (
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              )}
            </button>

            <button
              onClick={onOpenTimeline}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-2 transition cursor-pointer"
            >
              <Scissors size={14} className="text-lime-400" />
              <span>Timeline Video</span>
            </button>
          </div>

          {/* Right Header: Credits, Profile & Voice */}
          <div className="flex items-center gap-3">
            
            {/* Live Credits Chip */}
            <div 
              onClick={onOpenTopUp}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold cursor-pointer hover:bg-amber-500/20 transition"
              title="Klik untuk Top-Up Kredit"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>{currentUser?.credits !== undefined ? currentUser.credits : userCredits} Cr</span>
            </div>

            {/* Voice Mute / Speak Toggle */}
            <button
              onClick={() => {
                const muted = neuronaVoice.toggleMute();
                if (!muted) neuronaVoice.speak("Suara asisten sutradara Neuronna aktif.");
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Respon Suara AI"
            >
              <Volume2 size={16} className={isSpeaking ? 'text-indigo-400 animate-bounce' : ''} />
            </button>

            {/* Manual Reset Hub State Button */}
            <button
              id="header-hub-reset-btn"
              onClick={() => setShowResetConfirmModal(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Reset Tampilan Hub ke Kondisi Awal (IDLE)"
            >
              <RotateCcw size={15} className="text-slate-400 hover:text-amber-400" />
              <span className="hidden xl:inline text-xs">Reset Hub</span>
            </button>

            {/* User Profile Button (Opens UserProfileModal, NOT Founder Dashboard) */}
            <button
              id="header-user-profile-btn"
              onClick={onOpenProfile || onOpenTopUp}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer"
              title="Buka Informasi Akun & Profil"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {(currentUser?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline text-xs font-semibold text-slate-300 pr-1">
                {currentUser?.name ? currentUser.name.split(' ')[0] : 'Profil'}
              </span>
            </button>

            {/* API Rotator Pool Modal Trigger */}
            <button
              onClick={() => setIsRotatorOpen(true)}
              className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-500/10"
              title="Buka API Key Rotator Pool (Gemini & OpenAI)"
            >
              <Key size={14} className="text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">API Rotator</span>
            </button>

            {/* Founder FCC Dedicated Icon (ONLY shown if role === 'founder') */}
            {isFounder && onOpenFounder && (
              <button
                onClick={onOpenFounder}
                className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition text-xs font-bold flex items-center gap-1.5"
                title="Founder Control Center"
              >
                <Lock size={13} />
                <span className="hidden sm:inline">FCC</span>
              </button>
            )}

          </div>
        </header>

        {/* Center Main Studio & Orbit Canvas */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 flex flex-col justify-between">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* ========================================================================= */}
            {/* CENTER WORKSPACE: DIRECTOR CORE CIRCULAR ORBITAL HUB */}
            {/* ========================================================================= */}
            <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-4">
              
              {/* Header Title */}
              <div className="text-center space-y-1">
                <div className="text-[11px] font-mono tracking-widest text-indigo-400 font-semibold uppercase flex items-center justify-center gap-2">
                  <span>—•—</span>
                  <span>NEURONA DIRECTOR CORE INTELLIGENCE</span>
                  <span>—•—</span>
                </div>
                <h2 className="text-xs sm:text-sm text-slate-400">
                  {hubState === 'THINKING' ? (
                    <span className="text-indigo-400 font-semibold animate-pulse">
                      ✨ Menyusun rencana produksi...
                    </span>
                  ) : hubState === 'WRITING' ? (
                    <span className="text-amber-400 font-semibold animate-pulse">
                      ✍️ SINTA sedang menulis naskah...
                    </span>
                  ) : hubState === 'STORYBOARDING' ? (
                    <span className="text-purple-400 font-semibold animate-pulse">
                      🎬 GATOTKACA sedang menyusun storyboard...
                    </span>
                  ) : isStoryboardReady ? (
                    <span className="text-emerald-400 font-semibold">
                      ✅ Naskah & Storyboard siap!
                    </span>
                  ) : (
                    'AI Cinematic Production & Multi-Agent Matrix'
                  )}
                </h2>
              </div>

              {/* Luminous Circular Orbital Network Graphic */}
              <div className="relative w-full max-w-[440px] aspect-square flex items-center justify-center my-2">
                
                {/* Connecting SVG Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                  {orbitalNodes.map((node) => {
                    const isActive = node.isActive;
                    const isDone = node.isDone;
                    if (!isActive && !isDone && !isHypeActive) return null;
                    
                    const rad = (node.angle * Math.PI) / 180;
                    // Hub border is roughly at radius 70, Node border is roughly at radius 130
                    const x1 = 220 + Math.cos(rad) * 70;
                    const y1 = 220 + Math.sin(rad) * 70;
                    const x2 = 220 + Math.cos(rad) * 130;
                    const y2 = 220 + Math.sin(rad) * 130;

                    return (
                      <line 
                        key={`line-${node.id}`}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={node.color}
                        strokeWidth={isActive ? 3 : 1.5}
                        strokeOpacity={isActive ? 0.8 : 0.3}
                        className={isActive ? 'animate-pulse' : ''}
                      />
                    );
                  })}
                </svg>

                {/* Background Rotating Orbit Rings */}
                <div className={`absolute inset-4 rounded-full border ${(hubState === 'THINKING' || hubState === 'WRITING') ? 'border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.3)]' : hubState === 'STORYBOARDING' ? 'border-purple-500/40 shadow-[0_0_60px_rgba(192,132,252,0.3)]' : 'border-indigo-500/20 shadow-[0_0_60px_rgba(99,102,241,0.15)]'} animate-[spin_60s_linear_infinite]`} />
                <div className="absolute inset-12 rounded-full border border-purple-500/20 border-dashed animate-[spin_40s_linear_infinite_reverse]" />
                <div className="absolute inset-20 rounded-full border border-cyan-500/25" />

                {/* Central AI Director Core Disc */}
                <div 
                  onClick={() => {
                    if (isStoryboardReady || isHypeActive || hubState === 'READY') {
                      handleOpenStoryboard();
                    } else {
                      onInteract();
                    }
                  }}
                  title={isStoryboardReady ? 'Storyboard Siap — Klik untuk Membuka' : isHypeActive ? 'Membuka Storyboard...' : 'AI Director Core'}
                  style={{
                    boxShadow: isHypeActive
                      ? '0 0 80px rgba(245, 158, 11, 0.95), 0 0 40px rgba(6, 182, 212, 0.8), 0 0 120px rgba(168, 85, 247, 0.6)'
                      : isStoryboardReady
                      ? '0 0 60px rgba(16, 185, 129, 0.85), 0 0 30px rgba(6, 182, 212, 0.6)'
                      : isSpeaking
                      ? `0 0 ${35 + waveform[2] * 45}px ${(hubState === 'THINKING' || hubState === 'WRITING') ? '#f59e0b' : '#6366f1'}, 0 0 ${15 + waveform[5] * 25}px #06b6d4`
                      : undefined
                  }}
                  className={`relative z-10 w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-[#0e1630] via-[#141d3d] to-[#1e143b] border-2 ${
                    isHypeActive
                      ? 'border-amber-300 scale-110 ring-4 ring-amber-400/80 transition-all duration-300'
                      : isStoryboardReady
                      ? 'border-emerald-400 ring-4 ring-emerald-400/80 shadow-[0_0_50px_#10b981] animate-pulse'
                      : hubState === 'COMPLETED'
                      ? 'border-emerald-400 shadow-[0_0_50px_#10b981]'
                      : (hubState === 'THINKING' || hubState === 'WRITING')
                      ? 'border-amber-400 shadow-[0_0_50px_#f59e0b]'
                      : hubState === 'STORYBOARDING'
                      ? 'border-purple-400 shadow-[0_0_50px_#c084fc]'
                      : isSpeaking
                      ? 'border-cyan-400'
                      : 'border-indigo-500/60 shadow-[0_0_45px_rgba(99,102,241,0.5)]'
                  } flex flex-col items-center justify-center text-center p-3 cursor-pointer group hover:scale-105 transition-all duration-300`}
                >
                  {/* Hype Blast Rings */}
                  {isHypeActive && (
                    <>
                      <div className="absolute -inset-6 rounded-full border-2 border-amber-400 bg-amber-400/20 animate-ping pointer-events-none" />
                      <div className="absolute -inset-10 rounded-full border border-cyan-400 bg-cyan-400/10 animate-pulse pointer-events-none" />
                    </>
                  )}

                  {/* Voice Rhythm Speaking Pulse Rings */}
                  {isSpeaking && (
                    <div 
                      className="absolute rounded-full border border-cyan-400/70 pointer-events-none"
                      style={{
                        inset: -4 - waveform[0] * 15,
                        opacity: 0.3 + waveform[3] * 0.7
                      }}
                    />
                  )}

                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                    isHypeActive
                      ? 'from-amber-400 via-orange-500 to-cyan-400 shadow-[0_0_30px_#f59e0b]'
                      : hubState === 'COMPLETED'
                      ? 'from-emerald-500 to-teal-600 shadow-[0_0_20px_#10b981]'
                      : (hubState === 'THINKING' || hubState === 'WRITING')
                      ? 'from-amber-500 to-orange-600 shadow-[0_0_20px_#f59e0b]'
                      : hubState === 'STORYBOARDING'
                      ? 'from-purple-500 to-indigo-600 shadow-[0_0_20px_#c084fc]'
                      : 'from-indigo-500 to-purple-600'
                  } flex items-center justify-center shadow-lg mb-1.5 group-hover:shadow-[0_0_20px_#6366f1] transition`}>
                    {hubState === 'COMPLETED' ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : hubState === 'THINKING' ? (
                      <RefreshCw className="w-5 h-5 text-white animate-spin" />
                    ) : hubState === 'WRITING' ? (
                      <PenLine className="w-5 h-5 text-white animate-pulse" />
                    ) : isHypeActive ? (
                      <Sparkles className="w-5 h-5 text-white animate-bounce" />
                    ) : (
                      <Clapperboard className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <h3 className="text-[10px] sm:text-xs font-black tracking-wide text-white uppercase leading-tight">
                    {isHypeActive ? 'STORYBOARD READY!' : hubState === 'COMPLETED' ? 'VIDEO COMPLETED' : hubState === 'THINKING' ? 'IDEATING' : hubState === 'WRITING' ? 'WRITING SCRIPT' : hubState === 'STORYBOARDING' ? 'STORYBOARD 50%' : isSpeaking ? 'NEURONA SPEAKING' : 'AI DIRECTOR CORE'}
                  </h3>

                  {/* Audio Equalizer bars when speaking */}
                  {isSpeaking ? (
                    <div className="flex items-end gap-0.5 my-1 h-4">
                      {waveform.slice(0, 7).map((val, i) => (
                        <div 
                          key={i}
                          className="w-1 bg-cyan-400 rounded-full transition-all duration-75"
                          style={{
                            height: `${Math.max(4, val * 16)}px`
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isHypeActive ? 'bg-cyan-400' : (hubState === 'THINKING' || hubState === 'WRITING') ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                      <span className={`text-[9px] font-mono font-bold ${isHypeActive ? 'text-cyan-300' : (hubState === 'THINKING' || hubState === 'WRITING') ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {isHypeActive ? 'HYPE SUCCESS' : hubState === 'COMPLETED' ? '100% DONE' : hubState === 'WRITING' ? 'AGENT 1 ACTIVE' : isStoryboardReady ? 'REVIEW 50%' : 'READY'}
                      </span>
                    </div>
                  )}

                  <p className="text-[8px] text-slate-400 mt-0.5 max-w-[90px] leading-tight">
                    {isHypeActive ? 'Membuka Storyboard...' : hubState === 'COMPLETED' ? 'Video final siap ditonton.' : hubState === 'WRITING' ? 'SINTA menyusun naskah...' : isStoryboardReady ? 'Klik untuk tinjau' : 'What shall we create today?'}
                  </p>
                </div>

                {/* 8 Colored Orbiting Nodes */}
                {orbitalNodes.map((node) => {
                  const Icon = node.icon;
                  const radius = 150; // Radius in pixels for desktop/responsive
                  const rad = (node.angle * Math.PI) / 180;
                  const x = Math.cos(rad) * radius;
                  const y = Math.sin(rad) * radius;

                  const isNodeSpeakingActive = (node.isActive && isSpeaking);
                  const isNodeDim = !node.isActive && !node.isDone && !isHypeActive && hubState !== 'IDLE';

                  return (
                    <motion.div
                      key={node.id}
                      id={`hud-node-${node.id}`}
                      onClick={node.action}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                        opacity: isNodeDim ? 0.35 : 1,
                      }}
                      className="absolute z-20 flex flex-col items-center cursor-pointer group transition-opacity duration-500"
                    >
                      {/* Node Circle Button */}
                      <div 
                        style={{
                          boxShadow: isNodeSpeakingActive
                            ? `0 0 ${25 + waveform[6] * 35}px ${node.color}`
                            : (isHypeActive || node.isActive)
                            ? `0 0 35px ${node.color}`
                            : `0 0 20px ${node.glow}`,
                          borderColor: node.color,
                          transform: isNodeSpeakingActive ? `scale(${1 + waveform[4] * 0.12})` : undefined
                        }}
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${node.bg} border-2 flex items-center justify-center transition-all duration-200 ${!isNodeDim && 'group-hover:scale-110'} relative`}
                      >
                        <Icon size={18} style={{ color: node.color }} />
                        
                        {/* Status Overlays */}
                        {node.isDone && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border border-emerald-300">
                            <Check size={10} className="text-emerald-950 font-bold" />
                          </div>
                        )}
                        {node.badge && !node.isDone && (
                          <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-black/90 text-[7px] font-mono font-bold border border-amber-400 text-amber-300 whitespace-nowrap animate-bounce">
                            {node.badge}
                          </span>
                        )}
                        {isNodeSpeakingActive && (
                          <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        )}
                      </div>

                      {/* Node Label & Description */}
                      <div className="text-center mt-1 pointer-events-none">
                        <span 
                          style={{ color: node.color }}
                          className="text-[10px] sm:text-[11px] font-extrabold tracking-wider block"
                        >
                          {node.label}
                        </span>
                        <span className="text-[8px] text-slate-400 block whitespace-nowrap opacity-80 group-hover:opacity-100">
                          {node.desc}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Completed Action Banner */}
                {hubState === 'COMPLETED' && (
                  <div className="absolute top-[80%] sm:top-[75%] left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">
                        Video Selesai Dibuat!
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400">
                        Seluruh scene berhasil dirender dan digabungkan.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={onOpenStoryboard}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg transition-colors flex items-center gap-1"
                      >
                        <Play size={12} fill="currentColor" /> Lihat Hasil
                      </button>
                      {onResetProject && (
                        <button
                          onClick={onResetProject}
                          className="px-3 py-1.5 bg-slate-900 border border-emerald-500/50 hover:bg-slate-800 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                        >
                          Proyek Baru
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Loading / Readiness Indicator */}
                {(hubState === 'THINKING' || hubState === 'WRITING' || hubState === 'STORYBOARDING' || showReadyBanner) && (
                  <div className={`absolute top-[80%] sm:top-[75%] left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full bg-slate-900/90 border backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500 shadow-2xl ${
                    showReadyBanner ? 'border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)]' :
                    hubState === 'STORYBOARDING' ? 'border-purple-500/50 shadow-[0_0_30px_rgba(192,132,252,0.3)]' :
                    'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                  }`}>
                     {showReadyBanner ? (
                       <Check className="w-5 h-5 text-emerald-400" />
                     ) : (
                       <RefreshCw className={`w-5 h-5 animate-spin ${hubState === 'STORYBOARDING' ? 'text-purple-400' : 'text-amber-400'}`} />
                     )}
                     <div className="flex flex-col text-left">
                       <span className={`text-xs font-bold uppercase tracking-widest ${showReadyBanner ? 'text-emerald-100' : hubState === 'STORYBOARDING' ? 'text-purple-100' : 'text-amber-100'}`}>
                         {showReadyBanner ? 'Storyboard Siap' : hubState === 'STORYBOARDING' ? 'Menyusun Storyboard' : 'Menulis Naskah'}
                       </span>
                       <span className={`text-[9px] font-mono ${showReadyBanner ? 'text-emerald-400' : hubState === 'STORYBOARDING' ? 'text-purple-400 animate-pulse' : 'text-amber-400 animate-pulse'}`}>
                         {showReadyBanner ? 'Visual siap ditinjau' : 'AI Agent sedang merancang adegan...'}
                       </span>
                     </div>
                     
                     {showReadyBanner && (
                        <button
                          onClick={handleOpenStoryboard}
                          className="ml-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg transition-colors"
                        >
                          Lihat Sekarang
                        </button>
                     )}
                  </div>
                )}
              </div>

              {/* Bottom Response & Video Preview Banner */}
              <div className="w-full rounded-2xl bg-gradient-to-r from-[#0C1022] via-[#0E142B] to-[#120F29] border border-slate-800/90 p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center gap-4 justify-between">
                
                {/* Left Response Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">NEURONA RESPONSE</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {hubState === 'IDLE' ? 'STANDBY' : 'PRODUCING'}
                    </span>
                    {hubState !== 'IDLE' && (
                      <button
                        onClick={() => setShowResetConfirmModal(true)}
                        className="text-[10px] text-amber-400/80 hover:text-amber-300 hover:underline flex items-center gap-1 ml-1 cursor-pointer font-mono"
                        title="Reset tampilan Hub ke IDLE"
                      >
                        <RotateCcw size={10} />
                        <span>Reset Status</span>
                      </button>
                    )}
                    <button 
                      onClick={() => neuronaVoice.speak("NEURONA Director Core Online. Saya adalah Asisten Sutradara AI Anda. Bersama kita dapat membuat video luar biasa dari ide Anda.")}
                      className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 ml-auto cursor-pointer"
                    >
                      <Volume2 size={12} className={isSpeaking ? 'animate-pulse text-indigo-400' : ''} />
                      <span>{isSpeaking ? 'Berbicara...' : 'Dengar Suara'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {project?.status === 'QUOTA_FALLBACK_PENDING'
                      ? '⚠️ AI Kuota Penuh. Konfirmasi di chat apakah ingin menggunakan template naskah darurat (ketik "Ya").'
                      : (hubState === 'THINKING' || hubState === 'WRITING')
                      ? 'SINTA sedang menyusun naskah, sudut kamera sinematik, dan prompt visual adegan...' 
                      : hubState === 'STORYBOARDING'
                      ? 'GATOTKACA sedang menyusun adegan (scene) storyboard...'
                      : hubState === 'COMPLETED'
                      ? 'Render keseluruhan telah selesai. Video master hasil jahitan orkestrator siap untuk ditonton dan diunduh. Silakan putar hasil akhir Anda.'
                      : isStoryboardReady 
                      ? 'Naskah dan Storyboard telah selesai disusun! Silakan periksa adegan dan setujui untuk merender video utuh.' 
                      : 'NEURONA Director Core Online. Pilih salah satu studio (Animasi, Affiliate, Edukasi) atau masukkan ide cerita Anda di bawah.'}
                  </p>

                  {/* Fallback Action Button when Storyboard is Ready */}
                  {isStoryboardReady && (
                    <div className="pt-1 flex items-center gap-3">
                      <button
                        onClick={handleOpenStoryboard}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/25 animate-pulse transition-all cursor-pointer"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Buka Storyboard & Tinjau Adegan (50%)</span>
                      </button>
                    </div>
                  )}

                  {/* Feature Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-[10px] text-slate-300 flex items-center gap-1">
                      ✨ Cinematic Quality
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-[10px] text-slate-300 flex items-center gap-1">
                      🤖 Multi-AI Agents
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-[10px] text-slate-300 flex items-center gap-1">
                      ⚡ 60fps Rendering
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-[10px] text-slate-300 flex items-center gap-1">
                      🎨 Multi-Angle Lock
                    </span>
                  </div>
                </div>

                {/* Right Video Preview Thumbnail */}
                <div 
                  onClick={onOpenTimeline}
                  className="w-full md:w-52 aspect-video rounded-xl bg-slate-950 border border-indigo-500/30 overflow-hidden relative group cursor-pointer shrink-0 shadow-lg"
                >
                  <img 
                    src={project?.storyboard?.scenes?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'} 
                    alt="Video Preview"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const sc = project?.storyboard?.scenes?.[0];
                      if (sc?.remoteUrl && target.src !== sc.remoteUrl) {
                        target.src = sc.remoteUrl;
                      } else if (sc?.falUrl && target.src !== sc.falUrl) {
                        target.src = sc.falUrl;
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                    <span className="text-[10px] font-bold text-white truncate">
                      {project?.title || 'Preview Visual Adegan'}
                    </span>
                    <span className="text-[9px] text-cyan-400 font-mono flex items-center gap-1">
                      <Eye size={10} />
                      Buka Timeline Editor
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* ========================================================================= */}
            {/* RIGHT WORKSPACE: 3 STATUS CARDS */}
            {/* ========================================================================= */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Card 1: AI DIRECTOR STATUS */}
              <div className="p-4 rounded-2xl bg-[#090D1A] border border-slate-800/90 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-white tracking-wider uppercase">AI DIRECTOR STATUS</h3>
                
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${hubState !== 'IDLE' && !isStoryboardReady ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
                  <span className={`text-xs font-extrabold font-mono ${hubState !== 'IDLE' && !isStoryboardReady ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(hubState === 'COMPLETED') ? 'RENDERED 100%' : (hubState === 'THINKING' || hubState === 'WRITING') ? 'ORCHESTRATING SCRIPT' : hubState === 'STORYBOARDING' ? 'BUILDING SCENES' : isStoryboardReady ? 'STORYBOARD 50%' : 'READY'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  NEURONA is online with 8 autonomous agents orchestrating your cinematic video.
                </p>

                {/* Animated Audio Waveform */}
                <div className="flex items-center justify-between h-8 px-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const heights = [20, 45, 75, 30, 90, 60, 40, 80, 50, 30, 70, 95, 40, 60, 85, 30, 70, 50, 90, 40, 65, 35, 55, 25];
                    const h = heights[i % heights.length];
                    return (
                      <span
                        key={i}
                        style={{ height: `${h}%` }}
                        className={`w-1 rounded-full transition-all duration-300 ${
                          isListening 
                            ? 'bg-rose-500 animate-pulse' 
                            : isSpeaking 
                            ? 'bg-cyan-400 animate-pulse' 
                            : 'bg-cyan-500/60'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Card 2: QUICK ACTIONS */}
              <div className="p-4 rounded-2xl bg-[#090D1A] border border-slate-800/90 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-white tracking-wider uppercase">PILIHAN STUDIO</h3>
                
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={onOpenStudioSelector || onOpenVisualStudio}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition cursor-pointer text-left group"
                  >
                    <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition">
                      <Clapperboard size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Buka 3 Studio Form</div>
                      <div className="text-[10px] text-slate-400">Animasi, Affiliate, Edukasi</div>
                    </div>
                  </button>

                  <button
                    onClick={handleOpenStoryboard}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 transition cursor-pointer text-left group"
                  >
                    <div className="p-2 rounded-lg bg-purple-950 text-purple-400 group-hover:text-white group-hover:bg-purple-600 transition">
                      <Layers size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Storyboard Matrix</div>
                      <div className="text-[10px] text-slate-400">Tinjau adegan & keyframe HD</div>
                    </div>
                  </button>

                  <button
                    onClick={onOpenTimeline}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-lime-500/50 hover:bg-slate-800/50 transition cursor-pointer text-left group"
                  >
                    <div className="p-2 rounded-lg bg-lime-950 text-lime-400 group-hover:text-white group-hover:bg-lime-600 transition">
                      <Scissors size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Timeline Editor</div>
                      <div className="text-[10px] text-slate-400">Edit non-linear & override aset</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Card 3: RECENT PROJECTS */}
              <div className="p-4 rounded-2xl bg-[#090D1A] border border-slate-800/90 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase">PROYEK TERAKHIR</h3>
                  <button onClick={onOpenTimeline} className="text-[11px] text-indigo-400 hover:underline cursor-pointer">
                    Buka Editor
                  </button>
                </div>

                <div className="space-y-2">
                  {recentProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={onOpenTimeline}
                      className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-slate-700 transition cursor-pointer group"
                    >
                      <img 
                        src={p.thumbnail} 
                        alt={p.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{p.title}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{p.type}</span>
                          <span>•</span>
                          <span className="text-indigo-400">{p.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: SCENE DURATIONS CHART */}
              {project?.storyboard?.scenes && project.storyboard.scenes.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#090D1A] border border-slate-800/90 shadow-xl space-y-3">
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase">SCENE DURATIONS</h3>
                  <div className="h-40 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={project.storyboard.scenes.map((s: any, i: number) => ({ name: `S${i+1}`, duration: s.duration }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={20} />
                        <Tooltip
                          cursor={{ fill: '#1e293b', opacity: 0.4 }}
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                          itemStyle={{ color: '#818cf8' }}
                          formatter={(val: number) => [`${val}s`, 'Durasi']}
                        />
                        <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                          {
                            project.storyboard.scenes.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#a855f7'} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* ========================================================================= */}
          {/* BOTTOM INTERACTION BAR: PROMPT INPUT */}
          {/* ========================================================================= */}
          <div className="w-full max-w-4xl mx-auto pt-2 pb-16 lg:pb-2">
            <div className="p-2 rounded-2xl bg-[#090D1A] border border-slate-800/90 shadow-2xl flex items-center gap-2 relative focus-within:border-indigo-500/70 transition">
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Lampirkan Gambar Referensi / Produk"
              >
                <Paperclip size={18} />
              </button>

              <input
                id="director-core-prompt-input"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onInteract();
                  }
                }}
                placeholder="Perintahkan Sutradara AI: Buatkan video affiliate / anime / edukasi sinematik..."
                className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-slate-500 outline-none"
              />

              <button
                onClick={handleToggleVoiceInput}
                className={`p-2.5 rounded-xl transition ${
                  isListening 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Input Suara Bicara (Voice)"
              >
                <Mic size={18} />
              </button>

              <button
                id="director-core-send-btn"
                onClick={() => onInteract()}
                disabled={isThinking || !prompt.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isThinking ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                <span className="hidden sm:inline">Mulai Sutradara</span>
              </button>
            </div>
          </div>

        </main>

        {/* ========================================================================= */}
        {/* 3. MOBILE BOTTOM NAVIGATION (Fixed) */}
        {/* ========================================================================= */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#080B16]/95 border-t border-slate-800/80 backdrop-blur-md px-6 flex items-center justify-between z-30">
          
          <button 
            onClick={() => setActiveMobileTab('home')}
            className={`flex flex-col items-center gap-1 ${activeMobileTab === 'home' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <Home size={18} />
            <span className="text-[10px]">Home</span>
          </button>

          <button 
            onClick={onOpenStudioSelector || onOpenVisualStudio}
            className={`flex flex-col items-center gap-1 ${activeMobileTab === 'studio' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <Clapperboard size={18} />
            <span className="text-[10px]">3 Studio</span>
          </button>

          {/* Elevated Center Action (+) Button */}
          <button 
            onClick={() => {
              setPrompt("Buatkan konsep video cinematic baru");
              onInteract("Buatkan konsep video cinematic baru");
            }}
            className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.6)] border-2 border-[#080B16] active:scale-95 transition"
          >
            <Plus size={22} className="stroke-[3]" />
          </button>

          <button 
            onClick={onOpenTimeline}
            className={`flex flex-col items-center gap-1 ${activeMobileTab === 'projects' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <Scissors size={18} />
            <span className="text-[10px]">Timeline</span>
          </button>

          {/* Mobile Profile Tab (Opens UserProfileModal, NOT Founder Dashboard) */}
          <button 
            onClick={onOpenProfile || onOpenTopUp}
            className={`flex flex-col items-center gap-1 ${activeMobileTab === 'profile' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <User size={18} />
            <span className="text-[10px]">Profile</span>
          </button>

        </div>

      </div>

      <KeyRotatorModal
        isOpen={isRotatorOpen}
        onClose={() => setIsRotatorOpen(false)}
      />

      {/* Reset Confirmation Dialog Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B1021] border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                <RotateCcw size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Reset Tampilan Hub</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Reset tampilan Hub ke kondisi awal? Ini tidak akan menghapus project/data Anda, hanya mengembalikan status Hub ke 'Siap Membuat' (IDLE).
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Check size={13} />
                <span>Data Proyek Aman</span>
              </div>
              <p>
                Seluruh naskah, adegan storyboard, dan video yang sudah dibuat tetap tersimpan dan dapat dibuka kembali kapan saja lewat menu Timeline Editor atau Daftar Proyek.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="cancel-hub-reset-btn"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                id="confirm-hub-reset-btn"
                onClick={() => {
                  setShowResetConfirmModal(false);
                  setHasDismissedBanner(true);
                  setShowReadyBanner(false);
                  onResetProject?.();
                  neuronaVoice.speak("Tampilan Hub berhasil direset ke kondisi awal.");
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Ya, Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
