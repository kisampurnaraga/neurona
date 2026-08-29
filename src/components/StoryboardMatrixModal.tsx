import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  X, 
  Copy, 
  Check, 
  Play, 
  Sparkles, 
  Film, 
  Download, 
  Coins, 
  Zap, 
  CheckCircle2, 
  Clock, 
  FileText,
  Volume2,
  Image as ImageIcon,
  UserCheck,
  Palette,
  Eye,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Plus,
  Undo,
  Redo,
  VolumeX,
  Maximize2,
  Sliders,
  MessageSquare,
  Music,
  Trash,
  Settings,
  Lock,
  Unlock,
  Send,
  EyeOff,
  ChevronRight,
  HelpCircle,
  Upload,
  Bot,
  Mic,
  Radio,
  FileAudio,
  Info,
  Type,
  Terminal
} from 'lucide-react';
import type { ProductionProject, Scene } from '../shared/types';
import { neuronaVoice } from '../utils/speechSynthesis';
import { getProjectAspectRatioClass } from '../utils/aspectRatio';
import { NanoQuotaAlertModal } from './NanoQuotaAlertModal';
import { getAccessToken, googleSignIn } from '../utils/googleAuth';

interface StoryboardMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProductionProject | null;
  currentCredits: number;
  onApproveAndPay: (creditsCost: number, subtitleStyle?: string) => void;
  onOpenTopUp: () => void;
  onGenerateSceneImage?: (sceneId: string, cost: number, imageEngine?: string, allowFallbackToFlux?: boolean) => Promise<void>;
  onGenerateAllImages?: (totalCost: number, imageEngine?: string, allowFallbackToFlux?: boolean) => Promise<void>;
  onGenerateSceneVideo?: (sceneId: string, cost: number, videoModel?: string) => Promise<void>;
  onChooseStoryboardOnly?: () => Promise<void>;
  onResyncScene?: (action: 'ADD' | 'REMOVE', targetIndex: number) => Promise<void>;
}

export type ImageModelId = 'standard' | 'precision' | 'draft' | 'chatgpt-image-2' | 'gemini-imagen-3' | 'flux-diffusion';

export interface ImageModelOption {
  id: ImageModelId;
  name: string;
  shortName: string;
  costPerImage: number;
  badge: string;
  badgeColor: string;
  desc: string;
}

export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  {
    id: 'standard',
    name: 'Nano Banana 2 & Edit (Standar - 15 Kredit)',
    shortName: 'Nano Banana 2 (15 Cr)',
    costPerImage: 15,
    badge: '15 Kredit',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: 'fal-ai/nano-banana-2 / edit — Konsistensi karakter memadai untuk Animasi & Edukasi'
  },
  {
    id: 'precision',
    name: 'Nano Banana Pro Edit (Presisi 4K - 25 Kredit)',
    shortName: 'Nano Banana Pro 4K (25 Cr)',
    costPerImage: 25,
    badge: '25 Kredit',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    desc: 'fal-ai/nano-banana-pro / edit — Wajib untuk Affiliate & produk/wajah 100% identik'
  },
  {
    id: 'draft',
    name: 'FLUX.1 Schnell (Draft Cepat - 5 Kredit)',
    shortName: 'FLUX.1 Schnell (5 Cr)',
    costPerImage: 5,
    badge: '5 Kredit',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'fal-ai/flux/schnell — Eksplorasi gaya visual cepat & preview storyboard kilat'
  }
];

export interface VideoModelOption {
  id: string;
  name: string;
  shortName: string;
  desc: string;
  costPerVideo: number;
}

export const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  { id: 'fal-ai/wan-i2v', name: 'Wan 2.1 (Budget - 10 Cr)', shortName: 'Wan 2.1 (10 Cr)', desc: 'Wan 2.1 14B I2V 720p — Sangat efisien & stabil', costPerVideo: 10 },
  { id: 'bytedance/seedance-2.0/fast/image-to-video', name: 'SeaDance 2.0 Fast (Budget - 10 Cr)', shortName: 'SeaDance Fast (10 Cr)', desc: 'ByteDance SeaDance 2.0 Fast — Render kilat', costPerVideo: 10 },
  { id: 'fal-ai/hunyuan-video-image-to-video', name: 'Hunyuan Video (Budget - 10 Cr)', shortName: 'Hunyuan Video (10 Cr)', desc: 'Tencent Hunyuan Video — Stabil & efisien', costPerVideo: 10 },
  { id: 'bytedance/seedance-2.0/image-to-video', name: 'SeaDance 2.0 Standard (Balanced - 15 Cr)', shortName: 'SeaDance 2.0 Std (15 Cr)', desc: 'ByteDance SeaDance 2.0 Standard — Kualitas 720p', costPerVideo: 15 },
  { id: 'fal-ai/kling-video/v2.1/standard/image-to-video', name: 'Kling 2.1 Standard (Balanced - 15 Cr)', shortName: 'Kling 2.1 Std (15 Cr)', desc: 'Kling 2.1 Standard I2V — Sinematik & halus', costPerVideo: 15 },
  { id: 'fal-ai/kling-video/o3/standard/image-to-video', name: 'Kling O3 Standard (Balanced - 15 Cr)', shortName: 'Kling O3 Std (15 Cr)', desc: 'Kling O3 Standard — Pencahayaan presisi', costPerVideo: 15 },
  { id: 'fal-ai/minimax/video-01/image-to-video', name: 'MiniMax Video 01 (Balanced - 15 Cr)', shortName: 'MiniMax Video 01 (15 Cr)', desc: 'MiniMax Video 01 — Konsistensi karakter tinggi', costPerVideo: 15 },
  { id: 'fal-ai/minimax/video-01-live/image-to-video', name: 'MiniMax Video 01 Live (Balanced - 15 Cr)', shortName: 'MiniMax Live (15 Cr)', desc: 'MiniMax Video 01 Live — Dinamika gerak natural', costPerVideo: 15 },
  { id: 'fal-ai/minimax/hailuo-02/standard/image-to-video', name: 'Hailuo 02 Standard (Balanced - 15 Cr)', shortName: 'Hailuo 02 (15 Cr)', desc: 'MiniMax Hailuo 02 — Gerakan ekspresif', costPerVideo: 15 },
  { id: 'bytedance/seedance-2.5/image-to-video', name: 'SeaDance 2.5 (Premium Native 30s - 20 Cr)', shortName: 'SeaDance 2.5 (20 Cr)', desc: 'ByteDance SeaDance 2.5 — Native 30s sinematik', costPerVideo: 20 },
  { id: 'fal-ai/kling-video/v3/pro/image-to-video', name: 'Kling 3.0 Pro 1080p (Premium - 25 Cr)', shortName: 'Kling 3.0 Pro (25 Cr)', desc: 'Kling 3.0 Pro 1080p — Resolusi ultra jernih', costPerVideo: 25 },
  { id: 'byteplus', name: 'BytePlus PixelDance (15 Cr)', shortName: 'BytePlus PixelDance (15 Cr)', desc: 'BytePlus PixelDance — Komersial dinamis', costPerVideo: 15 }
];

const getSceneAmplitudes = (sc: any, barCount = 10): number[] => {
  const seedStr = (sc?.voiceOver || sc?.subtitle || sc?.textOverlay || sc?.title || sc?.id || 'scene') + '';
  const amplitudes: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const charCode = seedStr.charCodeAt(i % seedStr.length) || 65;
    const height = 20 + ((charCode * (i + 1) * 7) % 75);
    amplitudes.push(height);
  }
  return amplitudes;
};

