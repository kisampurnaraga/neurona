import React, { useState, useEffect, useRef } from 'react';
import { VideoPreviewPlayer } from './VideoPreviewPlayer';
import { getProjectAspectRatioClass } from '../utils/aspectRatio';
import { 
  Activity, 
  ShieldAlert, ShieldCheck, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Radio, 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  Layers, 
  Zap, 
  X,
  Play,
  Pause,
  Film,
  Download,
  Palette,
  GraduationCap,
  ShoppingBag,
  Sliders,
  Paperclip,
  Mic,
  MicOff,
  Image as ImageIcon,
  Video as VideoIcon,
  Copy,
  Check,
  Send,
  ExternalLink,
  ChevronRight,
  Tv,
  Eye,
  RefreshCw,
  Clock,
  AlertCircle,
  LogOut,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { 
  ProductionProject, 
  AgentTelemetry, 
  TerminalLog, 
  ProductAsset, 
  AffiliateConfig, 
  AnimationConfig, 
  EducationalConfig, 
  VideoType, 
  Scene 
} from '../shared/types';
import { neuronaVoice } from '../utils/speechSynthesis';
import { CreditTopUpModal } from './CreditTopUpModal';
import { StoryboardMatrixModal } from './StoryboardMatrixModal';
import { ModelSelectorModal } from './ModelSelectorModal';
import { UserSessionData } from './AuthModal';

interface HolographicHudNodeProps {
  project: ProductionProject | null;
  prompt: string;
  setPrompt: (p: string) => void;
  isThinking: boolean;
  conversationalMessage: string | null;
  attachedAssets: ProductAsset[];
  onUploadAssets: (files: FileList | null) => void;
  onRemoveAsset: (id: string) => void;
  onInteract: (
    prompt?: string, 
    assets?: ProductAsset[], 
    affConfig?: AffiliateConfig, 
    animConfig?: AnimationConfig, 
    eduConfig?: EducationalConfig, 
    videoType?: VideoType
  ) => void;
  onApprove?: () => void;
  onRetry?: () => void;
  onOpenAffiliateModal: () => void;
  onOpenAnimationModal: () => void;
  onOpenEducationalModal: () => void;
  onOpenFounder: () => void;
  onOpenLanding?: () => void;
  onSwitchToStudio?: () => void;
  currentUser?: UserSessionData | null;
  onLogout?: () => void;
}

export const HolographicHudNode: React.FC<HolographicHudNodeProps> = ({
  project,
  prompt,
  setPrompt,
  isThinking,
  conversationalMessage,
  attachedAssets,
  onUploadAssets,
  onRemoveAsset,
  onInteract,
  onApprove,
  onRetry,
  onOpenAffiliateModal,
  onOpenAnimationModal,
  onOpenEducationalModal,
  onOpenFounder,
  onOpenLanding,
  onSwitchToStudio,
  currentUser,
  onLogout
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceMuted, setVoiceMuted] = useState(neuronaVoice.getMuted());
  const [isSpeaking, setIsSpeaking] = useState(neuronaVoice.getIsSpeaking());
  const [selectedAgent, setSelectedAgent] = useState<AgentTelemetry | null>(null);
  const [activeSubNodeModal, setActiveSubNodeModal] = useState<'NONE' | 'ANIMATION' | 'EDUCATION' | 'AFFILIATE' | 'VIDEO' | 'STORYBOARD' | 'AGENTS'>('NONE');
  const [timeTicker, setTimeTicker] = useState('02:24:09');
  const [copiedScript, setCopiedScript] = useState(false);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [clientConfig, setClientConfig] = useState({ qaMinScoreThreshold: 70, qaAutoFixThreshold: 80 });

  useEffect(() => {
    fetch('/api/config/client').then(r => r.json()).then(d => { if (d.qaMinScoreThreshold) setClientConfig(d); }).catch(console.error);
  }, []);

  // Credit System & Storyboard Modals
  const [userCredits, setUserCredits] = useState<number>(() => {
    const saved = localStorage.getItem('neurona_user_credits');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isStoryboardMatrixOpen, setIsStoryboardMatrixOpen] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.credits !== undefined) {
      setUserCredits(currentUser.credits);
    }
  }, [currentUser]);

  // Video Generation & TTS Voice Model Selection State
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>(() => {
    return localStorage.getItem('neurona_video_model') || 'fal-ai/veo3.1/lite/image-to-video';
  });
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    return localStorage.getItem('neurona_voice_id') || 'tryaudio-female-citra';
  });
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  // Speech Recognition (Voice Input)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice/error:", event.error);
        setIsListening(false);
      };
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
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [prompt, setPrompt]);

  const handleToggleVoiceInput = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda belum mendukung Speech Recognition. Silakan gunakan Google Chrome, Microsoft Edge, atau browser berbasis Chromium.");
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
        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
        };
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
      console.error("Speech recognition start failed:", err);
      setIsListening(false);
    }
  };

  const handleSelectVideoModel = (model: string) => {
    setSelectedVideoModel(model);
    localStorage.setItem('neurona_video_model', model);
  };

  const handleSelectVoiceId = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem('neurona_voice_id', voiceId);
  };

  const handleAddCredits = (amount: number) => {
    setUserCredits(prev => {
      const next = prev + amount;
      localStorage.setItem('neurona_user_credits', next.toString());
      return next;
    });
  };

  const handleApproveWithCredits = (cost: number = 20) => {
    if (userCredits < cost) {
      neuronaVoice.playChime('ALERT');
      neuronaVoice.speak(`Saldo kredit tidak mencukupi. Diperlukan ${cost} kredit untuk merender video.`);
      setIsCreditModalOpen(true);
      return;
    }

    setUserCredits(prev => {
      const next = Math.max(0, prev - cost);
      localStorage.setItem('neurona_user_credits', next.toString());
      return next;
    });

    neuronaVoice.playChime('SUCCESS');
    neuronaVoice.speak(`Kredit diverifikasi. ${cost} kredit dipotong. Tim Agen AI Indonesia sedang mengeksekusi render video.`);
    
    if (onApprove) {
      onApprove();
    }
  };

  const handleGenerateSceneImage = async (sceneId: string, cost: number = 5, imageEngine?: string) => {
    if (!project) return;
    if (userCredits < cost) {
      neuronaVoice.playChime('ALERT');
      neuronaVoice.speak(`Saldo kredit tidak mencukupi. Diperlukan ${cost} kredit untuk generate gambar adegan.`);
      setIsCreditModalOpen(true);
      return;
    }

    setUserCredits(prev => {
      const next = Math.max(0, prev - cost);
      localStorage.setItem('neurona_user_credits', next.toString());
      return next;
    });

    neuronaVoice.playChime('SUCCESS');
    neuronaVoice.speak(`Generating gambar karakter konsisten untuk adegan ini (${cost} kredit dipotong).`);

    try {
      await fetch(`/api/projects/${project.id}/generate-scene-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, imageEngine })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateAllImages = async (totalCost: number = 20, imageEngine?: string) => {
    if (!project) return;
    if (userCredits < totalCost) {
      neuronaVoice.playChime('ALERT');
      neuronaVoice.speak(`Saldo kredit tidak mencukupi. Diperlukan ${totalCost} kredit untuk generate semua gambar.`);
      setIsCreditModalOpen(true);
      return;
    }

    setUserCredits(prev => {
      const next = Math.max(0, prev - totalCost);
      localStorage.setItem('neurona_user_credits', next.toString());
      return next;
    });

    neuronaVoice.playChime('SUCCESS');
    neuronaVoice.speak(`Memproses pembuatan gambar karakter konsisten untuk semua adegan.`);

    try {
      await fetch(`/api/projects/${project.id}/generate-all-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageEngine })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateSceneVideo = async (sceneId: string, cost: number = 15, videoModel?: string) => {
    if (!project) return;
    if (userCredits < cost) {
      neuronaVoice.playChime('ALERT');
      neuronaVoice.speak(`Saldo kredit tidak mencukupi. Diperlukan ${cost} kredit untuk merender video adegan.`);
      setIsCreditModalOpen(true);
      return;
    }

    setUserCredits(prev => {
      const next = Math.max(0, prev - cost);
      localStorage.setItem('neurona_user_credits', next.toString());
      return next;
    });

    neuronaVoice.playChime('SUCCESS');
    neuronaVoice.speak(`Merender video adegan terpilih dengan AI video model.`);

    try {
      await fetch(`/api/projects/${project.id}/generate-scene-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, videoModel })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleChooseStoryboardOnly = async () => {
    if (!project) return;
    neuronaVoice.speak(`Pilihan Storyboard Gratis dipilih. Naskah dan prompt siap digunakan.`);
    try {
      await fetch(`/api/projects/${project.id}/choose-storyboard-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleResyncScene = async (action: 'ADD' | 'REMOVE', targetIndex: number) => {
    if (!project) return;
    neuronaVoice.speak(`Sinkronisasi naskah otomatis diaktifkan untuk ${action === 'ADD' ? 'penambahan' : 'penghapusan'} adegan.`);
    try {
      await fetch(`/api/projects/${project.id}/resync-scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetIndex })
      });
    } catch (e) {
      console.error(e);
      neuronaVoice.speak(`Gagal menyinkronkan naskah.`);
    }
  };

  // Calculate project overall progress percentage (0 - 100%)
  const progressPercentage = project?.overallProgress ?? (
    project?.status === 'COMPLETED' ? 100 :
    project?.status === 'QA' ? 98 :
    project?.status === 'EDITING' ? 95 :
    project?.status === 'AUDIO' ? 90 :
    project?.status === 'ASSEMBLING' ? 82 :
    project?.status === 'PRODUCING' ? 65 :
    project?.status === 'AWAITING_APPROVAL' ? 50 :
    project?.status === 'STORYBOARDING' ? 35 :
    project?.status === 'BRIEFING' ? 15 : 0
  );

  // Video playback
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to voice synthesis state
  useEffect(() => {
    const unsubscribe = neuronaVoice.subscribe((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => unsubscribe();
  }, []);

  // Stopwatch timer for HUD
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      setTimeTicker(`02:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll terminal logs
  // Auto-open Storyboard Matrix when status becomes AWAITING_APPROVAL
  useEffect(() => {
    if (project?.status === 'AWAITING_APPROVAL' && project?.storyboard) {
      setIsStoryboardMatrixOpen(true);
    }
  }, [project?.status, project?.storyboard]);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [project?.logs]);

  // Holographic Globe Canvas Animation with Laser Beam Vectors & Living Energetic Nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    let wavePulse = 0;

    const renderGlobe = () => {
      const isLiveProcessing = isThinking || (project && !['COMPLETED', 'FAILED'].includes(project.status));
      const rotationSpeed = isLiveProcessing ? 0.016 : 0.008;
      angle += rotationSpeed;
      wavePulse = (wavePulse + (isLiveProcessing ? 0.05 : 0.02)) % (Math.PI * 2);

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Living radius breathing expansion
      const breatheAmount = isLiveProcessing ? Math.sin(wavePulse * 2) * 8 : Math.sin(wavePulse) * 2;
      const baseRadius = Math.min(width, height) * 0.38;
      const radius = baseRadius + breatheAmount;

      ctx.clearRect(0, 0, width, height);

      // Dynamic color palette based on active agent/phase
      const activePhase = project?.status;
      let primaryGlow = 'rgba(6, 182, 212, 0.4)';
      let secondaryGlow = 'rgba(244, 63, 94, 0.35)';
      let accentHex = '#06b6d4';

      if (activePhase === 'PRODUCING' || activePhase === 'ASSEMBLING') {
        primaryGlow = 'rgba(244, 63, 94, 0.55)';
        secondaryGlow = 'rgba(99, 102, 241, 0.45)';
        accentHex = '#f43f5e';
      } else if (activePhase === 'STORYBOARDING' || activePhase === 'AWAITING_APPROVAL') {
        primaryGlow = 'rgba(245, 158, 11, 0.5)';
        secondaryGlow = 'rgba(16, 185, 129, 0.4)';
        accentHex = '#f59e0b';
      } else if (isLiveProcessing) {
        primaryGlow = 'rgba(139, 92, 246, 0.5)';
        secondaryGlow = 'rgba(6, 182, 212, 0.45)';
        accentHex = '#8b5cf6';
      }

      // 1. Ambient Outer Halo Gradient with Expanding Living Aura
      const haloMax = isLiveProcessing ? radius * 1.55 : radius * 1.35;
      const haloGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, haloMax);
      haloGrad.addColorStop(0, isLiveProcessing ? primaryGlow : 'rgba(99, 102, 241, 0.25)');
      haloGrad.addColorStop(0.35, isLiveProcessing ? secondaryGlow : 'rgba(6, 182, 212, 0.18)');
      haloGrad.addColorStop(0.7, 'rgba(244, 63, 94, 0.15)');
      haloGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, haloMax, 0, Math.PI * 2);
      ctx.fill();

      // Living Shockwave Ring Waves
      if (isLiveProcessing) {
        for (let w = 0; w < 3; w++) {
          const waveRadius = radius * (1.0 + ((wavePulse + (w * 1.2)) % 3) * 0.22);
          const waveAlpha = Math.max(0, 1 - (waveRadius - radius) / (radius * 0.65)) * 0.6;
          ctx.strokeStyle = `rgba(244, 63, 94, ${waveAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 2. Outer Rotating HUD Rings
      ctx.save();
      ctx.translate(centerX, centerY);

      // Pulse ring with glowing shadow
      ctx.strokeStyle = isLiveProcessing ? accentHex : 'rgba(244, 63, 94, 0.85)';
      ctx.lineWidth = isLiveProcessing ? 2.5 : 2;
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = isLiveProcessing ? 24 : 14;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating dashed Cyan ring
      ctx.rotate(-angle * (isLiveProcessing ? 2.0 : 1.4));
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
      ctx.lineWidth = isLiveProcessing ? 2 : 1.5;
      ctx.setLineDash([8, 12]);
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isLiveProcessing ? 18 : 10;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tactical Tick Marks
      ctx.strokeStyle = isLiveProcessing ? 'rgba(244, 63, 94, 0.75)' : 'rgba(244, 63, 94, 0.45)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 36; i++) {
        const rad = (i * 10 * Math.PI) / 180;
        const x1 = Math.cos(rad) * (radius * 1.18);
        const y1 = Math.sin(rad) * (radius * 1.18);
        const x2 = Math.cos(rad) * (radius * (i % 3 === 0 ? 1.25 : 1.21));
        const y2 = Math.sin(rad) * (radius * (i % 3 === 0 ? 1.25 : 1.21));
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();

      // 3. 3D Wireframe Sphere (Latitudes & Longitudes)
      ctx.shadowBlur = 0;
      const numLat = 10;
      const numLng = 16;

      for (let i = 1; i < numLat; i++) {
        const lat = (Math.PI * i) / numLat - Math.PI / 2;
        const latY = centerY + radius * Math.sin(lat);
        const latRadius = radius * Math.cos(lat);

        ctx.strokeStyle = isLiveProcessing ? 'rgba(6, 182, 212, 0.45)' : 'rgba(6, 182, 212, 0.25)';
        ctx.lineWidth = isLiveProcessing ? 1.2 : 1;
        ctx.beginPath();
        ctx.ellipse(centerX, latY, latRadius, latRadius * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < numLng; i++) {
        const lngAngle = (i * Math.PI) / (numLng / 2) + angle;
        const xOffset = Math.sin(lngAngle);
        const zCos = Math.cos(lngAngle);

        const alpha = zCos > 0 ? (isLiveProcessing ? 0.55 : 0.35) : (isLiveProcessing ? 0.15 : 0.08);
        ctx.strokeStyle = `rgba(244, 63, 94, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.abs(xOffset) * radius, radius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Tactical Target Reticles & Living Active Regional Nodes
      const activeAgentCodename = project?.activeAgent || (isThinking ? 'BATARA' : '');
      // We map 8 AI Agents directly to Production States
      const stateMapping: Record<string, string> = {
        'BRIEFING': 'DIRECTOR',
        'STORYBOARDING': 'STORYBOARD',
        'AWAITING_APPROVAL': 'REVIEWER',
        'PRODUCING': 'VISUAL_FX',
        'AUDIO': 'VOICEOVER',
        'ASSEMBLING': 'STITCHER',
        'EDITING': 'EDITOR',
        'QA': 'QUALITY_CTRL',
        'COMPLETED': 'DIRECTOR'
      };
      
      const activeState = project?.status || (isThinking ? 'BRIEFING' : '');
      const activeAgent = stateMapping[activeState] || 'DIRECTOR';

      const nodes = [
        { code: 'DIRECTOR', name: 'AGEN SUTRADARA', lat: 0.45, lng: 1.2, color: '#f43f5e' },
        { code: 'STORYBOARD', name: 'AGEN STORYBOARD', lat: 0.65, lng: -0.6, color: '#06b6d4' },
        { code: 'REVIEWER', name: 'AGEN REVIEW', lat: 0.15, lng: 0.4, color: '#f59e0b' },
        { code: 'VISUAL_FX', name: 'AGEN VISUAL FX', lat: 0.4, lng: -0.2, color: '#10b981' },
        { code: 'VOICEOVER', name: 'AGEN AUDIO TTS', lat: -0.1, lng: 1.0, color: '#8b5cf6' },
        { code: 'STITCHER', name: 'AGEN STITCHER', lat: -0.25, lng: -0.5, color: '#ec4899' },
        { code: 'EDITOR', name: 'AGEN EDITOR', lat: 0.25, lng: -1.0, color: '#eab308' },
        { code: 'QUALITY_CTRL', name: 'AGEN QA', lat: -0.4, lng: 0.3, color: '#3b82f6' }
      ];

      nodes.forEach((n) => {
        const nodeLng = n.lng + angle;
        const z = Math.cos(nodeLng);
        if (z > -0.2) {
          const nx = centerX + radius * Math.cos(n.lat) * Math.sin(nodeLng);
          const ny = centerY - radius * Math.sin(n.lat);
          const isNodeActive = isLiveProcessing && (activeAgent === n.code);

          // Living node expansion
          const nodeRadius = isNodeActive ? 8 + Math.sin(wavePulse * 3) * 3 : 6;
          const nodeGlowBlur = isNodeActive ? 28 : (isLiveProcessing ? 18 : 10);

          ctx.strokeStyle = n.color;
          ctx.lineWidth = isNodeActive ? 3 : 2;
          ctx.shadowColor = n.color;
          ctx.shadowBlur = nodeGlowBlur;

          // Expanding Living Aura Ring around the active node
          if (isNodeActive) {
            const auraExpandingRadius = nodeRadius + (wavePulse % 2) * 9;
            const auraAlpha = Math.max(0, 1 - (auraExpandingRadius - nodeRadius) / 18);
            ctx.strokeStyle = `${n.color}`;
            ctx.beginPath();
            ctx.arc(nx, ny, auraExpandingRadius, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Main node circle
          ctx.beginPath();
          ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Inner solid core
          ctx.fillStyle = isNodeActive ? '#ffffff' : n.color;
          ctx.beginPath();
          ctx.arc(nx, ny, isNodeActive ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Crosshairs
          const armLen = isNodeActive ? 14 : 9;
          ctx.beginPath();
          ctx.moveTo(nx - armLen, ny);
          ctx.lineTo(nx - 5, ny);
          ctx.moveTo(nx + 5, ny);
          ctx.lineTo(nx + armLen, ny);
          ctx.moveTo(nx, ny - armLen);
          ctx.lineTo(nx, ny - 5);
          ctx.moveTo(nx, ny + 5);
          ctx.lineTo(nx, ny + armLen);
          ctx.stroke();

          // Laser connection vector to center with animated photon flow
          ctx.strokeStyle = isNodeActive ? `${n.color}aa` : `${n.color}35`;
          ctx.lineWidth = isNodeActive ? 2 : 1;
          ctx.setLineDash(isNodeActive ? [4, 4] : [2, 4]);
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated energy photon packet traveling along vector if active
          if (isNodeActive) {
            const t = (wavePulse * 1.5) % 1;
            const px = nx + (centerX - nx) * t;
            const py = ny + (centerY - ny) * t;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = n.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Render Text Label when active (dynamic description)
          if (isNodeActive) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = n.color;
            ctx.font = 'bold 10px monospace';
            
            // Generate dynamic text based on current phase
            const phaseText = project?.currentPhaseName ? project.currentPhaseName.replace(/\(.*?\)/g, '').trim() : 'Sedang Memproses...';
            const displayTxt = `▶ ${n.name}: ${phaseText}`;
            
            // Background for text to make it readable
            const textWidth = ctx.measureText(displayTxt).width;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.7)'; // slate-950 with opacity
            ctx.fillRect(nx + 12, ny - 6, textWidth + 8, 16);
            
            ctx.fillStyle = '#ffffff'; // White text
            ctx.fillText(displayTxt, nx + 16, ny + 5);
          }

          ctx.shadowBlur = 0;
        }
      });

      // 5. Holographic Core Base Triangle Projector
      ctx.fillStyle = isLiveProcessing ? 'rgba(244, 63, 94, 0.6)' : 'rgba(6, 182, 212, 0.35)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY + radius * 1.05);
      ctx.lineTo(centerX - 35, centerY + radius * 1.25);
      ctx.lineTo(centerX + 35, centerY + radius * 1.25);
      ctx.closePath();
      ctx.fill();

      animId = requestAnimationFrame(renderGlobe);
    };

    renderGlobe();
    return () => cancelAnimationFrame(animId);
  }, [isThinking, project?.status, project?.activeAgent]);

  const handleVoiceToggle = () => {
    const isMuted = neuronaVoice.toggleMute();
    setVoiceMuted(isMuted);
    if (!isMuted) {
      neuronaVoice.playChime('ACTIVATE');
      neuronaVoice.speak('Sistem audio dan respon suara NEURONA telah diaktifkan.');
    }
  };

  const handleReplayVoice = () => {
    if (conversationalMessage) {
      neuronaVoice.speak(conversationalMessage);
    } else if (project?.brief) {
      neuronaVoice.speak(`Status produksi: ${project.title}. ${project.brief}`);
    } else {
      neuronaVoice.speak('Sistem jaringan Node NEURONA online dan siap mengeksekusi brief Anda.');
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

  const agents: AgentTelemetry[] = project?.telemetry || [
    { id: '1', codename: 'BATARA', agentName: 'Creative Strategist', role: 'Concept & Narrative Architect', status: 'ONLINE', location: 'JAKARTA APEX NODE', currentTask: 'Synthesizing creative briefs', progress: 100, latencyMs: 18 },
    { id: '2', codename: 'SINTA', agentName: 'Storyboard Director', role: 'Cinematic & Prompt Choreographer', status: 'ONLINE', location: 'YOGYAKARTA CORE', currentTask: 'Multi-shot scene breakdown & I2V prompts', progress: 100, latencyMs: 24 },
    { id: '3', codename: 'GATOTKACA', agentName: 'AI Video Director', role: 'Neural Video Generation Engine', status: project?.status === 'PRODUCING' ? 'ACTIVE' : 'STANDBY', location: 'BANDUNG QUANTUM ARRAY', currentTask: 'Neural cluster video rendering', progress: project?.status === 'COMPLETED' ? 100 : project?.status === 'PRODUCING' ? 65 : 10, latencyMs: 42 },
    { id: '4', codename: 'BIMA', agentName: 'Video Assembly Editor', role: 'Timeline & Multi-Track Compositor', status: 'STANDBY', location: 'SURABAYA RENDER FARM', currentTask: 'Timeline sequencer standby', progress: 100, latencyMs: 15 },
    { id: '5', codename: 'DAMAR', agentName: 'Audio Designer', role: 'Acoustic & Voice Synthesizer', status: 'ONLINE', location: 'BALI SOUND LAB', currentTask: 'Voiceover & audio scoring', progress: 90, latencyMs: 19 },
    { id: '6', codename: 'BAYU', agentName: 'Viral Content Editor', role: 'Engagement & Retention Optimizer', status: 'ONLINE', location: 'MEDAN APEX HUB', currentTask: 'Subtitles & hook stickers', progress: 80, latencyMs: 31 },
    { id: '7', codename: 'SURYA', agentName: 'Video QA Director', role: 'Quality & Resolution Assurance', status: 'STANDBY', location: 'MAKASSAR CORE', currentTask: '0 frame drops validation', progress: 100, latencyMs: 12 },
    { id: '8', codename: 'TIARA', agentName: 'Distribution Manager', role: 'Export & Multi-Format Dispatcher', status: 'STANDBY', location: 'NUSANTARA EDGE', currentTask: 'Master video packaging', progress: project?.status === 'COMPLETED' ? 100 : 0, latencyMs: 14 }
  ];

  const logs: TerminalLog[] = project?.logs?.length ? project.logs : [
    { id: '1', timestamp: '02:24:00', source: 'NEURONA', message: 'Holographic Neural Node Matrix initialized and synchronized.', level: 'INFO' },
    { id: '2', timestamp: '02:24:02', source: 'BATARA', message: 'Creative Strategist node listening on Jakarta Apex grid.', level: 'INFO' },
    { id: '3', timestamp: '02:24:05', source: 'GATOTKACA', message: 'Neural Video Director standing by on Bandung Quantum Array.', level: 'SUCCESS' },
    { id: '4', timestamp: '02:24:08', source: 'INTERRUPT', message: 'Sistem: Semua sub-node workspace & 8 Agen AI Indonesia terhubung.', level: 'INTERRUPT' }
  ];

  const scenesWithVideo = project?.storyboard?.scenes?.filter(s => Boolean(s.videoUrl && (!s.videoUrl.startsWith('data:image/')))) || [];
  const currentScene = project?.storyboard?.scenes?.[selectedSceneIndex];
  const activeVideoSrc = currentScene?.videoUrl 
    || project?.finalVideoUrl 
    || (scenesWithVideo.length > 0 ? scenesWithVideo[0].videoUrl : null)
    || currentScene?.assetUrl 
    || currentScene?.imageUrl 
    || null;

  const getNeuronaStatusText = () => {
    if (conversationalMessage) return conversationalMessage;
    if (isThinking) return "Sedang menganalisis brief dan merumuskan arsitektur multi-shot...";
    if (!project) return "NEURONA Node Matrix Online. Pilih Studio atau ketik instruksi produksi di bawah.";
    if (project.status === 'AWAITING_APPROVAL') return "Storyboard telah selesai dirancang. Tekan 'Mulai Render' untuk memproses visual video.";
    if (project.status === 'PRODUCING') return "Video Engine sedang merender tiap adegan visual secara paralel...";
    if (project.status === 'COMPLETED') return "Produksi video selesai! Putar atau unduh hasil video master.";
    if (project.status === 'FAILED') return "Terjadi kendala pada pipeline eksekusi.";
    return "Mengorkestrasi multi-agent pipeline...";
  };

  return (
    <div 
      id="neurona-node-matrix-app"
      className={`relative w-full bg-slate-950 text-slate-100 font-sans select-none overflow-x-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'min-h-screen'
      }`}
      style={{
        backgroundImage: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 1) 100%)'
      }}
    >
      {/* Background Cyber Grid Matrix */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(244, 63, 94, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* TOP HEADER: SYSTEM BANNER & NETWORK STATUS */}
      <header className="relative z-20 flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 border-b border-cyan-500/20 bg-slate-950/90 backdrop-blur-md">
        
        {/* Left Brand & Protocol */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-4 h-4 text-white fill-white" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-widest text-white">NEURONA</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  NODE NETWORK OS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                AVENGERS PROTOCOL • AUTONOMOUS VIDEO MATRIX
              </p>
            </div>
          </div>

          {/* Active Mode Badge */}
          {project?.videoType && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 shadow">
              <Sparkles size={11} className="text-indigo-400" />
              <span>ACTIVE: {project.videoType}</span>
            </div>
          )}
        </div>

        {/* Center Quick Workspace Links */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            id="hud-top-btn-anim"
            onClick={onOpenAnimationModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400 text-[11px] font-mono uppercase text-cyan-300 transition shadow-sm cursor-pointer"
          >
            <Palette size={12} className="text-cyan-400" />
            <span>Studio Animasi</span>
          </button>

          <button
            id="hud-top-btn-edu"
            onClick={onOpenEducationalModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-400 text-[11px] font-mono uppercase text-emerald-300 transition shadow-sm cursor-pointer"
          >
            <GraduationCap size={12} className="text-emerald-400" />
            <span>Studio Edukasi</span>
          </button>

          <button
            id="hud-top-btn-aff"
            onClick={onOpenAffiliateModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/30 hover:border-amber-400 text-[11px] font-mono uppercase text-amber-300 transition shadow-sm cursor-pointer"
          >
            <ShoppingBag size={12} className="text-amber-400" />
            <span>Studio Affiliate</span>
          </button>

          {/* Model AI & Voice Selector Quick Button */}
          <button
            id="hud-top-btn-models"
            onClick={() => setIsModelModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 hover:border-rose-400 text-[11px] font-mono uppercase text-rose-300 transition shadow-sm cursor-pointer"
            title="Pilih Model Video (Wan/Seedance/Kling/MiniMax/Hunyuan) & Pengisi Suara TTS"
          >
            <Sliders size={12} className="text-rose-400" />
            <span>Model Video & Suara</span>
            <span className="text-[9px] px-1 rounded bg-rose-500/30 text-rose-200">
              {selectedVideoModel.toUpperCase()}
            </span>
          </button>
        </div>

        {/* Right Tools, Credit Wallet & Audio */}
        <div className="flex items-center space-x-2 text-xs">
          
          {/* Credit Wallet Badge */}
          <button
            id="hud-header-credit-badge"
            onClick={() => setIsCreditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold transition shadow-sm cursor-pointer"
            title="Saldo Kredit AI & Beli Paket"
          >
            <span className="text-amber-400">🪙</span>
            <span>{userCredits}</span>
            <span className="text-[10px] text-amber-400/80 hidden sm:inline">Kredit</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 text-[9px] font-sans font-black">+</span>
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition ${
              soundEnabled ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Sound Effects"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>

          {/* Voice Synthesizer Toggle */}
          <button
            onClick={handleVoiceToggle}
            className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
              !voiceMuted 
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 ring-1 ring-rose-500/40' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Neurona Voice Speech Output"
          >
            {!voiceMuted ? <Volume2 className="w-3.5 h-3.5 animate-bounce text-rose-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="font-mono text-[10px] hidden sm:inline">{!voiceMuted ? 'VOICE ON' : 'VOICE OFF'}</span>
          </button>

          {/* Replay Voice */}
          <button
            onClick={handleReplayVoice}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1 font-mono text-[10px]"
            title="Dengarkan Kembali Respon Suara"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">REPLAY</span>
          </button>

          {/* Switch to Split Studio Workspace */}
          {onSwitchToStudio && (
            <button
              id="btn-switch-studio-view"
              onClick={onSwitchToStudio}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono uppercase transition cursor-pointer"
              title="Ganti ke Tampilan Dual Split Studio"
            >
              <Tv size={12} />
              <span className="hidden md:inline">Split Studio</span>
            </button>
          )}

          {/* Landing Page / Beranda Button */}
          {onOpenLanding && (
            <button
              id="hud-header-landing-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLanding();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase transition cursor-pointer shadow-sm"
              title="Kembali ke Landing Page / Informasi Paket Rp 150.000"
            >
              <Zap size={11} className="text-amber-400 fill-amber-400" />
              <span>Beranda</span>
            </button>
          )}

          {/* User Status Badge */}
          {currentUser && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono">
              <span className="text-gray-300 font-medium max-w-[100px] truncate">{currentUser.name}</span>
              <span className="text-cyan-400 font-bold">
                {currentUser.role === 'founder' ? '👑' : `${currentUser.credits} Cr`}
              </span>
            </div>
          )}

          {/* Founder Button: ONLY show if currentUser is founder */}
          {currentUser?.role === 'founder' && (
            <button
              id="hud-header-founder-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFounder();
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-950/90 to-indigo-950/90 hover:from-purple-900 hover:to-indigo-900 border border-purple-500/60 text-purple-200 hover:text-white transition text-xs font-mono font-bold shadow-md cursor-pointer active:scale-95 ring-1 ring-purple-500/30"
              title="Founder Control Center & Master Model Settings"
            >
              <Sliders size={13} className="text-purple-400" />
              <span className="font-black tracking-wide text-white">Founder</span>
            </button>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              id="hud-header-logout-btn"
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition cursor-pointer"
              title="Keluar / Logout Akun"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Model Selector Button (Mobile + Desktop) */}
          <button
            id="hud-header-model-btn"
            onClick={() => setIsModelModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold transition shadow-sm cursor-pointer active:scale-95"
            title="Pilih Model AI Video & Suara TTS"
          >
            <Sliders size={13} className="text-rose-400" />
            <span className="hidden sm:inline">Model:</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 text-[10px] font-bold">
              {selectedVideoModel.toUpperCase()}
            </span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </header>

      {/* LIVE PIPELINE PROGRESS BAR & PERCENTAGE INDICATOR */}
      {project && (
        <div className="relative z-20 px-4 sm:px-6 py-2 bg-slate-950/90 border-b border-cyan-500/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono font-bold text-[11px] shadow-sm">
              <span className={`w-2 h-2 rounded-full ${progressPercentage === 100 ? 'bg-emerald-400' : 'bg-cyan-400 animate-ping'}`} />
              <span>PROGRESS: {progressPercentage}%</span>
            </div>
            <div className="text-[11px] text-slate-200 font-medium truncate flex items-center gap-1.5">
              <span className="text-cyan-400 font-mono text-[10px]">
                {progressPercentage === 100 ? '[FINAL]' : progressPercentage >= 50 && project.status === 'AWAITING_APPROVAL' ? '[GATEWAY 50%]' : '[LIVE]'}
              </span>
              {(project as any).isTemplateScript && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-bold tracking-wider mr-1">
                  Naskah Template - Bukan Hasil AI
                </span>
              )}
              <span>
                {project.currentPhaseName || (
                  progressPercentage === 100 ? 'Video Master Selesai & Siap Diunduh' :
                  progressPercentage >= 50 && project.status === 'AWAITING_APPROVAL' ? 'Storyboard Siap (50%) - Menunggu Konfirmasi Render' :
                  `Agen AI Sedang Memproses (${progressPercentage}%)`
                )}
              </span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="flex items-center gap-3 w-full sm:w-72">
            <div className="flex-1 h-2.5 bg-slate-900 rounded-full border border-white/10 overflow-hidden p-0.5 relative">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercentage === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_10px_#10b981]' :
                  progressPercentage >= 50 ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 shadow-[0_0_10px_#06b6d4]' :
                  'bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-[0_0_8px_#6366f1]'
                }`}
                style={{ width: `${Math.max(4, progressPercentage)}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-cyan-300 min-w-[36px] text-right">
              {progressPercentage}%
            </span>
          </div>
        </div>
      )}

      {/* PRIORITY INTERRUPT / APPROVAL ALERT BANNER */}
      {project?.status === 'AWAITING_APPROVAL' && onApprove && (() => {
        const sbCreditsRequired = project.storyboard?.creditsRequired || (project.storyboard?.scenes?.length ? project.storyboard.scenes.length * 8 : 32);
        const displayCredits = currentUser?.credits !== undefined ? currentUser.credits : userCredits;

        return (
          <div className="relative z-20 px-6 py-2.5 bg-gradient-to-r from-amber-950 via-rose-950 to-amber-950 border-b border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase animate-pulse">
                ▲ REVIEW GATEWAY [50%]
              </span>
              <span className="font-mono text-amber-300 font-semibold">
                Storyboard siap (50%)! Biaya render: <strong className="text-white">{sbCreditsRequired} Kredit</strong> (Saldo Anda: <strong className="text-emerald-400">{displayCredits} Kredit</strong>).
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsStoryboardMatrixOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-mono text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Layers size={13} />
                <span>Buka Storyboard Matrix</span>
              </button>

              <button
                id="hud-matrix-approve-btn"
                onClick={() => handleApproveWithCredits(sbCreditsRequired)}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Play size={13} fill="currentColor" />
                <span>Mulai Render Video ({sbCreditsRequired} Kredit)</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* MAIN NEURAL NODE MATRIX STAGE */}
      <main className="relative z-10 flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
        
        {/* NETWORK GRAPH GRID */}
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* ========================================================================= */}
          {/* LEFT SUB-NODES CLUSTER: WORKSPACES (ANIMASI & EDUKASI) + STORYBOARD MATRIX */}
          {/* ========================================================================= */}
          <div className="lg:col-span-3 space-y-3.5 order-2 lg:order-1">
            
            {/* SUB-NODE 1: STUDIO ANIMASI 3D & ANIME */}
            {(() => {
              const isAnimActive = (isThinking && project?.videoType === 'ANIMATION') || (project?.status && !['COMPLETED', 'FAILED'].includes(project.status) && project?.videoType === 'ANIMATION');
              return (
                <div 
                  id="subnode-workspace-anim"
                  onClick={onOpenAnimationModal}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer group relative overflow-hidden ${
                    isAnimActive 
                      ? 'bg-slate-900 border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.6)] animate-energy-breathe scale-[1.02]'
                      : 'bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/30 shadow-lg shadow-cyan-950/40'
                  }`}
                >
                  {/* Living Radiant Beam Overlay */}
                  <div className={`absolute top-0 right-0 rounded-full blur-xl pointer-events-none transition-all ${
                    isAnimActive 
                      ? 'w-28 h-28 bg-cyan-400/30 animate-pulse' 
                      : 'w-16 h-16 bg-cyan-500/10 group-hover:bg-cyan-500/20'
                  }`} />
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isAnimActive 
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_#06b6d4] font-bold' 
                          : 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
                      }`}>
                        <Palette size={14} className={isAnimActive ? 'animate-bounce' : ''} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                          <span>Studio Animasi</span>
                          <span className={`w-2 h-2 rounded-full ${isAnimActive ? 'bg-cyan-300 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
                        </h3>
                        <span className={`text-[10px] font-mono ${isAnimActive ? 'text-cyan-300 font-bold' : 'text-cyan-400'}`}>
                          {isAnimActive ? '🔥 NODE AKTIF BERJALAN' : 'Workspace Node #01'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                    Produksi film animasi 3D Pixar, Unreal Engine 5, Anime Ghibli & Cyberpunk dengan multi-bahasa seiyuu.
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-[9px] font-mono text-cyan-300">
                    <span className={`px-2 py-0.5 rounded border transition-all ${isAnimActive ? 'bg-cyan-900 border-cyan-400 text-white shadow-sm' : 'bg-cyan-950/80 border-cyan-500/30'}`}>3D Pixar</span>
                    <span className={`px-2 py-0.5 rounded border transition-all ${isAnimActive ? 'bg-cyan-900 border-cyan-400 text-white shadow-sm' : 'bg-cyan-950/80 border-cyan-500/30'}`}>Anime Ghibli</span>
                    <span className={`px-2 py-0.5 rounded border transition-all ${isAnimActive ? 'bg-cyan-900 border-cyan-400 text-white shadow-sm' : 'bg-cyan-950/80 border-cyan-500/30'}`}>Japanese Seiyuu</span>
                  </div>
                </div>
              );
            })()}

            {/* SUB-NODE 2: STUDIO EDUKASI & PEDAGOGY */}
            {(() => {
              const isEduActive = (isThinking && project?.videoType === 'EDUCATIONAL') || (project?.status && !['COMPLETED', 'FAILED'].includes(project.status) && project?.videoType === 'EDUCATIONAL');
              return (
                <div 
                  id="subnode-workspace-edu"
                  onClick={onOpenEducationalModal}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer group relative overflow-hidden ${
                    isEduActive 
                      ? 'bg-slate-900 border-2 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.6)] animate-energy-breathe scale-[1.02]'
                      : 'bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/30 shadow-lg shadow-emerald-950/40'
                  }`}
                >
                  <div className={`absolute top-0 right-0 rounded-full blur-xl pointer-events-none transition-all ${
                    isEduActive 
                      ? 'w-28 h-28 bg-emerald-400/30 animate-pulse' 
                      : 'w-16 h-16 bg-emerald-500/10 group-hover:bg-emerald-500/20'
                  }`} />
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isEduActive 
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_#10b981] font-bold' 
                          : 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                      }`}>
                        <GraduationCap size={14} className={isEduActive ? 'animate-bounce' : ''} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                          <span>Studio Edukasi</span>
                          <span className={`w-2 h-2 rounded-full ${isEduActive ? 'bg-emerald-300 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                        </h3>
                        <span className={`text-[10px] font-mono ${isEduActive ? 'text-emerald-300 font-bold' : 'text-emerald-400'}`}>
                          {isEduActive ? '🔥 NODE AKTIF BERJALAN' : 'Workspace Node #02'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                    Video pembelajaran terstruktur, motion graphics, whiteboard, isometrik 3D & diagram konsep.
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-[9px] font-mono text-emerald-300">
                    <span className={`px-2 py-0.5 rounded border transition-all ${isEduActive ? 'bg-emerald-900 border-emerald-400 text-white shadow-sm' : 'bg-emerald-950/80 border-emerald-500/30'}`}>Motion 2D</span>
                    <span className={`px-2 py-0.5 rounded border transition-all ${isEduActive ? 'bg-emerald-900 border-emerald-400 text-white shadow-sm' : 'bg-emerald-950/80 border-emerald-500/30'}`}>Whiteboard</span>
                    <span className={`px-2 py-0.5 rounded border transition-all ${isEduActive ? 'bg-emerald-900 border-emerald-400 text-white shadow-sm' : 'bg-emerald-950/80 border-emerald-500/30'}`}>ELI5 Analogy</span>
                  </div>
                </div>
              );
            })()}

            {/* SUB-NODE 3: LIVE STORYBOARD & SCENE MATRIX */}
            {(() => {
              const isSbActive = isThinking || ['BRIEFING', 'STORYBOARDING', 'AWAITING_APPROVAL'].includes(project?.status || '');
              return (
                <div 
                  id="subnode-feature-storyboard"
                  onClick={() => setIsStoryboardMatrixOpen(true)}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer group relative overflow-hidden ${
                    isSbActive
                      ? 'bg-slate-900 border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5)] animate-energy-breathe'
                      : 'bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/20 shadow-lg shadow-amber-950/40'
                  }`}
                >
                  <div className={`absolute top-0 right-0 rounded-full blur-xl pointer-events-none transition-all ${
                    isSbActive ? 'w-24 h-24 bg-amber-400/25 animate-pulse' : 'w-14 h-14 bg-amber-500/10'
                  }`} />

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isSbActive 
                          ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_#f59e0b] font-bold' 
                          : 'bg-amber-950 border border-amber-500/40 text-amber-300'
                      }`}>
                        <Layers size={14} className={isSbActive ? 'animate-bounce' : ''} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                          <span>Storyboard Matrix</span>
                          {isSbActive && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                        </h3>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {project?.storyboard?.scenes?.length 
                            ? `${project.storyboard.scenes.length} Adegan | Saldo: ${currentUser?.credits !== undefined ? currentUser.credits : userCredits} Cr` 
                            : `Saldo Akun: ${currentUser?.credits !== undefined ? currentUser.credits : userCredits} Cr`}
                        </span>
                      </div>
                    </div>
                    <Eye size={14} className="text-amber-400 group-hover:scale-110 transition" />
                  </div>

                  {project?.storyboard?.scenes && project.storyboard.scenes.length > 0 ? (
                    <div className="space-y-1.5 mt-2">
                      <div className="text-[10px] text-slate-300 line-clamp-2 bg-black/40 p-2 rounded-xl border border-white/5 font-mono">
                        🎬 Adegan 1: {project.storyboard.scenes[0].visualDirection}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-amber-300 font-mono pt-1">
                        <span>Buka Rincian & Prompt I2V &gt;</span>
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] ${
                          isSbActive ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 animate-pulse' : 'bg-amber-950 border-amber-500/40'
                        }`}>
                          {project.status === 'AWAITING_APPROVAL' ? 'SIAP REVIEW' : 'LIVE'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Belum ada adegan. Masukkan instruksi di core chat atau pilih studio di atas.
                    </p>
                  )}
                </div>
              );
            })()}

          </div>

          {/* ========================================================================= */}
          {/* CENTER CORE: NEURONA CHAT HUB & HOLOGRAPHIC QUANTUM GLOBE */}
          {/* ========================================================================= */}
          <div className="lg:col-span-6 flex flex-col items-center justify-between space-y-4 order-1 lg:order-2">
            
            {/* Top Tactical Label */}
            <div className="text-center space-y-0.5 pointer-events-none">
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center justify-center gap-1.5">
                <Radio size={12} className="text-rose-400 animate-ping" />
                <span>NEURONA APEX CORE CHAT</span>
                {(isThinking || (project && !['COMPLETED', 'FAILED'].includes(project.status))) && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50 text-[9px] animate-pulse">
                    PROCESSING
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Pusat Kendali Interaktif & Neural Network
              </h2>
            </div>

            {/* Holographic 3D Globe with Laser Core & Living Radiant Aura */}
            <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className={`w-full h-full object-contain transition-all duration-700 ${
                  isThinking || (project && !['COMPLETED', 'FAILED'].includes(project.status))
                    ? 'drop-shadow-[0_0_55px_rgba(244,63,94,0.7)] scale-105'
                    : 'drop-shadow-[0_0_35px_rgba(6,182,212,0.4)]'
                }`}
              />

              {/* Center Holographic Core Indicator with Multi-Layer Living Energy Ripple */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* Outer Expanding Wave Ripple when active */}
                {(isThinking || (project && !['COMPLETED', 'FAILED'].includes(project.status))) && (
                  <div className="absolute w-28 h-28 rounded-full border-2 border-rose-500/60 animate-ping opacity-60 pointer-events-none" />
                )}
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  isThinking 
                    ? 'bg-gradient-to-br from-rose-500 via-purple-600 to-cyan-400 shadow-[0_0_40px_rgba(244,63,94,0.9)] animate-living-node scale-125' 
                    : project && !['COMPLETED', 'FAILED'].includes(project.status)
                    ? 'bg-gradient-to-br from-amber-500 via-rose-600 to-indigo-600 shadow-[0_0_35px_rgba(245,158,11,0.8)] animate-living-node scale-115'
                    : project?.status === 'COMPLETED'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-105'
                    : 'bg-gradient-to-br from-indigo-600/90 to-purple-800/90 border border-cyan-500/40 shadow-lg shadow-cyan-500/20'
                }`}>
                  <Zap className={`w-7 h-7 text-white ${isThinking ? 'animate-pulse' : ''}`} />
                </div>
                {isSpeaking && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-3 bg-cyan-400 animate-pulse rounded" />
                    <span className="w-1.5 h-6 bg-rose-400 animate-pulse delay-75 rounded" />
                    <span className="w-1.5 h-3 bg-cyan-400 animate-pulse delay-150 rounded" />
                  </div>
                )}
              </div>
            </div>

            {/* Conversational Bubble & Voice Wave Output */}
            <div className={`w-full rounded-2xl p-4 backdrop-blur-md space-y-2 transition-all ${
              isThinking || (project && !['COMPLETED', 'FAILED'].includes(project.status))
                ? 'bg-slate-900 border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900/90 border border-cyan-500/30 shadow-xl'
            }`}>
              <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">NEURONA Response</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    isThinking 
                      ? 'bg-rose-950 text-rose-300 border-rose-500/50 animate-pulse' 
                      : project && !['COMPLETED', 'FAILED'].includes(project.status)
                      ? 'bg-amber-950 text-amber-300 border-amber-500/50 animate-pulse'
                      : 'bg-indigo-950 text-indigo-300 border-indigo-500/40'
                  }`}>
                    {isThinking ? 'PROCESSING' : project?.status || 'STANDBY'}
                  </span>
                </div>
                
                <button
                  onClick={handleReplayVoice}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                  title="Dengarkan Respon Suara"
                >
                  <Volume2 size={12} className={isSpeaking ? 'animate-bounce text-rose-400' : ''} />
                  <span>{isSpeaking ? 'Berbicara...' : 'Dengar Suara'}</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                {getNeuronaStatusText()}
              </p>

              {/* Quick Preset Action Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                <button
                  onClick={() => onInteract("Buatkan video animasi 3D Pixar tentang petualangan robot di dunia cyberpunk")}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-500/40 text-[10px] text-slate-300 hover:text-cyan-300 transition"
                >
                  ✨ Animasi 3D Robot
                </button>
                <button
                  onClick={() => onInteract("Buatkan video edukasi konsep dasar Quantum Computing untuk pemula")}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-emerald-950/60 border border-white/10 hover:border-emerald-500/40 text-[10px] text-slate-300 hover:text-emerald-300 transition"
                >
                  📚 Edukasi Quantum
                </button>
                <button
                  onClick={() => onInteract("Buatkan video affiliate produk skincare viral TikTok dengan hook kuat")}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-amber-950/60 border border-white/10 hover:border-amber-500/40 text-[10px] text-slate-300 hover:text-amber-300 transition"
                >
                  🛍️ Affiliate Skincare
                </button>
              </div>
            </div>

            {/* INTEGRATED CORE PROMPT & ATTACHMENT STATION */}
            <div className="w-full space-y-2">
              
              {/* Attached Assets Preview Chips */}
              {attachedAssets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachedAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs text-slate-300">
                      {asset.type === 'IMAGE' ? <ImageIcon size={12} className="text-cyan-400" /> : <VideoIcon size={12} className="text-amber-400" />}
                      <span className="truncate max-w-[120px] font-mono text-[11px]">{asset.name}</span>
                      <button onClick={() => onRemoveAsset(asset.id)} className="text-slate-500 hover:text-rose-400">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className={`relative flex items-center rounded-2xl shadow-2xl transition ${
                isThinking 
                  ? 'bg-slate-900 border-2 border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                  : 'bg-slate-900/90 border border-cyan-500/40 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/50'
              }`}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => onUploadAssets(e.target.files)}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-slate-400 hover:text-cyan-300 transition"
                  title="Lampirkan Gambar atau Video Produk"
                >
                  <Paperclip size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleToggleVoiceInput}
                  className={`p-3 transition relative rounded-xl ${
                    isListening 
                      ? 'text-rose-400 bg-rose-500/20 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]' 
                      : 'text-slate-400 hover:text-cyan-300'
                  }`}
                  title={isListening ? "Mendengarkan suara... Klik untuk berhenti" : "Input Perintah Suara (Speech to Text)"}
                >
                  {isListening ? (
                    <MicOff size={18} className="animate-pulse text-rose-400" />
                  ) : (
                    <Mic size={18} />
                  )}
                  {isListening && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </button>

                <input
                  id="hud-matrix-prompt-input"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isThinking && onInteract()}
                  placeholder={isListening ? "🎙️ Mendengarkan suara Anda... Bicaralah sekarang..." : "Ketik instruksi produksi video atau gunakan mic..."}
                  className="flex-1 bg-transparent px-2 py-3.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
                  disabled={isThinking}
                />

                <button
                  id="hud-matrix-send-btn"
                  onClick={() => onInteract()}
                  disabled={isThinking || (!prompt.trim() && attachedAssets.length === 0)}
                  className={`mr-2 p-2.5 rounded-xl text-white transition cursor-pointer ${
                    isThinking 
                      ? 'bg-rose-600 shadow-lg shadow-rose-500/40' 
                      : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/30'
                  }`}
                >
                  {isThinking ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-2">
                {isListening ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
                    Merekam suara Anda... Bicaralah sekarang (misal: "buat video edukasi fisika")
                  </span>
                ) : (
                  <span>Tekan <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Enter</kbd> untuk mengeksekusi</span>
                )}
                <span className="text-cyan-400">LATENCY: 12ms • QUANTUM SYNC</span>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT SUB-NODES CLUSTER: AFFILIATE STUDIO + VIDEO MONITOR + AGENT TELEMETRY */}
          {/* ========================================================================= */}
          <div className="lg:col-span-3 space-y-3.5 order-3">
            
            {/* SUB-NODE 4: STUDIO AFFILIATE PRODUK */}
            {(() => {
              const isAffActive = (isThinking && project?.videoType === 'AFFILIATE') || (project?.status && !['COMPLETED', 'FAILED'].includes(project.status) && project?.videoType === 'AFFILIATE');
              return (
                <div 
                  id="subnode-workspace-affiliate"
                  onClick={onOpenAffiliateModal}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer group relative overflow-hidden ${
                    isAffActive 
                      ? 'bg-slate-900 border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.6)] animate-energy-breathe scale-[1.02]'
                      : 'bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/30 shadow-lg shadow-amber-950/40'
                  }`}
                >
                  <div className={`absolute top-0 right-0 rounded-full blur-xl pointer-events-none transition-all ${
                    isAffActive ? 'w-28 h-28 bg-amber-400/30 animate-pulse' : 'w-16 h-16 bg-amber-500/10 group-hover:bg-amber-500/20'
                  }`} />
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isAffActive 
                          ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_#f59e0b] font-bold' 
                          : 'bg-amber-950 border border-amber-500/40 text-amber-300'
                      }`}>
                        <ShoppingBag size={14} className={isAffActive ? 'animate-bounce' : ''} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                          <span>Studio Affiliate</span>
                          <span className={`w-2 h-2 rounded-full ${isAffActive ? 'bg-amber-300 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
                        </h3>
                        <span className={`text-[10px] font-mono ${isAffActive ? 'text-amber-300 font-bold' : 'text-amber-400'}`}>
                          {isAffActive ? '🔥 NODE AKTIF BERJALAN' : 'Workspace Node #03'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                    Video konversi tinggi TikTok/Shopee, hook formula retensi 3 detik, call-to-action & diskon badge.
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-[9px] font-mono text-amber-300">
                    <span className={`px-2 py-0.5 rounded border transition-all ${isAffActive ? 'bg-amber-900 border-amber-400 text-white shadow-sm' : 'bg-amber-950/80 border-amber-500/30'}`}>TikTok Hook</span>
                    <span className={`px-2 py-0.5 rounded border transition-all ${isAffActive ? 'bg-amber-900 border-amber-400 text-white shadow-sm' : 'bg-amber-950/80 border-amber-500/30'}`}>Shopee Flash</span>
                    <span className={`px-2 py-0.5 rounded border transition-all ${isAffActive ? 'bg-amber-900 border-amber-400 text-white shadow-sm' : 'bg-amber-950/80 border-amber-500/30'}`}>Diskon CTA</span>
                  </div>
                </div>
              );
            })()}

            {/* SUB-NODE 5: LIVE VIDEO STAGE & PLAYER */}
            {(() => {
              const isVideoRenderActive = ['PRODUCING', 'ASSEMBLING', 'AUDIO', 'EDITING', 'QA'].includes(project?.status || '');
              return (
                <div 
                  id="subnode-feature-video"
                  className={`p-3.5 rounded-2xl transition-all relative overflow-hidden ${
                    isVideoRenderActive
                      ? 'bg-slate-900 border-2 border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.7)] animate-energy-breathe scale-[1.02]'
                      : 'bg-slate-900/80 border border-rose-500/30 hover:border-rose-400 shadow-lg shadow-rose-950/40'
                  }`}
                >
                  <div className={`absolute top-0 right-0 rounded-full blur-xl pointer-events-none transition-all ${
                    isVideoRenderActive ? 'w-28 h-28 bg-rose-400/30 animate-pulse' : 'w-16 h-16 bg-rose-500/10'
                  }`} />

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isVideoRenderActive 
                          ? 'bg-rose-500 text-slate-950 shadow-[0_0_15px_#f43f5e] font-bold' 
                          : 'bg-rose-950 border border-rose-500/40 text-rose-300'
                      }`}>
                        <Film size={14} className={isVideoRenderActive ? 'animate-spin' : ''} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                          <span>Video Player Stage</span>
                          {isVideoRenderActive && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
                        </h3>
                        <span className="text-[10px] text-rose-400 font-mono">
                          {project?.status === 'COMPLETED' ? 'MASTER READY' : isVideoRenderActive ? '🔥 RENDERING VIDEO...' : 'STANDBY'}
                        </span>
                      </div>
                    </div>
                    
                    {project?.finalVideoUrl && (
                      <a
                        href={project.finalVideoUrl}
                        download={`neurona-video-${project.id.substring(0,6)}.mp4`}
                        className="p-1 rounded bg-rose-950 border border-rose-500/40 text-rose-300 hover:text-white"
                        title="Unduh MP4"
                      >
                        <Download size={12} />
                      </a>
                    )}
                  </div>

                  {/* Mini Video Display */}
                  <VideoPreviewPlayer className={getProjectAspectRatioClass(project)}
                    src={activeVideoSrc}
                    posterImage={currentScene?.imageUrl || currentScene?.assetUrl}
                    title={currentScene?.title || `Adegan ${(selectedSceneIndex || 0) + 1}`}
                    subtitle={currentScene?.subtitle || currentScene?.textOverlay}
                    voiceoverText={currentScene?.voiceOver}
                    status={project?.status}
                    activeAgent={project?.activeAgent || 'GATOTKACA VIDEO DIRECTOR'}
                    videoModel={project?.videoModel}
                    progressPercentage={progressPercentage}
                    currentPhaseName={project?.currentPhaseName}
                    scenes={project?.storyboard?.scenes}
                    activeSceneIndex={selectedSceneIndex}
                    onSelectScene={(idx) => setSelectedSceneIndex(idx)}
                    onRetry={onRetry}
                  />
                </div>
              );
            })()}

            {/* SUB-NODE 6: AUTONOMOUS AGENTS SWARM TELEMETRY */}
            <div 
              id="subnode-feature-agents"
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 shadow-lg shadow-cyan-950/40 space-y-2.5"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-white uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Cpu size={13} className="text-cyan-400" />
                  <span>Agent Telemetry Swarm</span>
                </div>
                <span className="text-[9px] font-mono text-cyan-400">8 NODES</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                {agents.slice(0, 4).map(agent => {
                  const isActiveAgent = project?.activeAgent?.includes(agent.codename) || (isThinking && agent.codename === 'BATARA');
                  return (
                    <div 
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`p-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                        isActiveAgent 
                          ? 'bg-cyan-950/90 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-[1.03] animate-pulse'
                          : 'bg-black/40 border border-white/5 hover:border-cyan-500/40'
                      }`}
                    >
                      <div>
                        <div className={`font-bold text-[10px] ${isActiveAgent ? 'text-cyan-300 font-black' : 'text-white'}`}>
                          {agent.codename}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate max-w-[70px]">{agent.role}</div>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${
                        isActiveAgent ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'
                      }`} />
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </main>

      

      {/* ========================================================================= */}
      {/* STORYBOARD MATRIX MODAL / DRAWER */}
      {/* ========================================================================= */}
      {activeSubNodeModal === 'STORYBOARD' && (
        <div 
          id="modal-storyboard-matrix"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
        >
          <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold text-sm">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                    Storyboard & Script Matrix
                  </h3>
                  <p className="text-xs text-slate-400">{project?.title || 'Rancangan Adegan Multi-Shot'}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubNodeModal('NONE')}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {project?.storyboard?.scenes && project.storyboard.scenes.length > 0 ? (
                project.storyboard.scenes.map((scene, idx) => (
                  <div key={scene.id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-amber-400">Adegan {idx + 1} ({scene.duration})</span>
                        {scene.qaScore !== undefined && (
                          <span className={`px-1.5 py-0.5 ml-1 rounded-full text-[9px] flex items-center gap-0.5 border ${
                            (scene.qaScore !== undefined && scene.qaScore >= clientConfig.qaMinScoreThreshold) ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30' : 'bg-rose-950/50 text-rose-400 border-rose-500/30'
                          }`} title={scene.qaIssues?.length ? `QA Issues:\n${scene.qaIssues.join('\n')}` : 'QA Audit Passed'}>
                            <ShieldCheck size={9} />
                            QA: {scene.qaScore}
                          </span>
                        )}
                      </div>
                      {scene.textOverlay && <span className="text-cyan-300 font-mono text-[10px]">[{scene.textOverlay}]</span>}
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">{scene.visualDirection}</p>
                    {scene.voiceOver && (
                      <p className="text-emerald-400/90 text-xs italic font-serif">🎙️ "{scene.voiceOver}"</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Belum ada storyboard yang dibuat.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={copyFullVoiceoverScript}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1"
              >
                {copiedScript ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedScript ? 'Naskah Tersalin' : 'Salin Naskah Suara'}</span>
              </button>

              {project?.status === 'AWAITING_APPROVAL' && onApprove && (
                <button
                  onClick={() => {
                    onApprove();
                    setActiveSubNodeModal('NONE');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 flex items-center gap-1"
                >
                  <Play size={12} fill="currentColor" />
                  Mulai Render Video
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AGENT TELEMETRY DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedAgent && (
        <div 
          id="agent-telemetry-drawer"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  {selectedAgent.codename.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                    {selectedAgent.codename} • {selectedAgent.agentName}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedAgent.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase">Node Location</div>
                <div className="text-cyan-300 font-medium mt-0.5">{selectedAgent.location}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase">Round-Trip Latency</div>
                <div className="text-emerald-400 font-mono font-medium mt-0.5">{selectedAgent.latencyMs} ms</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 col-span-2">
                <div className="text-slate-500 text-[10px] uppercase">Active Task Execution</div>
                <div className="text-white mt-0.5">{selectedAgent.currentTask}</div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
              >
                CLOSE TELEMETRY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Top-Up Modal */}
      <CreditTopUpModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        currentCredits={userCredits}
        onAddCredits={handleAddCredits}
        userEmail={currentUser?.email || 'kreator@neuronna.ai'}
        userName={currentUser?.name || 'Kreator Neuronna'}
      />

      {/* Advanced Storyboard Matrix Modal */}
      <StoryboardMatrixModal
        isOpen={isStoryboardMatrixOpen}
        onClose={() => setIsStoryboardMatrixOpen(false)}
        project={project}
        currentCredits={userCredits}
        onApproveAndPay={(cost) => {
          setIsStoryboardMatrixOpen(false);
          handleApproveWithCredits(cost);
        }}
        onOpenTopUp={() => setIsCreditModalOpen(true)}
        onGenerateSceneImage={handleGenerateSceneImage}
        onGenerateAllImages={handleGenerateAllImages}
        onGenerateSceneVideo={handleGenerateSceneVideo}
        onChooseStoryboardOnly={handleChooseStoryboardOnly}
        onResyncScene={handleResyncScene}
      />

      {/* Dynamic Video Model & Voiceover TTS Selector Modal */}
      <ModelSelectorModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedVideoModel={selectedVideoModel}
        onSelectVideoModel={handleSelectVideoModel}
        selectedVoiceId={selectedVoiceId}
        onSelectVoiceId={handleSelectVoiceId}
      />

    </div>
  );
};
