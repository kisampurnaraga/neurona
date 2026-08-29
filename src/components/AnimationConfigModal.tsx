import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Wand2, 
  Film, 
  Palette, 
  Globe, 
  Volume2, 
  Clapperboard, 
  Check, 
  ImageIcon, 
  RefreshCw, 
  Eye, 
  Maximize2,
  User,
  Shirt,
  ChevronRight,
  ChevronLeft,
  Upload,
  Trash2,
  Plus
} from 'lucide-react';
import { AnimationConfig } from '../shared/types';
import { neuronaVoice } from '../utils/speechSynthesis';

interface AnimationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: AnimationConfig, prompt: string, attachedAssets?: any[]) => void;
}

const ART_STYLES: { id: AnimationConfig['artStyle']; title: string; desc: string; icon: string; tag: string }[] = [
  { id: '3D_PIXAR', title: '3D Pixar / Stylized', desc: 'Warna kaya, pencahayaan lembut, karakter ekspresif & dinamis.', icon: '🎨', tag: 'Render 3D' },
  { id: '3D_UNREAL_HYPER', title: 'Unreal Engine 5 Hyper', desc: 'Fotorealistik 3D, raytracing sinematik, tekstur detail tinggi.', icon: '🚀', tag: 'Hyper Real' },
  { id: 'ANIME_SHINKAI', title: 'Anime Aesthetic (Shinkai/Ghibli)', desc: 'Awan dramatis, cat air estetik, visual emosional memukau.', icon: '🌸', tag: 'Japanese 2D' },
  { id: 'ANIME_CYBERPUNK', title: 'Cyberpunk Mecha Anime', desc: 'Lampu neon futuristik, gelap berkecepatan tinggi, efek sci-fi.', icon: '⚡', tag: 'Sci-Fi Action' },
  { id: '2D_CLASSIC_CARTOON', title: '2D Classic Cartoon', desc: 'Animasi kartun ceria dengan garis tegas dan warna kontras.', icon: '✏️', tag: 'Hand Drawn' },
  { id: 'CLAYMATION', title: 'Claymation / Stop Motion', desc: 'Tekstur tanah liat unik, gerakan stop-motion artistik.', icon: '🧱', tag: 'Stop Motion' },
  { id: 'COMIC_BOOK', title: 'Comic Book / Manga Ink', desc: 'Efek halftone raster, tinta tebal, panel aksi komik.', icon: '📚', tag: 'Graphic Novel' },
  { id: 'PIXEL_ART', title: 'Retro 16-Bit Pixel Art', desc: 'Gaya arcade klasik nostalgia dengan warna retro.', icon: '👾', tag: 'Retro Pixel' }
];

const LANGUAGES = [
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', label: 'Indonesian' },
  { code: 'en', name: 'English (Global)', flag: '🇬🇧', label: 'English' },
  { code: 'ja', name: 'Japanese (日本語 / Seiyuu)', flag: '🇯🇵', label: 'Nihongo' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷', label: 'Korean' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸', label: 'Spanish' },
  { code: 'zh', name: 'Mandarin (中文)', flag: '🇨🇳', label: 'Mandarin' }
];

const GENRES: { id: AnimationConfig['targetGenre']; label: string }[] = [
  { id: 'ADVENTURE', label: 'Petualangan (Adventure)' },
  { id: 'COMEDY', label: 'Komedi Lucu (Comedy)' },
  { id: 'SCI_FI', label: 'Sci-Fi Futuristik' },
  { id: 'FANTASY', label: 'Fantasi Magis' },
  { id: 'EMOTIONAL_DRAMA', label: 'Drama Emosional' },
  { id: 'ACTION', label: 'Aksi Laga / Olahraga (High Action)' }
];

const VOICE_TONES: { id: AnimationConfig['voiceTone']; label: string; desc: string }[] = [
  { id: 'EPIC_HEROIC', label: 'Heroik & Epik', desc: 'Nada narator film bioskop laga & anime' },
  { id: 'CHEERFUL', label: 'Ceria & Semangat', desc: 'Cocok untuk petualangan dan anak-anak' },
  { id: 'DEEP_DRAMATIC', label: 'Dramatis & Berat', desc: 'Misteri atau momen emosional' },
  { id: 'CUTE_ANIME', label: 'Gaya Anime Seiyuu', desc: 'Khas pengisi suara anime Jepang' },
  { id: 'CALM_NARRATOR', label: 'Narator Tenang', desc: 'Elegan dan terstruktur' }
];

