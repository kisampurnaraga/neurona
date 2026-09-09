import React, { useState } from 'react';
import { 
  X, Zap, Sparkles, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuickCreateConfig } from '../shared/types';
import { UnifiedVideoModelSelector, SelectedModelData } from './UnifiedVideoModelSelector';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: QuickCreateConfig, prompt: string) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [topic, setTopic] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16');
  const [targetAudience, setTargetAudience] = useState('');
  const [style, setStyle] = useState<QuickCreateConfig['style']>('CINEMATIC');
  const [videoProvider, setVideoProvider] = useState<string>('higgsfield');
  const [videoModel, setVideoModel] = useState<string>('veo3_1_lite');
  const [videoModelDisplayName, setVideoModelDisplayName] = useState<string>('Google Veo 3.1 Lite');
  const [characterReferenceUrl, setCharacterReferenceUrl] = useState('');
  const [sketchReferenceUrl, setSketchReferenceUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const config: QuickCreateConfig = {
      topic,
      aspectRatio,
      targetAudience: targetAudience || 'Umum',
      style,
      videoEngine: videoModel,
      videoProvider,
      videoModel,
      videoModelDisplayName,
      characterReferenceUrl,
      sketchReferenceUrl
    };

    const generatedPrompt = `Buatkan video ekspres bertema "${topic}" dengan gaya visual ${style} untuk audiens ${targetAudience || 'Umum'}.`;
    onSubmit(config, generatedPrompt);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-[#090D1C] border border-indigo-500/30 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden my-auto sm:my-10"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/40 via-[#0B1028] to-purple-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">⚡ QUICK CREATE EXPRESS</h2>
                <p className="text-xs text-slate-400">Formula instan membuat video dengan satu kalimat</p>
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
            {/* Topic */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Topik / Ide Utama Video</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="cth: Kopi pagi membawa keberuntungan, Misteri Segitiga Bermuda..."
                className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Visual Style Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Pilih Style Visual</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'CINEMATIC', label: '🎬 Cinematic', desc: 'Gaya film sinematik' },
                  { id: 'MODERN_MINIMALIST', label: '✨ Minimalist', desc: 'Estetika modern bersih' },
                  { id: 'ANIME', label: '🌸 Anime Art', desc: 'Kartun Jepang Ghibli' },
                  { id: 'UGC', label: '📱 UGC Creator', desc: 'Gaya rekam video HP' }
                ] as const).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`p-3 rounded-2xl border text-left transition ${style === s.id ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' : 'bg-[#0E142A] border-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    <div className="font-bold text-xs">{s.label}</div>
                    <div className="text-[10px] text-slate-400/80 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience & Aspect Ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Target Audiens</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="cth: Penggemar misteri, Milenial..."
                  className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                />
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

            {/* Reference Media */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Character Reference (Optional)</label>
                <input
                  type="text"
                  value={characterReferenceUrl}
                  onChange={(e) => setCharacterReferenceUrl(e.target.value)}
                  placeholder="URL Foto Referensi Wajah..."
                  className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Sketch Reference (Optional)</label>
                <input
                  type="text"
                  value={sketchReferenceUrl}
                  onChange={(e) => setSketchReferenceUrl(e.target.value)}
                  placeholder="URL Foto Referensi Sketsa..."
                  className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                />
              </div>
            </div>

            {/* Video Engine Selection */}
            <div className="bg-[#0b1022] border border-slate-800/80 rounded-2xl p-3.5">
              <UnifiedVideoModelSelector
                selectedProvider={videoProvider}
                selectedModelId={videoModel}
                themeColor="indigo"
                idPrefix="quick-video-engine"
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
                Sederhana, instan, 100% otomatis
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
                  disabled={!topic.trim()}
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg disabled:opacity-50 transition"
                >
                  <span>Mulai Kilat</span>
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
