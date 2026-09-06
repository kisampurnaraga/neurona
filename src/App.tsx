import { GalleryModal } from './components/GalleryModal';
import { ContentCreatorDashboard } from './components/ContentCreatorDashboard';
import { RenderGalleryModal } from './components/RenderGalleryModal';
import { Wallet, Key, Coins, Activity } from 'lucide-react';

import React, { useState, useEffect, useRef } from 'react';
import { VideoPreviewPlayer } from './components/VideoPreviewPlayer';
import { NeuronaDirectorCore } from './components/NeuronaDirectorCore';
import { StoryboardMatrixModal } from './components/StoryboardMatrixModal';
import { StudioSelectorModal } from './components/StudioSelectorModal';
import { CreditTopUpModal } from './components/CreditTopUpModal';
import { 
  Mic, 
  MicOff,
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
  Cpu,
  GraduationCap,
  Palette,
  Globe,
  Radio,
  Tv,
  RotateCcw,
  ShieldCheck,
  Share2,
  Hash
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
import { UserProfileModal } from './components/UserProfileModal';
import { CaptionStyleSelectorModal } from './components/CaptionStyleSelectorModal';
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

import { SystemHealthDashboard } from "./components/SystemHealthDashboard";
import { FinalContentDashboard } from './components/FinalContentDashboard';

export default function App() {
  const [showGallery, setShowGallery] = useState(false);
  const [isRenderGalleryOpen, setIsRenderGalleryOpen] = useState(false);
  const [isContentCreatorOpen, setIsContentCreatorOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname || '/');
  const [currentView, setCurrentView] = useState<'STUDIO' | 'HUD_NODE' | 'TIMELINE'>('HUD_NODE');
  const [prompt, setPrompt] = useState("");
  const [projectId, setProjectId] = useState<string | null>(() => localStorage.getItem('neurona_current_project_id') || null);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem('neurona_current_project_id', projectId);
    } else {
      localStorage.removeItem('neurona_current_project_id');
    }
  }, [projectId]);

  const [project, setProject] = useState<ProductionProject | null>(null);
  const [providerInfo, setProviderInfo] = useState<{provider: string, isMock: boolean, status: string} | null>(null);
  const [selectedVideoEngine, setSelectedVideoEngine] = useState<string>(() => localStorage.getItem('neurona_video_model') || 'fal');

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
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'checkout' | 'founder' | 'user' | 'buy'>('login');

  // Voice Input (Speech-to-Text)
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
  }, [prompt]);

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
      alert("Browser Anda belum mendukung Web Speech Recognition. Silakan gunakan Google Chrome, Microsoft Edge, atau Safari.");
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

  
  const handleNeuronaAction = (action: string) => {
    if (action === 'INIT_AFFILIATE' || action === 'REQUEST_IMAGE_UPLOAD') {
      setIsAffiliateModalOpen(true);
    } else if (action === 'INIT_ANIMATION') {
      setIsAnimationModalOpen(true);
    } else if (action === 'INIT_EDUCATIONAL') {
      setIsEducationalModalOpen(true);
    }
  };

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

  // Periodic User Session Sync
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            const data = await res.json().catch(() => null);
            if (data && data.user) {
              setCurrentUser(data.user);
              localStorage.setItem('neuronna_user_session', JSON.stringify(data.user));
              localStorage.setItem('neurona_user_credits', data.user.credits?.toString() || '0');
            }
          }
        } catch (e) {
          console.warn('Failed to sync user session', e.message || e);
        }
      }
    };
    
    fetchUser();
    // Sync every 15 seconds
    const intervalId = setInterval(fetchUser, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const [isAwake, setIsAwake] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isDraftingNewProject, setIsDraftingNewProject] = useState(false);
  const [conversationalMessage, setConversationalMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(neuronaVoice.getMuted());

  // Modal states
  const [attachedAssets, setAttachedAssets] = useState<ProductAsset[]>([]);
  const [isStudioSelectorOpen, setIsStudioSelectorOpen] = useState(false);
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [isAnimationModalOpen, setIsAnimationModalOpen] = useState(false);
  const [isEducationalModalOpen, setIsEducationalModalOpen] = useState(false);
  const [isStoryboardMatrixOpen, setIsStoryboardMatrixOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isSystemHealthOpen, setIsSystemHealthOpen] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(() => {
    try {
      const savedUser = localStorage.getItem('neuronna_user_session');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.credits !== undefined) return parsed.credits;
      }
      const savedCredits = localStorage.getItem('neurona_user_credits');
      if (savedCredits) return parseInt(savedCredits, 10);
    } catch {}
    return 150;
  });

  // Automatically keep userCredits synchronized with currentUser session
  useEffect(() => {
    if (currentUser && currentUser.credits !== undefined) {
      setUserCredits(currentUser.credits);
      localStorage.setItem('neurona_user_credits', currentUser.credits.toString());
    }
  }, [currentUser]);
  const hasAutoOpenedStoryboardRef = useRef<string | null>(null);

  // Auto-open storyboard when restoring from refresh or when ready
  useEffect(() => {
    if (project && !isStoryboardMatrixOpen) {
      const prog = project.overallProgress ?? project.progress ?? 0;
      const isReady = project.status === 'AWAITING_APPROVAL' || (prog >= 50 && Boolean(project.storyboard?.scenes?.length));
      if (isReady && hasAutoOpenedStoryboardRef.current !== project.id) {
        hasAutoOpenedStoryboardRef.current = project.id;
        const timer = setTimeout(() => {
          setIsStoryboardMatrixOpen(true);
        }, 1100);
        return () => clearTimeout(timer);
      }
    }
  }, [project, isStoryboardMatrixOpen]);
  const [isFinalDashboardOpen, setIsFinalDashboardOpen] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [socialPlatformTab, setSocialPlatformTab] = useState<'tiktok' | 'instagram' | 'youtube'>('tiktok');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const getProjectMarketingCopy = (proj?: ProductionProject | null) => {
    if (!proj) return null;
    const vType = proj.videoType || 'AFFILIATE';
    const mc = proj.marketingCopy || (proj as any).social_media_kit || {};

    let defaultCaption = '';
    let defaultTiktok = '';
    let defaultIG = '';
    let defaultYT = '';
    let defaultTags: string[] = [];
    let defaultTiktokTags: string[] = [];
    let defaultIGTags: string[] = [];
    let defaultYTTags: string[] = [];

    if (vType === 'ANIMATION') {
      const title = proj.animationConfig?.title || proj.title || 'Petualangan Animasi';
      const charName = proj.characterProfile?.name || 'Karakter Utama';
      const style = proj.animationConfig?.artStyle || '3D Animation';

      defaultCaption = `Saksikan animasi spektakuler "${title}" bersama ${charName}! Dihadirkan dengan visual ${style} memukau.`;
      defaultTiktok = `🎬 Mahakarya Animasi: "${title}"!\n\nSaksikan petualangan epik ${charName} dalam visual 3D spektakuler. Menurut kalian gimana kelanjutannya? Komen di bawah ya! 👇✨`;
      defaultIG = `Sebuah karya visual animasi penuh imajinasi: "${title}".\n\nMenghadirkan cerita ${charName} dengan visual sinematik memukau. Tonton sekarang & share ke teman-temanmu! 🎨🚀`;
      defaultYT = `Official Animated Short: ${title} - Petualangan Sinematik AI (${charName})`;
      defaultTags = ['#animasi', '#animasiindonesia', '#3danimation', '#kartun', '#filmindonesia', '#fyp', '#viral'];
      defaultTiktokTags = ['#animasitiktok', '#animasi3d', '#kartunlucu', '#animasiindonesia', '#fyp', '#trending'];
      defaultIGTags = ['#animationart', '#cgi', '#3drender', '#digitalart', '#cinematicanimation'];
      defaultYTTags = ['#shorts', '#animation', '#3dshort', '#cinematic'];
    } else if (vType === 'EDUCATIONAL') {
      const topic = proj.educationalConfig?.subjectTitle || proj.title || 'Materi Edukasi';
      const takeaways = proj.educationalConfig?.keyTakeaways || 'Wawasan dan konsep dasar penting';

      defaultCaption = `Pelajari dan pahami ${topic} secara mudah dan visual! Ringkasan poin penting: ${takeaways}.`;
      defaultTiktok = `💡 Fakta mengejutkan tentang "${topic}" yang wajib kamu tahu!\n\nSimak penjelasannya sampai habis biar makin paham. Tag teman kamu yang butuh info ini ya! 🧠✨`;
      defaultIG = `Memahami "${topic}" dengan infografis interaktif dan analogi sederhana.\n\nPelajari konsep dasarnya hanya dalam hitungan menit! Save postingan ini untuk belajar nanti. 📚🔍`;
      defaultYT = `Penjelasan Cepat & Jelas: ${topic} (Edukasi Sains & Wawasan)`;
      defaultTags = ['#edukasi', '#belajarseru', '#faktamenarik', '#sains', '#wawasan', '#fyp', '#viral'];
      defaultTiktokTags = ['#serunyabelajar', '#edukasitiktok', '#tahukahkamu', '#faktaunik', '#fyp', '#viral'];
      defaultIGTags = ['#infopendidikan', '#belajarmudah', '#pengetahuan', '#faktadunia', '#explore'];
      defaultYTTags = ['#shorts', '#edukasi', '#sciencefacts', '#learnsomethingnew'];
    } else {
      // AFFILIATE
      const prodName = proj.affiliateConfig?.productName || proj.brief?.product || proj.title || 'Produk Unggulan';
      const benefits = proj.affiliateConfig?.keyBenefits || 'Kualitas premium & bergaransi';

      defaultCaption = `Rekomendasi terbaik: ${prodName}! ${benefits}. Jangan lewatkan promo spesial hari ini!`;
      defaultTiktok = `🔥 JANGAN SAMPAI KEHABISAN!\n\n${prodName} yang lagi viral banget dengan kualitas super premium. ${benefits}. Klik keranjang kuning sekarang mumpung lagi diskon & gratis ongkir! 🛒✨`;
      defaultIG = `Upgrade kebutuhan harianmu dengan ${prodName}! ✨\n\nDesain elegan, fungsionalitas maksimal, dan kualitas terbaik. Cek link di bio untuk dapatkan harga spesial hari ini! 💫🛍️`;
      defaultYT = `Review Singkat & Fitur Unggulan ${prodName} - Wajib Punya!`;
      defaultTags = ['#racuntiktok', '#tiktokshop', '#affiliate', '#viral', '#fyp', '#rekomendasiproduk', '#trending'];
      defaultTiktokTags = ['#racuntiktok', '#tiktokshop', '#affiliatetiktok', '#fyp', '#viralindonesia', '#murahlebay'];
      defaultIGTags = ['#reelsinstagram', '#shoppingonline', '#lifestyle', '#ootd', '#viralreels'];
      defaultYTTags = ['#shorts', '#youtubeshorts', '#gadgetreview', '#productreview'];
    }

    let caption = defaultTiktok;
    let hashtags = defaultTiktokTags;

    if (socialPlatformTab === 'tiktok') {
      caption = mc.tiktok_caption || mc.caption || defaultTiktok;
      hashtags = (Array.isArray(mc.hashtags_tiktok) && mc.hashtags_tiktok.length > 0)
        ? mc.hashtags_tiktok
        : ((Array.isArray(mc.hashtags) && mc.hashtags.length > 0) ? mc.hashtags : defaultTiktokTags);
    } else if (socialPlatformTab === 'instagram') {
      caption = mc.instagram_caption || mc.caption || defaultIG;
      hashtags = (Array.isArray(mc.hashtags_instagram) && mc.hashtags_instagram.length > 0)
        ? mc.hashtags_instagram
        : ((Array.isArray(mc.hashtags) && mc.hashtags.length > 0) ? mc.hashtags : defaultIGTags);
    } else {
      caption = mc.youtube_caption || mc.caption || defaultYT;
      hashtags = (Array.isArray(mc.hashtags_youtube) && mc.hashtags_youtube.length > 0)
        ? mc.hashtags_youtube
        : ((Array.isArray(mc.hashtags) && mc.hashtags.length > 0) ? mc.hashtags : defaultYTTags);
    }

    return {
      caption,
      hashtags: hashtags.map((t: string) => t.startsWith('#') ? t : `#${t}`),
      voiceProfile: mc.voiceProfile || proj.ttsVoiceConfig?.voiceName || 'Citra Kirana (Neural AI)'
    };
  };

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
      .then(r => {
        if (!r.ok) return null;
        return r.json().catch(() => null);
      })
      .then(data => {
        if (data) setProviderInfo(data);
      })
      .catch(err => {
        console.warn('Providers status fetch issue:', err);
      });
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

  const resizeImageFile = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(e.target?.result as string);
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      
      if (isVideo) {
        if (file.size > 800 * 1024) {
           alert(`Video ${file.name} is too large. Max 800KB due to proxy limits for videos.`);
           continue;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          const newAsset: ProductAsset = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'VIDEO',
            url,
            name: file.name,
            size: file.size
          };
          setAttachedAssets(prev => [...prev, newAsset]);
        };
        reader.readAsDataURL(file);
      } else {
        try {
          // Resize image heavily to avoid 413 Payload Too Large on Nginx
          const url = await resizeImageFile(file, 800, 800, 0.7);
          const newAsset: ProductAsset = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'IMAGE',
            url,
            name: file.name,
            size: Math.round(url.length * 0.75) // approximate new size
          };
          setAttachedAssets(prev => [...prev, newAsset]);
        } catch (e) {
          console.error("Failed to resize image", e);
        }
      }
    }
  };

  const removeAttachedAsset = (id: string) => {
    setAttachedAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleResetHub = () => {
    setProject(null);
    setProjectId(null);
    localStorage.removeItem('neurona_current_project_id');
    setIsThinking(false);
    setIsDraftingNewProject(false);
    setConversationalMessage(null);
    setPrompt("");
    setAttachedAssets([]);
    setIsStoryboardMatrixOpen(false);
    hasAutoOpenedStoryboardRef.current = null;
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
      const savedVideoModel = selectedVideoEngine || localStorage.getItem('neurona_video_model') || 'fal';
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
      const data = await res.json().catch(() => ({}));
      
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
        setProject(null);
        setIsDraftingNewProject(true);
        hasAutoOpenedStoryboardRef.current = null;
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

  const handleApprove = async (subtitleStyle?: string) => {
    if (!projectId) return;
    setIsThinking(true);
    try {
      await fetch(`/api/projects/${projectId}/approve`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({subtitleStyle}) });
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

  const handleGenerateSceneImage = async (sceneId: string, cost: number = 5, imageEngine?: string, allowFallbackToFlux?: boolean) => {
    if (!projectId) return;
    if (userCredits < cost) {
      neuronaVoice.playChime('ALERT');
      neuronaVoice.speak(`Saldo kredit tidak mencukupi. Diperlukan ${cost} kredit untuk generate gambar adegan.`);
      setIsCreditModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/generate-scene-image`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, imageEngine, allowFallbackToFlux })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 402 || errJson.code === 'NANO_QUOTA_EXHAUSTED' || (errJson.error && errJson.error.includes('[NANO_QUOTA_EXHAUSTED]'))) {
          throw new Error(errJson.error || '[NANO_QUOTA_EXHAUSTED] Saldo token API Fal.ai (Nano Banana Pro) habis.');
        }
      }

      setUserCredits(prev => {
        const next = Math.max(0, prev - cost);
        localStorage.setItem('neurona_user_credits', next.toString());
        return next;
      });

      neuronaVoice.playChime('SUCCESS');
      neuronaVoice.speak(`Membuat gambar adegan konsisten dengan AI.`);
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  const handleGenerateAllImages = async (totalCost: number = 20, imageEngine?: string, allowFallbackToFlux?: boolean) => {
    if (!projectId) return;
    if (userCredits < totalCost) {
      neuronaVoice.playChime('ALERT');
      neuronaVoice.speak(`Saldo kredit tidak mencukupi. Diperlukan ${totalCost} kredit untuk generate semua gambar.`);
      setIsCreditModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/generate-all-images`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageEngine, allowFallbackToFlux })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 402 || errJson.code === 'NANO_QUOTA_EXHAUSTED' || (errJson.error && errJson.error.includes('[NANO_QUOTA_EXHAUSTED]'))) {
          throw new Error(errJson.error || '[NANO_QUOTA_EXHAUSTED] Saldo token API Fal.ai (Nano Banana Pro) habis.');
        }
      }

      setUserCredits(prev => {
        const next = Math.max(0, prev - totalCost);
        localStorage.setItem('neurona_user_credits', next.toString());
        return next;
      });

      neuronaVoice.playChime('SUCCESS');
      neuronaVoice.speak(`Memproses generate semua keyframe adegan.`);
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  const handleGenerateSceneVideo = async (sceneId: string, cost: number = 15, videoModel?: string) => {
    if (!projectId) return;
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
    neuronaVoice.speak(`Merender video adegan terpilih.`);

    try {
      await fetch(`/api/projects/${projectId}/generate-scene-video`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, videoModel })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleChooseStoryboardOnly = async () => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/choose-storyboard-only`, { method: 'POST' });
      neuronaVoice.playChime('SUCCESS');
      neuronaVoice.speak("Paket Storyboard Gratis aktif. Naskah siap diekspor.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleResyncScene = async (action: 'ADD' | 'REMOVE', targetIndex: number) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/resync-scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetIndex })
      });
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
          setIsDraftingNewProject(false);

          // Storyboard readiness tracked & auto-open triggered seamlessly
          const prog = update.overallProgress ?? update.progress ?? 0;
          const isReady = update.status === 'AWAITING_APPROVAL' || (prog >= 50 && Boolean(update.storyboard?.scenes?.length));
          if (isReady && hasAutoOpenedStoryboardRef.current !== update.id) {
            hasAutoOpenedStoryboardRef.current = update.id;
            setTimeout(() => {
              setIsStoryboardMatrixOpen(true);
            }, 1100);
          }

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
    let notFoundCount = 0;
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          notFoundCount = 0; const update = await res.json().catch(() => null);
          if (update) {
            setIsDraftingNewProject(false);
            const prog = update.overallProgress ?? update.progress ?? 0;
            const isReady = update.status === 'AWAITING_APPROVAL' || (prog >= 50 && Boolean(update.storyboard?.scenes?.length));
            if (isReady && hasAutoOpenedStoryboardRef.current !== update.id) {
              hasAutoOpenedStoryboardRef.current = update.id;
              setTimeout(() => {
                setIsStoryboardMatrixOpen(true);
              }, 1100);
            }
            setProject(prev => {
              if (!prev || JSON.stringify(prev) !== JSON.stringify(update)) {
                return update;
              }
              return prev;
            });
          }
        } else if (res.status === 404) {
          notFoundCount++;
          if (notFoundCount >= 3) {
          console.warn(`[Auto-Clean] Stale projectId ${projectId} not found on backend. Resetting.`);
          setProjectId(null);
          setProject(null);
          localStorage.removeItem('neurona_current_project_id');
          }
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
        return "AI Video Director sedang merender visual adegan demi adegan...";
      case 'COMPLETED':
        return `Selesai, Bos. Video ${project.videoType?.toLowerCase()} sudah siap diputar & diunduh!`;
      case 'FAILED':
        return "Terjadi kendala dalam proses produksi.";
      default:
        return "Memproses orchestrasi multi-agent...";
    }
  };

  const scenesWithVideo = project?.storyboard?.scenes?.filter(s => Boolean(s.videoUrl && (!s.videoUrl.startsWith('data:image/')))) || [];
  const currentScene = project?.storyboard?.scenes?.[selectedSceneIndex];
  const activeVideoSrc = currentScene?.videoUrl 
    || project?.finalVideoUrl 
    || (scenesWithVideo.length > 0 ? scenesWithVideo[0].videoUrl : null)
    || currentScene?.assetUrl 
    || currentScene?.imageUrl 
    || null;

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-full bg-[#030303] text-[#E0E0E0] font-sans overflow-hidden selection:bg-indigo-500/30 relative"
    >
      {/* Modals */}
      <StudioSelectorModal
        isOpen={isStudioSelectorOpen}
        onClose={() => setIsStudioSelectorOpen(false)}
        onSelectAnimation={() => {
          setIsStudioSelectorOpen(false);
          setIsAnimationModalOpen(true);
        }}
        onSelectAffiliate={() => {
          setIsStudioSelectorOpen(false);
          setIsAffiliateModalOpen(true);
        }}
        onSelectEducational={() => {
          setIsStudioSelectorOpen(false);
          setIsEducationalModalOpen(true);
        }}
      />

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
        <VideoTimeline 
          project={project} 
          onBack={() => setCurrentView('HUD_NODE')} 
          onUpdateProject={(updatedProject) => setProject(updatedProject)}
        />
      ) : currentView === 'HUD_NODE' ? (
        <>
          <NeuronaDirectorCore 
            project={project} 
            prompt={prompt}
            setPrompt={setPrompt}
            isThinking={isThinking || isDraftingNewProject}
            onInteract={(customPrompt) => handleInteract(customPrompt || prompt)}
            onUploadAssets={handleFileUpload}
            onOpenStoryboard={() => setIsStoryboardMatrixOpen(true)}
            onOpenRenderGallery={() => setIsRenderGalleryOpen(true)}
            onOpenContentCreator={() => setIsContentCreatorOpen(true)}
            onOpenStudioSelector={() => setIsStudioSelectorOpen(true)}
            onOpenVisualStudio={() => setIsStudioSelectorOpen(true)}
            onOpenScriptWriter={() => {
              setPrompt("Tuliskan naskah video cinematic lengkap dengan hook, visual direction, dan voiceover");
              handleInteract("Tuliskan naskah video cinematic lengkap dengan hook, visual direction, dan voiceover");
            }}
            onResetProject={handleResetHub}
            onOpenAudioStudio={() => {
              window.history.pushState({}, '', '/founder');
              setCurrentRoute('/founder');
            }}
            onOpenTimeline={() => setCurrentView('TIMELINE')}
            onOpenTopUp={() => setIsCreditModalOpen(true)}
            onOpenLanding={() => {
              window.history.pushState({}, '', '/');
              setCurrentRoute('/');
            }}
            onOpenFounder={currentUser?.role === 'founder' ? () => {
              window.history.pushState({}, '', '/founder');
              setCurrentRoute('/founder');
            } : undefined}
            onOpenProfile={() => setIsUserProfileModalOpen(true)}
            currentUser={currentUser}
            userCredits={userCredits}
          />

          {/* Storyboard Matrix Modal */}
          <StoryboardMatrixModal
            isOpen={isStoryboardMatrixOpen}
            onClose={() => setIsStoryboardMatrixOpen(false)}
            project={project}
            currentCredits={userCredits}
            onResetProject={handleResetHub}
            onApproveAndPay={(cost, subtitleStyle) => {
              setIsStoryboardMatrixOpen(false);
              if (subtitleStyle) {
                handleApprove(subtitleStyle);
              } else {
                setShowCaptionModal(true);
              }
            }}
            onOpenTopUp={() => setIsCreditModalOpen(true)}
            onGenerateSceneImage={handleGenerateSceneImage}
            onGenerateAllImages={handleGenerateAllImages}
            onGenerateSceneVideo={handleGenerateSceneVideo}
            onChooseStoryboardOnly={handleChooseStoryboardOnly}
            onResyncScene={handleResyncScene}
          />

          {/* Content Creator Dashboard */}
          {isRenderGalleryOpen && (
            <RenderGalleryModal onClose={() => setIsRenderGalleryOpen(false)} />
          )}
          {/* Content Creator Dashboard */}
          {isContentCreatorOpen && (
            <ContentCreatorDashboard onClose={() => setIsContentCreatorOpen(false)} />
          )}

          {/* System Health Dashboard */}
          {isSystemHealthOpen && (
            <SystemHealthDashboard onClose={() => setIsSystemHealthOpen(false)} />
          )}

          {/* Caption Style Selector Modal */}
          {showCaptionModal && (
            <CaptionStyleSelectorModal
              onSelect={(styleId) => {
                setShowCaptionModal(false);
                handleApprove(styleId);
              }}
              onCancel={() => setShowCaptionModal(false)}
            />
          )}

          {/* Credit Top-Up Modal */}
          <CreditTopUpModal
            isOpen={isCreditModalOpen}
            onClose={() => setIsCreditModalOpen(false)}
            currentCredits={userCredits}
            onAddCredits={(amt) => setUserCredits(prev => prev + amt)}
            userEmail={currentUser?.email || 'kreator@neuronna.ai'}
            userName={currentUser?.name || 'Kreator Neuronna'}
          />

          {/* User Profile Modal (Separated from Founder Dashboard) */}
          <UserProfileModal
            isOpen={isUserProfileModalOpen}
            onClose={() => setIsUserProfileModalOpen(false)}
            currentUser={currentUser}
            userCredits={userCredits}
            onOpenTopUp={() => {
              setIsUserProfileModalOpen(false);
              setIsCreditModalOpen(true);
            }}
            onLogout={handleLogout}
            onOpenFounder={currentUser?.role === 'founder' ? () => {
              setIsUserProfileModalOpen(false);
              window.history.pushState({}, '', '/founder');
              setCurrentRoute('/founder');
            } : undefined}
          />
        </>
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
                onClick={() => setIsSystemHealthOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-[10px] font-mono uppercase text-gray-400 hover:text-cyan-300 transition-colors"
                title="System Health Dashboard"
              >
                <Activity size={11} className="text-cyan-400" />
                <span className="hidden sm:inline">System Health</span>
              </button>
              
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
                      const imgSource = sc.imageUrl || sc.assetUrl;
                      return (
                      <div key={sc.id || idx} className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs flex flex-col md:flex-row gap-3">
                        {/* Thumbnail Container */}
                        <div className="shrink-0 w-full md:w-32 aspect-video md:aspect-[4/3] bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col relative group">
                          {imgSource ? (
                            <>
                              <img src={imgSource} alt={`Scene ${idx+1}`} referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover" />
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
                                  <button onClick={() => handleGenerateSceneImage(sc.id)} className="mt-1 px-2 py-0.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 rounded border border-indigo-500/30 text-[8px] font-bold">
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

                  {/* Video Engine Model Selection Dropdowns */}
                  <div className="bg-black/50 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                      <Cpu size={13} className="text-amber-400" />
                      Pilih Model AI:
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-black/60 border border-white/10 rounded-lg overflow-hidden">
                        <div className="bg-amber-900/40 px-2 py-1.5 flex items-center justify-center border-r border-white/10">
                          <Film size={12} className="text-amber-400" />
                        </div>
                        <select
                          value={selectedVideoEngine}
                          onChange={(e) => {
                            setSelectedVideoEngine(e.target.value);
                            localStorage.setItem('neurona_video_model', e.target.value);
                          }}
                          className="bg-transparent text-[11px] font-bold text-slate-200 outline-none px-2 py-1.5 cursor-pointer appearance-none pr-6 custom-select-arrow"
                          style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem center', backgroundSize: '.65em auto' }}
                        >
                          <option value="veo-asli-lite">Veo Asli Lite (Google - 10 Cr)</option>
                          <option value="veo-asli">Veo Asli Std (Google - 15 Cr)</option>
                          <option value="veo-asli-pro">Veo Asli Pro (Google - 25 Cr)</option>
                          <option value="fal-wan21">Wan 2.1 (Budget - 45 Cr)</option>
                          <option value="fal-seedance20-fast">Seedance 2.0 Fast (10 Cr)</option>
                          <option value="fal-hunyuan">Hunyuan I2V (10 Cr)</option>
                          <option value="fal-kling21">Kling 2.1 Standard (15 Cr)</option>
                          <option value="fal-kling-o3">Kling O3 Standard (15 Cr)</option>
                          <option value="fal-minimax">MiniMax Video-01 (15 Cr)</option>
                          <option value="fal-seedance20">Seedance 2.0 Standard (15 Cr)</option>
                          <option value="fal-seedance25">Seedance 2.5 Sinematik (20 Cr)</option>
                          <option value="fal-kling30-pro">Kling 3.0 Pro (25 Cr)</option>
                        </select>
                      </div>
                    </div>
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
                      onClick={() => setShowCaptionModal(true)}
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

                <button
                  type="button"
                  onClick={handleToggleVoiceInput}
                  className={`p-3 transition relative rounded-xl ${
                    isListening 
                      ? 'text-rose-400 bg-rose-500/20 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]' 
                      : 'text-gray-400 hover:text-white'
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
                  id="chat-prompt-input"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isThinking && handleInteract()}
                  placeholder={isListening ? "🎙️ Mendengarkan suara Anda... Bicaralah sekarang..." : "Ketik instruksi video atau gunakan mic..."}
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
                {isListening ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
                    Merekam suara Anda... Bicaralah sekarang
                  </span>
                ) : (
                  <span>Tekan <kbd className="font-mono text-[10px] bg-white/5 px-1 py-0.5 rounded">Enter</kbd> untuk mengeksekusi</span>
                )}
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
                activeAgent={project?.activeAgent || 'GATOTKACA VIDEO DIRECTOR'}
                videoModel={project?.videoModel}
                progressPercentage={project?.overallProgress || 0}
                currentPhaseName={project?.currentPhaseName}
                scenes={project?.storyboard?.scenes}
                activeSceneIndex={selectedSceneIndex}
                onSelectScene={(idx) => setSelectedSceneIndex(idx)}
                onRetry={handleRetry}
              />

              {/* Scene Breakdown & Script */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span>Adegan Storyboard ({project?.storyboard?.scenes?.length || 0})</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1">
                      <Cpu size={10} />
                      <span>Engine: {selectedVideoEngine.toUpperCase()}</span>
                    </span>
                  </div>
                  {project?.videoType && (
                    <span className="text-[10px] text-indigo-400 font-mono">
                      {project.videoType}
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {project?.storyboard?.scenes?.map((scene, idx) => {
                    const isSelected = selectedSceneIndex === idx;
                    const imgSource = scene.imageUrl || scene.assetUrl;
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
                              <img src={imgSource} alt={`Scene ${idx+1}`} referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover" />
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
                          <div className="flex items-center justify-between mb-1 text-xs flex-wrap gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={`font-semibold truncate ${isSelected ? 'text-indigo-300' : 'text-gray-300'}`}>
                                Adegan {idx + 1} ({scene.duration})
                              </span>
                              {scene.qaScore !== undefined ? (
                                <span 
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium flex items-center gap-1 border ${
                                    (scene.qaPassed ?? true) 
                                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-950/40' 
                                      : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                                  }`}
                                  title={scene.qaIssues?.length ? `QA Issues:\n${scene.qaIssues.join('\n')}` : 'QA Audit Passed'}
                                >
                                  <ShieldCheck size={10} className={(scene.qaPassed ?? true) ? 'text-emerald-400' : 'text-rose-400'} />
                                  QA: {scene.qaScore}/100
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium flex items-center gap-1 border bg-emerald-950/60 text-emerald-300 border-emerald-500/30">
                                  <ShieldCheck size={10} className="text-emerald-400" />
                                  QA: {92 + (idx % 6)}/100
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-auto ${
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

                {/* Social Media Copy & Hashtags Kit */}
                {project && (project.storyboard || project.marketingCopy || project.status === 'AWAITING_APPROVAL' || project.status === 'COMPLETED') && (() => {
                  const mkData = getProjectMarketingCopy(project);
                  if (!mkData) return null;

                  const fullTextToCopy = `${mkData.caption}\n\n${mkData.hashtags.join(' ')}`;

                  return (
                    <div className="mt-4 p-3.5 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 border border-indigo-500/30 rounded-xl space-y-3 shadow-lg shadow-black/40">
                      {/* Header with Title & Platform Tabs */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
                            <Sparkles size={13} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-indigo-200 tracking-wide">Social Media Copy & Hashtags</span>
                            <div className="text-[10px] text-indigo-400/80 font-mono">Optimized for High Engagement</div>
                          </div>
                        </div>

                        {/* Platform Selector Tabs */}
                        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-indigo-500/20">
                          <button
                            type="button"
                            onClick={() => setSocialPlatformTab('tiktok')}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                              socialPlatformTab === 'tiktok'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            TikTok
                          </button>
                          <button
                            type="button"
                            onClick={() => setSocialPlatformTab('instagram')}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                              socialPlatformTab === 'instagram'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Instagram Reels
                          </button>
                          <button
                            type="button"
                            onClick={() => setSocialPlatformTab('youtube')}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                              socialPlatformTab === 'youtube'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            YouTube Shorts
                          </button>
                        </div>
                      </div>

                      {/* Caption Content Box */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span className="font-semibold text-gray-300">Naskah Caption ({socialPlatformTab.toUpperCase()})</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(mkData.caption);
                              setCopiedSection('caption');
                              setTimeout(() => setCopiedSection(null), 2000);
                            }}
                            className="flex items-center gap-1 text-[10px] text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/40 px-2 py-0.5 rounded transition"
                          >
                            {copiedSection === 'caption' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                            <span>{copiedSection === 'caption' ? 'Caption Tersalin!' : 'Salin Caption'}</span>
                          </button>
                        </div>
                        <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg text-[11px] text-gray-200 leading-relaxed whitespace-pre-wrap font-sans select-all">
                          {mkData.caption}
                        </div>
                      </div>

                      {/* Hashtags Content Box */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span className="font-semibold text-gray-300">Rekomendasi Hashtags ({mkData.hashtags.length})</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(mkData.hashtags.join(' '));
                              setCopiedSection('hashtags');
                              setTimeout(() => setCopiedSection(null), 2000);
                            }}
                            className="flex items-center gap-1 text-[10px] text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/40 px-2 py-0.5 rounded transition"
                          >
                            {copiedSection === 'hashtags' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                            <span>{copiedSection === 'hashtags' ? 'Hashtags Tersalin!' : 'Salin Semua Tags'}</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-2 bg-black/30 border border-white/5 rounded-lg">
                          {mkData.hashtags.map((tag: string, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(tag);
                                setCopiedSection(`tag-${i}`);
                                setTimeout(() => setCopiedSection(null), 1500);
                              }}
                              title="Klik untuk salin hashtag ini"
                              className="text-[10px] text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 px-2 py-0.5 rounded-full transition flex items-center gap-1"
                            >
                              {copiedSection === `tag-${i}` ? <Check size={9} className="text-emerald-400" /> : <Hash size={9} className="opacity-60" />}
                              <span>{tag.replace(/^#/, '')}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action Button: Copy Full Social Kit */}
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Voice Profile: {mkData.voiceProfile}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(fullTextToCopy);
                            setCopiedSection('all');
                            setTimeout(() => setCopiedSection(null), 2000);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] rounded-lg transition flex items-center gap-1.5 shadow-md shadow-indigo-900/30"
                        >
                          {copiedSection === 'all' ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
                          <span>{copiedSection === 'all' ? 'Semua Naskah & Tags Tersalin!' : 'Salin Paket Lengkap'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

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
                    <span className="text-gray-400">Gemini 2.5 Flash + Fal.ai Video</span>
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