interface GfArchetype {
  id: string;
  name: string;
  desc: string;
  icon: string;
  artStyle: AnimationConfig['artStyle'];
  defaultHair: string;
  defaultEyes: string;
  defaultOutfit: string;
  defaultWorld: string;
}

const GF_ARCHETYPES: GfArchetype[] = [
  {
    id: 'SHONEN_HERO',
    name: 'Anime Shonen Hero',
    desc: 'Gaya animasi anime 2D klasik penuh determinasi, warna berani, dan garis kontras tinggi.',
    icon: '🌸',
    artStyle: 'ANIME_SHINKAI',
    defaultHair: 'Rambut hitam spiky runcing acak bergaya anime',
    defaultEyes: 'Mata tajam dengan tatapan fokus penuh determinasi',
    defaultOutfit: 'Jersey tim olahraga atletik nomor 12 merah-putih',
    defaultWorld: 'Stadion olahraga megah internasional dengan sorotan lampu volumetric'
  },
  {
    id: 'PIXAR_3D',
    name: '3D Pixar Stylized',
    desc: 'Karakter 3D menggemaskan khas Disney/Pixar, bentuk lembut, mata bundar ekspresif.',
    icon: '🎨',
    artStyle: '3D_PIXAR',
    defaultHair: 'Rambut cokelat rapi halus berkilau',
    defaultEyes: 'Mata bulat besar ekspresif berbinar ceria',
    defaultOutfit: 'Jaket kasual hangat dengan kombinasi warna trendi',
    defaultWorld: 'Ruang bermain cerah penuh mainan atau jalanan kota ramah'
  },
  {
    id: 'CYBER_MECHA',
    name: 'Cyberpunk Mecha Robot',
    desc: 'Bodi robotik futuristik ramping, material logam serat karbon, ornamen neon menyala.',
    icon: '⚡',
    artStyle: 'ANIME_CYBERPUNK',
    defaultHair: 'Antena cybernetic ganda dan rambut perak neon melayang',
    defaultEyes: 'Layar ekspresi emosif digital dengan mata biru cyan berpendar',
    defaultOutfit: 'Armor logam ringan bersisik serat karbon futuristik',
    defaultWorld: 'Metropolis cyberpunk masa depan di malam hari diselimuti kabut dan lampu neon'
  },
  {
    id: 'MAGIC_WIZARD',
    name: 'Magical Fantasy Mage',
    desc: 'Penyihir atau elf dari semesta fantasi magis klasik, jubah berornamen kuno, aura mistis.',
    icon: '🔮',
    artStyle: 'ANIME_SHINKAI',
    defaultHair: 'Rambut emas pirang panjang bergelombang dengan tiara perak',
    defaultEyes: 'Mata hijau bercahaya keperakan magis lembut',
    defaultOutfit: 'Jubah panjang sulaman sutera biru tua berpola emas kuno',
    defaultWorld: 'Hutan belantara sihir kuno berpendar dengan kristal energi mengambang'
  },
  {
    id: 'DETECTIVE_MASCOT',
    name: 'Cute Animal Detective',
    desc: 'Hewan antropomorfis lucu (chibi/furry) bergaya detektif cerdik penyelidik misteri.',
    icon: '🦊',
    artStyle: '2D_CLASSIC_CARTOON',
    defaultHair: 'Telinga rubah jingga kemerahan yang lembut bergoyang',
    defaultEyes: 'Mata hitam bulat berkilau penuh rasa ingin tahu',
    defaultOutfit: 'Tweed vest cokelat detektif kecil lengkap dengan dasi kupu-kupu',
    defaultWorld: 'Perpustakaan klasik berlantai kayu tua berselimut debu emas matahari sore'
  }
];

const GF_HAIR_OPTIONS = [
  'Rambut hitam spiky runcing acak bergaya anime',
  'Rambut cokelat rapi halus berkilau',
  'Antena cybernetic ganda dan rambut perak neon melayang',
  'Rambut emas pirang panjang bergelombang dengan tiara perak',
  'Telinga rubah jingga kemerahan yang lembut bergoyang',
  'Gaya kuncir kuda (ponytail) terikat tinggi bernuansa sporty'
];

const GF_EYES_OPTIONS = [
  'Mata tajam dengan tatapan fokus penuh determinasi',
  'Mata bulat besar ekspresif berbinar ceria',
  'Layar ekspresi emosif digital dengan mata biru cyan berpendar',
  'Mata hijau bercahaya keperakan magis lembut',
  'Mata hitam bulat berkilau penuh rasa ingin tahu',
  'Mata ungu misterius yang teduh dan tenang'
];

