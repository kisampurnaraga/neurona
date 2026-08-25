import React, { useState } from 'react';
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
  Maximize2 
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
  const [imageEngine, setImageEngine] = useState<string>('flux-diffusion');

  // Text-to-Image Character Sheet Generator State
  const [isGeneratingChar, setIsGeneratingChar] = useState(false);
  const [generatedCharImage, setGeneratedCharImage] = useState<string | null>(null);
  const [characterVisualAnalysis, setCharacterVisualAnalysis] = useState<string>('');
  const [showFullPreview, setShowFullPreview] = useState(false);

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
    const engineName = imageEngine === 'gemini-imagen-3' ? 'Google Imagen 3' : imageEngine === 'chatgpt-image-2' ? 'DALL-E 3' : imageEngine === 'midjourney-v6' ? 'Midjourney v6' : 'Flux.1 Ultra AI';
    neuronaVoice.speak(`Membuat lembar referensi karakter multi-angle menggunakan engine ${engineName}...`);
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
        setCharacterVisualAnalysis(data.visualAnalysis || `Ciri fisik karakter terkunci: ${characterDescription}`);
        neuronaVoice.speak(`Karakter referensi berhasil dibuat dengan ${engineName}. Visual lock aktif.`);
      }
    } catch (err) {
      console.error("Gagal generate karakter:", err);
    } finally {
      setIsGeneratingChar(false);
    }
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
      characterVisualAnalysis: characterVisualAnalysis || (generatedCharImage ? `Karakter referensi: ${characterDescription}` : undefined),
      characterReferenceUrl: generatedCharImage || undefined
    };
    
    const prompt = `Buatkan video animasi ${artStyle.replace(/_/g, ' ')} berjudul "${title}" dengan karakter ${characterDescription} di dunia ${worldSetting}. Bahasa narasi/dialog: ${language}.`;
    
    const attachedAssets = generatedCharImage ? [
      {
        id: `char_ref_${Date.now()}`,
        name: `Character_Reference_Sheet.jpg`,
        type: 'image' as const,
        url: generatedCharImage,
        size: '1.5 MB'
      }
    ] : undefined;

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
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  DESKRIPSI TOKOH & GENERATE KARAKTER AI (CHARACTER LOCK)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih Engine Model AI & tekan tombol <strong>Text-to-Image</strong> untuk membuat referensi karakter terfokus.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Auto Prompt from Title Button */}
                <button
                  type="button"
                  onClick={handleAutoGenerateCharacterFromTitle}
                  title="Otomatiskan deskripsi karakter & latar dunia sesuai Judul Animasi"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>✨ Auto Prompt Sesuai Judul</span>
                </button>

                {/* Dropdown Model A.I Penghasil Gambar */}
                <div className="flex items-center gap-1 bg-slate-900 border border-cyan-500/40 rounded-xl px-2.5 py-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <select
                    id="select-char-image-engine"
                    value={imageEngine}
                    onChange={(e) => setImageEngine(e.target.value)}
                    className="bg-transparent text-xs text-cyan-300 font-semibold outline-none cursor-pointer pr-1"
                  >
                    <option value="flux-diffusion" className="bg-slate-900 text-slate-200">⚡ Flux.1 Ultra AI (Diffusion 8K)</option>
                    <option value="gemini-imagen-3" className="bg-slate-900 text-slate-200">🎨 Google Imagen 3 (AI Studio)</option>
                    <option value="chatgpt-image-2" className="bg-slate-900 text-slate-200">🤖 OpenAI DALL-E 3 (ChatGPT)</option>
                    <option value="midjourney-v6" className="bg-slate-900 text-slate-200">✨ Midjourney v6 Cinematic</option>
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

            <textarea
              id="input-anim-character"
              rows={2}
              value={characterDescription}
              onChange={(e) => setCharacterDescription(e.target.value)}
              placeholder="Ciri fisik lengkap: gaya/warna rambut, seragam/jersey, nomor punggung, ekspresi wajah, aksesori..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-xs text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
            />

            {/* AI Generated Character Sheet Preview Banner */}
            {generatedCharImage && (
              <div className="p-3 rounded-xl bg-[#090E20] border border-cyan-400/40 flex flex-col sm:flex-row items-center gap-4">
                <div 
                  onClick={() => setShowFullPreview(true)}
                  className="w-full sm:w-48 h-28 rounded-lg overflow-hidden bg-black/60 relative group cursor-pointer shrink-0 border border-cyan-500/30"
                >
                  <img 
                    src={generatedCharImage} 
                    alt="Character Reference Sheet"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-[11px] text-white font-medium">
                    <Eye size={14} />
                    <span>Perbesar</span>
                  </div>
                </div>

                <div className="space-y-1.5 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      Multi-Angle Character Sheet Terkunci
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      VISION LOCK ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Karakter ini akan dijadikan referensi visual konsisten untuk semua adegan storyboard, pencahayaan volumetric, dan render video Veo / BytePlus.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateCharacterSheet}
                    disabled={isGeneratingChar}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-medium flex items-center gap-1 pt-0.5 cursor-pointer"
                  >
                    <RefreshCw size={10} />
                    Regenerate Karakter Lain
                  </button>
                </div>
              </div>
            )}
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

          {/* Mesin Video AI & Pengisi Suara TTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/20">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                Mesin Generator Video AI
              </label>
              <select
                id="select-anim-video-engine"
                defaultValue={localStorage.getItem('neurona_video_model') || 'byteplus'}
                onChange={(e) => localStorage.setItem('neurona_video_model', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-xs text-white outline-none"
              >
                <option value="byteplus">BytePlus ModelArk (PixelDance/Doubao - Baru & Rekomendasi)</option>
                <option value="veo">Google Veo 3.1 (Rekomendasi Utama Sinematik)</option>
                <option value="runway">Runway Gen-3 Alpha (Tier 1 Video HD)</option>
              </select>
            </div>

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
