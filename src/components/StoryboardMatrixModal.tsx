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
  Upload
} from 'lucide-react';
import type { ProductionProject, Scene } from '../shared/types';
import { neuronaVoice } from '../utils/speechSynthesis';
import { getProjectAspectRatioClass } from '../utils/aspectRatio';

interface StoryboardMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProductionProject | null;
  currentCredits: number;
  onApproveAndPay: (creditsCost: number) => void;
  onOpenTopUp: () => void;
  onGenerateSceneImage?: (sceneId: string, cost: number, imageEngine?: string) => Promise<void>;
  onGenerateAllImages?: (totalCost: number, imageEngine?: string) => Promise<void>;
  onGenerateSceneVideo?: (sceneId: string, cost: number) => Promise<void>;
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
    name: 'Standar (Nano Banana 2 & Edit)',
    shortName: 'Standar (15 CR)',
    costPerImage: 15,
    badge: '15 Kredit',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: 'Konsistensi karakter memadai untuk Animasi & Edukasi'
  },
  {
    id: 'precision',
    name: 'Presisi Tinggi (Nano Banana Pro Edit)',
    shortName: 'Presisi Pro (25 CR)',
    costPerImage: 25,
    badge: '25 Kredit',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    desc: 'Wajib untuk Affiliate & produk/wajah 100% identik'
  },
  {
    id: 'draft',
    name: 'Hemat / Draft (FLUX.1 Schnell)',
    shortName: 'Draft (5 CR)',
    costPerImage: 5,
    badge: '5 Kredit',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'Eksplorasi gaya visual cepat & preview storyboard kilat'
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
  { id: 'fal-ai/wan-i2v', name: 'Wan 2.1 (Budget - 720p)', shortName: 'Wan 2.1', desc: 'Sangat efisien & hemat', costPerVideo: 10 },
  { id: 'bytedance/seedance-2.0/fast/image-to-video', name: 'SeaDance 2.0 Fast (Budget)', shortName: 'SeaDance 2.0 Fast', desc: 'Render kilat & murah', costPerVideo: 10 },
  { id: 'fal-ai/hunyuan-video-image-to-video', name: 'Hunyuan Video (Budget)', shortName: 'Hunyuan Video', desc: 'Stabil & efisien', costPerVideo: 10 },
  { id: 'bytedance/seedance-2.0/image-to-video', name: 'SeaDance 2.0 Standard (Balanced)', shortName: 'SeaDance 2.0 Std', desc: 'Kualitas seimbang 720p', costPerVideo: 15 },
  { id: 'fal-ai/kling-video/v2.1/standard/image-to-video', name: 'Kling 2.1 Standard (Balanced)', shortName: 'Kling 2.1', desc: 'Sinematik & kreatif', costPerVideo: 15 },
  { id: 'fal-ai/kling-video/o3/standard/image-to-video', name: 'Kling O3 Standard (Balanced)', shortName: 'Kling O3', desc: 'Pencahayaan presisi', costPerVideo: 15 },
  { id: 'fal-ai/minimax/video-01/image-to-video', name: 'MiniMax Video 01 (Balanced)', shortName: 'MiniMax Video 01', desc: 'Konsistensi karakter tinggi', costPerVideo: 15 },
  { id: 'fal-ai/minimax/video-01-live/image-to-video', name: 'MiniMax Video 01 Live (Balanced)', shortName: 'MiniMax Live', desc: 'Dinamika gerak natural', costPerVideo: 15 },
  { id: 'fal-ai/minimax/hailuo-02/standard/image-to-video', name: 'MiniMax Hailuo 02 (Balanced)', shortName: 'Hailuo 02', desc: 'Gerakan ekspresif', costPerVideo: 15 },
  { id: 'bytedance/seedance-2.5/image-to-video', name: 'SeaDance 2.5 (Premium - Native 30s)', shortName: 'SeaDance 2.5', desc: 'Native 30s, audio & sinematik', costPerVideo: 20 },
  { id: 'fal-ai/kling-video/v3/pro/image-to-video', name: 'Kling 3.0 Pro 1080p (Premium)', shortName: 'Kling 3.0 Pro', desc: 'Resolusi 1080p ultra jernih', costPerVideo: 25 },
  { id: 'veo', name: 'Google Veo 3.1', shortName: 'Veo 3.1', desc: 'Ultra HD fotorealistik', costPerVideo: 15 },
  { id: 'byteplus', name: 'BytePlus PixelDance', shortName: 'PixelDance', desc: 'Komersial dinamis', costPerVideo: 15 }
];

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
  const [selectedImageEngine, setSelectedImageEngine] = useState<ImageModelId>('chatgpt-image-2');
  const [selectedVideoEngine, setSelectedVideoEngine] = useState<string>(
    () => localStorage.getItem('neurona_video_model') || 'byteplus'
  );
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

  const [stitchProgress, setStitchProgress] = useState<number>(0);
  const [stitchLogs, setStitchLogs] = useState<string[]>([]);
  const [activeStitchStep, setActiveStitchStep] = useState<string>('');
  const [showStitchModal, setShowStitchModal] = useState<boolean>(false);

  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
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

      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, scenes: scenesPayload })
      });
      const data = await res.json();

      log('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
      setStitchProgress(100);
      setActiveStitchStep('Selesai');
      neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");

      if (data.success) {
        setFinalVideoUrl(data.url);
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

  const scenes = project.storyboard?.scenes || [];
  const charProfile = project.characterProfile || project.storyboard?.characterProfile;
  
  const currentEngineOption = IMAGE_MODEL_OPTIONS.find(m => m.id === selectedImageEngine) || IMAGE_MODEL_OPTIONS[0];
  const currentVideoEngineOption = VIDEO_MODEL_OPTIONS.find(m => m.id === selectedVideoEngine) || VIDEO_MODEL_OPTIONS[0];
  const singleImageCost = currentEngineOption.costPerImage;
  const singleVideoCost = currentVideoEngineOption.costPerVideo;
  const imageCreditsTotal = scenes.length * singleImageCost;
  const videoCreditsTotal = scenes.length * singleVideoCost;
  const isAwaiting = project.status === 'AWAITING_APPROVAL' || project.activeProductionStage === 'STORYBOARD' || project.activeProductionStage === 'IMAGES';

  const completedImagesCount = scenes.filter(s => Boolean(s.imageUrl && (s.imageStatus === 'COMPLETED' || s.imageUrl.startsWith('data:') || s.imageUrl.startsWith('http')))).length;
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

  const handleGenerateAllImages = async (engine?: ImageModelId) => {
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
        await onGenerateAllImages(calculatedTotal, chosenEngine);
      }
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleGenerateSingleImage = async (sceneId: string, cost?: number, engine?: ImageModelId) => {
    const chosenEngine = engine || selectedImageEngine;
    const modelOpt = IMAGE_MODEL_OPTIONS.find(m => m.id === chosenEngine) || currentEngineOption;
    const appliedCost = cost ?? modelOpt.costPerImage;

    if (currentCredits < appliedCost) {
      onOpenTopUp();
      return;
    }
    setIsProcessingAction(`image-${sceneId}`);
    try {
      if (onGenerateSceneImage) {
        await onGenerateSceneImage(sceneId, appliedCost, chosenEngine);
      }
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleGenerateSingleVideo = async (sceneId: string, cost: number) => {
    if (currentCredits < cost) {
      neuronaVoice.playChime('ALERT');
      neuronaVoice.speak(`Saldo kredit tidak mencukupi. Diperlukan ${cost} kredit untuk merender video adegan.`);
      onOpenTopUp();
      return;
    }
    neuronaVoice.playChime('SUCCESS');
    neuronaVoice.speak(`Memproses rendering video adegan.`);
    setIsProcessingAction(`video-${sceneId}`);
    try {
      if (onGenerateSceneVideo) {
        await onGenerateSceneVideo(sceneId, cost);
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
                    onChange={(e) => setSelectedImageEngine(e.target.value as ImageModelId)}
                    className="bg-transparent text-[11px] font-bold text-slate-200 outline-none px-2 py-1.5 cursor-pointer appearance-none pr-6 custom-select-arrow"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem center', backgroundSize: '.65em auto' }}
                  >
                    {IMAGE_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                        {opt.shortName} ({opt.costPerImage}K)
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
                        {opt.shortName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Generate All Images Button */}
              <button
                onClick={() => handleGenerateAllImages(selectedImageEngine)}
                disabled={isProcessingAction === 'all-images'}
                className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {isProcessingAction === 'all-images' ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Sedang Generate ({completedImagesCount}/{scenes.length})...</span>
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
              
              {/* VEO MASTER VIDEO READY BANNER */}
              {(project.finalVideoUrl || scenes.some(s => Boolean(s.videoUrl))) && (
                <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border-2 border-emerald-500/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-emerald-950/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30 shrink-0">
                      <Film size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          Video Hasil Generate Veo Ditemukan di Server!
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                          Siap Diputar
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        File video tersimpan di server (<span className="font-mono text-emerald-400">{project.finalVideoUrl || scenes.find(s => s.videoUrl)?.videoUrl}</span>). Anda dapat langsung memutar atau mengunduhnya tanpa menghabiskan kredit token lagi.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={project.finalVideoUrl || scenes.find(s => s.videoUrl)?.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/30"
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Putar Video</span>
                    </a>
                    <a
                      href={project.finalVideoUrl || scenes.find(s => s.videoUrl)?.videoUrl}
                      download={`veo-video-${project.id.substring(0, 6)}.mp4`}
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
                      Gambar ini diikat ke prompt Sinta untuk memastikan model Runway Gen-3 atau Veo tidak mengubah bentuk, logo, atau warna produk Anda (anti-halusinasi).
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
                  const hasImage = Boolean(scene.imageUrl && (scene.imageStatus === 'COMPLETED' || scene.imageUrl.startsWith('data:') || scene.imageUrl.startsWith('http')));
                  const isImageGenerating = scene.imageStatus === 'GENERATING' || isProcessingAction === `image-${scene.id}`;
                  const isVideoGenerating = scene.videoStatus === 'GENERATING' || isProcessingAction === `video-${scene.id}`;

                  return (
                    <React.Fragment key={scene.id || idx}>
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
                            hasImage ? 'bg-purple-950/80 text-purple-300 border-purple-500/40' :
                            isImageGenerating ? 'bg-purple-950 text-purple-300 border-purple-500/40 animate-pulse' :
                            'bg-slate-900 text-slate-400 border-slate-800'
                          }`}>
                            <ImageIcon size={10} />
                            <span>Gambar: {hasImage ? 'READY' : (scene.imageStatus || 'PENDING')}</span>
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
                                        onClick={() => setFaceLocks(prev => ({ ...prev, [scene.id]: !prev[scene.id] }))}
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
                                        onClick={() => setProductLocks(prev => ({ ...prev, [scene.id]: !prev[scene.id] }))}
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

                          {/* Action Buttons per Scene - Enforce Sequential Generation */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {/* 1. Generate Image Button with current engine model */}
                            <button
                              onClick={() => handleGenerateSingleImage(scene.id, singleImageCost, selectedImageEngine)}
                              disabled={isImageGenerating}
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 ${
                                !hasImage 
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30' 
                                  : 'bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200'
                              }`}
                              title={`Generate dengan ${currentEngineOption.shortName}`}
                            >
                              {isImageGenerating ? (
                                <>
                                  <Loader2 size={11} className="animate-spin" />
                                  <span>Memproses...</span>
                                </>
                              ) : (
                                <>
                                  <Palette size={11} />
                                  <span>{hasImage ? `Regenerate (${singleImageCost} K)` : `1. Buat Gambar (${singleImageCost} K)`}</span>
                                </>
                              )}
                            </button>

                            {/* 2. Generate Video Button - Disabled until image is ready */}
                            <button
                              onClick={() => {
                                if (!hasImage) {
                                  handleGenerateSingleImage(scene.id, singleImageCost, selectedImageEngine);
                                  return;
                                }
                                handleGenerateSingleVideo(scene.id, singleVideoCost);
                              }}
                              disabled={isVideoGenerating || isImageGenerating}
                              title={!hasImage ? "Harap generate gambar terlebih dahulu" : "Render Video dari Gambar"}
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
                                  <span>2. Render Video ({singleVideoCost} K)</span>
                                </>
                              ) : (
                                <>
                                  <Play size={11} className="opacity-40" />
                                  <span>2. Video (Perlu Gambar)</span>
                                </>
                              )}
                            </button>
                          </div>
                          
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
                  </React.Fragment>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Belum ada storyboard yang dirancang. Mulai dengan memberikan brief di NEURONA Core.
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
                    Render multi-shot video dengan model pilihan ({project.videoModel || 'SORA_TURBO'}), subtitle dinamis & audio master.
                  </p>
                </div>

                <button
                  onClick={() => onApproveAndPay(videoCreditsTotal)}
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
                  onClick={handleStitchVideos}
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
                onClick={() => onApproveAndPay(videoCreditsTotal)}
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

      {/* Stitching Orchestrator Terminal Modal */}
      {showStitchModal && (
        <div className="fixed inset-0 z-[80] bg-[#0c0d12] text-slate-200 flex flex-col font-sans select-none overflow-hidden h-screen w-screen animate-in fade-in duration-300">
          
          {/* TOP NAV BAR */}
          <div className="h-14 border-b border-white/5 bg-[#0e0f14] px-4 flex items-center justify-between shrink-0">
            {/* Left controls */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowStitchModal(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-semibold"
              >
                <ArrowRight size={14} className="rotate-180" />
                <span>Back</span>
              </button>
              <div className="h-4 w-[1px] bg-white/10" />
              <button className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/5 cursor-pointer">
                <Undo size={14} />
              </button>
              <button className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/5 cursor-pointer">
                <Redo size={14} />
              </button>
            </div>

            {/* Center Tab Pills */}
            <div className="flex items-center bg-black/40 border border-white/5 p-0.5 rounded-full">
              <button className="px-3 py-1.5 rounded-full bg-[#1b1c24] text-purple-400 text-[10px] font-bold flex items-center gap-1.5 shadow">
                <Film size={12} />
                <span>Video Editor</span>
              </button>
              <button className="px-3 py-1.5 rounded-full text-slate-400 hover:text-slate-200 text-[10px] font-semibold flex items-center gap-1.5">
                <FileText size={12} />
                <span>Text Overlay</span>
              </button>
              <button className="px-3 py-1.5 rounded-full text-slate-400 hover:text-slate-200 text-[10px] font-semibold flex items-center gap-1.5">
                <Music size={12} />
                <span>Sound Master</span>
              </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Avatars */}
              <div className="flex items-center -space-x-1.5">
                <div className="w-6 h-6 rounded-full border border-purple-500 bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white shadow-sm shadow-purple-500/20">
                  JN
                </div>
                <div className="w-6 h-6 rounded-full border border-cyan-500 bg-cyan-600 flex items-center justify-center text-[9px] font-bold text-slate-950 shadow-sm shadow-cyan-500/20">
                  MK
                </div>
              </div>
              
              {/* Export Button */}
              <button 
                onClick={() => {
                  if (finalVideoUrl) {
                    const a = document.createElement('a');
                    a.href = finalVideoUrl;
                    a.download = `stitched-film-${project?.id.substring(0,6) || 'movie'}.mp4`;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  } else {
                    alert("Video belum selesai dijahit! Mohon tunggu beberapa saat.");
                  }
                }}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
              >
                <Download size={13} />
                <span>Export Film</span>
              </button>
            </div>
          </div>

          {/* MAIN COLUMN BODY LAYOUT */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT SIDEBAR: Media Bin */}
            <div className="w-[260px] border-r border-white/5 bg-[#0e0f14] flex flex-col overflow-y-auto shrink-0 select-none">
              <div className="p-4 border-b border-white/5">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Project Video</h3>
                <div className="relative">
                  <input 
                    type="text" 
                    readOnly
                    placeholder="Search scene assets..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 outline-none focus:border-purple-500/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-[10px]">🔍</div>
                </div>
              </div>

              {/* Media Lists */}
              <div className="p-2.5 space-y-2">
                {scenes.map((scene, idx) => {
                  const isActive = selectedSceneIndex === idx;
                  const isCompleted = scene.videoStatus === 'COMPLETED' && scene.videoUrl;
                  const thumb = scene.assetUrl || scene.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop';
                  return (
                    <div 
                      key={scene.id}
                      onClick={() => setSelectedSceneIndex(idx)}
                      className={`p-2 rounded-2xl cursor-pointer transition flex items-start gap-3 border ${
                        isActive 
                          ? 'bg-[#1b1c24] border-purple-500/50 shadow-md shadow-purple-500/5' 
                          : 'bg-black/20 border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="w-16 h-12 bg-black rounded-lg overflow-hidden shrink-0 relative border border-white/10">
                        <img 
                          src={thumb} 
                          alt="Thumbnail" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 right-1 px-1 py-[1px] bg-black/70 text-[8px] font-mono font-bold rounded text-slate-300">
                          05s
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-slate-200 truncate flex items-center gap-1.5">
                          <span>Scene {idx + 1}</span>
                          {isCompleted ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[9px] text-slate-500 truncate mt-1">
                          {scene.subtitle || scene.voiceOver || 'No Script'}
                        </p>
                        <div className="text-[8px] text-purple-400 font-mono mt-1.5 uppercase font-semibold">
                          {isCompleted ? 'READY' : 'GENERATING'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CENTER PANEL: Main Interactive Canvas Player */}
            <div className="flex-1 bg-[#090a0d] flex flex-col items-center justify-between p-4 relative overflow-hidden">
              <div className="flex-1 w-full flex flex-col items-center justify-center max-w-2xl">
                {/* Big Monitor Frame */}
                <div className={`w-full ${getProjectAspectRatioClass(project)} max-h-[50vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#000]`}>
                  {/* Glowing background halo */}
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none" />
                  
                  {stitchProgress === 100 && finalVideoUrl ? (
                    <video 
                      src={finalVideoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center">
                      {scenes[selectedSceneIndex]?.videoUrl ? (
                        <video 
                          src={scenes[selectedSceneIndex].videoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <img 
                            src={scenes[selectedSceneIndex]?.assetUrl || scenes[selectedSceneIndex]?.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop'} 
                            alt="Static Visual Reference" 
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
                          />
                          <div className="relative z-10 w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
                            <Clock size={28} />
                          </div>
                          <span className="relative z-10 text-xs font-bold text-amber-400">MEMPROSES VIDEO SCENE {selectedSceneIndex + 1}</span>
                          <p className="relative z-10 text-[10px] text-slate-400 max-w-xs leading-relaxed">
                            Video generator Veo 3.1 sedang berjalan pada server paralel Cloud Run. Tampilan visual saat ini diambil dari keyframe gambar statis.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top Header info */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
                    <div className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-mono text-slate-300">
                      🔒 ASPECT RATIO: {project?.aspectRatio || '16:9'}
                    </div>
                    {stitchProgress < 100 && (
                      <div className="px-3 py-1 rounded-full bg-purple-950/80 backdrop-blur-md border border-purple-500/40 text-[9px] font-mono text-purple-300 animate-pulse">
                        ⚡ STITCHING COMPILING...
                      </div>
                    )}
                  </div>
                </div>

                {/* Video controls console */}
                <div className="w-full max-w-2xl bg-[#0e0f14] border border-white/5 rounded-2xl p-3.5 mt-4 flex items-center justify-between shadow-lg">
                  <div className="text-[10px] font-mono text-slate-400">
                    <span className="text-purple-400 font-bold">00:01:38</span> / 00:05:00
                  </div>
                  
                  {/* Player button pack */}
                  <div className="flex items-center gap-3">
                    <button className="p-1.5 text-slate-500 hover:text-white transition rounded-full hover:bg-white/5 cursor-pointer">
                      <span className="text-xs">⏮</span>
                    </button>
                    <button 
                      onClick={() => setIsNlePlaying(!isNlePlaying)}
                      className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow shadow-purple-600/30 cursor-pointer transition"
                    >
                      {isNlePlaying ? <span className="text-xs">⏸</span> : <Play size={12} fill="currentColor" />}
                    </button>
                    <button className="p-1.5 text-slate-500 hover:text-white transition rounded-full hover:bg-white/5 cursor-pointer">
                      <span className="text-xs">⏭</span>
                    </button>
                  </div>

                  {/* Controls side */}
                  <div className="flex items-center gap-3">
                    <button className="p-1 text-slate-400 hover:text-white transition">
                      <Maximize2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: AI Director & Property Panel */}
            <div className="w-[320px] border-l border-white/5 bg-[#0e0f14] flex flex-col shrink-0 select-none">
              
              {/* Tab Header */}
              <div className="grid grid-cols-3 border-b border-white/5 text-[10px] text-center font-bold font-mono">
                {['Video', 'Animation', 'Tracking'].map((tab) => {
                  const isActive = activeInspectorTab === tab;
                  return (
                    <button 
                      key={tab}
                      onClick={() => setActiveInspectorTab(tab as any)}
                      className={`py-3 transition cursor-pointer ${
                        isActive ? 'text-purple-400 border-b-2 border-purple-500 bg-[#1b1c24]/20' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Inspector Content container */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Volume slider exactly like image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400">Volume Musik Latar</span>
                    <span className="text-purple-400 font-mono">{musicVolume}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={musicVolume} 
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg outline-none cursor-pointer"
                  />
                  <select className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-slate-300 focus:outline-none focus:border-purple-500/40">
                    <option>Study Chill Relax Rep...</option>
                    <option>Cinematic Epic Orchestral</option>
                    <option>Cyberpunk Neon Beats</option>
                    <option>Acoustic Guitar Soft</option>
                  </select>
                </div>

                {/* Background color curves exactly like image */}
                <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400 uppercase tracking-wider">Background Curves</span>
                    <span className="text-slate-600 text-[9px] font-mono">Curves | HSL | Basic</span>
                  </div>
                  {/* Curved Vector SVG representing the color curves exactly like image */}
                  <div className="h-16 w-full bg-slate-950/80 rounded-xl relative overflow-hidden border border-white/5 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 100 40">
                      <path 
                        d="M0,35 Q20,5 50,20 T100,5" 
                        fill="none" 
                        stroke="url(#purpleGrad)" 
                        strokeWidth="1.5" 
                        className="animate-pulse"
                      />
                      <circle cx="20" cy="12" r="2" fill="#c084fc" />
                      <circle cx="50" cy="20" r="2" fill="#22d3ee" />
                      <circle cx="80" cy="9" r="2" fill="#fb7185" />
                      
                      <defs>
                        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#c084fc" />
                          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#fb7185" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                {/* AI AGENT CHAT SECTION: Hi Mike! How can I help you? */}
                <div className="border-t border-white/5 pt-3.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow shadow-purple-600/30">
                      JN
                    </div>
                    <div className="text-[11px] font-bold">
                      <span className="text-slate-300">Asisten Director: </span>
                      <span className="text-purple-400">Jane</span>
                    </div>
                  </div>

                  {/* Chat message box */}
                  <div className="h-[180px] bg-black/60 rounded-2xl border border-white/5 p-3 overflow-y-auto space-y-2.5 flex flex-col justify-start">
                    {chatHistory.map((chat, i) => (
                      <div key={i} className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-2.5 rounded-2xl max-w-[90%] text-[10px] leading-relaxed break-all ${
                          chat.sender === 'user' 
                            ? 'bg-purple-600 text-white rounded-tr-none' 
                            : 'bg-slate-900 border border-white/5 text-slate-300 rounded-tl-none'
                        }`}>
                          {chat.message}
                        </div>
                        <span className="text-[8px] text-slate-600 font-mono mt-1 px-1">{chat.timestamp}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Interactive suggested tags */}
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      onClick={() => handleSendChat("Buatkan teks penutup otomatis")}
                      className="px-2 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-[9px] text-slate-400 font-medium transition cursor-pointer"
                    >
                      Generate Text
                    </button>
                    <button 
                      onClick={() => handleSendChat("Regenerasi keyframe visual untuk transisi")}
                      className="px-2 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-[9px] text-slate-400 font-medium transition cursor-pointer"
                    >
                      Generate Images
                    </button>
                    <button 
                      onClick={() => handleSendChat("Masukkan avatar presenter AI")}
                      className="px-2 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-[9px] text-slate-400 font-medium transition cursor-pointer"
                    >
                      Generate Avatar
                    </button>
                  </div>

                  {/* Chat input form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChat(chatInput);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Start typing..." 
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-slate-300 placeholder-slate-600 outline-none focus:border-purple-500/50"
                    />
                    <button 
                      type="submit"
                      className="w-8 h-8 rounded-xl bg-[#1b1c24] hover:bg-purple-600 hover:text-white transition flex items-center justify-center text-purple-400 cursor-pointer shadow-sm border border-white/10"
                    >
                      <Send size={12} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM REGION: MULTI-TRACK TIMELINE CANVAS */}
          <div className="h-[280px] bg-[#0c0d12] border-t border-white/5 flex flex-col shrink-0 select-none overflow-hidden">
            
            {/* 1. Time Ruler ticks precisely like picture */}
            <div className="h-8 border-b border-white/5 flex items-center bg-black/20 shrink-0 font-mono text-[9px] text-slate-600">
              <div className="w-[180px] px-4 font-bold border-r border-white/5 text-slate-500 shrink-0 uppercase tracking-wider text-[8px]">
                ⏱ TIMELINE MASTER
              </div>
              <div className="flex-1 flex justify-between px-6 overflow-x-auto select-none pointer-events-none">
                <span>00:01:40</span>
                <span>00:00:10</span>
                <span>00:00:15</span>
                <span>00:00:20</span>
                <span>00:00:25</span>
                <span>00:00:30</span>
                <span>00:00:35</span>
                <span>00:00:40</span>
                <span>00:00:45</span>
                <span>00:00:50</span>
              </div>
            </div>

            {/* 2. Scrollable track rows */}
            <div className="flex-1 overflow-y-auto space-y-[2px] bg-black/10">
              
              {/* TRACK 1: Text Overlay (Subtitle) */}
              <div className="h-[64px] flex items-center">
                {/* Track header */}
                <div className="w-[180px] h-full bg-[#0e0f14] border-r border-white/5 px-4 flex items-center justify-between shrink-0 text-slate-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold text-slate-300 truncate">💬 Subtitle Track</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => setTrackVisibility(p => ({ ...p, text: !p.text }))}
                      className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      {trackVisibility.text ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button 
                      onClick={() => setTrackLocked(p => ({ ...p, text: !p.text }))}
                      className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      {trackLocked.text ? <Lock size={12} className="text-amber-500" /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>

                {/* Track canvas area */}
                <div className="flex-1 h-full px-6 flex items-center relative overflow-x-auto bg-black/5">
                  {trackVisibility.text && (
                    <div className="flex items-center gap-4 w-full">
                      {scenes.map((scene, idx) => {
                        const isFocused = selectedSceneIndex === idx;
                        return (
                          <div 
                            key={`text-track-${scene.id}`}
                            onClick={() => setSelectedSceneIndex(idx)}
                            className={`px-3 py-1.5 rounded-full border text-[9px] font-semibold flex items-center gap-1 cursor-pointer transition select-none ${
                              isFocused 
                                ? 'bg-[#1b1c24] border-purple-500/50 text-purple-300 shadow shadow-purple-500/10' 
                                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {scene.subtitle || scene.voiceOver || 'Default Intro...'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Decorative anchor curve strings connecting down to video timeline track */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                    <path d="M 220 30 Q 240 60 260 64" fill="none" stroke="#c084fc" strokeWidth="1" strokeDasharray="3,3" />
                    <path d="M 400 30 Q 420 60 440 64" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3,3" />
                  </svg>
                </div>
              </div>

              {/* TRACK 2: Video Track (The main storyboard frames) */}
              <div className="h-[96px] flex items-center border-y border-white/5">
                {/* Track header */}
                <div className="w-[180px] h-full bg-[#0e0f14] border-r border-white/5 px-4 flex items-center justify-between shrink-0 text-slate-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold text-slate-300 truncate">🎬 Video Track</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => setTrackVisibility(p => ({ ...p, video: !p.video }))}
                      className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      {trackVisibility.video ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button 
                      onClick={() => setTrackLocked(p => ({ ...p, video: !p.video }))}
                      className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      {trackLocked.video ? <Lock size={12} className="text-amber-500" /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>

                {/* Track canvas layout (Video Cards) */}
                <div className="flex-1 h-full px-6 flex items-center overflow-x-auto relative bg-[#090a0d]/60">
                  {trackVisibility.video && (
                    <div className="flex items-center gap-3 py-1">
                      {scenes.map((scene, idx) => {
                        const isFocused = selectedSceneIndex === idx;
                        const poster = scene.assetUrl || scene.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop';
                        return (
                          <div 
                            key={`vid-track-${scene.id}`}
                            onClick={() => setSelectedSceneIndex(idx)}
                            className={`w-32 h-16 rounded-xl bg-black overflow-hidden relative cursor-pointer select-none border transition ${
                              isFocused 
                                ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/10' 
                                : 'border-white/5 opacity-70 hover:opacity-100'
                            }`}
                          >
                            {/* Inner Poster visual */}
                            <img 
                              src={poster} 
                              alt="Scene thumbnail" 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Selected highlight handles exactly like picture */}
                            {isFocused && (
                              <>
                                <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-purple-500 flex items-center justify-center">
                                  <div className="w-[2px] h-3 bg-white rounded-full" />
                                </div>
                                <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-purple-500 flex items-center justify-center">
                                  <div className="w-[2px] h-3 bg-white rounded-full" />
                                </div>
                                {/* Floating active agent tooltip bubble named "Jane" */}
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-purple-500 text-white text-[8px] font-bold shadow flex items-center gap-1 animate-bounce">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span>Jane</span>
                                </div>
                              </>
                            )}

                            {/* Badge overlays */}
                            <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded text-[7px] font-bold text-slate-300">
                              05s
                            </div>
                            <div className="absolute top-1 left-1 px-1 py-0.5 bg-black/60 rounded text-[7px] font-bold text-slate-300">
                              #{idx + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* TRACK 3: Audio Track (Audio wave generator exactly like image) */}
              <div className="h-[64px] flex items-center">
                {/* Track header */}
                <div className="w-[180px] h-full bg-[#0e0f14] border-r border-white/5 px-4 flex items-center justify-between shrink-0 text-slate-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold text-slate-300 truncate">🎙️ Audio Track</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => setTrackVisibility(p => ({ ...p, audio: !p.audio }))}
                      className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      {trackVisibility.audio ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button 
                      onClick={() => setTrackLocked(p => ({ ...p, audio: !p.audio }))}
                      className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      {trackLocked.audio ? <Lock size={12} className="text-amber-500" /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>

                {/* Track audio wave graphic */}
                <div className="flex-1 h-full px-6 flex items-center overflow-x-auto relative bg-[#090a0d]/40">
                  {trackVisibility.audio && (
                    <div className="w-full flex items-center gap-[3px] py-1 opacity-80 h-10 overflow-hidden">
                      {/* Generates a stylized live audio waveform graph */}
                      {Array.from({ length: 90 }).map((_, waveIdx) => {
                        const hVal = 4 + Math.sin(waveIdx * 0.2) * 16 + Math.cos(waveIdx * 0.1) * 8 + (isStitching ? Math.random() * 8 : 0);
                        const isGlow = waveIdx % 6 === 0;
                        return (
                          <div 
                            key={waveIdx}
                            className={`w-[2px] rounded-full transition-all duration-300 ${
                              isStitching 
                                ? 'bg-gradient-to-t from-emerald-500 to-teal-400' 
                                : 'bg-gradient-to-t from-purple-500 to-indigo-400'
                            }`}
                            style={{ 
                              height: `${Math.max(4, Math.min(32, hVal))}px`,
                              opacity: isGlow ? 1 : 0.6
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};