const GF_OUTFIT_OPTIONS = [
  'Jersey tim olahraga atletik nomor 12 merah-putih',
  'Jaket kasual hangat dengan kombinasi warna trendi',
  'Armor logam ringan bersisik serat karbon futuristik',
  'Jubah panjang sulaman sutera biru tua berpola emas kuno',
  'Tweed vest cokelat detektif kecil lengkap dengan dasi kupu-kupu',
  'Jas laboratorium riset serba putih canggih berpendar tipis'
];

const GF_WORLD_OPTIONS = [
  'Stadion olahraga megah internasional dengan sorotan lampu volumetric',
  'Ruang bermain cerah penuh mainan atau jalanan kota ramah',
  'Metropolis cyberpunk masa depan di malam hari diselimuti kabut dan lampu neon',
  'Hutan belantara sihir kuno berpendar dengan kristal energi mengambang',
  'Perpustakaan klasik berlantai kayu tua berselimut debu emas matahari sore',
  'Atap sekolah tinggi bernuansa langit senja Makoto Shinkai jingga dramatis'
];

export const AnimationConfigModal: React.FC<AnimationConfigModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [title, setTitle] = useState('Anime Championship Match: Kisah Kemenangan Voli');
  const [artStyle, setArtStyle] = useState<AnimationConfig['artStyle']>('ANIME_SHINKAI');
  const [language, setLanguage] = useState('id');
  const [targetGenre, setTargetGenre] = useState<AnimationConfig['targetGenre']>('ACTION');
  const [characterDescription, setCharacterDescription] = useState('Atlet bola voli wanita nomor punggung 12 dengan rambut hitam terikat kuncir, jersey tim merah putih, ekspresi wajah tajam penuh determinasi, mata cokelat fokus');
  const [worldSetting, setWorldSetting] = useState('Stadion voli internasional indoor dengan lampu sorot arena volumetric, hard rim lighting, siluet dramatis, latar belakang penonton bersorak');
  const [voiceTone, setVoiceTone] = useState<AnimationConfig['voiceTone']>('EPIC_HEROIC');
  const [aspectRatio, setAspectRatio] = useState<AnimationConfig['aspectRatio']>('16:9');
  const [sceneCount, setSceneCount] = useState(4);
  const [imageEngine, setImageEngine] = useState<string>('standard');

  // Text-to-Image Character Sheet Generator State
  const [isGeneratingChar, setIsGeneratingChar] = useState(false);
  const [generatedCharImage, setGeneratedCharImage] = useState<string | null>(null);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [characterVisualAnalysis, setCharacterVisualAnalysis] = useState<string>('');
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Google Flow Character Forge State
  const [isGoogleFlowMode, setIsGoogleFlowMode] = useState(true);
  const [gfStep, setGfStep] = useState(1);
  const [gfSelectedArchetype, setGfSelectedArchetype] = useState('SHONEN_HERO');
  const [gfSelectedHair, setGfSelectedHair] = useState(GF_HAIR_OPTIONS[0]);
  const [gfSelectedEyes, setGfSelectedEyes] = useState(GF_EYES_OPTIONS[0]);
  const [gfSelectedOutfit, setGfSelectedOutfit] = useState(GF_OUTFIT_OPTIONS[0]);
  const [gfSelectedWorld, setGfSelectedWorld] = useState(GF_WORLD_OPTIONS[0]);

  // Synchronize Google Flow selections to manual fields
  useEffect(() => {
    if (isGoogleFlowMode) {
      const arch = GF_ARCHETYPES.find(a => a.id === gfSelectedArchetype) || GF_ARCHETYPES[0];
      const charDesc = `Karakter ${arch.name} dengan ${gfSelectedHair}, memiliki ${gfSelectedEyes}, mengenakan ${gfSelectedOutfit}`;
      setCharacterDescription(charDesc);
      setWorldSetting(gfSelectedWorld);
      if (arch.artStyle) {
        setArtStyle(arch.artStyle);
      }
    }
  }, [isGoogleFlowMode, gfSelectedArchetype, gfSelectedHair, gfSelectedEyes, gfSelectedOutfit, gfSelectedWorld]);

  if (!isOpen) return null;

  const handleAutoGenerateCharacterFromTitle = () => {
    if (!title.trim()) return;
    const t = title.toLowerCase();
    let genChar = '';
    let genWorld = '';
    
    if (t.includes('voli') || t.includes('volleyball') || t.includes('smash') || t.includes('match') || t.includes('championship')) {
      genChar = 'Atlet bola voli wanita nomor punggung 12 dengan rambut hitam terikat kuncir tinggi, jersey tim merah-putih athletic, ekspresi wajah tajam penuh determinasi, mata cokelat fokus';
      genWorld = 'Stadion voli internasional indoor dengan lampu sorot arena volumetric, hard rim lighting, siluet dramatis, penonton bersorak';
    } else if (t.includes('cyber') || t.includes('mecha') || t.includes('robot') || t.includes('futur')) {
      genChar = 'Protagonis mecha anime dengan jaket neon cybernetic, rambut perak pendek bercahaya, mata cyan berpendar, ekspresi heroik tajam';
      genWorld = 'Kota cyberpunk metropolis futuristik malam hari dengan papan reklame neon hologram dan asap atmosferik';
    } else if (t.includes('ninja') || t.includes('samurai') || t.includes('pedang') || t.includes('blade')) {
      genChar = 'Pendekar ninja muda berikat kepala perak, pakaian klan hitam-merah, tatapan mata tajam fokus pertarungan, ekspresi berani';
      genWorld = 'Kuil kuno di puncak gunung malam hari dengan daun sakura berjatuhan dan pencahayaan bulan purnama sinematik';
    } else if (t.includes('sihir') || t.includes('magic') || t.includes('wizard') || t.includes('naga') || t.includes('dragon')) {
      genChar = 'Penyihir muda heroik dengan jubah petualang biru-emas, tongkat kristal bercahaya, rambut pirang bergelombang, mata hijau jernih';
      genWorld = 'Hutan sihir kuno dengan pohon raksasa berpendar dan kristal energi alami di sekelilingnya';
    } else if (t.includes('sekolah') || t.includes('school') || t.includes('romance') || t.includes('cinta')) {
      genChar = 'Siswa SMA anime ceria berpakaian seragam sekolah jepang rapi, rambut cokelat sebahu, senyum ramah hangat, mata berbinar jernih';
      genWorld = 'Atap sekolah anime saat sore hari dengan pemandangan langit senja bernuansa Makoto Shinkai dan cahaya matahari hangat';
    } else {
      genChar = `Protagonis utama heroik untuk "${title}", gaya busana khas petualang sinematik, ekspresi ekspresif berkarisma, rambut tertata rapi, mata jernih fokus`;
      genWorld = `Dunia latar tempat sinematik berlatar untuk "${title}" dengan pencahayaan sinematik kelas studio dan kedalaman atmosferik`;
    }

    setCharacterDescription(genChar);
    setWorldSetting(genWorld);
    neuronaVoice.speak('Karakter dan latar dunia otomatis disesuaikan dengan judul animasi!');
  };

  const handleGenerateCharacterSheet = async () => {
    if (!characterDescription.trim()) return;
    setIsGeneratingChar(true);
    const engineName = imageEngine === 'precision' ? 'Nano Banana Pro Edit' : imageEngine === 'draft' ? 'Flux Schnell' : 'Nano Banana 2';
    neuronaVoice.speak(`Membuat lembar referensi karakter menggunakan engine ${engineName}...`);
    try {
      const res = await fetch('/api/generate-character-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterDescription,
          artStyle,
          genre: targetGenre,
          imageEngine
        })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedCharImage(data.imageUrl);
        setReferenceImageUrls(prev => [...prev, data.imageUrl]);
        setCharacterVisualAnalysis(data.visualAnalysis || `Ciri fisik karakter terkunci: ${characterDescription}`);
        neuronaVoice.speak(`Karakter referensi berhasil dibuat dengan ${engineName}. Visual lock aktif.`);
      }
    } catch (err) {
      console.error("Gagal generate karakter:", err);
    } finally {
      setIsGeneratingChar(false);
    }
  };

  const handleUploadReferencePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    neuronaVoice.speak(`Mengupload ${files.length} foto referensi karakter...`);
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setReferenceImageUrls(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReferencePhoto = (idxToRemove: number) => {
    setReferenceImageUrls(prev => prev.filter((_, idx) => idx !== idxToRemove));
    neuronaVoice.speak("Foto referensi dihapus.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: AnimationConfig = {
      title,
      artStyle,
      language,
      targetGenre,
      characterDescription,
      worldSetting,
      voiceTone,
      aspectRatio,
      sceneCount,
      imageEngine,
      characterVisualAnalysis: characterVisualAnalysis || (referenceImageUrls.length > 0 ? `Karakter referensi: ${characterDescription}` : undefined),
      characterReferenceUrl: referenceImageUrls[0] || undefined,
      characterReferenceUrls: referenceImageUrls
    };
    
    const prompt = `Buatkan video animasi ${artStyle.replace(/_/g, ' ')} berjudul "${title}" dengan karakter ${characterDescription} di dunia ${worldSetting}. Bahasa narasi/dialog: ${language}.`;
    
    const attachedAssets = referenceImageUrls.length > 0 ? referenceImageUrls.map((url, idx) => ({
      id: `char_ref_${idx}_${Date.now()}`,
      name: `Character_Reference_Pose_${idx + 1}.jpg`,
      type: 'image' as const,
      url: url,
      size: '1.5 MB'
    })) : undefined;

    onSubmit(config, prompt, attachedAssets);
    onClose();
  };

  return (
    <div id="animation-config-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto select-none">
      <div id="animation-config-modal-container" className="relative w-full max-w-4xl bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-950/60 overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                STUDIO ANIMASI & VISUAL UNIVERSE
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  PIXAR / ANIME / 3D
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Bangun universe cerita, karakter terkunci (Character Lock), & sinematografi kelas studio
              </p>
            </div>
          </div>
          <button
            id="close-anim-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Judul Animasi */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              Judul / Ide Cerita Animasi
            </label>
            <input
              id="input-anim-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pertandingan Voli Anime Epik: Final Championship Match"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-500 outline-none transition"
              required
            />
          </div>

          {/* Pilihan Visual Art Style */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Gaya Visual Animasi (Art Style & Engine)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ART_STYLES.map((style) => (
                <button
                  key={style.id}
                  id={`style-btn-${style.id}`}
                  type="button"
                  onClick={() => setArtStyle(style.id)}
                  className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between cursor-pointer ${
                    artStyle === style.id
                      ? 'bg-cyan-950/70 border-cyan-400 ring-1 ring-cyan-400 shadow-md shadow-cyan-950'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{style.icon}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {style.tag}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white leading-tight mb-1">
                      {style.title}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {style.desc}
                    </p>
                  </div>
                  {artStyle === style.id && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION KARAKTER UTAMA + TEXT-TO-IMAGE GENERATOR */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-4">
            
            {/* Header / Mode Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  DESKRIPSI TOKOH & GENERATE KARAKTER AI (CHARACTER LOCK)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Gunakan visual wizard <strong>Google Flow Style</strong> atau input deskripsi manual untuk melock karakter Anda.
                </p>
              </div>

              {/* Mode Toggler */}
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsGoogleFlowMode(true);
                    neuronaVoice.speak('Mengaktifkan mode visual Google Flow.');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isGoogleFlowMode 
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Google Flow (Rekomendasi)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsGoogleFlowMode(false);
                    neuronaVoice.speak('Mengaktifkan mode deskripsi manual.');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !isGoogleFlowMode 
                      ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✍️ Manual Deskripsi
                </button>
              </div>
            </div>

            {/* Quick Actions and Model Picker */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {!isGoogleFlowMode && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateCharacterFromTitle}
                    title="Otomatiskan deskripsi karakter & latar dunia sesuai Judul Animasi"
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>✨ Auto Prompt Judul</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Dropdown Model A.I Penghasil Gambar */}
                <div className="flex items-center gap-1 bg-slate-900 border border-cyan-500/40 rounded-xl px-2.5 py-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <select
                    id="select-char-image-engine"
                    value={imageEngine}
                    onChange={(e) => setImageEngine(e.target.value)}
                    className="bg-transparent text-xs text-cyan-300 font-semibold outline-none cursor-pointer pr-1"
                  >
                    <option value="standard" className="bg-slate-900 text-slate-200">🍌 Nano Banana 2 (Standard - 15 CR)</option>
                    <option value="draft" className="bg-slate-900 text-slate-200">⚡ FLUX.1 Schnell (Draft - 5 CR)</option>
                    <option value="precision" className="bg-slate-900 text-slate-200">💎 Nano Banana Pro Edit (Precision - 25 CR)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCharacterSheet}
                  disabled={isGeneratingChar || !characterDescription.trim()}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg cursor-pointer ${
                    isGeneratingChar
                      ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 animate-pulse cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold shadow-cyan-500/30 active:scale-95'
                  }`}
                >
                  {isGeneratingChar ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                      <span>Rendering Karakter AI...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      <span>🎨 Generate Karakter AI (Text-to-Image)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Render Google Flow step-by-step UI */}
            {isGoogleFlowMode ? (
              <div className="space-y-4">
                {/* Steps Navigation Header */}
                <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                    {[
                      { step: 1, label: 'Gaya & Arketipe', icon: <Sparkles className="w-3.5 h-3.5" /> },
                      { step: 2, label: 'Fisik & Rambut', icon: <User className="w-3.5 h-3.5" /> },
                      { step: 3, label: 'Busana & Pakaian', icon: <Shirt className="w-3.5 h-3.5" /> },
                      { step: 4, label: 'Semesta Latar', icon: <Globe className="w-3.5 h-3.5" /> }
                    ].map((s) => (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => setGfStep(s.step)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                          gfStep === s.step
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          gfStep === s.step ? 'bg-cyan-400 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {s.step}
                        </span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Back / Next Buttons */}
                  <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-slate-800">
                    <button
                      type="button"
                      onClick={() => setGfStep(prev => Math.max(1, prev - 1))}
                      disabled={gfStep === 1}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGfStep(prev => Math.min(4, prev + 1))}
                      disabled={gfStep === 4}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Step Content Panels */}
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 min-h-[140px] flex flex-col justify-center">
                  {/* Step 1: Arketipe */}
                  {gfStep === 1 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Pilih Arketipe Karakter Utama</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                        {GF_ARCHETYPES.map((arch) => (
                          <button
                            key={arch.id}
                            type="button"
                            onClick={() => {
                              setGfSelectedArchetype(arch.id);
                              // Auto apply defaults
                              setGfSelectedHair(arch.defaultHair);
                              setGfSelectedEyes(arch.defaultEyes);
                              setGfSelectedOutfit(arch.defaultOutfit);
                              setGfSelectedWorld(arch.defaultWorld);
                              setArtStyle(arch.artStyle);
                              neuronaVoice.speak(`Arketipe ${arch.name} terpilih.`);
                            }}
                            className={`p-2.5 rounded-xl text-left border transition relative flex flex-col justify-between cursor-pointer ${
                              gfSelectedArchetype === arch.id
                                ? 'bg-cyan-950/50 border-cyan-500 ring-1 ring-cyan-500 shadow shadow-cyan-950'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xl">{arch.icon}</span>
                                {gfSelectedArchetype === arch.id && (
                                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-bold text-white truncate leading-tight">{arch.name}</div>
                              <p className="text-[9px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">{arch.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Rambut & Wajah */}
                  {gfStep === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Gaya & Warna Rambut</span>
                        <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                          {GF_HAIR_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setGfSelectedHair(opt)}
                              className={`px-3 py-2 rounded-lg text-left text-[11px] font-medium border transition cursor-pointer flex items-center justify-between ${
                                gfSelectedHair === opt
                                  ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                              }`}
                            >
                              <span className="truncate">{opt}</span>
                              {gfSelectedHair === opt && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Mata & Ekspresi</span>
                        <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                          {GF_EYES_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setGfSelectedEyes(opt)}
                              className={`px-3 py-2 rounded-lg text-left text-[11px] font-medium border transition cursor-pointer flex items-center justify-between ${
                                gfSelectedEyes === opt
                                  ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                              }`}
                            >
                              <span className="truncate">{opt}</span>
                              {gfSelectedEyes === opt && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Pakaian */}
                  {gfStep === 3 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Kostum / Pakaian Karakter</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {GF_OUTFIT_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setGfSelectedOutfit(opt)}
                            className={`px-3 py-2.5 rounded-xl text-left text-[11px] font-semibold border transition cursor-pointer flex items-center justify-between ${
                              gfSelectedOutfit === opt
                                ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                            }`}
                          >
                            <span className="line-clamp-2">{opt}</span>
                            {gfSelectedOutfit === opt && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-1.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Latar Semesta */}
                  {gfStep === 4 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Latar Dunia / World-Building Atmosphere</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {GF_WORLD_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setGfSelectedWorld(opt)}
                            className={`px-3 py-2.5 rounded-xl text-left text-[11px] font-semibold border transition cursor-pointer flex items-center justify-between ${
                              gfSelectedWorld === opt
                                ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                            }`}
                          >
                            <span className="line-clamp-2">{opt}</span>
                            {gfSelectedWorld === opt && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-1.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Compiled Google Flow Prompt Constructor Tags Preview */}
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Prompt Builder Constructor (Google Flow)
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">Auto Synced & Compiled</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/40 rounded-lg border border-slate-800">
                    <span className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 flex items-center gap-1 select-none">
                      🏷️ Style: {GF_ARCHETYPES.find(a => a.id === gfSelectedArchetype)?.name}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 flex items-center gap-1 select-none">
                      👤 Rambut: {gfSelectedHair.length > 25 ? gfSelectedHair.substring(0, 25) + '...' : gfSelectedHair}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400 flex items-center gap-1 select-none">
                      👁️ Wajah: {gfSelectedEyes.length > 25 ? gfSelectedEyes.substring(0, 25) + '...' : gfSelectedEyes}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 flex items-center gap-1 select-none">
                      👗 Kostum: {gfSelectedOutfit.length > 25 ? gfSelectedOutfit.substring(0, 25) + '...' : gfSelectedOutfit}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 flex items-center gap-1 select-none">
                      🏟️ Semesta: {gfSelectedWorld.length > 25 ? gfSelectedWorld.substring(0, 25) + '...' : gfSelectedWorld}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Manual editable textareas
              <textarea
                id="input-anim-character"
                rows={2}
                value={characterDescription}
                onChange={(e) => setCharacterDescription(e.target.value)}
                placeholder="Ciri fisik lengkap: gaya/warna rambut, seragam/jersey, nomor punggung, ekspresi wajah, aksesori..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-xs text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
              />
            )}

            {/* Compiled Prompt Sentence Preview Card */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kompilasi Deskripsi Karakter Terkunci</span>
              <p className="text-xs text-slate-300 italic leading-relaxed">{characterDescription || 'Belum ada deskripsi karakter.'}</p>
            </div>

            {/* HUB KONSISTENSI VISUAL (GAYA OPENART.AI) */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/10 pb-3">
                <div className="text-left">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Shirt className="w-4 h-4 text-cyan-400" />
                    Hub Konsistensi Visual (Gaya OpenArt.ai)
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Unggah beberapa pose/foto dengan pakaian identik atau generate otomatis menggunakan AI.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {referenceImageUrls.length} REFERENSI TERKUNCI
                  </span>
                  {referenceImageUrls.length > 0 && (
                    <span className="text-[9px] font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 animate-pulse">
                      VISION LOCK ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Gallery Grid */}
              {referenceImageUrls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {referenceImageUrls.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-square flex flex-col justify-between">
                      <div className="absolute top-1 left-1 z-10">
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-cyan-300 border border-cyan-500/20 font-bold">
                          Pose {idx + 1}
                        </span>
                      </div>
                      <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => removeReferencePhoto(idx)}
                          className="p-1 rounded-md bg-red-600/90 text-white hover:bg-red-500 hover:scale-105 transition shadow cursor-pointer"
                          title="Hapus foto ini"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div 
                        onClick={() => {
                          setGeneratedCharImage(url);
                          setShowFullPreview(true);
                        }}
                        className="w-full h-full relative cursor-pointer overflow-hidden flex items-center justify-center bg-black/40"
                      >
                        <img 
                          src={url} 
                          alt={`Reference pose ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] text-white">
                          <Eye size={12} className="mr-1" /> Perbesar
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center border-2 border-dashed border-slate-800 rounded-xl space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
                    <ImageIcon size={18} />
                  </div>
                  <div className="text-xs text-slate-400">Belum ada foto referensi karakter</div>
                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto px-4">
                    Gunakan tombol di bawah untuk membuat lembar pose dengan AI atau langsung unggah beberapa foto/jersey karakter Anda dari perangkat.
                  </p>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                {/* Upload Trigger Button */}
                <label className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-cyan-500 hover:bg-cyan-500/5 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer">
                  <Upload size={14} className="text-cyan-400" />
                  <span>Unggah Pose / Jersey</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadReferencePhoto}
                  />
                </label>

                {/* AI Generation Button */}
                <button
                  type="button"
                  onClick={handleGenerateCharacterSheet}
                  disabled={isGeneratingChar || !characterDescription.trim()}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-50 text-xs font-bold text-white shadow-lg hover:shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  {isGeneratingChar ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-cyan-200" />
                      <span>Memproses Pose...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={14} className="text-cyan-300" />
                      <span>Buat Pose dengan AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Pro Tips Box */}
              <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/10 text-[10px] text-slate-400 leading-relaxed text-left font-sans">
                💡 <strong className="text-cyan-300">Tips Konsistensi Olahraga/Jersey</strong>: 
                Unggah beberapa foto pose dari pemain yang mengenakan <span className="text-white">seragam / jersey voli yang sama persis</span> (misal: warna jersey sama, motif sama, sepatu voli sama). AI kami akan otomatis memadukan semua gambar ini untuk menghasilkan naskah dan render storyboard dengan akurasi pakaian 100%!
              </div>
            </div>
          </div>

          {/* Setting Dunia / Latar Tempat (World-Building) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Setting Dunia / Latar Tempat & Pencahayaan (World-Building)
            </label>
            <textarea
              id="input-anim-world"
              rows={2}
              value={worldSetting}
              onChange={(e) => setWorldSetting(e.target.value)}
              placeholder="Stadion internasional, lampu sorot arena volumetric, hard rim lighting, bokeh background..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* JUMLAH ADEGAN (SCENE) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              JUMLAH ADEGAN (SCENE)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { count: 4, label: '4 Scene (Singkat & Epik) ⭐' },
                { count: 6, label: '6 Scene (Standar)' },
                { count: 8, label: '8 Scene (Panjang)' },
                { count: 12, label: '12 Scene (Film Pendek)' }
              ].map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setSceneCount(opt.count)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    sceneCount === opt.count 
                      ? 'bg-cyan-600/30 border-cyan-500 text-white font-bold ring-1 ring-cyan-400' 
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-cyan-400/80 mt-1.5 ml-1">
              💡 Estimasi Biaya Render: {sceneCount} Scene x 8 Kredit = <strong>{sceneCount * 8} Kredit</strong>
            </div>
          </div>

          {/* Bahasa & Genre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Bahasa Naskah & Voiceover
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    id={`lang-btn-${lang.code}`}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`p-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition cursor-pointer ${
                      language === lang.code
                        ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span className="truncate">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                Genre Cerita
              </label>
              <select
                id="select-anim-genre"
                value={targetGenre}
                onChange={(e) => setTargetGenre(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-white outline-none"
              >
                {GENRES.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pengisi Suara TTS */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/20">
            

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1.5 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                Pengisi Suara Narator TTS
              </label>
              <select
                id="select-anim-voice-actor"
                defaultValue={localStorage.getItem('neurona_voice_id') || 'id-ID-Journey-O'}
                onChange={(e) => {
                  localStorage.setItem('neurona_voice_id', e.target.value);
                  neuronaVoice.setVoice(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-rose-400 text-xs text-white outline-none"
              >
                <option value="id-ID-Journey-O">Google Cloud Journey-O (ID ♀ Natural & Ultra-Realistis)</option>
                <option value="id-ID-Wavenet-B">Google Cloud Wavenet-B (ID ♂ Bertenaga & Dinamis)</option>
                <option value="en-US-Journey-D">Google Cloud Journey-D (EN ♂ Narator Sinematik)</option>
                <option value="ja-JP-Neural2-B">Google Cloud Neural2-B (JA ♀ Seiyuu Anime)</option>
                <option value="openai-female-nova">ChatGPT Nova (OpenAI - ♀ Ceria & Energik)</option>
                <option value="openai-male-onyx">ChatGPT Onyx (OpenAI - ♂ Berwibawa & Podcast)</option>
                <option value="eleven-male-adam">Adam Epic Narrator (ElevenLabs - ♂ Epik)</option>
              </select>
            </div>
          </div>

          {/* Nada Suara & Aspek Rasio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                Gaya Emosi Suara (Voice Acting)
              </label>
              <select
                id="select-anim-voicetone"
                value={voiceTone}
                onChange={(e) => setVoiceTone(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-white outline-none"
              >
                {VOICE_TONES.map((vt) => (
                  <option key={vt.id} value={vt.id}>{vt.label} - {vt.desc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                <Clapperboard className="w-3.5 h-3.5" />
                Format Rasio Layar
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="ratio-16-9"
                  onClick={() => setAspectRatio('16:9')}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
                    aspectRatio === '16:9'
                      ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>16:9 Landscape (Bioskop / YouTube)</span>
                </button>
                <button
                  type="button"
                  id="ratio-9-16"
                  onClick={() => setAspectRatio('9:16')}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
                    aspectRatio === '9:16'
                      ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>9:16 Vertikal (TikTok / Reels)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              id="cancel-anim-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              id="submit-anim-btn"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition active:scale-95 flex items-center space-x-2 cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>Mulai Produksi Animasi (Studio Director)</span>
            </button>
          </div>

        </form>

        {/* Full Image Preview Lightbox */}
        {showFullPreview && generatedCharImage && (
          <div 
            onClick={() => setShowFullPreview(false)}
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="max-w-3xl max-h-[85vh] relative rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl">
              <img 
                src={generatedCharImage} 
                alt="Character Sheet Full View" 
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white">
                <X size={18} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
