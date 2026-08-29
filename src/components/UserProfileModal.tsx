import React from 'react';
import { 
  X, 
  User, 
  Mail, 
  ShieldCheck, 
  Coins, 
  Sparkles, 
  Phone, 
  LogOut, 
  Crown, 
  ExternalLink,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { User as UserType } from '../shared/types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType | null;
  userCredits?: number;
  onOpenTopUp: () => void;
  onLogout?: () => void;
  onOpenFounder?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userCredits = 0,
  onOpenTopUp,
  onLogout,
  onOpenFounder
}) => {
  if (!isOpen) return null;

  const isFounder = currentUser?.role === 'founder';
  const userName = currentUser?.name || 'Kreator Neuronna';
  const userEmail = currentUser?.email || 'kreator@neuronna.ai';
  const userPhone = currentUser?.phoneWa || currentUser?.phone_wa || '0812-3456-7890';
  const isEarlyBird = currentUser?.packageTier === 'early_bird_lifetime' || currentUser?.package_tier === 'early_bird_lifetime';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-[#090D1A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Background Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 relative p-5 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-black/40 text-indigo-300 border border-indigo-500/30 backdrop-blur-sm flex items-center gap-1.5">
              <Crown className="w-3 h-3 text-amber-400" />
              {isFounder ? 'MASTER FOUNDER & ARCHITECT' : isEarlyBird ? 'MEMBER EARLY BIRD LIFETIME' : 'KREATOR PRO'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Avatar Card Overlay */}
        <div className="px-6 pb-6 pt-0 relative flex-1 flex flex-col justify-between -mt-12 space-y-5">
          
          {/* Avatar and Basic Info */}
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-3.5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-0.5 shadow-xl border-2 border-[#090D1A] relative">
                <div className="w-full h-full rounded-[14px] bg-[#0A0E1F] flex items-center justify-center text-2xl font-black text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#090D1A] flex items-center justify-center text-[10px] text-white">
                  ✓
                </div>
              </div>

              <div className="pb-1">
                <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                  {userName}
                  {isFounder && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      FOUNDER
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{userEmail}</p>
              </div>
            </div>

            <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Aktif
            </span>
          </div>

          {/* Balance / Credits Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-950 border border-indigo-500/30 shadow-inner flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Saldo Kredit Produksi Video
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white">{currentUser?.credits !== undefined ? currentUser.credits : userCredits}</span>
                <span className="text-xs text-indigo-300 font-medium">Kredit Tersedia</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Estimasi sisa render: ~{Math.floor((currentUser?.credits ?? userCredits) / 8)} Scene Video AI
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenTopUp();
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Top-Up Kredit</span>
            </button>
          </div>

          {/* Account Details List */}
          <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Informasi Akun
            </div>
            
            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-2">
                <Mail size={13} className="text-slate-500" />
                Email Terdaftar
              </span>
              <span className="text-slate-200 font-mono font-medium">{userEmail}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-2">
                <Phone size={13} className="text-slate-500" />
                WhatsApp
              </span>
              <span className="text-slate-200 font-mono">{userPhone}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-2">
                <ShieldCheck size={13} className="text-slate-500" />
                Tingkat Akses
              </span>
              <span className="text-indigo-400 font-semibold">
                {isFounder ? 'Root Administrator (Founder)' : 'Early Bird Lifetime Access'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400 flex items-center gap-2">
                <Layers size={13} className="text-slate-500" />
                Engine Video
              </span>
              <span className="text-emerald-400 font-mono">Fal.ai Video Studio (11 Verified Models)</span>
            </div>
          </div>

          {/* Founder Exclusive Gateway Button (Only visible & clickable if currentUser.role === 'founder') */}
          {isFounder && onOpenFounder && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-yellow-950/30 border border-amber-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Lock size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300">Founder Control Center</div>
                  <div className="text-[10px] text-amber-400/80">Akses khusus manajemen platform & kuota</div>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenFounder();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <span>Buka FCC</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Action Buttons: Support WA & Logout */}
          <div className="flex items-center gap-3 pt-2">
            <a
              href="https://wa.me/6281234567890?text=Halo%20Admin%20Neuronna,%20saya%20butuh%20bantuan%20terkait%20akun%20saya"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <ExternalLink size={13} />
              <span>Bantuan WhatsApp</span>
            </a>

            <button
              onClick={() => {
                onClose();
                if (onLogout) {
                  onLogout();
                } else {
                  localStorage.removeItem('neurona_auth_token');
                  localStorage.removeItem('neurona_user');
                  window.location.reload();
                }
              }}
              className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
