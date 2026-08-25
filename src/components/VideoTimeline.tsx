import React, { useState, useEffect, useRef } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Sparkles, 
  Check, 
  Trash2, 
  Plus, 
  Download, 
  RefreshCw, 
  Sliders, 
  Zap, 
  ArrowLeft,
  Film,
  Maximize2,
  CheckCircle2,
  Clock,
  Layers,
  Edit3,
  X,
  Volume2,
  SkipBack,
  SkipForward,
  Paperclip,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import type { ProductionProject, Scene } from '../shared/types';
import { getProjectAspectRatioClass } from '../utils/aspectRatio';

interface VideoTimelineProps {
  project?: ProductionProject | null;
  onBack?: () => void;
  onUpdateProject?: (project: ProductionProject) => void;
}

interface SortableSceneProps {
  scene: Scene;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

const SortableSceneItem: React.FC<SortableSceneProps> = ({ scene, index, isSelected, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: scene.id || index });

  const durationSec = parseInt(String(scene.duration || '5').replace('s', ''), 10) || 5;
  const assetSource = scene.videoUrl || scene.imageUrl || scene.assetUrl;
  const isVideo = !!scene.videoUrl || (assetSource && (assetSource.includes('.mp4') || assetSource.includes('data:video')));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`h-[200px] w-[180px] shrink-0 rounded-xl border p-3 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden group select-none ${
        isSelected 
          ? 'bg-indigo-950/60 border-indigo-400 shadow-xl shadow-indigo-950/50 ring-2 ring-indigo-500/50' 
          : isDragging 
          ? 'bg-gray-800 border-indigo-500 shadow-2xl' 
          : 'bg-[#121215] border-white/10 hover:border-white/30 hover:bg-[#18181c]'
      }`}
    >
      {/* Top Header */}
      <div className="flex justify-between items-center z-10" {...attributes} {...listeners}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold bg-black/60 px-2 py-0.5 rounded text-gray-300 border border-white/10">
            #{index + 1}
          </span>
          {isVideo ? (
            <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
              <VideoIcon size={9} /> MP4
            </span>
          ) : assetSource ? (
            <span className="text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
              <ImageIcon size={9} /> KEYFRAME
            </span>
          ) : null}
        </div>
        <span className="text-[10px] font-mono font-bold bg-black/70 border border-white/10 text-indigo-300 px-2 py-0.5 rounded">
          {durationSec}s
        </span>
      </div>

      {/* Frame Visual Thumbnail */}
      <div className="my-2 h-[85px] w-full bg-black/80 rounded-lg overflow-hidden relative border border-white/5 group-hover:border-indigo-500/30 transition-colors flex items-center justify-center">
        {assetSource ? (
          isVideo ? (
            <video src={assetSource} className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <img src={assetSource} alt={`Scene ${index+1}`} className="w-full h-full object-cover pointer-events-none" />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-600 gap-1 p-2 text-center">
            <Sparkles size={16} className="text-gray-500 opacity-60" />
            <span className="text-[9px] uppercase font-mono tracking-wider font-semibold">Belum Ada Frame</span>
          </div>
        )}

        {/* Hover drag cue */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-mono text-white font-bold bg-black/50 backdrop-blur-[1px]" {...attributes} {...listeners}>
          <span>Geser / Klik Edit</span>
        </div>
      </div>

      {/* Frame Subtitle & Status */}
      <div className="space-y-1">
        <div className="text-[11px] truncate font-medium text-gray-200">
          {scene.textOverlay || scene.subtitle || scene.visualDirection || `Adegan ${index + 1}`}
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-gray-400">
          <span className={`flex items-center gap-1 ${
            scene.status === 'COMPLETED' ? 'text-emerald-400' :
            scene.status === 'GENERATING' ? 'text-amber-400 animate-pulse' : 'text-gray-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              scene.status === 'COMPLETED' ? 'bg-emerald-400' :
              scene.status === 'GENERATING' ? 'bg-amber-400 animate-ping' : 'bg-gray-500'
            }`}></span>
            {scene.status === 'COMPLETED' ? 'Rendered' : scene.status === 'GENERATING' ? 'Rendering' : 'Draft'}
          </span>
          {scene.imageUrl && !scene.videoUrl && (
            <span className="text-indigo-400 font-bold">Keyframe HD</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function VideoTimeline({ project, onBack, onUpdateProject }: VideoTimelineProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [isStitching, setIsStitching] = useState<boolean>(false);
  const [stitchMessage, setStitchMessage] = useState<string | null>(null);

  // Inspector & Override fields state
  const [editPromptText, setEditPromptText] = useState<string>('');
  const [editTextOverlay, setEditTextOverlay] = useState<string>('');
  const [editVoiceOver, setEditVoiceOver] = useState<string>('');
  const [editDuration, setEditDuration] = useState<string>('5s');
  const [customAssetUrl, setCustomAssetUrl] = useState<string>('');
  const [isGeneratingAiFrame, setIsGeneratingAiFrame] = useState<boolean>(false);

  // Hermes AI Chat
  const [hermesMessage, setHermesMessage] = useState<string>(
    "Selamat datang di Timeline Video Studio! Seluruh frame render dari project otomatis di-ingest ke timeline di bawah. Kamu bisa memotong durasi, mengganti aset frame tanpa re-render ulang seluruh video!"
  );
  const [inputText, setInputText] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ingest scenes from project state automatically
  useEffect(() => {
    if (project?.storyboard?.scenes && project.storyboard.scenes.length > 0) {
      setScenes(project.storyboard.scenes);
    } else {
      // Default sample scenes for instant interactive editing
      setScenes([
        {
          id: 'scene_1',
          duration: '4s',
          textOverlay: 'Diskon 50% Hari Ini Only!',
          subtitle: 'Diskon 50% Hari Ini Only!',
          visualDirection: 'Cinematic product reveal with neon studio lighting',
          voiceOver: 'Awas jangan sampai kehabisan promo terbesar minggu ini!',
          status: 'COMPLETED',
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
          videoUrl: '/api/videos/sample-ocean.mp4'
        },
        {
          id: 'scene_2',
          duration: '6s',
          textOverlay: 'Material Premium & Kualitas Tinggi',
          subtitle: 'Material Premium & Kualitas Tinggi',
          visualDirection: 'Macro shot showing luxury craftsmanship texture',
          voiceOver: 'Dibuat dari bahan pilihan berkualitas tinggi untuk kenyamanan maksimal.',
          status: 'COMPLETED',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
        },
        {
          id: 'scene_3',
          duration: '4s',
          textOverlay: 'Klik Keranjang Kuning Sekarang!',
          subtitle: 'Klik Keranjang Kuning Sekarang!',
          visualDirection: 'Dynamic CTA prompt with glowing yellow shopping badge',
          voiceOver: 'Klik keranjang kuning di kiri bawah sebelum kehabisan!',
          status: 'COMPLETED',
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
        }
      ]);
    }
  }, [project]);

  // Sync selected scene into local editor fields
  const activeScene = scenes[selectedSceneIndex] || scenes[0];

  useEffect(() => {
    if (activeScene) {
      setEditTextOverlay(activeScene.textOverlay || activeScene.subtitle || '');
      setEditVoiceOver(activeScene.voiceOver || '');
      setEditDuration(activeScene.duration || '5s');
      setEditPromptText(activeScene.visualDirection || activeScene.promptTextToImage || '');
      setCustomAssetUrl(activeScene.videoUrl || activeScene.imageUrl || activeScene.assetUrl || '');
    }
  }, [selectedSceneIndex, activeScene]);

  // Handle Drag & Drop reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex((s, idx) => (s.id || idx) === active.id);
      const newIndex = scenes.findIndex((s, idx) => (s.id || idx) === over.id);

      if (oldIndex >= 0 && newIndex >= 0) {
        const newScenes = arrayMove(scenes, oldIndex, newIndex);
        setScenes(newScenes);
        setSelectedSceneIndex(newIndex);

        setHermesMessage(`Oke! Posisi adegan #${oldIndex + 1} digeser ke adegan #${newIndex + 1}. Klik 'Fast Re-Stitch Master' untuk memperbarui video akhir!`);

        // Sync to backend if project exists
        if (project?.id) {
          try {
            const res = await fetch(`/api/projects/${project.id}/reorder-scenes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scenes: newScenes })
            });
            const data = await res.json();
            if (data.project && onUpdateProject) {
              onUpdateProject(data.project);
            }
          } catch (e) {
            console.error('Failed to sync scene reorder:', e);
          }
        }
      }
    }
  };

  // Update scene property locally and on backend
  const updateActiveScene = async (updates: Partial<Scene>) => {
    if (!activeScene) return;

    const updatedScene = { ...activeScene, ...updates };
    const newScenes = [...scenes];
    newScenes[selectedSceneIndex] = updatedScene;
    setScenes(newScenes);

    setHermesMessage(`Frame adegan #${selectedSceneIndex + 1} berhasil diperbarui! Perubahan siap digabungkan tanpa re-render ulang adegan lain.`);

    if (project?.id) {
      try {
        const res = await fetch(`/api/projects/${project.id}/override-scene`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId: activeScene.id || `scene_${selectedSceneIndex + 1}`,
            ...updates
          })
        });
        const data = await res.json();
        if (data.project && onUpdateProject) {
          onUpdateProject(data.project);
        }
      } catch (e) {
        console.error('Failed to override scene:', e);
      }
    }
  };

  // Handle local file upload for frame override
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const isVideoFile = file.type.startsWith('video/');

      if (isVideoFile) {
        updateActiveScene({ videoUrl: dataUrl, assetUrl: dataUrl, status: 'COMPLETED' });
      } else {
        updateActiveScene({ imageUrl: dataUrl, assetUrl: dataUrl, status: 'COMPLETED' });
      }
      setCustomAssetUrl(dataUrl);
      setHermesMessage(`Sip! Aset dari file "${file.name}" berhasil diunggah dan dipasang ke adegan #${selectedSceneIndex + 1}.`);
    };

    reader.readAsDataURL(file);
  };

  // Generate AI Keyframe specifically for this scene
  const handleAiFrameGenerate = async () => {
    if (!project?.id || !activeScene) {
      // Offline fallback simulation
      setIsGeneratingAiFrame(true);
      setTimeout(() => {
        const fakeUrl = `https://images.unsplash.com/photo-${1510000000000 + Math.floor(Math.random() * 100000)}?w=800&auto=format&fit=crop&q=80`;
        updateActiveScene({ imageUrl: fakeUrl, status: 'COMPLETED', visualDirection: editPromptText });
        setIsGeneratingAiFrame(false);
        setHermesMessage(`Frame AI Keyframe baru khusus adegan #${selectedSceneIndex + 1} telah selesai digenerate!`);
      }, 1500);
      return;
    }

    setIsGeneratingAiFrame(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/generate-scene-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: activeScene.id })
      });
      const data = await res.json();
      if (data.success) {
        setHermesMessage(`Sutradara Sinta selesai merender Frame Keyframe HD untuk adegan #${selectedSceneIndex + 1}!`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAiFrame(false);
    }
  };

  // Fast Re-stitch Master Assembly without full re-render
  const handleFastStitchMaster = async () => {
    setIsStitching(true);
    setStitchMessage('Menjalankan fast re-stitch & penggabungan master video...');

    if (!project?.id) {
      setTimeout(() => {
        setIsStitching(false);
        setStitchMessage('Master video berhasil digabungkan!');
        setHermesMessage('Selesai! Master video utuh telah berhasil diproduksi kembali dengan aset-aset override terbaru!');
        setTimeout(() => setStitchMessage(null), 3000);
      }, 2000);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${project.id}/stitch-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.finalVideoUrl) {
        setStitchMessage('Fast re-stitch berhasil selesai!');
        setHermesMessage('Selesai! Master video telah diperbarui dengan frame override tanpa harus re-render ulang dari awal.');
        if (project && onUpdateProject) {
          onUpdateProject({
            ...project,
            finalVideoUrl: data.finalVideoUrl,
            status: 'COMPLETED'
          });
        }
      }
    } catch (e: any) {
      setStitchMessage(`Gagal re-stitch: ${e.message}`);
    } finally {
      setIsStitching(false);
      setTimeout(() => setStitchMessage(null), 4000);
    }
  };

  // Delete scene
  const handleDeleteScene = () => {
    if (scenes.length <= 1) return;
    const newScenes = scenes.filter((_, idx) => idx !== selectedSceneIndex);
    setScenes(newScenes);
    setSelectedSceneIndex(Math.max(0, selectedSceneIndex - 1));
    setHermesMessage(`Adegan #${selectedSceneIndex + 1} berhasil dihapus dari timeline.`);
  };

  // Add new scene
  const handleAddScene = () => {
    const newSceneId = `scene_${Date.now()}`;
    const newScene: Scene = {
      id: newSceneId,
      duration: '5s',
      textOverlay: 'Teks Subtitle Baru',
      subtitle: 'Teks Subtitle Baru',
      visualDirection: 'Cinematic visual direction baru',
      voiceOver: 'Kalimat narasi suara baru',
      status: 'COMPLETED',
      imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80'
    };
    const newScenes = [...scenes, newScene];
    setScenes(newScenes);
    setSelectedSceneIndex(newScenes.length - 1);
    setHermesMessage(`Adegan baru #${newScenes.length} berhasil ditambahkan ke timeline!`);
  };

  // AI Hermes natural language command handler
  const handleHermesCommand = () => {
    if (!inputText.trim()) return;
    const lower = inputText.toLowerCase();

    if (lower.includes('ganti teks') || lower.includes('ubah teks') || lower.includes('teks')) {
      const match = inputText.match(/(?:jadi|dengan|:)\s*["']?([^"']+)["']?/i) || inputText.split('teks')[1];
      const newText = match ? (typeof match === 'string' ? match : match[1]).trim() : inputText;
      setEditTextOverlay(newText);
      updateActiveScene({ textOverlay: newText, subtitle: newText });
      setHermesMessage(`Sip! Teks adegan #${selectedSceneIndex + 1} diganti jadi "${newText}".`);
    } else if (lower.includes('potong') || lower.includes('durasi')) {
      const numMatch = inputText.match(/\d+/);
      const seconds = numMatch ? `${numMatch[0]}s` : '3s';
      setEditDuration(seconds);
      updateActiveScene({ duration: seconds });
      setHermesMessage(`Siap! Durasi adegan #${selectedSceneIndex + 1} dipotong jadi ${seconds}.`);
    } else if (lower.includes('stitch') || lower.includes('render') || lower.includes('gabung')) {
      handleFastStitchMaster();
    } else {
      setEditTextOverlay(inputText);
      updateActiveScene({ textOverlay: inputText, subtitle: inputText });
      setHermesMessage(`Beres! Teks overlay adegan #${selectedSceneIndex + 1} diperbarui sesuai instruksi kamu.`);
    }

    setInputText('');
  };

  // Active scene video / image source
  const currentAsset = activeScene?.videoUrl || activeScene?.imageUrl || activeScene?.assetUrl;
  const isCurrentVideo = !!activeScene?.videoUrl || (currentAsset && (currentAsset.includes('.mp4') || currentAsset.includes('data:video')));

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-[#030303] text-white font-sans overflow-y-auto lg:overflow-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* MOBILE FLOATING STICKY HEADER FOR SMARTPHONE USERS */}
      <div className="lg:hidden sticky top-0 z-50 bg-[#08080c]/95 backdrop-blur-md px-4 py-3 border-b border-white/10 flex items-center justify-between shadow-xl shrink-0">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Halaman Utama</span>
        </button>
        
        <button 
          onClick={onBack} 
          className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/30 text-gray-300 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1 text-xs font-bold font-mono"
          title="Tutup Timeline Editor"
        >
          <X size={16} />
          <span className="hidden sm:inline">Tutup</span>
        </button>
      </div>

      {/* KANVAS UTAMA: Studio Video Stage + Timeline Track */}
      <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden">
        
        {/* Top Header Navigation (Desktop / Tablet) */}
        <div className="h-13 shrink-0 border-b border-white/5 bg-[#080808] flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack} 
                className="text-xs font-mono text-indigo-300 hover:text-white flex items-center gap-1.5 transition px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 font-bold cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Studio</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Video Editor Studio (Non-Linear Asset Editor)
              </span>
              {project?.title && (
                <span className="text-[11px] font-mono text-gray-400 px-2 py-0.5 rounded bg-white/5 border border-white/10 truncate max-w-[200px]">
                  {project.title}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stitchMessage && (
              <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" />
                {stitchMessage}
              </span>
            )}

            <button
              id="btn-fast-stitch-master"
              onClick={handleFastStitchMaster}
              disabled={isStitching}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 uppercase tracking-wider text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Zap size={14} className="fill-white" />
              <span>Fast Re-Stitch Master</span>
            </button>
          </div>
        </div>

        {/* TOP VIDEO STAGE PREVIEW */}
        <div className="flex-1 bg-[#070709] relative flex items-center justify-center overflow-hidden p-4">
          
          {/* Main Stage Frame Player */}
          <div className={`relative ${getProjectAspectRatioClass(project)} max-h-[92%] w-full max-w-4xl bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group`}>
            
            {currentAsset ? (
              isCurrentVideo ? (
                <video
                  ref={videoRef}
                  src={currentAsset}
                  controls={false}
                  autoPlay={isPlaying}
                  loop
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={currentAsset}
                  alt={`Scene ${selectedSceneIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 gap-2 p-8 text-center">
                <Film size={40} className="opacity-40" />
                <p className="text-xs font-mono">Belum ada aset visual untuk adegan #{selectedSceneIndex + 1}</p>
                <p className="text-[11px] text-gray-600">Unggah foto/video di panel kanan atau generate via AI</p>
              </div>
            )}

            {/* Kinetic Text Subtitle Overlay */}
            {(activeScene?.textOverlay || activeScene?.subtitle) && (
              <div 
                className="absolute bottom-8 left-0 right-0 px-8 text-center pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]"
              >
                <span className="inline-block px-4 py-2 bg-black/75 backdrop-blur-md rounded-xl text-yellow-300 font-black text-xl md:text-2xl uppercase tracking-wider border border-yellow-500/30 shadow-2xl">
                  {activeScene.textOverlay || activeScene.subtitle}
                </span>
              </div>
            )}

            {/* Stage Playback Overlay Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
              
              {/* Top Stage Info Badge */}
              <div className="flex justify-between items-center text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-indigo-600/80 text-white font-bold">
                    Adegan #{selectedSceneIndex + 1} / {scenes.length}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-black/60 text-gray-300 border border-white/10">
                    Durasi: {activeScene?.duration || '5s'}
                  </span>
                </div>
                {activeScene?.status === 'COMPLETED' && (
                  <span className="px-2 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle size={12} /> Rendered Asset
                  </span>
                )}
              </div>

              {/* Bottom Playback Scrubber & Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <button
                    onClick={() => {
                      setIsPlaying(!isPlaying);
                      if (videoRef.current) {
                        if (isPlaying) videoRef.current.pause();
                        else videoRef.current.play();
                      }
                    }}
                    className="p-2 rounded-full bg-white text-black hover:bg-gray-200 transition font-bold"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                  </button>

                  <button
                    onClick={() => setSelectedSceneIndex(Math.max(0, selectedSceneIndex - 1))}
                    className="p-2 rounded-full bg-black/60 hover:bg-black text-white transition border border-white/10"
                    title="Adegan Sebelumnya"
                  >
                    <SkipBack size={14} />
                  </button>

                  <button
                    onClick={() => setSelectedSceneIndex(Math.min(scenes.length - 1, selectedSceneIndex + 1))}
                    className="p-2 rounded-full bg-black/60 hover:bg-black text-white transition border border-white/10"
                    title="Adegan Berikutnya"
                  >
                    <SkipForward size={14} />
                  </button>

                  <div className="flex-1 bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer">
                    <div 
                      className="bg-indigo-500 h-full transition-all"
                      style={{ width: `${((selectedSceneIndex + 1) / scenes.length) * 100}%` }}
                    />
                  </div>

                  <span className="text-[11px] font-mono text-gray-300">
                    Adegan {selectedSceneIndex + 1}
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM TIMELINE TRACK EDITOR AREA */}
        <div className="h-[250px] shrink-0 bg-[#0c0c0f] border-t border-white/10 p-4 flex flex-col justify-between">
          
          {/* Timeline Toolbar */}
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-300 uppercase font-mono flex items-center gap-1.5">
                <Sliders size={13} className="text-indigo-400" />
                Track Timeline ({scenes.length} Frame)
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                (Tarik & lepas frame untuk mengubah urutan)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddScene}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white flex items-center gap-1 transition"
              >
                <Plus size={12} /> Tambah Frame
              </button>

              <button
                onClick={handleDeleteScene}
                disabled={scenes.length <= 1}
                className="px-3 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-xs font-mono text-rose-300 disabled:opacity-30 flex items-center gap-1 transition"
              >
                <Trash2 size={12} /> Hapus Frame
              </button>
            </div>
          </div>

          {/* Draggable Horizontal Scenes Sequence */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 relative custom-scrollbar">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={scenes.map((s, idx) => s.id || idx)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-3 items-center h-full absolute px-1">
                  {scenes.map((scene, index) => (
                    <SortableSceneItem
                      key={scene.id || index}
                      scene={scene}
                      index={index}
                      isSelected={selectedSceneIndex === index}
                      onSelect={() => setSelectedSceneIndex(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

        </div>

      </div>

      {/* KANVAS KANAN: Inspector Frame Override & Hermes Producer Chat */}
      <div className="w-full lg:w-[420px] shrink-0 bg-[#08080a] flex flex-col border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
        
        {/* FRAME ASSET INSPECTOR & OVERRIDE PANEL */}
        <div className="p-5 border-b border-white/5 bg-[#0b0b0e] space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-mono font-bold text-xs">
                #{selectedSceneIndex + 1}
              </div>
              <h3 className="font-bold text-sm text-gray-200">
                Inspector Adegan #{selectedSceneIndex + 1}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                {activeScene?.status || 'COMPLETED'}
              </span>
              {onBack && (
                <button 
                  onClick={onBack} 
                  className="px-2.5 py-1 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 flex items-center gap-1 text-xs font-bold transition cursor-pointer"
                  title="Kembali ke Halaman Utama"
                >
                  <X size={14} />
                  <span className="text-[11px] font-mono">Tutup</span>
                </button>
              )}
            </div>
          </div>

          {/* Override Asset Upload & Attached Assets */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
              Ganti Aset Visual (Upload / URL)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              accept="image/*,video/*"
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/40 text-xs font-mono text-indigo-300 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Upload size={13} />
                <span>Upload File</span>
              </button>

              <button
                onClick={handleAiFrameGenerate}
                disabled={isGeneratingAiFrame}
                className="py-2 px-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-xs font-mono text-purple-300 font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Sparkles size={13} className={isGeneratingAiFrame ? 'animate-spin' : ''} />
                <span>{isGeneratingAiFrame ? 'Generating...' : 'AI Re-Render'}</span>
              </button>
            </div>

            {/* Attached Product Assets Quick Selector */}
            {project?.attachedAssets && project.attachedAssets.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-mono text-gray-500 block mb-1.5">
                  Atau Pilih Dari Aset Produk Terlampir:
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {project.attachedAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => {
                        updateActiveScene({ imageUrl: asset.url, assetUrl: asset.url, status: 'COMPLETED' });
                        setCustomAssetUrl(asset.url);
                      }}
                      className="shrink-0 w-12 h-12 rounded-lg border border-white/10 hover:border-indigo-400 overflow-hidden relative group bg-black"
                    >
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-indigo-600/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[8px] font-bold">
                        Pilih
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subtitle & Voiceover Override Form */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div>
              <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                Teks Subtitle / Overlay
              </label>
              <input
                type="text"
                value={editTextOverlay}
                onChange={(e) => {
                  setEditTextOverlay(e.target.value);
                  updateActiveScene({ textOverlay: e.target.value, subtitle: e.target.value });
                }}
                placeholder="Diskon 50% Hari Ini!"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                Naskah Suara (Voiceover Script)
              </label>
              <textarea
                rows={2}
                value={editVoiceOver}
                onChange={(e) => {
                  setEditVoiceOver(e.target.value);
                  updateActiveScene({ voiceOver: e.target.value });
                }}
                placeholder="Kalimat narasi suara untuk adegan ini..."
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                  Durasi Frame
                </label>
                <select
                  value={editDuration}
                  onChange={(e) => {
                    setEditDuration(e.target.value);
                    updateActiveScene({ duration: e.target.value });
                  }}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="2s">2 Detik</option>
                  <option value="3s">3 Detik</option>
                  <option value="4s">4 Detik</option>
                  <option value="5s">5 Detik</option>
                  <option value="6s">6 Detik</option>
                  <option value="8s">8 Detik</option>
                  <option value="10s">10 Detik</option>
                </select>
              </div>

              <div className="shrink-0 pt-5">
                <button
                  onClick={handleFastStitchMaster}
                  disabled={isStitching}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Zap size={12} /> Fast Stitch
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* AI HERMES PRODUCER CHAT ASSISTANT */}
        <div className="flex-1 flex flex-col justify-between p-4 bg-[#08080a]">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md text-xs">
                N
              </div>
              <div>
                <h4 className="font-bold text-xs text-gray-200">Neuronna (Hermes AI Producer)</h4>
                <p className="text-[9px] text-emerald-400 font-mono uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Timeline Assistant Active
                </p>
              </div>
            </div>

            <div className="bg-[#121216] border border-white/5 p-3.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed text-gray-300 shadow-inner">
              {hermesMessage}
            </div>
          </div>

          <div className="pt-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleHermesCommand()}
                placeholder="Misal: 'Ganti teks adegan 1 jadi Flash Sale'"
                className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                onClick={handleHermesCommand}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                Kirim
              </button>
            </div>
            <p className="text-[9px] text-gray-500 text-center font-mono">
              ✨ Ketik instruksi dalam Bahasa Indonesia untuk mengedit timeline secara cerdas.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
