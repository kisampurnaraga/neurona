import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  MessageSquare, 
  Coins, 
  Sparkles, 
  Flame, 
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface UserSessionData {
  user_id: string;
  email: string;
  name: string;
  role: 'founder' | 'admin' | 'creator' | 'user';
  credits: number;
  status_aktif: boolean;
  package_tier: string;
  phone_wa?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSessionData, token: string) => void;
  initialMode?: 'user' | 'founder' | 'buy';
  whatsappNumber?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'user',
  whatsappNumber = '6281234567890'
}) => {
  const [mode, setMode] = useState<'user' | 'founder' | 'buy'>(initialMode);
  
  // User Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Founder Form State
  const [founderKey, setFounderKey] = useState('');
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inactiveAccountData, setInactiveAccountData] = useState<{ message: string; activation_url?: string } | null>(null);

  if (!isOpen) return null;

  const defaultWaMessage = "Halo Admin Neuronna, saya ingin mendaftar akun dan membeli akses seharga Rp 150.000. Berikut bukti transfer saya: [Lampirkan Gambar]";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultWaMessage)}`;

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Harap masukkan alamat email dan password/PIN 6 digit Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setInactiveAccountData(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.error === 'ACCOUNT_INACTIVE') {
          setInactiveAccountData({
            message: data.message || 'Akun Anda belum aktif. Harap konfirmasi pembayaran Rp 150.000 ke WhatsApp Admin.',
            activation_url: data.activation_url || whatsappUrl
          });
        } else {
          setErrorMsg(data.message || data.error || 'Login gagal. Periksa kembali email dan password Anda.');
        }
        setIsLoading(false);
        return;
      }

      // Success
      localStorage.setItem('neuronna_auth_token', data.token);
      localStorage.setItem('neuronna_user_session', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      // Offline / network fallback demo
      if (email.toLowerCase().includes('kreator') || email.toLowerCase().includes('demo')) {
        const demoUser: UserSessionData = {
          user_id: 'usr_demo_offline',
          email,
          name: email.split('@')[0],
          role: 'user',
          credits: 150,
          status_aktif: true,
          package_tier: 'early_bird_lifetime'
        };
        localStorage.setItem('neuronna_user_session', JSON.stringify(demoUser));
        onLoginSuccess(demoUser, 'demo_token');
        onClose();
      } else {
        setErrorMsg('Gagal terhubung ke server otentikasi. Silakan coba kembali.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFounderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!founderKey) {
      setErrorMsg('Harap masukkan Master Security Key Founder.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/founder-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: founderKey })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Kunci Founder tidak valid.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('neuronna_auth_token', data.token);
      localStorage.setItem('neuronna_user_session', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      // Fallback check
      if (
        founderKey.trim() === 'NEURONNA_FOUNDER_MASTER_2025' || 
        founderKey.trim() === 'ia12aS87!' || 
        founderKey.trim() === 'founder2026' || 
        founderKey.trim() === 'neuronna2026'
      ) {
        const founderUser: UserSessionData = {
          user_id: 'founder_root_001',
          email: 'ia.asep12@gmail.com',
          name: 'Asep (Founder & Master Architect)',
          role: 'founder',
          credits: 999999,
          status_aktif: true,
          package_tier: 'early_bird_lifetime'
        };
        localStorage.setItem('neuronna_user_session', JSON.stringify(founderUser));
        onLoginSuccess(founderUser, 'founder_token');
        onClose();
      } else {
        setErrorMsg('Otorisasi Founder gagal. Kunci tidak valid.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillFounderAccount = () => {
    setEmail('ia.asep12@gmail.com');
    setPassword('ia12aS87!');
    setErrorMsg(null);
    setInactiveAccountData(null);
  };

  const fillDemoAccount = () => {
    setEmail('kreator@neuronna.ai');
    setPassword('123456');
    setErrorMsg(null);
    setInactiveAccountData(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-[#0a0b12] border border-white/15 rounded-2xl shadow-2xl shadow-cyan-900/20 overflow-hidden text-white font-sans"
      >
        {/* Top Header Glow Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-amber-400" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <KeyRound size={16} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {mode === 'user' && 'Masuk ke Studio Neuronna'}
                {mode === 'founder' && 'Otorisasi Founder Portal'}
                {mode === 'buy' && 'Aktivasi Akses Rp 150.000'}
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                {mode === 'user' && 'Gunakan Email & Password/PIN dari Admin'}
                {mode === 'founder' && 'Akses Khusus Manajemen Founder & Tim'}
                {mode === 'buy' && 'Beli Akses Seumur Hidup via WhatsApp'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/5 rounded-xl mt-4">
            <button
              onClick={() => { setMode('user'); setErrorMsg(null); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all ${
                mode === 'user' 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Masuk Pengguna
            </button>
            <button
              onClick={() => { setMode('buy'); setErrorMsg(null); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1 transition-all ${
                mode === 'buy' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Flame size={12} className="text-amber-400" />
              <span>Beli Akses</span>
            </button>
            <button
              onClick={() => { setMode('founder'); setErrorMsg(null); }}
              className={`py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-medium transition-all ${
                mode === 'founder' 
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Akses Founder Portal"
            >
              <Lock size={12} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 pb-6 pt-2">
          {/* Error Message Box */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2 text-xs text-red-200"
            >
              <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* Account Inactive Box */}
          {inactiveAccountData && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-2.5"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <span className="font-semibold text-amber-300">{inactiveAccountData.message}</span>
              </div>
              {inactiveAccountData.activation_url && (
                <a
                  href={inactiveAccountData.activation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2 px-3 text-center rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs transition shadow"
                >
                  Hubungi Admin di WhatsApp untuk Aktivasi Instan
                </a>
              )}
            </motion.div>
          )}

          {/* TAB 1: USER LOGIN FORM */}
          {mode === 'user' && (
            <form onSubmit={handleUserLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">
                  Email Akun
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full bg-[#12141f] border border-white/10 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-gray-300 uppercase tracking-wider">
                    Password / PIN 6 Digit
                  </label>
                  <span className="text-[10px] font-mono text-gray-400">
                    Diberikan saat aktivasi WA
                  </span>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan PIN 6 digit"
                    required
                    className="w-full bg-[#12141f] border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold font-mono text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="animate-pulse">Memverifikasi Akun...</span>
                ) : (
                  <>
                    <span>Masuk ke Studio</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              {/* Demo Account Quick Fill Buttons */}
              <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-gray-400">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px]">Akses Founder:</span>
                  <button
                    type="button"
                    onClick={fillFounderAccount}
                    className="text-purple-400 hover:text-purple-300 font-mono underline cursor-pointer text-[11px]"
                  >
                    Founder: ia.asep12@gmail.com
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px]">Uji Coba Member:</span>
                  <button
                    type="button"
                    onClick={fillDemoAccount}
                    className="text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer text-[11px]"
                  >
                    Demo Member (150 Kredit)
                  </button>
                </div>
              </div>

              {/* Callout to Buy */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <p className="text-[11px] text-gray-400 mb-1.5">
                  Belum memiliki akun aktif atau belum transfer?
                </p>
                <button
                  type="button"
                  onClick={() => setMode('buy')}
                  className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 transition"
                >
                  Dapatkan Akses Rp 150.000 Sekarang &rarr;
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: BUY ACCESS & WHATSAPP */}
          {mode === 'buy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold mb-2">
                  <Flame size={11} className="text-amber-400 fill-amber-400" />
                  <span>EARLY BIRD LIFETIME PASS</span>
                </div>
                <div className="text-2xl font-black text-white mb-0.5">Rp 150.000</div>
                <div className="text-[11px] font-mono text-gray-400">Sekali Bayar &bull; Akses Seumur Hidup &bull; 150 Kredit Awal</div>
              </div>

              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  <span>Storyboard & Naskah Hook AI <strong>100% Gratis Selamanya</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  <span>150 Kredit Render AI (Google Veo, Runway, BytePlus)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  <span>Aktivasi Instan (2-5 Menit) langsung via WhatsApp Admin</span>
                </div>
              </div>

              <div className="p-3 bg-[#11131c] rounded-xl border border-white/10 text-xs">
                <div className="text-gray-400 text-[10px] font-mono uppercase mb-1">Transfer Bank BCA:</div>
                <div className="font-mono font-bold text-amber-300 text-sm">8720-9988-12</div>
                <div className="text-gray-400 text-[10px]">a.n. NEURONA DIGITAL MEDIA</div>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold font-mono text-xs uppercase tracking-wider shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 text-center"
              >
                <MessageSquare size={16} />
                <span>Beli & Aktivasi via WhatsApp</span>
              </a>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('user')}
                  className="text-xs text-gray-400 hover:text-white font-mono"
                >
                  Sudah punya PIN/Akun? <span className="text-cyan-400 underline">Masuk di sini</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: FOUNDER ACCESS FORM */}
          {mode === 'founder' && (
            <form onSubmit={handleFounderLogin} className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <ShieldCheck size={14} className="text-indigo-400" />
                  <span>Founder Security Check</span>
                </div>
                <p className="text-[11px] text-indigo-300/80">
                  Portal ini hanya dapat diakses oleh Founder untuk mengaktifkan akun pembeli, mengatur API key, dan memantau operasional.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">
                  Founder Master Key
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={founderKey}
                    onChange={(e) => setFounderKey(e.target.value)}
                    placeholder="Masukkan Kunci Otorisasi Founder"
                    required
                    className="w-full bg-[#12141f] border border-white/10 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>Master Key / Pass:</span>
                  <button
                    type="button"
                    onClick={() => setFounderKey('NEURONNA_FOUNDER_MASTER_2025')}
                    className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    Isi Master Key (NEURONNA_FOUNDER_MASTER_2025)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold font-mono text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Memverifikasi Kunci...' : 'Buka Founder Portal'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
