import React, { useState } from 'react';
import { 
  X, Film, Sparkles, AlertCircle, ChevronRight, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FilmConfig } from '../shared/types';
import { UnifiedVideoModelSelector, SelectedModelData } from './UnifiedVideoModelSelector';

interface FilmConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: FilmConfig, prompt: string) => void;
}

export const FilmConfigModal: React.FC<FilmConfigModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<FilmConfig['genre']>('DRAMA');
  const [style, setStyle] = useState<FilmConfig['style']>('DARK_MOODY');
  const [logline, setLogline] = useState('');
  const [charactersDescription, setCharactersDescription] = useState('');
  const [voiceTone, setVoiceTone] = useState('DEEP_CINEMATIC');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [videoProvider, setVideoProvider] = useState<string>('higgsfield');
  const [videoModel, setVideoModel] = useState<string>('veo3_1');
  const [videoModelDisplayName, setVideoModelDisplayName] = useState<string>('Google Veo 3.1 Cinematic');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !logline.trim()) return;

    const config: FilmConfig = {
      title,
      genre,
      style,
      logline,
      charactersDescription,
      voiceTone,
      aspectRatio,
      sceneCount: 4,
      videoEngine: videoModel,
      videoProvider,
      videoModel,
      videoModelDisplayName
    };

    const generatedPrompt = `Buatkan film sinematik berjudul "${title}" bergenre ${genre} dengan gaya visual ${style}. Logline: ${logline}. Karakter: ${charactersDescription || 'Tanpa deskripsi tambahan'}.`;
    onSubmit(config, generatedPrompt);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#090D1C] border border-indigo-500/30 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/40 to-purple-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">STUDIO FILM SINEMATIK</h2>
                <p className="text-xs text-slate-400">Rancang mahakarya narasi sinematik Anda sendiri</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Judul Film / Project</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="cth: Sang Penjaga Angin, Senja di Borobudur..."
                className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Genre & Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Genre Cerita</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value as any)}
                  className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                >
                  <option value="DRAMA">Drama Emosional</option>
                  <option value="SCI_FI">Sains Fiksi (Sci-Fi)</option>
                  <option value="THRILLER">Thriller / Misteri</option>
                  <option value="ACTION">Aksi / Laga</option>
                  <option value="ROMANCE">Romansa Romantis</option>
                  <option value="FANTASY">Fantasi Mitologi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Gaya Visual / Cinematic Palette</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as any)}
                  className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                >
                  <option value="DARK_MOODY">Dark & Moody (Atmospheric, Shadows)</option>
                  <option value="ANAMORPHIC">Anamorphic Lens Flare (High Sci-Fi)</option>
                  <option value="NEO_NOIR">Neo-Noir (High Contrast, Rainy)</option>
                  <option value="IMAX_EXPANSIVE">IMAX Expansive (Panoramic, Epic)</option>
                  <option value="WARM_VINTAGE">Warm Vintage Film (Retro Film Grain)</option>
                </select>
              </div>
            </div>

            {/* Logline */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Logline / Premise Film (Maks 1 Paragraph)</label>
              <textarea
                required
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                placeholder="cth: Di tahun 2085, seorang penemu robot tua menemukan transmisi suara aneh dari masa lalu..."
                rows={2}
                className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition resize-none"
              />
            </div>

            {/* Characters Description */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Deskripsi Karakter Utama (Opsional)</label>
              <textarea
                value={charactersDescription}
                onChange={(e) => setCharactersDescription(e.target.value)}
                placeholder="cth: Sarah, astronot wanita 30-an, berjaket kulit cokelat usang, pandangan mata penuh rasa ingin tahu..."
                rows={2}
                className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition resize-none"
              />
            </div>

            {/* Voice Tone & Aspect Ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Voice Tone Narator</label>
                <select
                  value={voiceTone}
                  onChange={(e) => setVoiceTone(e.target.value)}
                  className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                >
                  <option value="DEEP_CINEMATIC">Deep Cinematic Voice (Bioskop)</option>
                  <option value="WHISPERING">Whispering & Intimate (Lembut)</option>
                  <option value="MYSTERIOUS">Mysterious & Suspenseful (Thriller)</option>
                  <option value="CALM">Calm & Eloquent (Narasi Tenang)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Format Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs transition ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#0E142A] border-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      {ratio === '16:9' ? '16:9 Landscape' : ratio === '9:16' ? '9:16 Portrait' : '1:1 Square'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Video Engine Selection */}
            <div className="bg-[#0b1022] border border-slate-800/80 rounded-2xl p-3.5">
              <UnifiedVideoModelSelector
                selectedProvider={videoProvider}
                selectedModelId={videoModel}
                themeColor="indigo"
                idPrefix="film-video-engine"
                compact={true}
                onChange={(selection: SelectedModelData) => {
                  setVideoProvider(selection.provider);
                  setVideoModel(selection.internalModelId);
                  setVideoModelDisplayName(selection.displayName);
                }}
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" />
                Mendukung High Resolution Video Engine
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 rounded-xl text-slate-400 hover:text-white font-bold text-xs border border-slate-800 hover:bg-slate-900 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !logline.trim()}
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg disabled:opacity-50 transition"
                >
                  <span>Mulai Produksi</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
