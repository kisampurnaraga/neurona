import React, { useState } from 'react';
import { 
  Zap, 
  Sparkles, 
  Film, 
  ShoppingBag, 
  Palette, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight, 
  MessageSquare, 
  Copy, 
  Check, 
  ShieldCheck, 
  Coins, 
  Play, 
  Layers, 
  Cpu, 
  ChevronDown, 
  Lock, 
  Star,
  ExternalLink,
  Flame,
  User,
  LogOut,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSessionData } from './AuthModal';

interface LandingPageProps {
  onEnterStudio: () => void;
  onOpenFounder?: () => void;
  currentUser?: UserSessionData | null;
  onOpenLogin?: (mode?: 'user' | 'founder' | 'buy') => void;
  onLogout?: () => void;
  whatsappNumber?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterStudio,
  onOpenFounder,
  currentUser,
  onOpenLogin,
  onLogout,
  whatsappNumber = '6281234567890'
}) => {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeStudioTab, setActiveStudioTab] = useState<'AFFILIATE' | 'ANIMATION' | 'EDUCATIONAL'>('AFFILIATE');

  const defaultWaMessage = "Halo Admin Neuronna, saya ingin mendaftar akun dan membeli akses seharga Rp 150.000. Berikut bukti transfer saya: [Lampirkan Gambar]";
  const whatsappCheckoutUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultWaMessage)}`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(type);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const handleStudioAction = () => {
    if (currentUser) {
      onEnterStudio();
    } else if (onOpenLogin) {
      onOpenLogin('user');
    } else {
      onEnterStudio();
    }
  };

  const faqs = [
    {
      q: "Apakah benar pembuatan Storyboard & Naskah benar-benar GRATIS?",
      a: "Ya, 100% GRATIS! Setelah mendaftar dan login, Anda bebas menggunakan Sutradara AI Gatotkaca untuk merumuskan hook viral, naskah voiceover perkata, dan visual direction adegan tanpa dipungut biaya apapun."
    },
    {
      q: "Kapan kredit saya akan dipotong?",
      a: "Kredit hanya dipotong saat Anda memutuskan untuk merender Gambar Keyframe HD (1-2 kredit) atau merender Video AI Utuh menggunakan Google Veo 3.1, Runway Gen-3, atau BytePlus (10-15 kredit per adegan)."
    },
    {
      q: "Bagaimana cara aktivasi akun setelah saya melakukan transfer Rp 150.000?",
      a: "Cukup klik tombol 'Beli via WhatsApp', Anda akan diarahkan ke WhatsApp Admin Neuronna dengan template teks otomatis. Lampirkan bukti transfer dan email Anda. Founder/Admin kami akan memverifikasi dan mengirimkan PIN/Password aktivasi 6 digit secara instan dalam 2-5 menit."
    },
    {
      q: "Apakah ada biaya langganan bulanan setelah membeli paket Rp 150.000?",
      a: "Tidak ada! Paket Early Bird ini adalah Akses Seumur Hidup (Lifetime Pass). Anda mendapatkan akses selamanya ke platform dan seluruh update engine AI di masa mendatang tanpa biaya langganan bulanan."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] right-[10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1a1a24_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* TOP STICKY NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050508]/80 border-b border-white/5 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-cyan-500 to-amber-400 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#07070c] rounded-[7px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                NEURONNA AI
              </span>
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest -mt-1">
                Autonomous Video OS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-gray-400">
            <a href="#fitur" className="hover:text-cyan-400 transition-colors">Fitur Unggulan</a>
            <a href="#storyboard" className="hover:text-cyan-400 transition-colors">Storyboard Gratis</a>
            <a href="#pricing" className="hover:text-amber-400 transition-colors flex items-center gap-1">
              <Flame size={12} className="text-amber-400" />
              <span>Akses Rp 150.000</span>
            </a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Founder Button: ONLY visible if the current logged-in user is a Founder */}
            {currentUser?.role === 'founder' && onOpenFounder && (
              <button
                onClick={onOpenFounder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/40 hover:border-indigo-500 bg-indigo-500/10 text-[11px] font-mono text-indigo-300 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Founder Control Center & Manajemen User WA"
              >
                <ShieldCheck size={13} className="text-indigo-400" />
                <span>Founder Portal</span>
              </button>
            )}

            {/* Authenticated User Status Bar */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-gray-300 font-medium max-w-[120px] truncate">{currentUser.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                    {currentUser.role === 'founder' ? '👑 Founder' : `${currentUser.credits} Cr`}
                  </span>
                </div>

                <button
                  onClick={onEnterStudio}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold font-mono uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  <span>Buka Studio</span>
                  <ArrowRight size={13} />
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-300 transition cursor-pointer"
                    title="Keluar / Logout"
                  >
                    <LogOut size={14} />
                  </button>
                )}
              </div>
            ) : (
              /* Unauthenticated Visitor CTA */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenLogin && onOpenLogin('user')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white text-xs font-mono font-medium transition cursor-pointer"
                >
                  <LogIn size={13} />
                  <span>Masuk</span>
                </button>

                <button
                  onClick={handleStudioAction}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold font-mono uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all cursor-pointer"
                >
                  <span>Buka Studio</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      
      {/* HERO SECTION */}
      <section className="relative z-10 pt-16 pb-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left Text Content */}
          <div className="flex-1 text-left">
            {/* Floating Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase mb-8 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            >
              <Sparkles size={13} className="text-cyan-400 animate-pulse" />
              <span>Next-Gen Autonomous Video AI</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
            >
              Bikin Video <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">Affiliate</span> & <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Animasi 3D</span> Otomatis dalam 60 Detik.
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-gray-400 max-w-xl mb-10 leading-relaxed font-normal"
            >
              Tinggalkan cara lama yang memakan waktu berjam-jam. Sutradara AI <strong className="text-white">Gatotkaca</strong> secara mandiri menyusun hook konversi tinggi, merancang storyboard multi-scene, hingga merender video fotorealistik siap viral di TikTok, Reels & Shorts.
            </motion.p>

            {/* CTA Group */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 mb-8"
            >
              <a
                href="#pricing"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all cursor-pointer"
              >
                <Flame size={18} className="fill-black" />
                <span>Ambil Akses Seumur Hidup (Rp 150rb)</span>
              </a>

              <button
                onClick={handleStudioAction}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 text-white font-mono text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <Play size={15} className="text-cyan-400" />
                <span>Coba Storyboard Gratis</span>
              </button>
            </motion.div>
            
            {/* Recommendation info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs text-gray-500 flex items-center gap-2"
            >
              <Film size={12} className="text-gray-400" />
              <span>Preview cinematic reel source: <a href="https://mixkit.co" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Mixkit.co</a> / <a href="https://pexels.com" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Pexels</a></span>
            </motion.div>
          </div>

          {/* Right Cinematic Video Reel Component */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex-1 w-full flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[320px] aspect-[9/16] rounded-[2rem] overflow-hidden border-[6px] border-slate-900 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-black group">
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                // Open source placeholder video (from Pexels / Mixkit type source)
                src="https://cdn.pixabay.com/video/2023/10/22/186008-876939918_large.mp4"
                poster="https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600"
              />
              
              {/* Overlay UI to make it look like a real vertical player */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
              
              <div className="absolute bottom-6 left-5 right-5 z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 p-0.5 flex items-center justify-center">
                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=neuronna" alt="avatar" className="w-full h-full rounded-full bg-black" />
                  </div>
                  <div>
                    <div className="text-white text-xs font-bold">@NeuronnaAI</div>
                    <div className="text-cyan-400 text-[10px] font-mono">Auto-generated via Veo</div>
                  </div>
                </div>
                <p className="text-white text-xs line-clamp-2 shadow-sm font-medium">
                  Merender video sinematik dengan Google Veo & AI TTS. Kualitas visual fotorealistik. #AI #VideoOS
                </p>
                <div className="flex items-center gap-3 mt-3 text-white">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><Flame size={14} /></div>
                    <span className="text-[10px]">45K</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><MessageSquare size={14} /></div>
                    <span className="text-[10px]">1.2K</span>
                  </div>
                </div>
              </div>

              {/* Top badges */}
              <div className="absolute top-5 left-5 z-10 flex gap-2 pointer-events-none">
                 <span className="px-2 py-1 bg-red-500 text-white text-[9px] font-bold uppercase rounded flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                 </span>
                 <span className="px-2 py-1 bg-black/50 backdrop-blur text-white text-[9px] border border-white/20 font-bold uppercase rounded">
                    4K HDR
                 </span>
              </div>
            </div>
          </motion.div>

        </div>
      {/* INTERACTIVE STUDIO PREVIEW SHOWCASE */}
        <div className="relative max-w-5xl mx-auto rounded-2xl border border-white/10 bg-[#0a0a12]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-2 text-xs font-mono text-gray-400">neuronna-studio-v3.1.ai</span>
            </div>

            {/* Studio Tabs Switcher */}
            <div className="flex items-center bg-black/60 rounded-lg p-1 border border-white/5">
              <button
                onClick={() => setActiveStudioTab('AFFILIATE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono transition-all ${
                  activeStudioTab === 'AFFILIATE' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ShoppingBag size={12} />
                <span>Affiliate TikTok</span>
              </button>
              <button
                onClick={() => setActiveStudioTab('ANIMATION')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono transition-all ${
                  activeStudioTab === 'ANIMATION' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Palette size={12} />
                <span>Animasi 3D</span>
              </button>
              <button
                onClick={() => setActiveStudioTab('EDUCATIONAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono transition-all ${
                  activeStudioTab === 'EDUCATIONAL' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <GraduationCap size={12} />
                <span>Edukasi & Shorts</span>
              </button>
            </div>
          </div>

          {/* Interactive Scene Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="rounded-xl bg-black/40 border border-white/5 p-4 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold">
                  Adegan 1 • Hook (0-3s)
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Prediksi Viral 94%</span>
              </div>
              <p className="text-xs text-gray-300 mb-2 font-medium">
                {activeStudioTab === 'AFFILIATE' && '"Stop scrolling! Masih pakai cara manual yang bikin pegel?"'}
                {activeStudioTab === 'ANIMATION' && 'Karakter cyberpunk menoleh dengan mata menyala neon di tengah hujan kota futuristik.'}
                {activeStudioTab === 'EDUCATIONAL' && '"Tahukah kamu 80% orang tidak tahu rumus sederhana ini untuk produktivitas?"'}
              </p>
              <div className="text-[10px] font-mono text-gray-500">
                Camera: Quick Zoom-in • Motion Speed: 1.4x
              </div>
            </div>

            <div className="rounded-xl bg-black/40 border border-white/5 p-4 hover:border-indigo-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold">
                  Adegan 2 • Product Lock
                </span>
                <span className="text-[10px] font-mono text-indigo-300">Consistency Lock ON</span>
              </div>
              <p className="text-xs text-gray-300 mb-2 font-medium">
                {activeStudioTab === 'AFFILIATE' && 'Demonstrasi produk dengan efek split screen sebelum & sesudah penggunaan.'}
                {activeStudioTab === 'ANIMATION' && 'Pertarungan energi epik dengan efek partikel holografik 4K.'}
                {activeStudioTab === 'EDUCATIONAL' && 'Diagram animasi 3D interaktif menjelaskan inti masalah secara visual.'}
              </p>
              <div className="text-[10px] font-mono text-gray-500">
                Engine: Google Veo 3.1 / Runway Gen-3
              </div>
            </div>

            <div className="rounded-xl bg-black/40 border border-white/5 p-4 hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
                  Adegan 3 • Call-To-Action
                </span>
                <span className="text-[10px] font-mono text-amber-400">High CTR Focus</span>
              </div>
              <p className="text-xs text-gray-300 mb-2 font-medium">
                {activeStudioTab === 'AFFILIATE' && '"Klik keranjang kuning sekarang mumpung lagi diskon 50% hari ini!"'}
                {activeStudioTab === 'ANIMATION' && 'Logo reveal cinematic dengan sound design synth bass yang megah.'}
                {activeStudioTab === 'EDUCATIONAL' && '"Follow untuk tips rahasia part selanjutnya!"'}
              </p>
              <div className="text-[10px] font-mono text-gray-500">
                Overlay: Animated Sticker + Arrow CTA
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FITUR SECTION */}
      <section id="fitur" className="py-20 px-6 max-w-7xl mx-auto relative z-10 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">Fitur Unggulan</h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white">
            Dirancang Khusus untuk Kreator, Affiliate Marketer & Edukator
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div id="storyboard" className="rounded-2xl bg-gradient-to-b from-white/[0.07] to-transparent p-6 border border-white/10 hover:border-cyan-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-5 text-cyan-400">
              <Layers size={24} />
            </div>
            <div className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase mb-2">
              100% Gratis Tanpa Batas
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Storyboard & Naskah Hook GRATIS</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Daftar dan buat konsep video sebanyak yang Anda mau. AI merancang formula hook, naskah voiceover per detik, dan visual prompt tanpa memotong kredit saldo Anda.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.07] to-transparent p-6 border border-white/10 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-5 text-indigo-400">
              <Coins size={24} />
            </div>
            <div className="inline-block px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold uppercase mb-2">
              Sistem Transparan
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Pay-As-You-Go Kredit Render</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Anda memegang kendali penuh. Kredit hanya terpakai saat Anda memutuskan merender gambar HD atau mengeksekusi video AI. Tanpa biaya tersembunyi.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.07] to-transparent p-6 border border-white/10 hover:border-amber-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 text-amber-400">
              <Cpu size={24} />
            </div>
            <div className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase mb-2">
              Multi-AI Integration
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Google Veo 3.1 & Runway Gen-3</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Pilih engine video kelas dunia langsung dari satu dashboard. Dilengkapi fitur Product Consistency Lock untuk menjaga keaslian detail produk affiliate.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING SECTION - Rp 150.000 EARLY BIRD PASS */}
      <section id="pricing" className="py-20 px-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs uppercase mb-3">
            <Flame size={13} />
            <span>Early Bird Founder Deal • Kuota Terbatas</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Investasi Sekali, Akses Selamanya.
          </h2>
          <p className="text-gray-400 text-sm sm:text-base">
            Dapatkan hak akses penuh ke ekosistem Neuronna AI tanpa biaya langganan bulanan.
          </p>
        </div>

        {/* SINGLE HIGH CONVERTING PRICING CARD */}
        <div className="max-w-xl mx-auto">
          <div className="relative rounded-3xl p-[2px] bg-gradient-to-b from-amber-400 via-orange-500 to-indigo-600 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <div className="bg-[#090912] rounded-[22px] p-8 sm:p-10 relative overflow-hidden">
              
              {/* Corner Tag */}
              <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-mono font-extrabold uppercase tracking-wider">
                LIFETIME PASS
              </div>

              <div className="mb-6">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  Paket Early Bird Pioneer
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Akses Seumur Hidup
                </h3>
              </div>

              {/* Price Display */}
              <div className="flex items-baseline gap-3 mb-6 pb-6 border-b border-white/10">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  Rp 150.000
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-xs text-gray-500 line-through font-mono">Rp 750.000</span>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">Hemat 80% Hari Ini</span>
                </div>
              </div>

              {/* Benefits Checklist */}
              <ul className="space-y-3.5 mb-8 text-left text-xs sm:text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Akses Penuh ke Semua Studio</strong> (Affiliate TikTok, Animasi 3D, Edukasi)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Pembuatan Storyboard & Naskah Hook GRATIS</strong> tanpa batas</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Bonus 150 Kredit Render Perdana</strong> (Setara ~10 adegan video HD)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Multi-Engine AI</strong>: Google Veo 3.1, Runway Gen-3, BytePlus PixelDance</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Pembaruan Fitur & Model AI Baru</strong> seumur hidup tanpa biaya tambahan</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <span><strong>Support WhatsApp Prioritas</strong> langsung dari Founder</span>
                </li>
              </ul>

              {/* Action Buttons */}
              <div className="space-y-3">
                <a
                  id="btn-checkout-wa"
                  href={whatsappCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all cursor-pointer"
                >
                  <MessageSquare size={18} className="fill-black" />
                  <span>Beli via WhatsApp (Rp 150.000)</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  <span>Lihat Nomor Rekening Pembayaran</span>
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-mono text-gray-500">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Aktivasi Instan Manual 2-5 Menit via Admin WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto relative z-10 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">Pertanyaan Umum</h2>
          <p className="text-2xl sm:text-3xl font-bold text-white">Frequently Asked Questions</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="rounded-xl bg-[#0a0a14] border border-white/5 overflow-hidden transition-all"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-gray-200 hover:text-white transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 transition-transform ${activeFaq === idx ? 'rotate-180 text-cyan-400' : ''}`} 
                />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-xs text-gray-400 leading-relaxed border-t border-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6 max-w-7xl mx-auto text-center text-xs font-mono text-gray-500 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-cyan-400 fill-cyan-400" />
            <span className="text-gray-300 font-bold">NEURONA AI VIDEO OS</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onEnterStudio} className="hover:text-cyan-400 transition-colors">Buka Studio</button>
            <a href="#pricing" className="hover:text-amber-400 transition-colors">Akses Rp 150.000</a>
            <a href={whatsappCheckoutUrl} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">Kontak Admin</a>
          </div>
        </div>
        <p>© 2026 Neuronna AI. All rights reserved. Platform produksi video otomatis cerdas berbasis Autonomous Agent.</p>
      </footer>

      {/* PAYMENT DETAILS MODAL */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b14] border border-white/10 rounded-2xl max-w-md w-full p-6 text-left relative shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-1">Informasi Transfer Pembayaran</h3>
              <p className="text-xs text-gray-400 mb-5">
                Silakan transfer sebesar <strong>Rp 150.000</strong> ke salah satu rekening resmi berikut:
              </p>

              {/* Bank 1: BCA */}
              <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-cyan-400 font-mono">BANK BCA</span>
                  <button 
                    onClick={() => handleCopy('8720998812', 'BCA')}
                    className="flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-white px-2 py-0.5 rounded bg-white/5"
                  >
                    {copiedAccount === 'BCA' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedAccount === 'BCA' ? 'Tersalin' : 'Salin Rekening'}</span>
                  </button>
                </div>
                <div className="text-sm font-mono font-bold text-white tracking-wider">8720-9988-12</div>
                <div className="text-[11px] text-gray-400">a.n. NEURONA DIGITAL MEDIA</div>
              </div>

              {/* Bank 2: Mandiri */}
              <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-amber-400 font-mono">BANK MANDIRI</span>
                  <button 
                    onClick={() => handleCopy('137009988112', 'MANDIRI')}
                    className="flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-white px-2 py-0.5 rounded bg-white/5"
                  >
                    {copiedAccount === 'MANDIRI' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedAccount === 'MANDIRI' ? 'Tersalin' : 'Salin Rekening'}</span>
                  </button>
                </div>
                <div className="text-sm font-mono font-bold text-white tracking-wider">137-00-998811-2</div>
                <div className="text-[11px] text-gray-400">a.n. NEURONA DIGITAL MEDIA</div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2">
                <a
                  href={whatsappCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs uppercase font-mono tracking-wider shadow-md"
                >
                  <MessageSquare size={15} />
                  <span>Kirim Bukti Transfer ke WhatsApp</span>
                </a>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-2 text-xs font-mono text-gray-400 hover:text-white text-center"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default LandingPage;
