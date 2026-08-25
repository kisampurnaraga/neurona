import React from 'react';
import { 
  Clapperboard, 
  ShoppingBag, 
  GraduationCap, 
  X, 
  Sparkles, 
  ArrowRight, 
  Wand2, 
  Smartphone, 
  Layers, 
  CheckCircle2,
  ChevronRight,
  Flame,
  Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudioSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAnimation: () => void;
  onSelectAffiliate: () => void;
  onSelectEducational: () => void;
}

export const StudioSelectorModal: React.FC<StudioSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectAnimation,
  onSelectAffiliate,
  onSelectEducational,
}) => {
  if (!isOpen) return null;

  const studios = [
    {
      id: 'animation',
      title: 'Studio Animasi',
      subtitle: '3D Pixar, Unreal Engine & Anime Cinematic',
      tag: 'CINEMATIC 3D & ANIME',
      color: 'from-purple-600 via-indigo-600 to-blue-600',
      glowColor: 'rgba(147, 51, 234, 0.4)',
      borderColor: 'border-purple-500/40 hover:border-purple-400',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: Clapperboard,
      subIcon: Wand2,
      description: 'Ideal untuk produksi video storytelling, film pendek animasi 3D CGI, kartun anime Ghibli/Shinkai, dan visualisasi fiksi ilmiah beresolusi tinggi.',
      features: [
        '8 Gaya Artistik (Pixar 3D, Unreal Engine, Cyberpunk, Ghibli)',
        'Multi-Language Seiyuu Voiceover & Lip-Sync AI',
        'Alur Cerita Dramatis, Komedi, Petualangan & Fantasi',
        'Generasi Kamera Sinematik (Orbit, Dolly, Crane Shot)'
      ],
      action: onSelectAnimation,
      btnLabel: 'Buka Studio Animasi',
      btnGradient: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
    },
    {
      id: 'affiliate',
      title: 'Studio Affiliate',
      subtitle: 'UGC TikTok Shop, Reels & Shopee Video',
      tag: 'VIRAL PRODUCT UGC',
      color: 'from-emerald-600 via-teal-600 to-cyan-600',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: ShoppingBag,
      subIcon: Smartphone,
      description: 'Didesain khusus bagi kreator affiliate & brand. Menghasilkan video review produk bergaya iPhone kasual yang lolos uji QA psikologi penjualan.',
      features: [
        'Formula Hook Pencegah Scroll (Problem-Solver, FOMO, Pain Point)',
        'Estetika Raw Smartphone Handheld (iPhone 15, Natural Light)',
        'Product Lock Presisi (Demonstrasi fitur, unboxing & pemakaian)',
        'Call-to-Action Konversi Keranjang Kuning & Promo Flash Sale'
      ],
      action: onSelectAffiliate,
      btnLabel: 'Buka Studio Affiliate',
      btnGradient: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
    },
    {
      id: 'educational',
      title: 'Studio Edukasi',
      subtitle: 'Explainer, Micro-Learning & Infografis STEM',
      tag: 'PEDAGOGY & EXPLAINER',
      color: 'from-amber-600 via-orange-600 to-rose-600',
      glowColor: 'rgba(245, 158, 11, 0.4)',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: GraduationCap,
      subIcon: Layers,
      description: 'Format terstruktur untuk pengajar, akademisi, dan kreator edukasi. Mengubah materi kompleks menjadi analogi visual yang mudah dicerna.',
      features: [
        'Motion Graphics 2D, Whiteboard & Isometric 3D Explainer',
        'Segmentasi Audiens (Anak-Anak, Pelajar SMP/SMA, Profesional, ELI5)',
        'Kategori STEM, Bisnis Finansial, Sains, Sejarah & AI',
        'Struktur Bab Pengajaran & Bilingual Voiceover'
      ],
      action: onSelectEducational,
      btnLabel: 'Buka Studio Edukasi',
      btnGradient: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl bg-[#090D1C] border border-indigo-500/30 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.2)] overflow-hidden my-auto"
        >
          {/* Top Decorative Luminous Header Bar */}
          <div className="relative p-5 sm:p-6 pb-4 border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/60 via-[#0B1028] to-purple-950/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
                    PILIH STUDIO PRODUKSI AI
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    FORM WIZARD
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pilih format studio yang ingin Anda buat melalui jalur inputan form terpandu:
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* 3 Studio Cards Container */}
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {studios.map((studio) => {
              const MainIcon = studio.icon;
              const SubIcon = studio.subIcon;

              return (
                <div
                  key={studio.id}
                  onClick={studio.action}
                  style={{
                    boxShadow: `0 4px 25px ${studio.glowColor}`
                  }}
                  className={`group relative rounded-2xl bg-[#0E142A] border ${studio.borderColor} p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer overflow-hidden`}
                >
                  {/* Subtle Background Glow Accent */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${studio.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition duration-500`} />

                  <div className="space-y-4 relative z-10">
                    {/* Header: Icon & Badge */}
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${studio.color} flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition`}>
                        <MainIcon size={24} />
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded-full border ${studio.badgeBg}`}>
                        {studio.tag}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h3 className="text-base font-extrabold text-white group-hover:text-indigo-200 transition">
                        {studio.title}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                        {studio.subtitle}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300/90 leading-relaxed">
                      {studio.description}
                    </p>

                    {/* Feature Bullets */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">
                        Fitur Utama:
                      </span>
                      {studio.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                          <CheckCircle2 size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button at Card Bottom */}
                  <div className="pt-5 mt-4 border-t border-slate-800/80 relative z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        studio.action();
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition ${studio.btnGradient}`}
                    >
                      <span>{studio.btnLabel}</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Footer Info */}
          <div className="px-6 py-3.5 bg-[#070A17] border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>Semua studio terhubung otomatis dengan Storyboard Matrix & Pipeline Produksi Video OS</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition underline underline-offset-2"
            >
              Batal / Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
