import React, { useState } from 'react';
import { Sparkles, X, Wand2, Film, Palette, Globe, Volume2, Clapperboard, Check } from 'lucide-react';
import { AnimationConfig } from '../shared/types';
import { neuronaVoice } from '../utils/speechSynthesis';

interface AnimationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: AnimationConfig, prompt: string) => void;
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
  { id: 'ACTION', label: 'Aksi Cepat (High Action)' }
];

const VOICE_TONES: { id: AnimationConfig['voiceTone']; label: string; desc: string }[] = [
  { id: 'CHEERFUL', label: 'Ceria & Semangat', desc: 'Cocok untuk petualangan dan anak-anak' },
  { id: 'EPIC_HEROIC', label: 'Heroik & Epik', desc: 'Nada narator film bioskop laga' },
  { id: 'DEEP_DRAMATIC', label: 'Dramatis & Berat', desc: 'Misteri atau momen emosional' },
  { id: 'CUTE_ANIME', label: 'Gaya Anime Seiyuu', desc: 'Khas pengisi suara anime Jepang' },
  { id: 'CALM_NARRATOR', label: 'Narator Tenang', desc: 'Elegan dan terstruktur' }
];

export const AnimationConfigModal: React.FC<AnimationConfigModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [title, setTitle] = useState('Petualangan Robot Penjelajah Galaksi');
  const [artStyle, setArtStyle] = useState<AnimationConfig['artStyle']>('3D_PIXAR');
  const [language, setLanguage] = useState('id');
  const [targetGenre, setTargetGenre] = useState<AnimationConfig['targetGenre']>('ADVENTURE');
  const [characterDescription, setCharacterDescription] = useState('Karakter robot kecil lucu bernama Bolt dengan mata bercahaya biru dan ransel energi');
  const [worldSetting, setWorldSetting] = useState('Planet kristal neon dengan langit aurora dan vegetasi bercahaya');
  const [voiceTone, setVoiceTone] = useState<AnimationConfig['voiceTone']>('CHEERFUL');
  const [aspectRatio, setAspectRatio] = useState<AnimationConfig['aspectRatio']>('16:9');

  if (!isOpen) return null;

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
      aspectRatio
    };
    
    const prompt = `Buatkan video animasi ${artStyle.replace(/_/g, ' ')} berjudul "${title}" dengan karakter ${characterDescription} di dunia ${worldSetting}. Bahasa narasi/dialog: ${language}.`;
    onSubmit(config, prompt);
    onClose();
  };

  return (
    <div id="animation-config-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div id="animation-config-modal-container" className="relative w-full max-w-4xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                Studio Video Animasi & Storytelling
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  Neural Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">Konfigurasi visual universe, gaya render, karakter, dan multi-bahasa</p>
            </div>
          </div>
          <button
            id="btn-close-animation-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-slate-200">
          
          {/* Judul Animasi */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
              Judul / Ide Cerita Animasi
            </label>
            <input
              id="input-anim-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Petualangan Kucing Samurai di Kota Cyberpunk"
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ART_STYLES.map((style) => (
                <button
                  key={style.id}
                  id={`style-btn-${style.id}`}
                  type="button"
                  onClick={() => setArtStyle(style.id)}
                  className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                    artStyle === style.id
                      ? 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400 shadow-md shadow-cyan-950'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{style.icon}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {style.tag}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white leading-tight mb-1">
                      {style.title}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
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

          {/* Bahasa & Genre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
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
                    className={`p-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition ${
                      language === lang.code
                        ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300'
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
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

          {/* Deskripsi Karakter & World Setting */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Deskripsi Tokoh / Karakter Utama
              </label>
              <textarea
                id="input-anim-character"
                rows={2}
                value={characterDescription}
                onChange={(e) => setCharacterDescription(e.target.value)}
                placeholder="Ciri fisik, pakaian, ekspresi wajah, kepribadian..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-500 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Setting Dunia / Latar Tempat (World-Building)
              </label>
              <textarea
                id="input-anim-world"
                rows={2}
                value={worldSetting}
                onChange={(e) => setWorldSetting(e.target.value)}
                placeholder="Kota masa depan, hutan fantasi, kastil awan, pencahayaan..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Mesin Video AI & Pengisi Suara TTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/20">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
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
                <option value="veo">Google Veo 3.1 (Rekomendasi Utama & API Ready)</option>
                <option value="runway">Runway Gen-3 Alpha (Fallback Tier 1 & API Ready)</option>
                <option value="sora" disabled>OpenAI Sora Turbo (Disabled - No Public API)</option>
                <option value="luma" disabled>Luma Dream Machine (Perlu API Key)</option>
                <option value="kling" disabled>Kling AI 1.5 HD (Perlu API Key)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                Pengisi Suara Narator TTS
              </label>
              <select
                id="select-anim-voice-actor"
                defaultValue={localStorage.getItem('neurona_voice_id') || 'openai-female-nova'}
                onChange={(e) => {
                  localStorage.setItem('neurona_voice_id', e.target.value);
                  neuronaVoice.setVoice(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-rose-400 text-xs text-white outline-none"
              >
                <option value="id-ID-Journey-O">Google Cloud Journey-O (ID ♀ Natural & Ultra-Realistis)</option>
                <option value="id-ID-Wavenet-A">Google Cloud Wavenet-A (ID ♀ Jernih & Profesional)</option>
                <option value="id-ID-Wavenet-B">Google Cloud Wavenet-B (ID ♂ Bertenaga & Dinamis)</option>
                <option value="en-US-Journey-D">Google Cloud Journey-D (EN ♂ Narator Sinematik)</option>
                <option value="ja-JP-Neural2-B">Google Cloud Neural2-B (JA ♀ Seiyuu Anime)</option>
                <option value="openai-female-nova">ChatGPT Nova (OpenAI - ♀ Ceria, Energik & Ramah)</option>
                <option value="openai-male-onyx">ChatGPT Onyx (OpenAI - ♂ Berwibawa & Podcast)</option>
                <option value="openai-female-shimmer">ChatGPT Shimmer (OpenAI - ♀ Lembut & Sinematik)</option>
                <option value="openai-male-echo">ChatGPT Echo (OpenAI - ♂ Hangat & Bersahabat)</option>
                <option value="openai-neutral-alloy">ChatGPT Alloy (OpenAI - ♀ Netral Khas ChatGPT)</option>
                <option value="tryaudio-female-citra">Citra Kirana (Neural AI - ♀ Perempuan Ceria)</option>
                <option value="tryaudio-male-dimas">Dimas Perkasa (Neural AI - ♂ Laki-Laki Berwibawa)</option>
                <option value="eleven-male-adam">Adam Epic Narrator (ElevenLabs - ♂ Laki-Laki Epik)</option>
                <option value="eleven-female-rachel">Rachel Storyteller (ElevenLabs - ♀ Perempuan Emosional)</option>
              </select>
            </div>
          </div>

          {/* Nada Suara & Aspek Rasio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                <Clapperboard className="w-3.5 h-3.5" />
                Format Rasio Layar
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '16:9', label: '16:9 (Landscape Bioskop/YouTube)' },
                  { id: '9:16', label: '9:16 (Vertical TikTok/Reels)' },
                  { id: '1:1', label: '1:1 (Square Feed)' }
                ].map((ratio) => (
                  <button
                    key={ratio.id}
                    id={`ratio-btn-${ratio.id.replace(':', '-')}`}
                    type="button"
                    onClick={() => setAspectRatio(ratio.id as any)}
                    className={`py-2 px-2 text-[11px] font-medium rounded-xl border text-center transition ${
                      aspectRatio === ratio.id
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {ratio.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              id="btn-cancel-anim"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Batal
            </button>
            <button
              id="btn-generate-anim"
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition"
            >
              <Wand2 className="w-4 h-4" />
              Mulai Produksi Animasi
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
