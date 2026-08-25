import React, { useState } from 'react';
import { Coins, Sparkles, Check, Zap, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { neuronaVoice } from '../utils/speechSynthesis';

interface CreditTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  onAddCredits: (amount: number) => void;
}

export const PRICING_PACKAGES = [
  {
    id: 'starter',
    name: 'Creator Starter',
    badge: 'STARTER',
    credits: 100,
    priceIdr: 'Rp 75.000',
    priceUsd: '$4.99',
    description: 'Cocok untuk mencicipi generate keyframe gambar dan video multi-shot.',
    features: [
      '100 Kredit AI (20 Gambar / 6 Scene Video)',
      'Free AI Storyboard & Consistent Character Seed',
      'Akses 8 Agen AI Indonesia (BATARA dkk)',
      'Download Naskah & Video 1080p'
    ],
    popular: false,
    color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
  },
  {
    id: 'creator_pro',
    name: 'Pro Content Creator',
    badge: 'REKOMENDASI (PROMO)',
    credits: 250,
    priceIdr: 'Rp 150.000',
    priceUsd: '$9.99',
    description: 'Paling favorit untuk affiliate marketer & creator YouTube/TikTok/Shopee.',
    features: [
      '250 Kredit AI Video Generatif',
      'Free Unlimited AI Storyboard (Hemat Rp 150.000)',
      'Konsistensi Karakter Wajah & Busana Terkunci',
      'Prioritas Render Sora, Runway & Kling AI',
      'Voiceover TryAudio & ElevenLabs Studio'
    ],
    popular: true,
    color: 'border-amber-500/60 bg-amber-950/30 text-amber-300'
  },
  {
    id: 'studio_master',
    name: 'Studio Master Elite',
    badge: 'BEST VALUE',
    credits: 400,
    priceIdr: 'Rp 200.000',
    priceUsd: '$12.99',
    description: 'Paket lengkap produksi video serial, animasi cerita & edukasi viral.',
    features: [
      '400 Kredit AI Video Generatif',
      'Free Unlimited AI Storyboard & Multi-Scene Director',
      'Keyframe Generator Karakter Ultra-HD 4K',
      'Multi-Track Audio Engine & Moving Subtitles',
      'Lisensi Komersial Penuh & Tanpa Watermark'
    ],
    popular: false,
    color: 'border-purple-500/50 bg-purple-950/20 text-purple-300'
  },
  {
    id: 'agency',
    name: 'Agency Enterprise',
    badge: 'UNLIMITED SPEED',
    credits: 1200,
    priceIdr: 'Rp 499.000',
    priceUsd: '$32.99',
    description: 'Untuk digital agency, brand owner & produksi video massal skala besar.',
    features: [
      '1.200 Kredit AI Video Generatif',
      'Dedicated Neural Video Cluster Prioritas',
      'Batch Video Rendering & API Access',
      'Custom Seiyuu Voice Cloning',
      'Dukungan Teknis Prioritas 24/7'
    ],
    popular: false,
    color: 'border-rose-500/40 bg-rose-950/20 text-rose-300'
  }
];

export const CreditTopUpModal: React.FC<CreditTopUpModalProps> = ({
  isOpen,
  onClose,
  currentCredits,
  onAddCredits
}) => {
  const [selectedPkg, setSelectedPkg] = useState<string>('pro');
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = (credits: number, name: string) => {
    onAddCredits(credits);
    setIsSuccessToast(true);
    neuronaVoice.playChime('SUCCESS');
    neuronaVoice.speak(`Top up berhasil! ${credits} kredit telah ditambahkan ke akun Anda.`);
    setTimeout(() => {
      setIsSuccessToast(false);
      onClose();
    }, 1200);
  };

  return (
    <div 
      id="modal-credit-topup"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div className="bg-[#0b0c10] border border-cyan-500/40 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <Coins size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                  Top Up Saldo Kredit NEURONA AI
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                  PRODUKSI VIDEO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gunakan Storyboard secara gratis, atau isi kredit untuk eksekusi generate video oleh 8 Agen AI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/40 text-xs font-mono text-amber-300">
              <Coins size={14} className="text-amber-400" />
              <span>Saldo: <strong>{currentCredits}</strong> Kredit</span>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body: Pricing Cards */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Quick Notice Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400 shrink-0" />
              <span>
                <strong>Model Bisnis Transparan:</strong> Storyboard, Subtitle & Prompt I2V <strong>GRATIS</strong>. Eksekusi render video AI = <strong>20 Kredit / Video</strong> (5 kredit per adegan).
              </span>
            </div>
            <button
              onClick={() => handlePurchase(100, 'Demo Free 100')}
              className="px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-cyan-200 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition"
              title="Isi 100 Kredit gratis untuk mencoba fitur"
            >
              +100 Kredit Demo
            </button>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING_PACKAGES.map((pkg) => {
              const isSelected = selectedPkg === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg.id)}
                  className={`relative rounded-2xl p-4 flex flex-col justify-between border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-amber-400 bg-slate-900/90 shadow-xl shadow-amber-500/10 scale-[1.02]' 
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 text-[9px] font-black tracking-widest uppercase shadow">
                      {pkg.badge}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-white uppercase">{pkg.name}</span>
                      <span className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono text-amber-400 border border-amber-500/20">
                        {pkg.credits} CR
                      </span>
                    </div>

                    <div>
                      <div className="text-xl font-black text-white">{pkg.priceIdr}</div>
                      <div className="text-[10px] text-slate-400 font-mono">({pkg.priceUsd} USD)</div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">{pkg.description}</p>

                    <div className="border-t border-white/5 pt-2.5 space-y-1.5 text-[10px] text-slate-300">
                      {pkg.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pkg.credits, pkg.name);
                    }}
                    className={`mt-4 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                    }`}
                  >
                    <Zap size={13} fill="currentColor" />
                    <span>Beli Paket ({pkg.credits} Kredit)</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-white/5 pt-3 font-mono">
            <div className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Garansi 100% Kredit Kembali Jika Render Gagal</span>
            </div>
            <span>PEMBAYARAN INSTAN • QRIS / VA / CC</span>
          </div>

        </div>

        {/* Success Toast */}
        {isSuccessToast && (
          <div className="p-3 bg-emerald-950 border-t border-emerald-500 text-center text-xs font-bold text-emerald-300 animate-pulse">
            ✅ Pembelian Kredit Berhasil Diverifikasi! Saldo Telah Ditambahkan.
          </div>
        )}

      </div>
    </div>
  );
};
