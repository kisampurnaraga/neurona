import React, { useState } from 'react';
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
  ArrowRight
, Plus } from 'lucide-react';
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

export type ImageModelId = 'chatgpt-image-2' | 'gemini-imagen-3' | 'flux-diffusion';

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
    id: 'chatgpt-image-2',
    name: 'ChatGPT Image 2 (DALL-E 3)',
    shortName: 'ChatGPT Image 2',
    costPerImage: 5,
    badge: '5 Kredit',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: 'Kualitas komersial tertinggi & detail tekstur presisi'
  },
  {
    id: 'gemini-imagen-3',
    name: 'Google Imagen 3 (Gemini)',
    shortName: 'Gemini Imagen 3',
    costPerImage: 3,
    badge: '3 Kredit',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    desc: 'Ultra cepat, fotorealistis & pencahayaan natural'
  },
  {
    id: 'flux-diffusion',
    name: 'Flux AI Ultra HD',
    shortName: 'Flux AI',
    costPerImage: 2,
    badge: '2 Kredit',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    desc: 'Pilihan hemat, tajam & konsistensi warna stabil'
  }
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

  const allVideosCompleted = project?.scenes?.every(s => s.videoStatus === 'COMPLETED' && s.videoUrl) || false;

  const handleStitchVideos = async () => {
    if (!project || !project.scenes) return;
    setIsStitching(true);
    try {
      const scenesPayload = project.scenes
        .filter(s => s.videoStatus === 'COMPLETED' && s.videoUrl)
        .map(s => ({
          url: s.videoUrl,
          text: s.subtitle || s.voiceOver || s.textOverlay || s.dialogue || ''
        }));

      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, scenes: scenesPayload })
      });
      const data = await res.json();
      if (data.success) {
        setFinalVideoUrl(data.url);
      } else {
        alert('Stitching failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error calling stitch API: ' + e.message);
    } finally {
      setIsStitching(false);
    }
  };


  if (!isOpen || !project) return null;

  const scenes = project.storyboard?.scenes || [];
  const charProfile = project.characterProfile || project.storyboard?.characterProfile;
  
  const currentEngineOption = IMAGE_MODEL_OPTIONS.find(m => m.id === selectedImageEngine) || IMAGE_MODEL_OPTIONS[0];
  const singleImageCost = currentEngineOption.costPerImage;
  const imageCreditsTotal = scenes.length * singleImageCost;
  const videoCreditsTotal = project.storyboard?.totalVideoCredits || (scenes.length * 15) || 60;
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
              {/* Model Choice Pills */}
              <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-[10px]">
                <span className="text-slate-400 px-1.5 font-bold font-mono hidden sm:inline">Pilih Model:</span>
                {IMAGE_MODEL_OPTIONS.map((opt) => {
                  const isSelected = selectedImageEngine === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedImageEngine(opt.id)}
                      className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                        isSelected 
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/40 border border-purple-400/50' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                      }`}
                      title={`${opt.name} (${opt.costPerImage} Kredit/gambar) - ${opt.desc}`}
                    >
                      <span>{opt.shortName}</span>
                      <span className={`px-1 rounded text-[9px] font-mono ${isSelected ? 'bg-black/30 text-purple-200' : 'bg-slate-800 text-slate-400'}`}>
                        {opt.costPerImage}K
                      </span>
                    </button>
                  );
                })}
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
                            <span>Video: {scene.videoStatus === 'FAILED' ? 'GAGAL (COBA LAGI)' : isVideoGenerating ? 'RENDERING...' : (scene.videoStatus || 'PENDING')}</span>
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
                                handleGenerateSingleVideo(scene.id, scene.videoCreditCost || 15);
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
                                  <span>2. Render Video (15 K)</span>
                                </>
                              ) : (
                                <>
                                  <Play size={11} className="opacity-40" />
                                  <span>2. Video (Perlu Gambar)</span>
                                </>
                              )}
                            </button>
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
            
            
            {/* Stitch Button */}
            {allVideosCompleted && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleStitchVideos}
                  disabled={isStitching}
                  className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isStitching ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
                  <span>{isStitching ? 'Menyatukan Video...' : 'Render Final Movie'}</span>
                </button>
                {finalVideoUrl && (
                  <a href={finalVideoUrl} target="_blank" rel="noreferrer" className="w-full px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[11px] text-center transition border border-emerald-500/30">
                    📥 Download Final Movie
                  </a>
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
    </div>
  );
};
