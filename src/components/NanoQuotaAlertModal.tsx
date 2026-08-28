import React from 'react';
import { AlertTriangle, Zap, ShieldAlert, CreditCard, ArrowRight, X } from 'lucide-react';

interface NanoQuotaAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueWithFlux: () => void;
  onOpenTopUp: () => void;
  errorMessage?: string;
  sceneId?: string | null;
}

export const NanoQuotaAlertModal: React.FC<NanoQuotaAlertModalProps> = ({
  isOpen,
  onClose,
  onContinueWithFlux,
  onOpenTopUp,
  errorMessage,
  sceneId
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-rose-500/40 rounded-2xl p-6 shadow-2xl shadow-rose-950/50 text-slate-100 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
        >
          <X size={18} />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
            <ShieldAlert size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                Peringatan Token Provider API
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Saldo Token Nano Banana Pro Tidak Mencukupi
            </h3>
          </div>
        </div>

        {/* Informative Body */}
        <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs leading-relaxed text-slate-300 mb-6">
          <p>
            Model <strong className="text-purple-300 font-semibold">Nano Banana Pro Edit</strong> mewajibkan token saldo API Fal.ai aktif untuk melakukan <span className="text-amber-300 font-medium underline decoration-amber-500/40">Product & Character Reference Lock (Image-to-Image)</span> pada adegan ini.
          </p>
          <p className="text-rose-200/90 bg-rose-950/40 border-l-2 border-rose-500 px-3 py-2 rounded-r">
            {errorMessage || 'Saldo/token API Fal.ai pada server provider saat ini habis (HTTP 402 Payment Required).'}
          </p>
          <p className="text-slate-400 text-[11px]">
            Sistem menghentikan alih otomatis tanpa persetujuan Anda agar konsistensi karakter tidak rusak oleh model Text-to-Image biasa. Silakan pilih tindakan berikutnya:
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Action 1: Continue with Flux */}
          <button
            onClick={() => {
              onClose();
              onContinueWithFlux();
            }}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Zap size={15} fill="currentColor" />
            <span>Lanjutkan dengan Flux (Draft)</span>
          </button>

          {/* Action 2: Top Up / Cancel */}
          <button
            onClick={() => {
              onClose();
              onOpenTopUp();
            }}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard size={15} className="text-cyan-400" />
            <span>Cek Saldo / Top Up</span>
          </button>
        </div>
      </div>
    </div>
  );
};