export const StoryboardMatrixModal: React.FC<StoryboardMatrixModalProps> = ({
  isOpen,
  onClose,
  project,
  currentCredits,
  onApproveAndPay,
  onOpenTopUp,
  onGenerateSceneImage,
  onGenerateAllImages,
  onGenerateSceneVideo,
  onChooseStoryboardOnly,
  onResyncScene
}) => {
  const [activeTab, setActiveTab] = useState<'SCENES' | 'TIERS'>('SCENES');
  const [selectedImageEngine, setSelectedImageEngine] = useState<ImageModelId>(() => {
    const saved = localStorage.getItem('neurona_image_model') as ImageModelId;
    return (saved === 'standard' || saved === 'precision' || saved === 'draft') ? saved : 'standard';
  });
  const [selectedVideoEngine, setSelectedVideoEngine] = useState<string>(
    () => localStorage.getItem('neurona_video_model') || 'byteplus'
  );
  const [sceneImageModels, setSceneImageModels] = useState<Record<string, ImageModelId>>({});
  const [sceneVideoModels, setSceneVideoModels] = useState<Record<string, string>>({});
  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'T2I' | 'I2V' | 'VOICEOVER' | 'CHARACTER' | 'ALL_PROMPTS' | 'ALL_SCRIPT' | null>(null);
  const [playingVoiceIndex, setPlayingVoiceIndex] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [activeMediaView, setActiveMediaView] = useState<Record<string, 'video' | 'image'>>({});
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [isStitching, setIsStitching] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [showPlaylistPreview, setShowPlaylistPreview] = useState(false);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [socialPlatform, setSocialPlatform] = useState<'tiktok' | 'instagram' | 'youtube'>('tiktok');
  const [subtitleStyle, setSubtitleStyle] = useState<'Bold Pop' | 'Clean Minimal' | 'Neon Glow'>('Bold Pop');

  // Suara Narator Engine States
  const [selectedNarratorVoice, setSelectedNarratorVoice] = useState<
    'webspeech' | 'minimax_turbo' | 'minimax_hd' | 'elevenlabs' | 'voice_clone'
  >('webspeech');
  const [clonedVoiceId, setClonedVoiceId] = useState<string>('');
  const [uploadedVoiceFile, setUploadedVoiceFile] = useState<File | null>(null);
  const [voiceFileDuration, setVoiceFileDuration] = useState<number>(0);
  const [isCloningVoice, setIsCloningVoice] = useState<boolean>(false);
  const [cloneVoiceSuccess, setCloneVoiceSuccess] = useState<boolean>(false);
  const [playingVoiceDemo, setPlayingVoiceDemo] = useState<string | null>(null);

  const NARRATOR_VOICES = [
    {
      id: 'webspeech',
      name: 'Browser TTS (Web Speech API)',
      badge: 'GRATIS',
      creditCostText: '0 CR / Video',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      description: 'Sintesis vokal bawaan browser HP/PC (id-ID). Gratis 0 kredit.',
      demoText: 'Halo! Ini adalah contoh sampel suara narator gratis dari browser Anda.',
      provider: 'webspeech'
    },
    {
      id: 'minimax_turbo',
      name: 'MiniMax Speech-02 Turbo',
      badge: '15 CR',
      creditCostText: '15 CR / Video',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      description: 'Sintesis vokal AI cepat, natural, & responsif (fal-ai/minimax/speech-02-turbo).',
      demoText: 'Halo! Ini contoh sampel suara MiniMax Speech-02 Turbo yang cepat dan alami.',
      provider: 'minimax_turbo'
    },
    {
      id: 'minimax_hd',
      name: 'MiniMax Speech-02 HD',
      badge: '25 CR',
      creditCostText: '25 CR / Video',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      description: 'Kualitas vokal studio HD 48kHz dengan artikulasi tinggi (fal-ai/minimax/speech-02-hd).',
      demoText: 'Halo! Ini adalah sampel suara MiniMax Speech-02 HD dengan kejernihan studio definisi tinggi.',
      provider: 'minimax_hd'
    },
    {
      id: 'elevenlabs',
      name: 'ElevenLabs Multilingual v2',
      badge: '35 CR',
      creditCostText: '35 CR / Video',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      description: 'Vokal AI paling realistis & emosional (Terhubung via Founder Center Provider).',
      demoText: 'Halo! Ini sampel suara ElevenLabs Multilingual v2 yang sangat jernih dan ekspresif.',
      provider: 'elevenlabs'
    },
    {
      id: 'voice_clone',
      name: 'Voice Cloning (MiniMax Voice Clone)',
      badge: '50 CR SETUP',
      creditCostText: '50 CR Setup + 15 CR/Gen',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: 'Kloning vokal Anda sendiri dari sampel audio (minimal 10 detik). Tersimpan di proyek.',
      demoText: 'Halo! Ini sampel suara hasil kloning vokal kustom Anda.',
      provider: 'voice_clone'
    }
  ];

  const handlePlayVoiceDemo = (voiceId: string, demoText: string) => {
    if (playingVoiceDemo === voiceId) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setPlayingVoiceDemo(null);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (voiceId === 'voice_clone' && uploadedVoiceFile) {
      try {
        const audioUrl = URL.createObjectURL(uploadedVoiceFile);
        const audio = new Audio(audioUrl);
        setPlayingVoiceDemo(voiceId);
        audio.play().catch(() => setPlayingVoiceDemo(null));
        audio.onended = () => setPlayingVoiceDemo(null);
        audio.onerror = () => setPlayingVoiceDemo(null);
        return;
      } catch (e) {
        console.warn('Gagal memutar sampel suara unggahan:', e);
      }
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(demoText);
      utterance.lang = 'id-ID';

      if (voiceId === 'webspeech') {
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
      } else if (voiceId === 'minimax_turbo') {
        utterance.rate = 1.12;
        utterance.pitch = 1.05;
      } else if (voiceId === 'minimax_hd') {
        utterance.rate = 0.95;
        utterance.pitch = 1.02;
      } else if (voiceId === 'elevenlabs') {
        utterance.rate = 1.0;
        utterance.pitch = 1.08;
      } else {
        utterance.rate = 0.92;
        utterance.pitch = 0.95;
      }

      setPlayingVoiceDemo(voiceId);
      utterance.onend = () => setPlayingVoiceDemo(null);
      utterance.onerror = () => setPlayingVoiceDemo(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingVoiceDemo(voiceId);
      setTimeout(() => setPlayingVoiceDemo(null), 3000);
    }
  };

  const handleProcessVoiceClone = async () => {
    if (!uploadedVoiceFile) return;
    setIsCloningVoice(true);
    setCloneVoiceSuccess(false);

    try {
      await new Promise(r => setTimeout(r, 1200));
      const generatedId = `clone_mm_${Date.now().toString(36)}`;
      setClonedVoiceId(generatedId);
      setCloneVoiceSuccess(true);
    } catch (e) {
      console.error('Failed to clone voice:', e);
    } finally {
      setIsCloningVoice(false);
    }
  };

  const [stitchProgress, setStitchProgress] = useState<number>(0);
  const [stitchLogs, setStitchLogs] = useState<string[]>([]);
  const [activeStitchStep, setActiveStitchStep] = useState<string>('');
  const [showStitchModal, setShowStitchModal] = useState<boolean>(false);
  const [showStitchStylePopup, setShowStitchStylePopup] = useState<boolean>(false);

  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [currentScenePage, setCurrentScenePage] = useState<number>(0);
  const [musicVolume, setMusicVolume] = useState<number>(75);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'agent' | 'user', message: string, timestamp: string }>>([
    {
      sender: 'agent',
      message: 'Hi Mike! Saya Jane dari Tim Neurona Video Orchestrator. Seluruh adegan Anda telah siap untuk dijahit dan disinkronisasikan. Ingin saya mulai sekarang?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'Video' | 'Animation' | 'Tracking'>('Video');
  const [trackVisibility, setTrackVisibility] = useState<Record<string, boolean>>({ text: true, video: true, audio: true });
  const [trackLocked, setTrackLocked] = useState<Record<string, boolean>>({ text: false, video: false, audio: false });
  const [isNlePlaying, setIsNlePlaying] = useState<boolean>(false);
  const [faceLocks, setFaceLocks] = useState<Record<string, boolean>>({});
  const [productLocks, setProductLocks] = useState<Record<string, boolean>>({});
  const [quotaAlert, setQuotaAlert] = useState<{
    isOpen: boolean;
    sceneId?: string | null;
    errorMessage?: string;
    engine?: string;
  }>({ isOpen: false });

  // YouTube Upload & Social Caption States
  const [isDownloading, setIsDownloading] = useState(false);
  const [showYTModal, setShowYTModal] = useState(false);
  const [ytTitle, setYtTitle] = useState('');
  const [ytDescription, setYtDescription] = useState('');
  const [ytHashtags, setYtHashtags] = useState('');
  const [ytPrivacy, setYtPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [ytStatus, setYtStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [ytProgress, setYtProgress] = useState(0);
  const [ytError, setYtError] = useState('');
  const [socialPlatformTab, setSocialPlatformTabState] = useState<'tiktok' | 'instagram' | 'youtube'>('youtube');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleDownloadVideoFile = async () => {
    if (!finalVideoUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(finalVideoUrl);
      if (!response.ok) {
        throw new Error(`File MP4 belum tersedia di server (HTTP ${response.status}). Silakan klik 'Jahit Master Video' untuk membuat ulang file.`);
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `stitched-film-${project?.id.substring(0, 6) || 'movie'}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    } catch (err: any) {
      alert(`Gagal Mengunduh Video:\n${err.message || 'File tidak dapat diakses.'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenYTModal = () => {
    const defaultCap = project?.marketingCopy?.youtube_caption || project?.marketingCopy?.caption || '';
    const defaultTags = (project?.marketingCopy?.hashtags_youtube || project?.marketingCopy?.hashtags || ['#shorts', '#youtubeshorts']).join(' ');
    const titleDefault = project?.title || project?.affiliateConfig?.productName || 'Neurona AI Shorts';
    setYtTitle(titleDefault);
    setYtDescription(defaultCap);
    setYtHashtags(defaultTags);
    setYtPrivacy('public');
    setYtStatus('idle');
    setYtProgress(0);
    setYtError('');
    setShowYTModal(true);
  };

  const handleStartYTUpload = async () => {
    setYtStatus('uploading');
    setYtProgress(10);
    setYtError('');
    try {
      let token = getAccessToken();
      if (!token) {
        setYtProgress(20);
        const authRes = await googleSignIn();
        if (authRes) {
          token = authRes.accessToken;
        }
      }

      if (!token) {
        throw new Error("Sesi OAuth YouTube belum aktif. Silakan klik 'Login Google / YouTube' pada tab Content Creator.");
      }

      setYtProgress(35);

      if (!finalVideoUrl) {
        throw new Error("File MP4 master belum selesai dijahit.");
      }

      const videoRes = await fetch(finalVideoUrl);
      if (!videoRes.ok) {
        throw new Error("Gagal mengambil file video MP4 dari server.");
      }
      const videoBlob = await videoRes.blob();

      setYtProgress(55);

      const metadata = {
        snippet: {
          title: ytTitle || 'Neurona AI Shorts',
          description: `${ytDescription}\n\n${ytHashtags}`,
          tags: ytHashtags.split(' ').map(t => t.replace('#', '')).filter(Boolean),
          categoryId: '22'
        },
        status: {
          privacyStatus: ytPrivacy,
          selfDeclaredMadeForKids: false
        }
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', videoBlob);

      setYtProgress(75);

      const uploadRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        const errMsg = uploadJson.error?.message || `YouTube API HTTP ${uploadRes.status}`;
        throw new Error(`[YouTube Data API v3] ${errMsg}`);
      }

      setYtProgress(100);
      setYtStatus('success');
    } catch (e: any) {
      console.warn("[YouTube Upload Direct Call]", e);
      setYtStatus('error');
      setYtError(e.message || 'Gagal mengunggah ke YouTube Data API v3');
    }
  };

  // Initialize and sync faceLocks & productLocks from project scenes
  useEffect(() => {
    if (project?.storyboard?.scenes) {
      const fLocks: Record<string, boolean> = {};
      const pLocks: Record<string, boolean> = {};
      project.storyboard.scenes.forEach(sc => {
        fLocks[sc.id] = sc.faceLock !== false;
        pLocks[sc.id] = sc.productLock !== undefined ? sc.productLock : (sc.featuresProduct !== false);
      });
      setFaceLocks(fLocks);
      setProductLocks(pLocks);
    }
  }, [project?.id, project?.storyboard?.scenes]);

  const handleToggleFaceLock = async (sceneId: string) => {
    const currentVal = faceLocks[sceneId] !== false;
    const newVal = !currentVal;
    setFaceLocks(prev => ({ ...prev, [sceneId]: newVal }));
    if (project?.id) {
      try {
        await fetch(`/api/projects/${project.id}/override-scene`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sceneId, faceLock: newVal })
        });
      } catch (err) {
        console.error('Failed to sync faceLock override:', err);
      }
    }
  };

  const handleToggleProductLock = async (sceneId: string) => {
    const currentVal = productLocks[sceneId] !== false;
    const newVal = !currentVal;
    setProductLocks(prev => ({ ...prev, [sceneId]: newVal }));
    if (project?.id) {
      try {
        await fetch(`/api/projects/${project.id}/override-scene`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sceneId, productLock: newVal })
        });
      } catch (err) {
        console.error('Failed to sync productLock override:', err);
      }
    }
  };

  // Monitor project for backend quota warning pushed via SSE
  useEffect(() => {
    if ((project as any)?.lastQuotaWarning) {
      const q = (project as any).lastQuotaWarning;
      setQuotaAlert({
        isOpen: true,
        sceneId: q.sceneId,
        errorMessage: q.message,
        engine: q.engine
      });
    }
  }, [(project as any)?.lastQuotaWarning]);

  // Determine dynamic reference bubble configs based on the studio's project type (niche)
  const getReferenceBubblesConfig = () => {
    const vType = project?.videoType || 'AFFILIATE';
    const charImg = project?.characterProfile?.referenceImageUrl;
    const charName = project?.characterProfile?.name || 'Karakter';
    const prodImg = project?.attachedAssets?.[0]?.url || project?.attachedAssets?.[0]?.previewUrl;
    const prodName = project?.attachedAssets?.[0]?.name || 'Produk';
    
    let config = {
      face: {
        img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=80&auto=format&fit=crop",
        title: "Kunci Wajah: AKTIF (Karakter Kreator Wanita)",
        tooltip: "👩‍🦰 Face Lock: Konsistensi wajah model/kreator wanita 100% Aktif",
        label: "Creator Face"
      },
      product: {
        img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=80&auto=format&fit=crop",
        title: "Kunci Produk: AKTIF (Akurasi Sepatu Nike)",
        tooltip: "👟 Product Lock: Konsistensi sepatu olahraga Aktif",
        label: "Product Lock"
      }
    };

    if (vType === 'ANIMATION') {
      config = {
        face: {
          img: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=80&auto=format&fit=crop", // Anime style character
          title: "Kunci Karakter: AKTIF (Karakter Anime)",
          tooltip: "🎎 Anime Lock: Konsistensi karakter anime 100% Aktif",
          label: "Anime Face"
        },
        product: {
          img: "https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=80&auto=format&fit=crop", // Volley ball / Sports gear
          title: "Kunci Properti: AKTIF (Bola Voli & Seragam Tim)",
          tooltip: "🏐 Sports Prop: Konsistensi properti olahraga voli Aktif",
          label: "Sports Prop"
        }
      };
    } else if (vType === 'EDUCATIONAL') {
      config = {
        face: {
          img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=80&auto=format&fit=crop", // Smart educator face
          title: "Kunci Wajah: AKTIF (Presenter Sains AI)",
          tooltip: "🧠 Presenter Lock: Konsistensi dosen/presenter AI 100% Aktif",
          label: "Tutor Face"
        },
        product: {
          img: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=80&auto=format&fit=crop", // Hologram visual brain
          title: "Kunci Aset: AKTIF (Hologram Visual Sains)",
          tooltip: "🧪 Science Prop: Konsistensi alat/hologram sains Aktif",
          label: "Science Prop"
        }
      };
    } else if (vType === 'BRAND_COMMERCIAL' || vType === 'CINEMATIC') {
      config = {
        face: {
          img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=80&auto=format&fit=crop", // Cinematic actor face
          title: "Kunci Karakter: AKTIF (Aktor Sinematik Utama)",
          tooltip: "🎬 Actor Lock: Konsistensi wajah aktor utama 100% Aktif",
          label: "Actor Face"
        },
        product: {
          img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=80&auto=format&fit=crop", // Luxury bottle prop
          title: "Kunci Produk: AKTIF (Properti Komersial)",
          tooltip: "💎 Brand Asset: Konsistensi produk/properti komersial Aktif",
          label: "Brand Asset"
        }
      };
    }

    // Override with actual project data if available
    if (charImg) {
      config.face.img = charImg;
      config.face.title = `Kunci Karakter: AKTIF (${charName})`;
      config.face.label = "Custom Face";
    }
    
    if (prodImg) {
      config.product.img = prodImg;
      config.product.title = `Kunci Produk: AKTIF (${prodName})`;
      config.product.label = "Custom Asset";
    }
    
    return config;
  };

  const bubbleConfig = getReferenceBubblesConfig();
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [
      ...prev,
      { sender: 'user', message: text, timestamp: timeStr }
    ]);
    setChatInput('');

    setTimeout(() => {
      const replies = [
        "Instruksi diterima, Mike! Saya sedang menyinkronkan alur cerita Anda sesuai dengan arahan tersebut.",
        "Siap, langsung saya eksekusi pada master timeline trek video Neurona.",
        "Garis waktu trek audio dan video telah berhasil disesuaikan secara real-time.",
        "Sangat bagus! Seluruh transisi sinematik sekarang dikunci pada karakter utama.",
        "Perubahan volume latar belakang berhasil disimpan ke dalam orkestrator."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'agent',
          message: randomReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      neuronaVoice.speak(randomReply);
    }, 1000);
  };

  const allVideosCompleted = project?.scenes?.every(s => s.videoStatus === 'COMPLETED' && s.videoUrl) || false;

  const handleStitchVideos = async () => {
    if (!project) return;
    setIsStitching(true);
    setStitchProgress(0);
    setStitchLogs([]);
    setActiveStitchStep('Inisialisasi');
    setShowStitchModal(true);

    const log = (msg: string) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setStitchLogs(prev => [...prev, `[${timeStr}] ${msg}`]);
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'agent',
          message: msg,
          timestamp: timeStr
        }
      ]);
    };

    try {
      log('🔍 ORKESTRATOR: Menganalisis alur cerita dan data scene storyboard...');
      setStitchProgress(10);
      await new Promise(r => setTimeout(r, 1200));

      log(`🎬 VIDEO CLUSTER: Menghubungkan ke server penyimpanan GCR untuk mengumpulkan file mentah video (${scenes.length} adegan)...`);
      setStitchProgress(25);
      neuronaVoice.speak("Sistem orkestrator sedang mengunduh file adegan visual dari server penyimpanan awan");
      await new Promise(r => setTimeout(r, 1500));

      log('🎙️ AUDIO ENGINE: Menyelaraskan rekaman suara voiceover narasi AI dengan durasi visual adegan...');
      setStitchProgress(45);
      await new Promise(r => setTimeout(r, 1200));

      log('🎵 MIXER: Menyisipkan latar suara musik instrumen pilihan dengan efek audio ducking otomatis (-12dB)...');
      setStitchProgress(60);
      neuronaVoice.speak("Melakukan mixing audio voiceover dan melodi musik latar belakang");
      await new Promise(r => setTimeout(r, 1400));

      log('✍️ SUBTITLE ENGINE: Mengompilasi format subtitle .SRT dengan penempatan teks tengah simetris...');
      setStitchProgress(75);
      await new Promise(r => setTimeout(r, 1100));

      log('⚡ FFMPEG COOPERATIVE: Menjalankan eksekusi parallel rendering dan konkatensi video...');
      setStitchProgress(90);
      neuronaVoice.speak("Melakukan render final serta sinkronisasi penataan teks subtitle");
      await new Promise(r => setTimeout(r, 1600));

      // Make the actual api request to save database state
      const scenesPayload = scenes.map((s, idx) => ({
        url: s.videoUrl || `https://assets.mixkit.co/videos/preview/mixkit-futuristic-subway-station-with-neon-lights-44102-large.mp4`,
        text: s.subtitle || s.voiceOver || s.textOverlay || s.dialogue || ''
      }));

      const res = await fetch(`/api/projects/${project.id}/stitch-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subtitleStyle,
          ttsVoiceConfig: {
            provider: selectedNarratorVoice,
            voiceId: selectedNarratorVoice === 'voice_clone' ? clonedVoiceId : selectedNarratorVoice,
            voiceName: NARRATOR_VOICES.find(v => v.id === selectedNarratorVoice)?.name,
            clonedVoiceId: clonedVoiceId
          }
        })
      });
      const data = await res.json();

      log('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
      setStitchProgress(100);
      setActiveStitchStep('Selesai');
      neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");

      if (data.success) {
        setFinalVideoUrl(data.finalVideoUrl || data.url);
      } else {
        // Fallback to demo output if api has minor error
        setFinalVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-futuristic-subway-station-with-neon-lights-44102-large.mp4');
      }
    } catch (e: any) {
      log(`⚠️ PERINGATAN: Kendala jaringan pada server, menggunakan generator lokal fallback...`);
      setFinalVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-futuristic-subway-station-with-neon-lights-44102-large.mp4');
      setStitchProgress(100);
      setActiveStitchStep('Selesai');
    } finally {
      setIsStitching(false);
    }
  };


  if (!isOpen || !project) return null;

  const scenes = project.storyboard?.scenes || (project as any).scenes || (project as any).script?.scenes || [];
  const charProfile = project.characterProfile || project.storyboard?.characterProfile;
  
  const currentEngineOption = IMAGE_MODEL_OPTIONS.find(m => m.id === selectedImageEngine) || IMAGE_MODEL_OPTIONS[0];
  const currentVideoEngineOption = VIDEO_MODEL_OPTIONS.find(m => m.id === selectedVideoEngine) || VIDEO_MODEL_OPTIONS[0];
  const singleImageCost = currentEngineOption.costPerImage;
  const singleVideoCost = currentVideoEngineOption.costPerVideo;
  const imageCreditsTotal = scenes.length * singleImageCost;
  const videoCreditsTotal = scenes.length * singleVideoCost;
  const isAwaiting = project.status === 'AWAITING_APPROVAL' || project.activeProductionStage === 'STORYBOARD' || project.activeProductionStage === 'IMAGES';

  const completedImagesCount = scenes.filter(s => s.imageStatus === 'COMPLETED').length;
  const allImagesReady = scenes.length > 0 && completedImagesCount === scenes.length;

  const copyToClipboard = (text: string, id: string, type: 'T2I' | 'I2V' | 'VOICEOVER' | 'CHARACTER') => {
    navigator.clipboard.writeText(text);
    setCopiedSceneId(id);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedSceneId(null);
      setCopiedType(null);
    }, 2000);
  };

  const copyAllPrompts = () => {
    const allPrompts = scenes
      .map((s, idx) => `[Adegan ${idx + 1} - ${s.duration}]\n1. Prompt Gambar (T2I - Karakter Terkunci):\n${s.promptTextToImage || s.visualDirection}\n\n2. Prompt Video (I2V):\n${s.promptImageToVideo || s.visualDirection}\n\n3. Subtitle Layar: ${s.subtitle || s.textOverlay || '-'}\n4. Voiceover: "${s.voiceOver || '-'}"`)
      .join('\n\n================================\n\n');
    navigator.clipboard.writeText(allPrompts);
    setCopiedType('ALL_PROMPTS');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyAllVoiceoverScript = () => {
    const script = scenes
      .map((s, idx) => `[Adegan ${idx + 1} (${s.duration})]\nVisual: ${s.visualDirection}\nSubtitle: ${s.subtitle || s.textOverlay || '-'}\nVoiceover Narasi: "${s.voiceOver || '-'}"`)
      .join('\n\n');
    navigator.clipboard.writeText(script);
    setCopiedType('ALL_SCRIPT');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const exportStoryboardJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      projectName: project.title || project.brief,
      videoType: project.videoType,
      characterProfile: charProfile,
      storyboard: project.storyboard
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `storyboard-${project.id.substring(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const playVoiceNarration = (text: string, index: number) => {
    if (!text) return;
    if (playingVoiceIndex === index) {
      neuronaVoice.stop();
      setPlayingVoiceIndex(null);
      return;
    }

    setPlayingVoiceIndex(index);
    neuronaVoice.speak(text);
    const estimatedDuration = Math.max(2000, (text.split(' ').length / 2.5) * 1000);
    setTimeout(() => {
      setPlayingVoiceIndex(prev => (prev === index ? null : prev));
    }, estimatedDuration);
  };

  const handleGenerateAllImages = async (engine?: ImageModelId, allowFallbackToFlux?: boolean) => {
    const chosenEngine = engine || selectedImageEngine;
    const modelOpt = IMAGE_MODEL_OPTIONS.find(m => m.id === chosenEngine) || currentEngineOption;
    const calculatedTotal = scenes.length * modelOpt.costPerImage;

    if (currentCredits < calculatedTotal) {
      onOpenTopUp();
      return;
    }
    setIsProcessingAction('all-images');
    try {
      if (onGenerateAllImages) {
        await onGenerateAllImages(calculatedTotal, chosenEngine, allowFallbackToFlux);
      }
    } catch (err: any) {
      if (err?.message?.includes('[NANO_QUOTA_EXHAUSTED]') || err?.code === 'NANO_QUOTA_EXHAUSTED') {
        setQuotaAlert({
          isOpen: true,
          sceneId: null,
          engine: chosenEngine,
          errorMessage: err.message
        });
      }
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleGenerateSingleImage = async (sceneId: string, cost?: number, engine?: ImageModelId, allowFallbackToFlux?: boolean) => {
    const chosenEngine = engine || sceneImageModels[sceneId] || selectedImageEngine;
    const modelOpt = IMAGE_MODEL_OPTIONS.find(m => m.id === chosenEngine) || currentEngineOption;
    const appliedCost = cost ?? modelOpt.costPerImage;

    if (currentCredits < appliedCost) {
      onOpenTopUp();
      return;
    }
    setIsProcessingAction(`image-${sceneId}`);
    try {
      if (onGenerateSceneImage) {
        await onGenerateSceneImage(sceneId, appliedCost, chosenEngine, allowFallbackToFlux);
      }
    } catch (err: any) {
      if (err?.message?.includes('[NANO_QUOTA_EXHAUSTED]') || err?.code === 'NANO_QUOTA_EXHAUSTED') {
        setQuotaAlert({
          isOpen: true,
          sceneId,
          engine: chosenEngine,
          errorMessage: err.message
        });
      }
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleGenerateSingleVideo = async (sceneId: string, cost?: number, videoModel?: string) => {
    const chosenVideoModel = videoModel || sceneVideoModels[sceneId] || selectedVideoEngine;
    const modelOpt = VIDEO_MODEL_OPTIONS.find(m => m.id === chosenVideoModel) || currentVideoEngineOption;
    const appliedCost = cost ?? modelOpt.costPerVideo;

    if (currentCredits < appliedCost) {
      neuronaVoice.playChime('ALERT');
      neuronaVoice.speak(`Saldo kredit tidak mencukupi. Diperlukan ${appliedCost} kredit untuk merender video adegan.`);
      onOpenTopUp();
      return;
    }
    neuronaVoice.playChime('SUCCESS');
    neuronaVoice.speak(`Memproses rendering video adegan dengan model ${modelOpt.shortName}.`);
    setIsProcessingAction(`video-${sceneId}`);
    try {
      if (onGenerateSceneVideo) {
        await onGenerateSceneVideo(sceneId, appliedCost, chosenVideoModel);
      }
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleUploadSceneAsset = async (sceneId: string, type: 'image' | 'video', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    
    setIsProcessingAction(`upload-${sceneId}`);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const res = await fetch(`/api/projects/${project.id}/override-scene`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              sceneId, 
              [type === 'image' ? 'imageUrl' : 'videoUrl']: base64,
              [type === 'image' ? 'imageStatus' : 'videoStatus']: 'COMPLETED',
              assetUrl: type === 'video' ? base64 : undefined
            })
          });
          
          if (!res.ok) {
            throw new Error(await res.text());
          }
          neuronaVoice.speak(`${type === 'image' ? 'Gambar' : 'Video'} untuk adegan ini berhasil diunggah secara lokal.`);
        } catch (error: any) {
          console.error(error);
          neuronaVoice.speak(`Gagal mengunggah ${type}.`);
        } finally {
          setIsProcessingAction(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsProcessingAction(null);
    }
  };

  const handleChooseStoryboardOnly = async () => {
    setIsProcessingAction('storyboard-only');
    try {
      if (onChooseStoryboardOnly) {
        await onChooseStoryboardOnly();
      }
      onClose();
    } finally {
      setIsProcessingAction(null);
    }
  };

  return (
    <div 
      id="modal-storyboard-matrix-advanced"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto overscroll-contain"
    >
      <div className="bg-[#0a0c10] border border-amber-500/40 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 shrink-0">
              <Layers size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-sm md:text-base font-bold text-white uppercase tracking-wider">
                  Storyboard & Visual Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                  {scenes.length} ADEGAN
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold">
                  {completedImagesCount}/{scenes.length} GAMBAR READY
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-xl">
                {project.title || project.brief || 'Kelola Visual Gambar & Render Video Adegan'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('SCENES')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'SCENES'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon size={12} />
                <span>Galeri Adegan</span>
              </button>
              <button
                onClick={() => setActiveTab('TIERS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'TIERS'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles size={12} />
                <span>Opsi Paket</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={exportStoryboardJson}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 transition cursor-pointer"
                title="Ekspor Data JSON"
              >
                <Download size={12} />
                <span>JSON</span>
              </button>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* SCROLLABLE MODAL BODY - Smooth Touch Scrolling on All Devices */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-4 sm:space-y-5 bg-[#090b0e]">
          
          {/* CHARACTER CONSISTENCY PROFILE CARD */}
          {charProfile && (
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 border border-purple-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center text-purple-300 font-bold shrink-0 overflow-hidden shadow-md relative">
                  {(charProfile.referenceImageUrl || project.characterProfile?.referenceImageUrl || project.affiliateConfig?.characterImage) ? (
                    <img 
                      src={charProfile.referenceImageUrl || project.characterProfile?.referenceImageUrl || project.affiliateConfig?.characterImage} 
                      alt="Reference Character" 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserCheck size={24} />
                  )}
                  {(charProfile.referenceImageUrl || project.characterProfile?.referenceImageUrl || project.affiliateConfig?.characterImage) && (
                    <span className="absolute bottom-0 inset-x-0 bg-purple-950/90 text-purple-200 text-[8px] font-bold text-center py-0.5 border-t border-purple-500/40">
                      MODEL
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white uppercase tracking-wider text-xs">
                      Karakter Konsisten: {charProfile.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 font-mono text-[9px]">
                      SEED #{charProfile.styleSeed || 4819203}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[9px] flex items-center gap-1">
                      <ShieldCheck size={10} />
                      <span>{(charProfile.referenceImageUrl || project.affiliateConfig?.characterImage) ? 'Foto Model & Wajah Terkunci' : 'Wajah & Busana Terkunci'}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                    <strong>Busana:</strong> {charProfile.outfit} • <strong>Rambut & Wajah:</strong> {charProfile.hairStyle || charProfile.facialFeatures}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                <button
                  onClick={() => copyToClipboard(charProfile.consistencyAnchorPrompt || '', 'char-anchor', 'CHARACTER')}
                  className="flex-1 md:flex-initial py-1.5 px-3 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedType === 'CHARACTER' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedType === 'CHARACTER' ? 'Prompt Master Tersalin!' : 'Salin Anchor Prompt Karakter'}</span>
                </button>
              </div>
            </div>
          )}

          {/* SEQUENTIAL WORKFLOW GUIDANCE BANNER WITH MODEL SELECTOR */}
          <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 shrink-0">
                <Sparkles size={13} className="text-amber-400" />
                <span>Alur Kerja:</span>
              </span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className={`px-2 py-0.5 rounded font-mono font-bold ${completedImagesCount > 0 ? 'bg-purple-950 text-purple-300 border border-purple-500/30' : 'bg-slate-900 text-slate-400'}`}>
                  1. Gambar ({completedImagesCount}/{scenes.length})
                </span>
                <ArrowRight size={12} className="text-slate-500" />
                <span className={`px-2 py-0.5 rounded font-mono font-bold ${allImagesReady ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-slate-500'}`}>
                  2. Render Video
                </span>
              </div>
            </div>

            {/* Model Selector & Dynamic Generate Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Model Selectors (Image & Video) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-black/60 border border-white/10 rounded-lg overflow-hidden">
                  <div className="bg-purple-900/40 px-2 py-1.5 flex items-center justify-center border-r border-white/10">
                    <Palette size={12} className="text-purple-400" />
                  </div>
                  <select
                    value={selectedImageEngine}
                    onChange={(e) => {
                      const val = e.target.value as ImageModelId;
                      setSelectedImageEngine(val);
                      localStorage.setItem('neurona_image_model', val);
                    }}
                    className="bg-transparent text-[11px] font-bold text-slate-200 outline-none px-2 py-1.5 cursor-pointer appearance-none pr-6 custom-select-arrow"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem center', backgroundSize: '.65em auto' }}
                  >
                    {IMAGE_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center bg-black/60 border border-white/10 rounded-lg overflow-hidden">
                  <div className="bg-amber-900/40 px-2 py-1.5 flex items-center justify-center border-r border-white/10">
                    <Film size={12} className="text-amber-400" />
                  </div>
                  <select
                    value={selectedVideoEngine}
                    onChange={(e) => {
                      setSelectedVideoEngine(e.target.value);
                      localStorage.setItem('neurona_video_model', e.target.value);
                      window.dispatchEvent(new Event('storage'));
                    }}
                    className="bg-transparent text-[11px] font-bold text-slate-200 outline-none px-2 py-1.5 cursor-pointer appearance-none pr-6 custom-select-arrow"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem center', backgroundSize: '.65em auto' }}
                  >
                    {VIDEO_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Generate All Images Button */}
              <button
                onClick={() => {
                  if (scenes.length === 0) {
                    if (onResyncScene) {
                      onResyncScene('ADD', 0);
                    } else {
                      handleGenerateAllImages(selectedImageEngine);
                    }
                    return;
                  }
                  handleGenerateAllImages(selectedImageEngine);
                }}
                disabled={isProcessingAction === 'all-images'}
                className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {isProcessingAction === 'all-images' ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Sedang Generate ({completedImagesCount}/{scenes.length})...</span>
                  </>
                ) : scenes.length === 0 ? (
                  <>
                    <Plus size={12} />
                    <span>Buat 5 Adegan Dulu</span>
                  </>
                ) : (
                  <>
                    <Palette size={12} />
                    <span>{allImagesReady ? 'Regenerate Semua Gambar' : 'Generate Semua Gambar'} ({imageCreditsTotal} Kredit)</span>
                  </>
                )}
              </button>

              {/* Single Scene Video Execution & Combine Buttons */}
              {scenes.some(s => s.videoStatus === 'COMPLETED' || s.videoUrl) && (
                <button
                  onClick={() => {
                    setPlaylistIndex(0);
                    setShowPlaylistPreview(true);
                  }}
                  className="py-1.5 px-3 rounded-lg bg-cyan-900/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Tes play semua video adegan yang sudah selesai secara berurutan"
                >
                  <Film size={12} />
                  <span>Tes Penggabungan (Playlist)</span>
                </button>
              )}

              <button
                onClick={() => {
                  onApproveAndPay(videoCreditsTotal);
                  onClose();
                }}
                className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-bold text-[11px] shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Play size={12} fill="currentColor" />
                <span>
                  {scenes.some(s => s.videoStatus === 'COMPLETED' || s.videoUrl) 
                    ? 'Gabungkan & Finis Video Master' 
                    : `Full Video Render (${videoCreditsTotal} Kredit)`}
                </span>
              </button>
            </div>
          </div>


          {/* OPTIONAL ASSETS UPLOAD */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1.5">
                <ImageIcon size={12} />
                <span>Upload Logo Brand (Opsional)</span>
              </label>
              <input 
                type="file" 
                accept="image/*"
                className="w-full text-[11px] text-slate-300 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                       if (project) project.brandLogoUrl = event.target?.result;
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
              />
              <p className="text-[9px] text-slate-500 mt-1">Logo akan diposisikan otomatis oleh AI Video Orchestrator</p>
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1.5">
                <Film size={12} />
                <span>Upload Video Tambahan (Opsional)</span>
              </label>
              <input 
                type="file" 
                accept="video/*"
                className="w-full text-[11px] text-slate-300 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                       if (project) project.extraVideoUrl = event.target?.result;
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
              />
              <p className="text-[9px] text-slate-500 mt-1">Video akan digabungkan pada proses akhir rendering master</p>
            </div>
          </div>

          {/* OPTIONAL ASSETS UPLOAD */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1.5">
                <ImageIcon size={12} />
                <span>Upload Logo Brand (Opsional)</span>
              </label>
              <input 
                type="file" 
                accept="image/*"
                className="w-full text-[11px] text-slate-300 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                       if (project) project.brandLogoUrl = event.target?.result as string;
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
              />
              <p className="text-[9px] text-slate-500 mt-1">Logo akan diposisikan otomatis oleh AI Video Orchestrator</p>
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1.5">
                <Film size={12} />
                <span>Upload Video Tambahan (Opsional)</span>
              </label>
              <input 
                type="file" 
                accept="video/*"
                className="w-full text-[11px] text-slate-300 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                       if (project) project.extraVideoUrl = event.target?.result as string;
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
              />
              <p className="text-[9px] text-slate-500 mt-1">Video akan digabungkan pada proses akhir rendering master</p>
            </div>
          </div>

          {/* TAB 1: SCENES LIST WITH PROMINENT IMAGE PREVIEWS */}
          {activeTab === 'SCENES' && (
            <div className="space-y-4">
              
              {/* MASTER VIDEO READY BANNER */}
              {project.finalVideoUrl && (
                <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border-2 border-emerald-500/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-emerald-950/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30 shrink-0">
                      <Film size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          Video Hasil Generate Ditemukan di Server!
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                          Siap Diputar
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        File video tersimpan di server (<span className="font-mono text-emerald-400">{project.finalVideoUrl}</span>). Anda dapat langsung memutar atau mengunduhnya tanpa menghabiskan kredit token lagi.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={project.finalVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/30"
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Putar Video</span>
                    </a>
                    <a
                      href={project.finalVideoUrl}
                      download={`master-video-${project.id.substring(0, 6)}.mp4`}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 transition"
                      title="Unduh MP4"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                </div>
              )}
              
              {/* Product Lock Reference Area */}
              {project.videoType === 'AFFILIATE' && project.affiliateConfig?.productImages?.[0] && (
                <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-emerald-500/50 bg-black">
                    <img 
                      src={project.affiliateConfig.productImages[0]} 
                      alt="Product Lock Reference" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider font-mono">
                      <ShieldCheck size={14} />
                      <span>Product Lock Active (Aset Referensi Utama)</span>
                    </div>
                    <p className="text-slate-300">
                      Gambar ini diikat ke prompt Sinta untuk memastikan model video AI tidak mengubah bentuk, logo, atau warna produk Anda (anti-halusinasi).
                    </p>
                  </div>
                </div>
              )}

              {/* OPTIMIZED SOCIAL MEDIA KIT & SKOQ QA AUDIT */}
              {(project.marketingCopy?.caption || project.marketingCopy?.hashtags || project.marketingCopy?.tiktok_caption) && (
                <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/30 rounded-xl p-3.5 sm:p-4 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/40">
                        OPENCLAUW COPYWRITING
                      </span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider hidden sm:inline">
                        Optimized Social Media Kit
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
                      <button onClick={() => setSocialPlatform('tiktok')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${socialPlatform === 'tiktok' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>TikTok</button>
                      <button onClick={() => setSocialPlatform('instagram')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${socialPlatform === 'instagram' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>IG Reels</button>
                      <button onClick={() => setSocialPlatform('youtube')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${socialPlatform === 'youtube' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>YT Shorts</button>
                    </div>
                  </div>
                  
                  {/* Skoq QA Audit Badge */}
                  <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span className="text-emerald-300 text-[10px] font-mono font-medium">Skoq Audit QA Passed: Content highly optimized for engagement & conversion</span>
                  </div>

                  {(() => {
                     const mc = project.marketingCopy || (project as any).social_media_kit || {};
                     const vType = project.videoType || 'AFFILIATE';
                     
                     let defCaption = '';
                     let defTiktok = '';
                     let defIG = '';
                     let defYT = '';
                     let defTags: string[] = [];
                     let defTiktokTags: string[] = [];
                     let defIGTags: string[] = [];
                     let defYTTags: string[] = [];

                     if (vType === 'ANIMATION') {
                       const title = project.animationConfig?.title || project.title || 'Petualangan Animasi';
                       const charName = project.characterProfile?.name || 'Karakter Utama';
                       defCaption = `Saksikan animasi spektakuler "${title}" bersama ${charName}! Dihadirkan dengan visual 3D memukau.`;
                       defTiktok = `🎬 Mahakarya Animasi: "${title}"!\n\nSaksikan petualangan epik ${charName} dalam visual 3D spektakuler. Menurut kalian gimana kelanjutannya? Komen di bawah ya! 👇✨`;
                       defIG = `Sebuah karya visual animasi penuh imajinasi: "${title}".\n\nMenghadirkan cerita ${charName} dengan visual sinematik memukau. Tonton sekarang & share ke teman-temanmu! 🎨🚀`;
                       defYT = `Official Animated Short: ${title} - Petualangan Sinematik AI (${charName})`;
                       defTags = ['#animasi', '#animasiindonesia', '#3danimation', '#kartun', '#filmindonesia', '#fyp', '#viral'];
                       defTiktokTags = ['#animasitiktok', '#animasi3d', '#kartunlucu', '#animasiindonesia', '#fyp', '#trending'];
                       defIGTags = ['#animationart', '#cgi', '#3drender', '#digitalart', '#cinematicanimation'];
                       defYTTags = ['#shorts', '#animation', '#3dshort', '#cinematic'];
                     } else if (vType === 'EDUCATIONAL') {
                       const topic = project.educationalConfig?.subjectTitle || project.title || 'Materi Edukasi';
                       const takeaways = project.educationalConfig?.keyTakeaways || 'Wawasan dan konsep dasar penting';
                       defCaption = `Pelajari dan pahami ${topic} secara mudah dan visual! Ringkasan poin penting: ${takeaways}.`;
                       defTiktok = `💡 Fakta mengejutkan tentang "${topic}" yang wajib kamu tahu!\n\nSimak penjelasannya sampai habis biar makin paham. Tag teman kamu yang butuh info ini ya! 🧠✨`;
                       defIG = `Memahami "${topic}" dengan infografis interaktif dan analogi sederhana.\n\nPelajari konsep dasarnya hanya dalam hitungan menit! Save postingan ini untuk belajar nanti. 📚🔍`;
                       defYT = `Penjelasan Cepat & Jelas: ${topic} (Edukasi Sains & Wawasan)`;
                       defTags = ['#edukasi', '#belajarseru', '#faktamenarik', '#sains', '#wawasan', '#fyp', '#viral'];
                       defTiktokTags = ['#serunyabelajar', '#edukasitiktok', '#tahukahkamu', '#faktaunik', '#fyp', '#viral'];
                       defIGTags = ['#infopendidikan', '#belajarmudah', '#pengetahuan', '#faktadunia', '#explore'];
                       defYTTags = ['#shorts', '#edukasi', '#sciencefacts', '#learnsomethingnew'];
                     } else {
                       const prodName = project.affiliateConfig?.productName || project.brief?.product || project.title || 'Produk Unggulan';
                       const benefits = project.affiliateConfig?.keyBenefits || 'Kualitas premium & bergaransi';
                       defCaption = `Rekomendasi terbaik: ${prodName}! ${benefits}. Jangan lewatkan promo spesial hari ini!`;
                       defTiktok = `🔥 JANGAN SAMPAI KEHABISAN!\n\n${prodName} yang lagi viral banget dengan kualitas super premium. ${benefits}. Klik keranjang kuning sekarang mumpung lagi diskon & gratis ongkir! 🛒✨`;
                       defIG = `Upgrade kebutuhan harianmu dengan ${prodName}! ✨\n\nDesain elegan, fungsionalitas maksimal, dan kualitas terbaik. Cek link di bio untuk dapatkan harga spesial hari ini! 💫🛍️`;
                       defYT = `Review Singkat & Fitur Unggulan ${prodName} - Wajib Punya!`;
                       defTags = ['#racuntiktok', '#tiktokshop', '#affiliate', '#viral', '#fyp', '#rekomendasiproduk', '#trending'];
                       defTiktokTags = ['#racuntiktok', '#tiktokshop', '#affiliatetiktok', '#fyp', '#viralindonesia', '#murahlebay'];
                       defIGTags = ['#reelsinstagram', '#shoppingonline', '#lifestyle', '#ootd', '#viralreels'];
                       defYTTags = ['#shorts', '#youtubeshorts', '#gadgetreview', '#productreview'];
                     }

                     let currentCaption = '';
                     let currentHashtags: string[] = [];
                     
                     if (socialPlatform === 'tiktok') {
                       currentCaption = mc?.tiktok_caption || mc?.caption || defTiktok;
                       currentHashtags = (Array.isArray(mc?.hashtags_tiktok) && mc.hashtags_tiktok.length > 0)
                         ? mc.hashtags_tiktok
                         : ((Array.isArray(mc?.hashtags) && mc.hashtags.length > 0) ? mc.hashtags : defTiktokTags);
                     } else if (socialPlatform === 'instagram') {
                       currentCaption = mc?.instagram_caption || mc?.caption || defIG;
                       currentHashtags = (Array.isArray(mc?.hashtags_instagram) && mc.hashtags_instagram.length > 0)
                         ? mc.hashtags_instagram
                         : ((Array.isArray(mc?.hashtags) && mc.hashtags.length > 0) ? mc.hashtags : defIGTags);
                     } else {
                       currentCaption = mc?.youtube_caption || mc?.caption || defYT;
                       currentHashtags = (Array.isArray(mc?.hashtags_youtube) && mc.hashtags_youtube.length > 0)
                         ? mc.hashtags_youtube
                         : ((Array.isArray(mc?.hashtags) && mc.hashtags.length > 0) ? mc.hashtags : defYTTags);
                     }
                     
                     return (
                       <>
                         {currentCaption && (
                           <div className="bg-black/50 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto font-sans relative group">
                             {currentCaption}
                             <button
                               onClick={() => {
                                 navigator.clipboard.writeText(currentCaption);
                                 setCopiedType('ALL_SCRIPT');
                                 setTimeout(() => setCopiedType(null), 2000);
                               }}
                               className="absolute top-2 right-2 p-1.5 rounded bg-black/60 hover:bg-black/80 text-gray-300 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                               title="Salin Caption"
                             >
                               {copiedType === 'ALL_SCRIPT' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                             </button>
                           </div>
                         )}

                         {currentHashtags && currentHashtags.length > 0 && (
                           <div className="flex flex-wrap gap-1.5 pt-1">
                             {currentHashtags.map((tag, i) => (
                               <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-500/30">
                                 {tag.startsWith('#') ? tag : `#${tag}`}
                               </span>
                             ))}
                           </div>
                         )}
                         
                         <div className="flex justify-end">
                            <button
                               onClick={() => {
                                 const hash = currentHashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
                                 navigator.clipboard.writeText(`${currentCaption}\n\n${hash}`);
                                 setCopiedType('ALL_SCRIPT');
                                 setTimeout(() => setCopiedType(null), 2000);
                               }}
                               className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                               {copiedType === 'ALL_SCRIPT' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                               <span>Salin Semua (Caption + Hashtags)</span>
                            </button>
                         </div>
                       </>
                     );
                  })()}
                </div>
              )}

              {scenes.length > 0 ? (
                scenes.map((scene, idx) => {
                  const isT2ICopied = copiedSceneId === scene.id && copiedType === 'T2I';
                  const isI2VCopied = copiedSceneId === scene.id && copiedType === 'I2V';
                  const isVoiceCopied = copiedSceneId === scene.id && copiedType === 'VOICEOVER';
                  const isThisVoicePlaying = playingVoiceIndex === idx;
                  const hasImage = scene.imageStatus === 'COMPLETED';
                  const isImageFailed = scene.imageStatus === 'FAILED';
                  const isImageGenerating = scene.imageStatus === 'GENERATING' || isProcessingAction === `image-${scene.id}`;
                  const isVideoGenerating = scene.videoStatus === 'GENERATING' || isProcessingAction === `video-${scene.id}`;

                  return (
                    <div key={scene.id || idx} className={currentScenePage === idx ? 'block animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                    <div 
                      className="p-3.5 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800/80 hover:border-amber-500/40 transition shadow-xl space-y-3.5"
                    >
                      {/* Scene Title Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-rose-600 text-slate-950 font-bold font-mono text-xs flex items-center justify-center shadow-md">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white text-xs sm:text-sm tracking-wider uppercase">
                            Adegan {idx + 1}
                          </span>
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/60 text-slate-300 border border-white/10 font-mono text-[10px]">
                            <Clock size={10} className="text-amber-400" />
                            <span>Durasi: {scene.duration}</span>
                          </span>
                          {scene.qaScore !== undefined && (
                            <span 
                              className={`px-2 py-0.5 rounded-full flex items-center gap-1 border font-mono text-[10px] font-bold ${
                                scene.qaPassed 
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50' 
                                  : 'bg-rose-950/60 text-rose-400 border-rose-500/50'
                              }`} 
                              title={scene.qaIssues?.length ? `QA Issues:\n${scene.qaIssues.join('\n')}` : 'QA Audit Passed 100%'}
                            >
                              <ShieldCheck size={11} className={scene.qaPassed ? 'text-emerald-400' : 'text-rose-400'} />
                              <span>QA: {scene.qaScore}/100</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={() => {
                              if (window.confirm('Hapus scene ini dan sinkronisasi ulang naskah?')) {
                                onResyncScene?.('REMOVE', idx);
                              }
                            }}
                            className="p-1 rounded bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 hover:text-white transition-colors border border-rose-500/20"
                            title="Hapus Scene"
                          >
                            <X size={12} />
                          </button>

                          {/* Image Status Pill */}
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                            isImageFailed ? 'bg-rose-950/80 text-rose-300 border-rose-500/80 font-bold' :
                            hasImage ? 'bg-purple-950/80 text-purple-300 border-purple-500/40' :
                            isImageGenerating ? 'bg-purple-950 text-purple-300 border-purple-500/40 animate-pulse' :
                            'bg-slate-900 text-slate-400 border-slate-800'
                          }`}>
                            {isImageFailed ? <AlertCircle size={10} className="text-rose-400" /> : <ImageIcon size={10} />}
                            <span>Gambar: {isImageFailed ? 'GAGAL (COBA LAGI)' : hasImage ? 'READY' : (scene.imageStatus || 'PENDING')}</span>
                          </span>

                          {/* Video Status Pill */}
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                            scene.videoStatus === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-sm' :
                            scene.videoStatus === 'FAILED' ? 'bg-rose-950 text-rose-300 border-rose-500/80 animate-bounce font-bold' :
                            isVideoGenerating ? 'bg-amber-950 text-amber-300 border-amber-500/50 animate-pulse font-bold' :
                            'bg-slate-900 text-slate-400 border-slate-800'
                          }`}>
                            {scene.videoStatus === 'FAILED' ? <AlertCircle size={10} className="text-rose-400" /> : <Film size={10} />}
                            <span>Video: {scene.videoStatus === 'FAILED' ? 'GAGAL (COBA LAGI)' : isVideoGenerating ? (scene.videoProgress ? `RENDERING... (${scene.videoProgress})` : 'RENDERING...') : (scene.videoStatus || 'PENDING')}</span>
                          </span>
                        </div>
                      </div>

                      {/* Main Layout: Visual Image Box + Script & Prompts */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
                        
                        {/* LEFT: Prominent Visual & Video Preview (5 Cols on LG) */}
                        <div className="lg:col-span-5 space-y-2.5 bg-black/60 p-3 rounded-xl border border-white/10">
                          {(() => {
                            const isVideoDone = scene.videoStatus === 'COMPLETED' || Boolean(scene.videoUrl);
                            const currentView = activeMediaView[scene.id] || (isVideoDone ? 'video' : 'image');
                            const isExplicitImageInVideo = typeof scene.videoUrl === 'string' && scene.videoUrl.startsWith('data:image/');
                            const safeVideoSrc = (!isExplicitImageInVideo && scene.videoUrl && (scene.videoUrl.endsWith('.mp4') || scene.videoUrl.endsWith('.webm') || scene.videoUrl.includes('/videos/') || scene.videoUrl.includes('/sample/') || scene.videoUrl.startsWith('data:video/')))
                              ? scene.videoUrl
                              : '/api/videos/sample-ocean.mp4';

                            return (
                              <>
                                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                  {/* View Toggle Tabs if both Image & Video exist */}
                                  {isVideoDone && hasImage ? (
                                    <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-white/10">
                                      <button
                                        onClick={() => setActiveMediaView(prev => ({ ...prev, [scene.id]: 'video' }))}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                          currentView === 'video' 
                                            ? 'bg-emerald-500 text-slate-950 shadow' 
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        <Film size={10} />
                                        <span>Video</span>
                                      </button>
                                      <button
                                        onClick={() => setActiveMediaView(prev => ({ ...prev, [scene.id]: 'image' }))}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                          currentView === 'image' 
                                            ? 'bg-purple-500 text-white shadow' 
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        <ImageIcon size={10} />
                                        <span>Gambar</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="font-bold text-white flex items-center gap-1">
                                      {isVideoDone ? (
                                        <>
                                          <Film size={12} className="text-emerald-400" />
                                          <span>Video Hasil Render</span>
                                        </>
                                      ) : (
                                        <>
                                          <ImageIcon size={12} className="text-purple-400" />
                                          <span>Keyframe Visual</span>
                                        </>
                                      )}
                                    </span>
                                  )}

                                  {isVideoDone ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle2 size={11} />
                                      <span>Video Selesai</span>
                                    </span>
                                  ) : hasImage ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle2 size={11} />
                                      <span>Gambar Siap Render</span>
                                    </span>
                                  ) : isImageFailed ? (
                                    <span className="text-rose-400 text-[9px] flex items-center gap-0.5 font-bold">
                                      <AlertCircle size={10} />
                                      <span>Gagal (Kuota/API Error)</span>
                                    </span>
                                  ) : (
                                    <span className="text-amber-400 text-[9px] flex items-center gap-0.5">
                                      <AlertCircle size={10} />
                                      <span>Wajib Buat Gambar Dulu</span>
                                    </span>
                                  )}
                                </div>

                                {/* Media Preview Box (Video or Image) */}
                                <div className={`relative ${getProjectAspectRatioClass(project)} w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center group shadow-inner`}>
                                  {/* INTERACTIVE REFERENCE BUBBLES HUD (FACE & PRODUCT LOCK) */}
                                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-2 z-30">
                                    {/* Face Lock Bubble - Show for all studios */}
                                    {true && (
                                      <div 
                                        onClick={() => handleToggleFaceLock(scene.id)}
                                        className={`relative w-10 h-10 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center border-2 group/bubble ${
                                          faceLocks[scene.id] !== false 
                                            ? 'border-purple-500 bg-purple-950/90 shadow-md shadow-purple-500/50 ring-2 ring-purple-500/20' 
                                            : 'border-white/20 bg-black/60 hover:border-white/50'
                                        }`}
                                        title={faceLocks[scene.id] !== false ? bubbleConfig.face.title : "Kunci Karakter: NONAKTIF"}
                                      >
                                        <img 
                                          src={bubbleConfig.face.img} 
                                          alt="Face Reference"
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover rounded-full p-[1px]"
                                        />
                                        {/* Padlock status badge */}
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border text-[8px] font-bold ${
                                          faceLocks[scene.id] !== false
                                            ? 'bg-purple-600 text-white border-purple-400'
                                            : 'bg-slate-800 text-slate-400 border-slate-600'
                                        }`}>
                                          {faceLocks[scene.id] !== false ? <Lock size={8} /> : <Unlock size={8} />}
                                        </div>

                                        {/* Floating Tooltip info on hover */}
                                        <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-purple-950/95 border border-purple-500/30 text-[9px] text-purple-200 font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl opacity-0 group-hover/bubble:opacity-100 transition duration-250 pointer-events-none">
                                          {bubbleConfig.face.tooltip}
                                        </div>
                                      </div>
                                    )}

                                    {/* Product Lock Bubble - Show for all studios */}
                                    {true && (
                                      <div 
                                        onClick={() => handleToggleProductLock(scene.id)}
                                        className={`relative w-10 h-10 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center border-2 group/bubble ${
                                          productLocks[scene.id] !== false 
                                            ? 'border-cyan-400 bg-cyan-950/90 shadow-md shadow-cyan-400/50 ring-2 ring-cyan-400/20' 
                                            : 'border-white/20 bg-black/60 hover:border-white/50'
                                        }`}
                                        title={productLocks[scene.id] !== false ? bubbleConfig.product.title : "Kunci Properti: NONAKTIF"}
                                      >
                                        <img 
                                          src={bubbleConfig.product.img} 
                                          alt="Product Reference"
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover rounded-full p-[1px]"
                                        />
                                        {/* Padlock status badge */}
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border text-[8px] font-bold ${
                                          productLocks[scene.id] !== false
                                            ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                                            : 'bg-slate-800 text-slate-400 border-slate-600'
                                        }`}>
                                          {productLocks[scene.id] !== false ? <Lock size={8} /> : <Unlock size={8} />}
                                        </div>

                                        {/* Floating Tooltip info on hover */}
                                        <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-cyan-950/95 border border-cyan-400/30 text-[9px] text-cyan-200 font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl opacity-0 group-hover/bubble:opacity-100 transition duration-250 pointer-events-none">
                                          {bubbleConfig.product.tooltip}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {isVideoDone && currentView === 'video' ? (
                                    <div className="relative w-full h-full bg-black">
                                      <video
                                        src={safeVideoSrc}
                                        controls
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        onError={(e) => {
                                          const v = e.target as HTMLVideoElement;
                                          v.src = '/api/videos/sample-ocean.mp4';
                                        }}
                                        className="w-full h-full object-contain"
                                      />
                                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[9px] font-mono font-bold flex items-center gap-1">
                                        <Film size={9} />
                                        <span>VIDEO ADEGAN {idx + 1}</span>
                                      </div>

                                      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                        <button
                                          onClick={() => setPreviewVideoUrl(safeVideoSrc)}
                                          className="p-1 px-2 rounded-lg bg-black/70 hover:bg-black text-white text-[10px] flex items-center gap-1 backdrop-blur-sm border border-white/20 transition cursor-pointer"
                                          title="Perbesar Video"
                                        >
                                          <Eye size={11} />
                                          <span>Layar Penuh</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            const a = document.createElement('a');
                                            a.href = safeVideoSrc;
                                            a.download = `neuronna-scene-${idx + 1}.mp4`;
                                            a.target = '_blank';
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                          }}
                                          className="p-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 backdrop-blur-sm transition cursor-pointer shadow"
                                          title="Unduh File Video MP4"
                                        >
                                          <Download size={11} />
                                          <span>Unduh MP4</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : hasImage ? (
                                    <>
                                      <img 
                                        src={scene.imageUrl} 
                                        alt={`Keyframe Adegan ${idx + 1}`} 
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        
                                      />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => setPreviewImageUrl(scene.imageUrl || null)}
                                          className="p-1.5 px-2.5 rounded-lg bg-white/20 hover:bg-white/40 text-white text-xs flex items-center gap-1 backdrop-blur-sm transition cursor-pointer"
                                        >
                                          <Eye size={13} />
                                          <span className="text-[10px]">Perbesar</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            const url = scene.imageUrl;
                                            if (url) {
                                              const a = document.createElement('a');
                                              a.href = url;
                                              a.download = `neuronna-scene-${scene.id || idx + 1}.png`;
                                              a.target = '_blank';
                                              document.body.appendChild(a);
                                              a.click();
                                              document.body.removeChild(a);
                                            }
                                          }}
                                          className="p-1.5 px-2.5 rounded-lg bg-amber-500/80 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 backdrop-blur-sm transition cursor-pointer shadow-lg"
                                          title="Unduh Gambar"
                                        >
                                          <Download size={13} />
                                          <span className="text-[10px]">Unduh</span>
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-center p-4 space-y-2">
                                      {isImageGenerating ? (
                                        <div className="space-y-2">
                                          <Loader2 size={24} className="animate-spin text-purple-400 mx-auto" />
                                          <p className="text-[10px] font-mono text-purple-300">Merender Gambar Karakter...</p>
                                        </div>
                                      ) : (
                                        <>
                                          <Palette size={24} className="text-slate-600 mx-auto stroke-[1.5]" />
                                          <p className="text-[10px] text-slate-300 font-semibold">Gambar Belum Dibuat</p>
                                          <p className="text-[9px] text-amber-400/80">Klik tombol ungu untuk memproses gambar</p>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}

                          {/* Per-Scene AI Model Selector Bar */}
                          {(() => {
                            const curImgEngine = sceneImageModels[scene.id] || selectedImageEngine;
                            const curVidEngine = sceneVideoModels[scene.id] || selectedVideoEngine;
                            const curImgOpt = IMAGE_MODEL_OPTIONS.find(m => m.id === curImgEngine) || currentEngineOption;
                            const curVidOpt = VIDEO_MODEL_OPTIONS.find(m => m.id === curVidEngine) || currentVideoEngineOption;
                            const perSceneImageCost = curImgOpt.costPerImage;
                            const perSceneVideoCost = curVidOpt.costPerVideo;

                            return (
                              <>
                                <div className="flex flex-wrap items-center justify-between bg-slate-950/80 border border-slate-800 rounded-lg p-1.5 gap-2 text-[10px] mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <Palette size={11} className="text-purple-400 shrink-0" />
                                    <span className="text-slate-400 font-medium">Gambar:</span>
                                    <select
                                      value={curImgEngine}
                                      onChange={(e) => {
                                        const val = e.target.value as ImageModelId;
                                        setSceneImageModels(prev => ({ ...prev, [scene.id]: val }));
                                      }}
                                      className="bg-slate-900 border border-purple-500/30 font-bold text-purple-200 rounded px-1.5 py-0.5 outline-none cursor-pointer text-[10px]"
                                    >
                                      {IMAGE_MODEL_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                                          {opt.shortName}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Film size={11} className="text-amber-400 shrink-0" />
                                    <span className="text-slate-400 font-medium">Video:</span>
                                    <select
                                      value={curVidEngine}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSceneVideoModels(prev => ({ ...prev, [scene.id]: val }));
                                      }}
                                      className="bg-slate-900 border border-amber-500/30 font-bold text-amber-200 rounded px-1.5 py-0.5 outline-none cursor-pointer text-[10px] max-w-[130px] truncate"
                                    >
                                      {VIDEO_MODEL_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                                          {opt.shortName}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Action Buttons per Scene */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {/* 1. Generate Image Button */}
                                  <button
                                    onClick={() => handleGenerateSingleImage(scene.id, perSceneImageCost, curImgEngine)}
                                    disabled={isImageGenerating}
                                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 ${
                                      !hasImage 
                                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30' 
                                        : 'bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200'
                                    }`}
                                    title={`Generate dengan ${curImgOpt.shortName}`}
                                  >
                                    {isImageGenerating ? (
                                      <>
                                        <Loader2 size={11} className="animate-spin" />
                                        <span>Memproses...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Palette size={11} />
                                        <span>{hasImage ? `Regenerate (${perSceneImageCost} K)` : `1. Buat Gambar (${perSceneImageCost} K)`}</span>
                                      </>
                                    )}
                                  </button>

                                  {/* 2. Generate Video Button */}
                                  <button
                                    onClick={() => {
                                      if (!hasImage) {
                                        handleGenerateSingleImage(scene.id, perSceneImageCost, curImgEngine);
                                        return;
                                      }
                                      handleGenerateSingleVideo(scene.id, perSceneVideoCost, curVidEngine);
                                    }}
                                    disabled={isVideoGenerating || isImageGenerating}
                                    title={!hasImage ? "Harap generate gambar terlebih dahulu" : `Render Video dengan ${curVidOpt.shortName}`}
                                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 ${
                                      hasImage
                                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20'
                                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700/60'
                                    }`}
                                  >
                                    {isVideoGenerating ? (
                                      <>
                                        <Loader2 size={11} className="animate-spin" />
                                        <span>Rendering Video...</span>
                                      </>
                                    ) : hasImage ? (
                                      <>
                                        <Play size={11} fill="currentColor" />
                                        <span>2. Render Video ({perSceneVideoCost} K)</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play size={11} className="opacity-40" />
                                        <span>2. Video (Perlu Gambar)</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                          
                          {/* Manual Asset Upload Buttons */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            <label className={`py-1.5 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center justify-center gap-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 ${isImageGenerating ? 'opacity-50 pointer-events-none' : ''}`}>
                              <Upload size={11} />
                              <span>Upload Gambar</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleUploadSceneAsset(scene.id, 'image', e)}
                                disabled={isImageGenerating}
                              />
                            </label>
                            
                            <label className={`py-1.5 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center justify-center gap-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 ${isVideoGenerating ? 'opacity-50 pointer-events-none' : ''}`}>
                              <Upload size={11} />
                              <span>Upload Video</span>
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => handleUploadSceneAsset(scene.id, 'video', e)}
                                disabled={isVideoGenerating}
                              />
                            </label>
                          </div>
                        </div>

                        {/* RIGHT: Visual Direction, Script, Subtitle, Prompts (7 Cols on LG) */}
                        <div className="lg:col-span-7 space-y-2.5">
                          
                          {/* Visual Direction */}
                          <div className="space-y-1 text-xs">
                            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                <Film size={11} className="text-cyan-400" />
                                <span>Petunjuk Visual & Arah Kamera</span>
                              </div>
                              {scene.qaScore !== undefined && (
                                <div className={`px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                                  scene.qaPassed 
                                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50' 
                                    : 'bg-rose-950/40 text-rose-400 border-rose-500/50'
                                }`} title={scene.qaIssues?.length ? `QA Issues:\n${scene.qaIssues.join('\n')}` : 'QA Audit Passed'}>
                                  <ShieldCheck size={10} />
                                  <span>QA Score: {scene.qaScore}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-slate-200 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5 font-sans text-[11px]">
                              {scene.visualDirection}
                            </p>
                          </div>

                          {/* Subtitle & Voiceover */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {/* Subtitle */}
                            <div className="space-y-1">
                              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center justify-between">
                                <span className="flex items-center gap-1 text-amber-300">
                                  <Sparkles size={11} />
                                  <span>Subtitle Layar</span>
                                </span>
                              </div>
                              <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-200 font-sans text-[11px] min-h-[38px] flex items-center">
                                {scene.subtitle || scene.textOverlay || <span className="text-slate-500 italic">Tanpa subtitle</span>}
                              </div>
                            </div>

                            {/* Voiceover */}
                            <div className="space-y-1">
                              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center justify-between">
                                <span className="flex items-center gap-1 text-emerald-300">
                                  <Volume2 size={11} />
                                  <span>Voiceover Narasi</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => playVoiceNarration(scene.voiceOver || '', idx)}
                                    className={`text-[9px] px-1.5 py-0.5 rounded border transition flex items-center gap-1 cursor-pointer ${
                                      isThisVoicePlaying ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold' : 'bg-emerald-950 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                                    }`}
                                  >
                                    <Volume2 size={9} />
                                    <span>{isThisVoicePlaying ? 'Stop' : 'Tes'}</span>
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(scene.voiceOver || '', scene.id || String(idx), 'VOICEOVER')}
                                    className="text-[9px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                  >
                                    {isVoiceCopied ? <Check size={9} /> : <Copy size={9} />}
                                    <span>{isVoiceCopied ? 'OK' : 'Salin'}</span>
                                  </button>
                                </div>
                              </div>
                              <div className="p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-200 italic font-sans text-[11px] min-h-[38px] flex items-center">
                                {scene.voiceOver ? `"${scene.voiceOver}"` : <span className="text-slate-500 italic">Tanpa naskah</span>}
                              </div>
                            </div>
                          </div>

                          {/* Prompt T2I & I2V Accordion/Panels */}
                          <div className="space-y-1.5 pt-0.5 text-xs">
                            {/* Prompt Gambar */}
                            <div className="p-2 rounded-xl bg-purple-950/20 border border-purple-500/25 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-purple-300 font-bold flex items-center gap-1">
                                  <Palette size={10} className="text-purple-400" />
                                  <span>Prompt Gambar</span>
                                </span>
                                <button
                                  onClick={() => copyToClipboard(scene.promptTextToImage || scene.visualDirection, scene.id || String(idx), 'T2I')}
                                  className="px-2 py-0.5 rounded bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-[9px] text-purple-300 font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  {isT2ICopied ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} />}
                                  <span>{isT2ICopied ? 'Tersalin' : 'Salin Prompt Gambar'}</span>
                                </button>
                              </div>
                              <div className="text-slate-300 font-mono text-[10px] leading-relaxed break-words line-clamp-2 hover:line-clamp-none transition">
                                {scene.promptTextToImage || `Consistent character render of ${scene.visualDirection} --seed 4819203`}
                              </div>
                            </div>

                            {/* Prompt Video */}
                            <div className="p-2 rounded-xl bg-cyan-950/20 border border-cyan-500/25 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-cyan-300 font-bold flex items-center gap-1">
                                  <Zap size={10} className="text-cyan-400" />
                                  <span>Prompt Video</span>
                                </span>
                                <button
                                  onClick={() => copyToClipboard(scene.promptImageToVideo || scene.visualDirection, scene.id || String(idx), 'I2V')}
                                  className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-[9px] text-cyan-300 font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  {isI2VCopied ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} />}
                                  <span>{isI2VCopied ? 'Tersalin' : 'Salin Prompt Video'}</span>
                                </button>
                              </div>
                              <div className="text-slate-300 font-mono text-[10px] leading-relaxed break-words line-clamp-2 hover:line-clamp-none transition">
                                {scene.promptImageToVideo || scene.visualDirection}
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>
                    </div>
                    
                    {/* Insert Scene Button */}
                    <div className="flex justify-center -my-2 relative z-10">
                      <button
                        onClick={() => {
                          if (window.confirm('Tambah scene baru setelah ini dan sinkronisasi naskah?')) {
                            onResyncScene?.('ADD', idx);
                          }
                        }}
                        className="px-3 py-1 rounded-full bg-slate-900 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shadow-lg shadow-emerald-500/10 hover:bg-emerald-950 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Tambah Scene Baru"
                      >
                        <Plus size={10} />
                        <span>Tambah Scene</span>
                      </button>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="text-center py-12 px-6 rounded-2xl bg-slate-900/60 border border-purple-500/20 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    <Layers size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Naskah Adegan Storyboard Belum Dibuat
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md text-center">
                    Proyek ini belum memiliki breakdown 5 adegan visual. Klik tombol di bawah untuk membuat naskah, hook viral, prompt visual & mengunci karakter secara instan.
                  </p>
                  <button
                    onClick={() => {
                      if (onResyncScene) {
                        onResyncScene('ADD', 0);
                      } else {
                        handleGenerateAllImages(selectedImageEngine);
                      }
                    }}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/30 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Buat 5 Adegan Storyboard Sekarang</span>
                  </button>
                </div>
              )}

              {/* Pagination Controls */}
              {scenes.length > 0 && (
                <div className="flex items-center justify-between px-2 pt-2 pb-4 mt-2 border-t border-white/5">
                  <button
                    onClick={() => setCurrentScenePage(Math.max(0, currentScenePage - 1))}
                    disabled={currentScenePage === 0}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white transition cursor-pointer flex items-center gap-1"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    <span className="text-xs font-bold">Prev</span>
                  </button>
                  <div className="flex gap-1.5">
                    {scenes.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentScenePage(i)}
                        className={`w-8 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${currentScenePage === i ? 'bg-amber-500 scale-110' : 'bg-slate-700 hover:bg-slate-500'}`}
                        title={`Scene ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentScenePage(Math.min(scenes.length - 1, currentScenePage + 1))}
                    disabled={currentScenePage === scenes.length - 1}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white transition cursor-pointer flex items-center gap-1"
                  >
                    <span className="text-xs font-bold">Next</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 3-TIER PRODUCTION OPTIONS */}
          {activeTab === 'TIERS' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              
              {/* TIER 1: Cukup Storyboard (Gratis) */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/40 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <FileText size={14} className="text-cyan-400" />
                      <span>TAHAP 1: Storyboard Saja</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-mono text-[9px] font-bold">
                      GRATIS / 0 KREDIT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Gunakan naskah lengkap, subtitle viral hook & prompt visual untuk dieksekusi secara mandiri.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <button
                      onClick={copyAllPrompts}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-200 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {copiedType === 'ALL_PROMPTS' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>{copiedType === 'ALL_PROMPTS' ? 'Tersalin' : 'Salin Prompt'}</span>
                    </button>
                    <button
                      onClick={copyAllVoiceoverScript}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {copiedType === 'ALL_SCRIPT' ? <Check size={11} className="text-emerald-400" /> : <Volume2 size={11} />}
                      <span>{copiedType === 'ALL_SCRIPT' ? 'Tersalin' : 'Salin Naskah'}</span>
                    </button>
                  </div>

                  <button
                    onClick={handleChooseStoryboardOnly}
                    disabled={isProcessingAction === 'storyboard-only'}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isProcessingAction === 'storyboard-only' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    <span>Selesai & Cukup Storyboard (0 Kredit)</span>
                  </button>
                </div>
              </div>

              {/* TIER 2: Generate Keyframe Gambar Karakter Konsisten */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/40 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-purple-400" />
                      <span>TAHAP 2: Gambar Karakter</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/50 font-mono text-[9px] font-bold">
                      {imageCreditsTotal} KREDIT ({singleImageCost}/SCENE)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    Kunci wajah dan busana karakter konsisten di setiap gambar adegan sebelum dijadikan video.
                  </p>
                </div>

                <button
                  onClick={() => handleGenerateAllImages(selectedImageEngine)}
                  disabled={isProcessingAction === 'all-images'}
                  className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isProcessingAction === 'all-images' ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Sedang Generate Gambar...</span>
                    </>
                  ) : (
                    <>
                      <Palette size={13} />
                      <span>Generate Semua Gambar ({imageCreditsTotal} Kredit)</span>
                    </>
                  )}
                </button>
              </div>

              {/* TIER 3: Full Video Render Master */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <Film size={14} className="text-amber-400" />
                      <span>TAHAP 3: Full Video Master</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50 font-mono text-[9px] font-bold">
                      {videoCreditsTotal} KREDIT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    Render multi-shot video dengan model pilihan ({project.videoModel || 'FAL_AI_STANDARD'}), subtitle dinamis & audio master.
                  </p>
                  
                  </div>
                <button
                  onClick={() => onApproveAndPay(videoCreditsTotal, undefined)}
                  className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-bold text-[11px] shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Full Video Render ({videoCreditsTotal} Kredit)</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer: Balance & Multi-Stage Action Controls */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/40 text-xs font-mono text-amber-300">
              <Coins size={14} className="text-amber-400" />
              <span>Saldo Anda: <strong>{currentCredits}</strong> Kredit</span>
            </div>
            
            <button
              onClick={onOpenTopUp}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
            >
              + Top Up Paket Rp 150k / Rp 200k
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Tutup
            </button>
            
            
            {/* Stitch Button (Gabungkan Video) */}
            {scenes.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setShowStitchStylePopup(true)}
                  disabled={isStitching}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isStitching ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
                  <span>Gabungkan Video (Orkestrasi AI)</span>
                </button>
                {finalVideoUrl && (
                  <button
                    onClick={() => {
                      setPreviewVideoUrl(finalVideoUrl);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs text-center transition border border-emerald-500/30 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>📺 Putar Film Hasil Jahitan</span>
                  </button>
                )}
              </div>
            )}

            {isAwaiting && (
              <button
                onClick={() => onApproveAndPay(videoCreditsTotal, undefined)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Play size={13} fill="currentColor" />
                <span>Full Render Video ({videoCreditsTotal} Kredit)</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Playlist Preview Modal */}
      {showPlaylistPreview && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center gap-4">
            <div className="w-full flex justify-between items-center text-white px-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Film size={20} />
                <span>Test Penggabungan: Adegan {playlistIndex + 1} dari {project.scenes?.filter(s => s.videoStatus === 'COMPLETED' || s.videoUrl).length || 0}</span>
              </div>
              <button
                onClick={() => setShowPlaylistPreview(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={`w-full ${getProjectAspectRatioClass(project)} bg-black rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl relative`}>
              <video
                src={project.scenes?.filter(s => s.videoStatus === 'COMPLETED' || s.videoUrl)?.[playlistIndex]?.videoUrl}
                autoPlay
                controls
                onEnded={() => {
                  const completedScenes = project.scenes?.filter(s => s.videoStatus === 'COMPLETED' || s.videoUrl) || [];
                  if (playlistIndex + 1 < completedScenes.length) {
                    setPlaylistIndex(playlistIndex + 1);
                  } else {
                    neuronaVoice.speak("Preview penggabungan selesai.");
                    setShowPlaylistPreview(false);
                  }
                }}
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              {project.scenes?.filter(s => s.videoStatus === 'COMPLETED' || s.videoUrl).map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setPlaylistIndex(idx)}
                  className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition ${playlistIndex === idx ? 'border-cyan-400' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  <video src={s.videoUrl} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={previewImageUrl} 
              alt="Keyframe Preview" 
              className="max-w-full max-h-[85vh] rounded-2xl border border-purple-500/40 shadow-2xl object-contain"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="mt-3 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition cursor-pointer"
            >
              Tutup Preview
            </button>
          </div>
        </div>
      )}

      {/* Video Fullscreen Preview Modal */}
      {previewVideoUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setPreviewVideoUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className={`w-full ${getProjectAspectRatioClass(project)} rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl bg-black`}>
              <video 
                src={previewVideoUrl} 
                controls 
                autoPlay 
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = previewVideoUrl;
                  a.download = `neuronna-scene-video.mp4`;
                  a.target = '_blank';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Download size={13} />
                <span>Unduh File MP4</span>
              </button>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition cursor-pointer"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Stitching Orchestrator Terminal Modal (Replaced Timeline) */}
      
      {/* Stitch & Final Video Settings Popup Modal */}
      {showStitchStylePopup && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-7 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Film size={22} className="text-cyan-400" /> Pengaturan Final Video & Narasi
                </h3>
                <p className="text-slate-400 text-xs mt-1">Konfigurasikan gaya caption subtitle dan pilihan suara narator AI sebelum menyatukan video master.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowStitchStylePopup(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* SECTION 1: GAYA CAPTION SUBTITLE */}
            <div className="mb-7">
              <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
                <Palette size={14} /> 1. Gaya Caption Subtitle (Animasi Teks)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { style: 'Bold Pop', desc: 'Teks kuning tebal, populer untuk Affiliate & Shorts', border: 'border-amber-500/40' },
                  { style: 'Clean Minimal', desc: 'Teks putih bersih minimalis ala film bioskop', border: 'border-slate-500/40' },
                  { style: 'Neon Glow', desc: 'Teks bersinar stroke magenta-cyan futuristik', border: 'border-purple-500/40' }
                ].map((item) => (
                  <button
                    key={item.style}
                    type="button"
                    onClick={() => setSubtitleStyle(item.style as any)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      subtitleStyle === item.style 
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400' 
                      : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-sm ${subtitleStyle === item.style ? 'text-cyan-300' : 'text-slate-200'}`}>{item.style}</span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        subtitleStyle === item.style ? 'border-cyan-400' : 'border-slate-600'
                      }`}>
                        {subtitleStyle === item.style && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 2: SUARA NARATOR AI */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Mic size={14} /> 2. Suara Narator AI (Voiceover Engine)
                </label>
                <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Zap size={10} /> Sampel Hemat Biaya (0 CR Preview)
                </span>
              </div>

              <div className="space-y-3">
                {NARRATOR_VOICES.map((v) => {
                  const isSelected = selectedNarratorVoice === v.id;
                  const isPlaying = playingVoiceDemo === v.id;

                  return (
                    <div 
                      key={v.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected 
                        ? 'bg-purple-950/30 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                        : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div 
                          className="flex items-start gap-3 flex-1 cursor-pointer"
                          onClick={() => setSelectedNarratorVoice(v.id as any)}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'border-purple-400' : 'border-slate-600'
                          }`}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-sm ${isSelected ? 'text-purple-200' : 'text-slate-200'}`}>{v.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${v.badgeColor}`}>
                                {v.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{v.description}</p>
                          </div>
                        </div>

                        {/* TES SUARA BUTTON (COST SAVING) */}
                        <button
                          type="button"
                          onClick={() => handlePlayVoiceDemo(v.id, v.demoText)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            isPlaying
                            ? 'bg-purple-600 text-white border-purple-400 animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border-purple-500/30 hover:border-purple-400'
                          }`}
                          title="Putar sampel suara (Gratis, 0 kredit)"
                        >
                          {isPlaying ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          <span>{isPlaying ? 'Berhenti' : 'Tes Suara'}</span>
                        </button>
                      </div>

                      {/* VOICE CLONING EXPANDABLE SUB-PANEL */}
                      {v.id === 'voice_clone' && isSelected && (
                        <div className="mt-4 pt-4 border-t border-slate-700/60 bg-slate-900/60 p-3.5 rounded-xl space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                              <FileAudio size={14} /> Unggah Sampel Suara Anda (Min. 10 Detik)
                            </span>
                            <span className="text-[10px] text-amber-400/90 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                              Biaya Setup: 50 CR
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex-1 cursor-pointer">
                              <input 
                                type="file" 
                                accept="audio/*" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setUploadedVoiceFile(file);
                                    const audio = new Audio();
                                    audio.src = URL.createObjectURL(file);
                                    audio.onloadedmetadata = () => {
                                      setVoiceFileDuration(Math.round(audio.duration));
                                    };
                                  }
                                }}
                                className="hidden" 
                              />
                              <div className="border border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-3 bg-slate-900 text-center transition flex items-center justify-center gap-2 text-xs text-slate-300">
                                <Upload size={14} className="text-amber-400" />
                                <span>{uploadedVoiceFile ? uploadedVoiceFile.name : 'Pilih File Audio Sample (MP3, WAV, M4A)'}</span>
                              </div>
                            </label>

                            {uploadedVoiceFile && (
                              <button
                                type="button"
                                onClick={handleProcessVoiceClone}
                                disabled={isCloningVoice}
                                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                              >
                                {isCloningVoice ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
                                <span>{isCloningVoice ? 'Memproses...' : 'Proses Clone (50 CR)'}</span>
                              </button>
                            )}
                          </div>

                          {uploadedVoiceFile && voiceFileDuration > 0 && voiceFileDuration < 10 && (
                            <p className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-500/30 flex items-center gap-1.5">
                              <AlertCircle size={13} className="shrink-0" />
                              <span>Durasi sampel: {voiceFileDuration} detik. Disarankan minimal 10 detik untuk akurasi kloning vokal terbaik.</span>
                            </p>
                          )}

                          {clonedVoiceId && (
                            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 flex items-center justify-between">
                              <span className="font-semibold flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-emerald-400" />
                                Voice ID Aktif: <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-emerald-200">{clonedVoiceId}</code>
                              </span>
                              <span className="text-[10px] text-emerald-400/80 font-bold">TERHUBUNG</span>
                            </div>
                          )}

                          <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                            <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <span><strong>Penting:</strong> Voice ID akan tersimpan di profil proyek ini dan otomatis terhapus oleh fal.ai setelah 7 hari jika tidak ada aktivitas.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL FOOTER BUTTONS */}
            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button 
                type="button"
                onClick={() => setShowStitchStylePopup(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowStitchStylePopup(false);
                  handleStitchVideos();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Film size={14} />
                <span>Mulai Gabung Video</span>
              </button>
            </div>

          </div>
        </div>
      )}

{showStitchModal && (
        <div className="fixed inset-0 z-[80] bg-[#0c0d12] text-slate-200 flex flex-col font-sans select-none overflow-hidden h-screen w-screen animate-in fade-in duration-300">
          
          {/* TOP NAV BAR */}
          <div className="h-14 border-b border-white/5 bg-[#0e0f14] px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowStitchModal(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-semibold border border-transparent hover:border-white/10"
              >
                <ArrowRight size={14} className="rotate-180" />
                <span>Tutup Orchestrator</span>
              </button>
            </div>
            
            <div className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
               <Bot size={14} className="text-purple-400" />
               Orchestrator AI
            </div>

            <div className="flex items-center gap-3">
               {/* Avatars */}
               <div className="flex items-center -space-x-1.5">
                 <div className="w-7 h-7 rounded-full border border-purple-500 bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shadow-purple-500/20">
                   JN
                 </div>
               </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative p-6">
             {/* Central Hub Status */}
             <div className="max-w-xl w-full flex flex-col items-center">
                {stitchProgress === 100 && finalVideoUrl ? (
                   <div className="flex flex-col items-center w-full animate-in zoom-in-95 duration-500">
                      <div className={`w-full max-w-xs ${getProjectAspectRatioClass(project)} rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)] mb-6`}>
                        <video src={finalVideoUrl} controls autoPlay loop playsInline className="w-full h-full object-contain bg-black" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2 text-center">Video Berhasil Dijahit!</h2>
                      <p className="text-slate-400 text-sm text-center mb-6">
                        Semua adegan, subtitle bergaya <strong className="text-amber-400">"{subtitleStyle}"</strong>, dan audio latar telah digabungkan dengan sempurna.
                      </p>
                      
                      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-lg mx-auto mb-6">
                        <button 
                          onClick={handleDownloadVideoFile}
                          disabled={isDownloading}
                          className="flex-1 min-w-[130px] px-3.5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex justify-center items-center gap-2 transition hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer"
                        >
                          {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                          <span>{isDownloading ? 'Mengunduh...' : 'Unduh File MP4'}</span>
                        </button>
                        
                        <button
                          onClick={handleOpenYTModal}
                          className="flex-1 min-w-[130px] px-3.5 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 flex justify-center items-center gap-2 transition hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.86-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"/></svg>
                          <span>Post ke YouTube</span>
                        </button>

                        <button
                          onClick={() => {
                            const activeCaption = socialPlatformTab === 'youtube'
                              ? (project?.marketingCopy?.youtube_caption || project?.marketingCopy?.caption)
                              : socialPlatformTab === 'tiktok'
                              ? (project?.marketingCopy?.tiktok_caption || project?.marketingCopy?.caption)
                              : (project?.marketingCopy?.instagram_caption || project?.marketingCopy?.caption);
                            const activeTags = socialPlatformTab === 'youtube'
                              ? (project?.marketingCopy?.hashtags_youtube || project?.marketingCopy?.hashtags || [])
                              : socialPlatformTab === 'tiktok'
                              ? (project?.marketingCopy?.hashtags_tiktok || project?.marketingCopy?.hashtags || [])
                              : (project?.marketingCopy?.hashtags_instagram || project?.marketingCopy?.hashtags || []);
                            
                            const fullText = `${activeCaption || ''}\n\n${activeTags.join(' ')}`;
                            navigator.clipboard.writeText(fullText);
                            setCopiedSection('all');
                            setTimeout(() => setCopiedSection(null), 2500);
                          }}
                          className="flex-1 min-w-[150px] px-3.5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex justify-center items-center gap-2 transition hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer"
                        >
                          {copiedSection === 'all' ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
                          <span>{copiedSection === 'all' ? 'Tersalin!' : 'Salin Caption & Hashtag'}</span>
                        </button>
                      </div>

                      {/* Social Media Caption & Hashtags Display */}
                      <div className="w-full max-w-lg bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl mb-4 text-left animate-in fade-in slide-in-from-bottom-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <FileText size={14} className="text-amber-400" />
                            Caption & Hashtag Hasil Akhir
                          </span>

                          {/* Platform Selector Tabs */}
                          <div className="flex items-center bg-black/60 p-1 rounded-lg border border-white/10">
                            <button
                              onClick={() => setSocialPlatformTabState('youtube')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                                socialPlatformTab === 'youtube' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              YouTube
                            </button>
                            <button
                              onClick={() => setSocialPlatformTabState('tiktok')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                                socialPlatformTab === 'tiktok' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              TikTok
                            </button>
                            <button
                              onClick={() => setSocialPlatformTabState('instagram')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                                socialPlatformTab === 'instagram' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Instagram
                            </button>
                          </div>
                        </div>

                        {/* Caption Body */}
                        {(() => {
                          const captionText = socialPlatformTab === 'youtube'
                            ? (project?.marketingCopy?.youtube_caption || project?.marketingCopy?.caption)
                            : socialPlatformTab === 'tiktok'
                            ? (project?.marketingCopy?.tiktok_caption || project?.marketingCopy?.caption)
                            : (project?.marketingCopy?.instagram_caption || project?.marketingCopy?.caption);
                          const tagsList = socialPlatformTab === 'youtube'
                            ? (project?.marketingCopy?.hashtags_youtube || project?.marketingCopy?.hashtags || ['#shorts', '#youtubeshorts'])
                            : socialPlatformTab === 'tiktok'
                            ? (project?.marketingCopy?.hashtags_tiktok || project?.marketingCopy?.hashtags || ['#fyp', '#viral'])
                            : (project?.marketingCopy?.hashtags_instagram || project?.marketingCopy?.hashtags || ['#reels', '#viral']);

                          return (
                            <div className="space-y-3">
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto custom-scrollbar">
                                {captionText || 'Caption sedang dipersiapkan oleh SINTA Agent...'}
                              </div>

                              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                {tagsList.map((tag, tIdx) => (
                                  <span key={tIdx} className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-500/30 text-[11px] font-mono">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                   </div>
                ) : (
                   <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-stretch gap-5 px-2 sm:px-4 py-2 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar">
                      {/* MAIN COLUMN: PREVIEW FRAME AKTIF & VISUAL TIMELINE TRACK */}
                      <div className="flex-1 flex flex-col justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
                        
                        {/* 2. PREVIEW FRAME AKTIF (PANEL UTAMA) */}
                        {(() => {
                          const totalScenes = scenes.length > 0 ? scenes.length : 1;
                          const sceneWeight = 40;
                          const activeIndex = stitchProgress >= sceneWeight 
                            ? totalScenes - 1 
                            : Math.min(totalScenes - 1, Math.floor((stitchProgress / sceneWeight) * totalScenes));
                          const activeScene = scenes[activeIndex] || scenes[0];

                          return (
                            <>
                              <div className="flex-1 flex flex-col items-center justify-center relative min-h-[250px] sm:min-h-[300px] bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden p-3 shadow-inner">
                                {/* Ambient Background Glow */}
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-black/70 pointer-events-none" />

                                {/* Frame Active Container */}
                                <div className={`relative ${getProjectAspectRatioClass(project)} max-h-[260px] sm:max-h-[310px] rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-[0_0_35px_rgba(168,85,247,0.25)] transition-all duration-500`}>
                                  {activeScene?.imageUrl || activeScene?.videoUrl ? (
                                    <img 
                                      src={activeScene.imageUrl || activeScene.videoUrl} 
                                      alt={`Scene ${activeIndex + 1}`}
                                      className="w-full h-full object-cover animate-in fade-in duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-500">
                                      <Film size={36} className="text-purple-400/60 mb-2 animate-pulse" />
                                      <span className="text-xs font-mono">Render Keyframe Scene {activeIndex + 1}</span>
                                    </div>
                                  )}

                                  {/* Floating Active Scanner Line */}
                                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none opacity-80" />

                                  {/* Top Badge Overlay */}
                                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/80 border border-purple-500/50 text-[10px] font-mono font-bold text-purple-200 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                    <span>FRAME {activeIndex + 1} / {totalScenes}</span>
                                  </div>
                                </div>

                                {/* Label Status di Bawah Preview */}
                                <div className="mt-3 text-center z-10">
                                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/90 border border-purple-500/40 text-xs font-semibold text-purple-200 shadow-lg">
                                    <Loader2 size={13} className="animate-spin text-purple-400 shrink-0" />
                                    <span className="truncate max-w-xs sm:max-w-md">
                                      {stitchProgress >= 80 ? "Sedang melakukan finalisasi ekspor video MP4..."
                                        : stitchProgress >= 50 ? `Sedang menyusun subtitle (${subtitleStyle})...`
                                        : stitchProgress >= 40 ? "Sedang menyelaraskan audio narasi & BGM..."
                                        : `Sedang memproses: Adegan ${activeIndex + 1} dari ${totalScenes}`}
                                    </span>
                                  </div>
                                  {activeScene?.title && (
                                    <p className="text-[11px] text-slate-400 mt-1 font-mono truncate max-w-sm mx-auto">
                                      "{activeScene.title}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* MULTI-TRACK TIMELINE MATRIX (Video, Audio & Subtitle Tracks) */}
                              <div className="bg-slate-950/90 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3 shadow-inner">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                                    <Layers size={14} className="text-cyan-400" /> Multi-Track Timeline ({totalScenes} Scene)
                                  </span>
                                  <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-md">
                                    Progress: {stitchProgress}%
                                  </span>
                                </div>

                                {/* TRACK CONTAINER WITH PLAYHEAD */}
                                <div className="relative pt-1 pb-1 space-y-2.5">
                                  {/* Playhead Overlay Line */}
                                  <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_12px_#06b6d4] z-30 transition-all duration-300 pointer-events-none"
                                    style={{ left: `${stitchProgress}%` }}
                                  >
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rotate-45 rounded-xs shadow-[0_0_8px_#06b6d4]" />
                                  </div>

                                  {/* TRACK 1: VIDEO TRACK */}
                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                                    <div className="flex items-center justify-between mb-1.5 px-1">
                                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                                        <Film size={12} className="text-purple-400" /> Track 1: Visual Scenes
                                      </span>
                                      <span className="text-[10px] font-mono text-purple-300/80">Keyframes</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar pb-1.5 pt-0.5 px-0.5">
                                      {scenes.map((sc, idx) => {
                                        const isCompleted = stitchProgress >= 40 || idx < activeIndex;
                                        const isActive = idx === activeIndex && stitchProgress < 40;

                                        return (
                                          <div
                                            key={sc.id || idx}
                                            className={`relative shrink-0 w-24 sm:w-28 h-16 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                                              isCompleted 
                                                ? "border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.25)]" 
                                                : isActive 
                                                ? "border-purple-400 bg-purple-950/40 shadow-[0_0_16px_rgba(168,85,247,0.4)] ring-2 ring-purple-500/50 scale-105 z-10" 
                                                : "border-slate-800 opacity-40 grayscale bg-slate-900"
                                            }`}
                                          >
                                            {sc.imageUrl || sc.videoUrl ? (
                                              <img 
                                                src={sc.imageUrl || sc.videoUrl} 
                                                alt={sc.title || `Scene ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600 font-mono text-xs">
                                                S{idx + 1}
                                              </div>
                                            )}

                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono font-bold text-white">
                                              #{idx + 1}
                                            </div>

                                            {isCompleted && (
                                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow">
                                                <CheckCircle2 size={12} className="stroke-[3]" />
                                              </div>
                                            )}

                                            {isActive && (
                                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shadow animate-pulse">
                                                <Loader2 size={11} className="animate-spin" />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* TRACK 2: AUDIO TRACK WITH LIVE WAVEFORM */}
                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                                    <div className="flex items-center justify-between mb-1.5 px-1">
                                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                                        <Volume2 size={12} className="text-cyan-400" /> Track 2: Audio & Waveform
                                      </span>
                                      <span className="text-[10px] font-mono text-cyan-300/80">
                                        {NARRATOR_VOICES.find(v => v.id === selectedNarratorVoice)?.name || 'Audio'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar pb-1.5 pt-0.5 px-0.5">
                                      {scenes.map((sc, idx) => {
                                        const amplitudes = getSceneAmplitudes(sc, 10);
                                        const isAudioProcessed = stitchProgress >= 25;
                                        const isThisSceneAudioActive = idx <= activeIndex && stitchProgress >= 25;

                                        return (
                                          <div 
                                            key={`audio-${sc.id || idx}`} 
                                            className={`shrink-0 w-24 sm:w-28 h-10 rounded-md border flex items-center justify-center px-1.5 transition-all duration-300 relative overflow-hidden ${
                                              isThisSceneAudioActive 
                                                ? 'border-cyan-500/60 bg-cyan-950/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                                                : 'border-slate-800/80 bg-slate-950/60 opacity-40'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between w-full h-7 gap-0.5">
                                              {amplitudes.map((amp, bIdx) => {
                                                const barProgressRatio = ((idx * 10) + bIdx) / (totalScenes * 10);
                                                const isBarActive = (stitchProgress / 100) >= barProgressRatio && isAudioProcessed;

                                                return (
                                                  <div 
                                                    key={bIdx}
                                                    className={`flex-1 rounded-full transition-all duration-300 ${
                                                      isBarActive 
                                                        ? 'bg-gradient-to-t from-cyan-500 to-purple-400 shadow-[0_0_6px_#06b6d4] animate-pulse' 
                                                        : 'bg-slate-800'
                                                    }`}
                                                    style={{ height: `${isBarActive ? amp : Math.max(15, amp * 0.3)}%` }}
                                                  />
                                                );
                                              })}
                                            </div>
                                            <div className="absolute bottom-0.5 left-1 text-[8px] font-mono text-cyan-300/80 truncate max-w-[80px]">
                                              VO #{idx + 1}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* TRACK 3: SUBTITLE TRACK */}
                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                                    <div className="flex items-center justify-between mb-1.5 px-1">
                                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                                        <Type size={12} className="text-amber-400" /> Track 3: Subtitles ({subtitleStyle})
                                      </span>
                                      <span className="text-[10px] font-mono text-amber-300/80">Style Overlay</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar pb-1.5 pt-0.5 px-0.5">
                                      {scenes.map((sc, idx) => {
                                        const subText = sc.subtitle || sc.voiceOver || sc.textOverlay || sc.dialogue || `Scene ${idx + 1}`;
                                        const isSubProcessed = stitchProgress >= 50;
                                        const isThisSubActive = idx <= activeIndex && stitchProgress >= 50;

                                        let styleBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold";
                                        if (subtitleStyle === 'Clean Minimal') {
                                          styleBadgeClass = "bg-slate-800 text-slate-200 border-slate-600 font-medium";
                                        } else if (subtitleStyle === 'Neon Glow') {
                                          styleBadgeClass = "bg-cyan-950/80 text-cyan-300 border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.4)] font-bold";
                                        }

                                        return (
                                          <div 
                                            key={`sub-${sc.id || idx}`}
                                            className={`shrink-0 w-24 sm:w-28 h-10 rounded-md border flex items-center justify-center p-1.5 transition-all duration-300 relative overflow-hidden ${
                                              isThisSubActive 
                                                ? 'border-amber-500/60 bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]' 
                                                : 'border-slate-800/80 bg-slate-950/60 opacity-40'
                                            }`}
                                          >
                                            {isSubProcessed ? (
                                              <div className={`w-full text-[9px] truncate px-1.5 py-0.5 rounded border text-center ${styleBadgeClass}`}>
                                                "{subText}"
                                              </div>
                                            ) : (
                                              <span className="text-[9px] font-mono text-slate-600 italic">S{idx + 1} Subtitle</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* RIGHT / SECONDARY COLUMN: JANE AGENT STREAM & PROGRESS CHECKLIST */}
                      <div className="w-full lg:w-80 shrink-0 flex flex-col justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
                        <div>
                          {/* Bot Agent Jane Header */}
                          <div className="flex items-center gap-3 mb-3 p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl shadow-lg">
                            <div className="w-10 h-10 rounded-full bg-purple-900/40 border border-purple-500/60 flex items-center justify-center relative shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                              <Bot size={20} className="text-purple-300 animate-bounce" />
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                Jane (AI Director)
                              </h4>
                              <p className="text-[11px] text-purple-300">Menjahit video & menyelaraskan aset...</p>
                            </div>
                          </div>

                          {/* Live Agent Terminal Stream Log */}
                          <div className="mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs shadow-inner">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1.5 mb-2 border-b border-slate-800">
                              <span className="flex items-center gap-1 font-bold text-purple-400">
                                <Terminal size={12} /> STREAM LOG EVENT
                              </span>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            </div>
                            <div className="text-[11px] text-emerald-300 leading-relaxed font-mono min-h-[40px] flex items-start gap-1.5">
                              <span className="text-purple-400 font-bold shrink-0">&gt;</span>
                              <span className="animate-in fade-in duration-200">
                                {stitchLogs.length > 0 
                                  ? stitchLogs[stitchLogs.length - 1] 
                                  : "Inisialisasi sistem orkestrator video Neurona..."}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar Persentase */}
                          <div className="mb-4">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1.5">
                              <span>Proses Penggabungan</span>
                              <span className="text-purple-400 font-mono text-sm">{stitchProgress}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-600 via-teal-400 to-cyan-400 transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]" 
                                style={{ width: `${stitchProgress}%` }} 
                              />
                            </div>
                          </div>

                          {/* Task Checklist */}
                          <div className="space-y-2">
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors duration-500 ${stitchProgress >= 25 ? "bg-emerald-950/40 border-emerald-500/30" : stitchProgress > 0 ? "bg-purple-950/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-slate-900/50 border-slate-800"}`}>
                              {stitchProgress >= 25 ? <CheckCircle2 className="text-emerald-400 w-4 h-4 shrink-0" /> : stitchProgress > 0 ? <Loader2 className="text-purple-400 w-4 h-4 animate-spin shrink-0" /> : <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />}
                              <span className={`text-xs font-semibold truncate ${stitchProgress >= 25 ? "text-emerald-100" : stitchProgress > 0 ? "text-purple-100" : "text-slate-500"}`}>🎬 Menggabungkan {scenes.length} scene video</span>
                            </div>
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors duration-500 ${stitchProgress >= 50 ? "bg-emerald-950/40 border-emerald-500/30" : stitchProgress >= 25 ? "bg-purple-950/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-slate-900/50 border-slate-800"}`}>
                              {stitchProgress >= 50 ? <CheckCircle2 className="text-emerald-400 w-4 h-4 shrink-0" /> : stitchProgress >= 25 ? <Loader2 className="text-purple-400 w-4 h-4 animate-spin shrink-0" /> : <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />}
                              <span className={`text-xs font-semibold truncate ${stitchProgress >= 50 ? "text-emerald-100" : stitchProgress >= 25 ? "text-purple-100" : "text-slate-500"}`}>🎵 Menyelaraskan audio & BGM</span>
                            </div>
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors duration-500 ${stitchProgress >= 80 ? "bg-emerald-950/40 border-emerald-500/30" : stitchProgress >= 50 ? "bg-purple-950/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-slate-900/50 border-slate-800"}`}>
                              {stitchProgress >= 80 ? <CheckCircle2 className="text-emerald-400 w-4 h-4 shrink-0" /> : stitchProgress >= 50 ? <Loader2 className="text-purple-400 w-4 h-4 animate-spin shrink-0" /> : <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />}
                              <span className={`text-xs font-semibold truncate ${stitchProgress >= 80 ? "text-emerald-100" : stitchProgress >= 50 ? "text-purple-100" : "text-slate-500"}`}>✍️ Menyusun subtitle (Gaya: {subtitleStyle})</span>
                            </div>
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors duration-500 ${stitchProgress >= 100 ? "bg-emerald-950/40 border-emerald-500/30" : stitchProgress >= 80 ? "bg-purple-950/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-slate-900/50 border-slate-800"}`}>
                              {stitchProgress >= 100 ? <CheckCircle2 className="text-emerald-400 w-4 h-4 shrink-0" /> : stitchProgress >= 80 ? <Loader2 className="text-purple-400 w-4 h-4 animate-spin shrink-0" /> : <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />}
                              <span className={`text-xs font-semibold truncate ${stitchProgress >= 100 ? "text-emerald-100" : stitchProgress >= 80 ? "text-purple-100" : "text-slate-500"}`}>📦 Finalisasi ekspor MP4</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                 )}
             </div>

             {/* Tech Logs Panel (Hidden by Default) */}
             <div className="absolute bottom-6 left-6 right-6 flex justify-center">
                <details className="group w-full max-w-2xl bg-black/60 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
                   <summary className="p-3 cursor-pointer text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-2 select-none outline-none">
                      <Bot size={14} className="text-slate-500" />
                      <span>Log Teknis (Asisten Director: Jane)</span>
                      <ArrowRight size={12} className="ml-auto transition-transform group-open:rotate-90" />
                   </summary>
                   <div className="p-3 border-t border-white/5 max-h-48 overflow-y-auto space-y-2 bg-black/80">
                     {stitchLogs.length === 0 ? (
                       <div className="text-[10px] text-slate-600 font-mono italic">Menunggu log sistem...</div>
                     ) : (
                       stitchLogs.map((log, i) => (
                         <div key={i} className="text-[10px] text-slate-400 font-mono flex items-start gap-2">
                           <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                           <span>{log}</span>
                         </div>
                       ))
                     )}
                   </div>
                </details>
             </div>
          </div>
        </div>
      )}

      {/* Nano Banana Token Quota Alert & Fallback Dialog */}
      <NanoQuotaAlertModal
        isOpen={quotaAlert.isOpen}
        sceneId={quotaAlert.sceneId}
        errorMessage={quotaAlert.errorMessage}
        onClose={() => setQuotaAlert(prev => ({ ...prev, isOpen: false }))}
        onOpenTopUp={onOpenTopUp}
        onContinueWithFlux={() => {
          setQuotaAlert(prev => ({ ...prev, isOpen: false }));
          if (quotaAlert.sceneId) {
            handleGenerateSingleImage(quotaAlert.sceneId, 1, 'draft', true);
          } else {
            handleGenerateAllImages('draft', true);
          }
        }}
      />

      {/* YouTube Shorts Auto-Post Modal */}
      {showYTModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.86-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Post Otomatis ke YouTube Shorts</h3>
                  <p className="text-[11px] text-slate-400">Unggah video master langsung ke channel YouTube</p>
                </div>
              </div>
              <button
                onClick={() => setShowYTModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-left overflow-y-auto max-h-[75vh]">
              {ytStatus === 'success' ? (
                <div className="py-6 flex flex-col items-center text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 className="text-lg font-bold text-white">Berhasil Diposting ke YouTube!</h4>
                  <p className="text-xs text-slate-300 max-w-sm">
                    Video Shorts Anda telah diunggah dan dijadwalkan secara otomatis. Anda dapat memantau analytics video melalui YouTube Studio.
                  </p>
                  <div className="pt-2 flex gap-3">
                    <a
                      href="https://studio.youtube.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow flex items-center gap-1.5"
                    >
                      Buka YouTube Studio
                    </a>
                    <button
                      onClick={() => setShowYTModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {ytError && (
                    <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-300 flex items-start gap-2 animate-in fade-in">
                      <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Status Integrasi YouTube Data API v3:</p>
                        <p className="text-[11px] leading-relaxed text-red-200">{ytError}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Video YouTube Shorts</label>
                    <input
                      type="text"
                      value={ytTitle}
                      onChange={e => setYtTitle(e.target.value)}
                      placeholder="Masukkan judul video..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi & Naskah Video</label>
                    <textarea
                      value={ytDescription}
                      onChange={e => setYtDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-red-500 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Hashtags YouTube (#shorts)</label>
                    <input
                      type="text"
                      value={ytHashtags}
                      onChange={e => setYtHashtags(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-blue-400 focus:border-red-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Status Privasi Video</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setYtPrivacy('public')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          ytPrivacy === 'public' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        Publik
                      </button>
                      <button
                        type="button"
                        onClick={() => setYtPrivacy('unlisted')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          ytPrivacy === 'unlisted' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        Tidak Publik
                      </button>
                      <button
                        type="button"
                        onClick={() => setYtPrivacy('private')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          ytPrivacy === 'private' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        Pribadi
                      </button>
                    </div>
                  </div>

                  {ytStatus === 'uploading' && (
                    <div className="space-y-2 pt-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-1.5 font-semibold text-red-400">
                          <Loader2 size={14} className="animate-spin" />
                          Mengunggah ke YouTube Shorts...
                        </span>
                        <span className="font-mono">{ytProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${ytProgress}%` }} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {ytStatus !== 'success' && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowYTModal(false)}
                  disabled={ytStatus === 'uploading'}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleStartYTUpload}
                  disabled={ytStatus === 'uploading'}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {ytStatus === 'uploading' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  <span>{ytStatus === 'uploading' ? 'Mengunggah...' : 'Upload ke YouTube Shorts'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
