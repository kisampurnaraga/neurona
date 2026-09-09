import React, { useState } from 'react';
import { 
  X, Megaphone, Sparkles, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoAdsConfig } from '../shared/types';
import { UnifiedVideoModelSelector, SelectedModelData } from './UnifiedVideoModelSelector';

interface VideoAdsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: VideoAdsConfig, prompt: string) => void;
}

export const VideoAdsConfigModal: React.FC<VideoAdsConfigModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [productName, setProductName] = useState('');
  const [objective, setObjective] = useState<VideoAdsConfig['objective']>('SALES');
  const [hookStyle, setHookStyle] = useState<VideoAdsConfig['hookStyle']>('FOMO');
  const [benefits, setBenefits] = useState('');
  const [cta, setCta] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16');
  const [videoProvider, setVideoProvider] = useState<string>('higgsfield');
  const [videoModel, setVideoModel] = useState<string>('veo3_1_lite');
  const [videoModelDisplayName, setVideoModelDisplayName] = useState<string>('Google Veo 3.1 Lite');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !benefits.trim() || !cta.trim()) return;

    const config: VideoAdsConfig = {
      productName,
      objective,
      hookStyle,
      benefits,
      cta,
      targetAudience: targetAudience || 'Masyarakat umum',
      aspectRatio,
      sceneCount: 4,
      videoEngine: videoModel,
      videoProvider,
      videoModel,
      videoModelDisplayName
    };

    const generatedPrompt = `Buatkan iklan video profesional untuk produk "${productName}" dengan objektif ${objective}. Formula Hook: ${hookStyle}. Manfaat: ${benefits}. CTA: ${cta}. Target Audience: ${targetAudience || 'Umum'}.`;
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
          <div className="p-5 border-b border-slate-800/80 bg-gradient-to-r from-emerald-950/40 to-teal-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">STUDIO VIDEO ADS COMMERCIAL</h2>
                <p className="text-xs text-slate-400">Rancang video iklan komersial berkonversi tinggi</p>
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
            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Nama Produk / Jasa</label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="cth: TWS BassKing v3, Hijab Syar'i Aisyah..."
                className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Objective & Hook Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Objektif Iklan</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as any)}
                  className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                >
                  <option value="SALES">Meningkatkan Penjualan (Sales conversion)</option>
                  <option value="AWARENESS">Kesadaran Brand (Brand Awareness)</option>
                  <option value="LEAD_GEN">Mengumpulkan Calon Pembeli (Lead Gen)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Gaya Psikologi Hook</label>
                <select
                  value={hookStyle}
                  onChange={(e) => setHookStyle(e.target.value as any)}
                  className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                >
                  <option value="FOMO">FOMO (Rasa Khawatir Ketinggalan Promo)</option>
                  <option value="PROBLEM_SOLVER">Problem Solver (Menyelesaikan Masalah Utama)</option>
                  <option value="HIGH_ENERGY">High Energy Commercial (Gaya Keren/Cepat)</option>
                  <option value="STORYTELLING">Storytelling (Berdasarkan Narasi Pendek)</option>
                </select>
              </div>
            </div>

            {/* Benefits */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Manfaat & Nilai Tambah Utama (USP)</label>
              <textarea
                required
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder="cth: Menggunakan driver audio titanium 12mm, bass sangat dalam, daya tahan baterai 48 jam penuh..."
                rows={2}
                className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition resize-none"
              />
            </div>

            {/* CTA */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Kalimat Call-to-Action (CTA)</label>
              <input
                type="text"
                required
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="cth: Klik link di bawah untuk mendapatkan diskon 50% khusus hari ini!"
                className="w-full bg-[#0E142A] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Target Audience & Aspect Ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Target Audiens</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="cth: Anak muda penikmat musik harian..."
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
                      className={`py-2 px-3 rounded-xl border font-bold text-xs transition ${aspectRatio === ratio ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[#0E142A] border-slate-800 text-slate-400 hover:text-white'}`}
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
                themeColor="emerald"
                idPrefix="video-ads-engine"
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
                Diformulasikan secara psikologis untuk konversi tinggi
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
                  disabled={!productName.trim() || !benefits.trim() || !cta.trim()}
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg disabled:opacity-50 transition"
                >
                  <span>Buat Iklan</span>
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
