import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Sparkles, 
  Check, 
  Zap, 
  X, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  MessageSquare,
  ArrowRight,
  Info,
  Clock,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { neuronaVoice } from '../utils/speechSynthesis';

interface BankAccount {
  id?: string;
  bank: string;
  accountNumber: string;
  accountName: string;
}

interface PaymentConfigData {
  whatsappNumber: string;
  telegramBotUsername?: string;
  bankAccounts: BankAccount[];
}

interface CreditTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  onAddCredits: (amount: number) => void;
  userEmail?: string;
  userName?: string;
}

/**
 * STRUKTUR HARGA & EKONOMI KREDIT SEHAT (VEODOC & KEYFRAME)
 * 1 Kredit = Rp 500
 * Biaya Imagen / Keyframe = 1-2 Kredit (Rp 500 - Rp 1.000)
 * Biaya Veo AI Scene Video 5-10s = 8-10 Kredit (Rp 4.000 - Rp 5.000 per scene)
 * 1 Video Lengkap (4 Scene) = 32-40 Kredit (Rp 16.000 - Rp 20.000)
 */
export const PRICING_PACKAGES = [
  {
    id: 'starter_100',
    name: 'Top Up Mini',
    badge: 'STARTER',
    credits: 100,
    priceIdr: 'Rp 50.000',
    priceNumber: 50000,
    costPerCredit: 'Rp 500/kredit',
    description: 'Cukup untuk 100 Keyframe Gambar atau ~10-12 Scene Video Veo.',
    features: [
      '100 Saldo Kredit Veo & Imagen',
      'Storyboard & Naskah Bebas Pulsa (Gratis)',
      'Konsistensi Karakter Wajah & Seed',
      'Download Video Full HD 1080p'
    ],
    popular: false,
    color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
  },
  {
    id: 'creator_pro_250',
    name: 'Paket Kreator Aktif',
    badge: 'PALING POPULER',
    credits: 250,
    priceIdr: 'Rp 115.000',
    priceNumber: 115000,
    costPerCredit: 'Rp 460/kredit (Diskon 8%)',
    description: 'Pilihan pas untuk Affiliate & Content Creator harian (6-8 Video Full).',
    features: [
      '250 Saldo Kredit Video Generatif',
      'Estimasi 25-30 Scene Video Veo / Runway',
      'Prioritas Antrean Render Server',
      'Voiceover TryAudio & Subtitle Otomatis'
    ],
    popular: true,
    color: 'border-amber-500/60 bg-amber-950/30 text-amber-300'
  },
  {
    id: 'studio_master_500',
    name: 'Studio Master',
    badge: 'HEMAT MAKSIMAL',
    credits: 500,
    priceIdr: 'Rp 210.000',
    priceNumber: 210000,
    costPerCredit: 'Rp 420/kredit (Diskon 16%)',
    description: 'Untuk produksi film pendek, seri animasi TikTok & video iklan masif.',
    features: [
      '500 Saldo Kredit High-Speed',
      'Estimasi 55-65 Scene Video Cinematic',
      'Direct Multi-Scene Rendering Cluster',
      'Lisensi Komersial & Resolusi Ultra 4K'
    ],
    popular: false,
    color: 'border-purple-500/50 bg-purple-950/20 text-purple-300'
  }
];

export const CreditTopUpModal: React.FC<CreditTopUpModalProps> = ({
  isOpen,
  onClose,
  currentCredits,
  onAddCredits,
  userEmail = 'user@neuronna.ai',
  userName = 'Kreator Neuronna'
}) => {
  const [selectedPkg, setSelectedPkg] = useState<typeof PRICING_PACKAGES[0]>(PRICING_PACKAGES[0]);
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // Payment config from server
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigData>({
    whatsappNumber: '6281234567890',
    telegramBotUsername: 'NeuronnaAIBot',
    bankAccounts: [
      { id: '1', bank: 'BANK BCA', accountNumber: '8720-9988-12', accountName: 'NEURONA DIGITAL MEDIA' },
      { id: '2', bank: 'BANK MANDIRI', accountNumber: '137-00-998811-2', accountName: 'NEURONA DIGITAL MEDIA' }
    ]
  });

  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      return;
    }
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/public/payment-config');
        if (res.ok) {
          const data = await res.json();
          if (data && data.paymentConfig) {
            setPaymentConfig({
              whatsappNumber: data.paymentConfig.whatsappNumber || '6281234567890',
              telegramBotUsername: data.paymentConfig.telegramBotUsername || 'NeuronnaAIBot',
              bankAccounts: Array.isArray(data.paymentConfig.bankAccounts) && data.paymentConfig.bankAccounts.length > 0
                ? data.paymentConfig.bankAccounts
                : [
                    { id: '1', bank: 'BANK BCA', accountNumber: '8720-9988-12', accountName: 'NEURONA DIGITAL MEDIA' },
                    { id: '2', bank: 'BANK MANDIRI', accountNumber: '137-00-998811-2', accountName: 'NEURONA DIGITAL MEDIA' }
                  ]
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load payment config for topup:', err);
      }
    };
    fetchConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cleanWaNumber = paymentConfig.whatsappNumber ? paymentConfig.whatsappNumber.replace(/[^0-9]/g, '') : '6281234567890';
  

  // Format WhatsApp confirmation message
  const getWhatsAppMessage = () => {
    const text = 
`Halo Admin Neuronna, saya ingin konfirmasi Top-Up Kredit Akun.

📋 *RINCIAN TOP UP:*
• Akun Email: ${userEmail}
• Nama: ${userName}
• Paket Pilihan: ${selectedPkg.name} (+${selectedPkg.credits} Kredit)
• Total Transfer: ${selectedPkg.priceIdr}

Berikut saya lampirkan foto / screenshot bukti transfer.
Mohon bantuannya untuk menambahkan kredit ke akun saya. Terima kasih! 🚀`;
    return `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(text)}`;
  };

  // Telegram deep-link for automated bot confirmation
  

  return (
    <div 
      id="modal-credit-topup"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div className="bg-[#0b0c10] border border-cyan-500/40 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200 text-white font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <Coins size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono">
                  Top Up Saldo Kredit NEURONA AI
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                  VEO ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Storyboard naskah gratis sepuasnya. Kredit hanya terpotong saat generate gambar & scene video AI.
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
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {step === 'select' ? (
            <>
              {/* Cost Transparency Banner */}
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-cyan-200 gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400 shrink-0" />
                  <span>
                    <strong>Kalkulasi Sehat:</strong> 1 Scene Video Veo AI = <strong>~8-10 Kredit</strong> (Rp 4.000 - Rp 5.000). Sangat hemat & efisien untuk kreator.
                  </span>
                </div>
                <div className="text-[10px] font-mono text-cyan-400/80 shrink-0">
                  Rate: Rp 500 / Kredit
                </div>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PRICING_PACKAGES.map((pkg) => {
                  const isSelected = selectedPkg.id === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg)}
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
                          <span className="text-xs font-bold text-white uppercase font-mono">{pkg.name}</span>
                          <span className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono text-amber-400 border border-amber-500/20">
                            +{pkg.credits} CR
                          </span>
                        </div>

                        <div>
                          <div className="text-xl font-black text-white font-mono">{pkg.priceIdr}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{pkg.costPerCredit}</div>
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
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPkg(pkg);
                          setStep('payment');
                        }}
                        className={`mt-4 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg cursor-pointer uppercase font-mono ${
                          isSelected || pkg.popular
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                        }`}
                      >
                        <Zap size={13} fill="currentColor" />
                        <span>Beli {pkg.priceIdr}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Demo test button for immediate preview */}
              <div className="pt-2 flex items-center justify-between border-t border-white/5 text-[11px] text-gray-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Jaminan saldo kredit masuk instan setelah konfirmasi</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onAddCredits(100);
                    setIsSuccessToast(true);
                    neuronaVoice.playChime('SUCCESS');
                    neuronaVoice.speak('Demo top up 100 kredit berhasil ditambahkan!');
                    setTimeout(() => {
                      setIsSuccessToast(false);
                      onClose();
                    }, 1200);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-[10px] underline cursor-pointer"
                >
                  [Mode Demo: +100 Kredit Langsung]
                </button>
              </div>
            </>
          ) : (
            /* STEP 2: PAYMENT & TRANSFER INSTRUCTIONS */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Paket Yang Dipilih:</span>
                  <div className="text-sm font-bold text-white font-mono flex items-center gap-2 mt-0.5">
                    <span>{selectedPkg.name}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold">
                      +{selectedPkg.credits} Kredit
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Total Transfer:</span>
                  <div className="text-lg font-black text-amber-400 font-mono">{selectedPkg.priceIdr}</div>
                </div>
              </div>

              {/* Bank Accounts */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                  PILIH REKENING TRANSFER:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {paymentConfig.bankAccounts.map((acc, idx) => (
                    <div 
                      key={acc.id || idx}
                      className="p-3.5 rounded-xl bg-black/60 border border-white/10 hover:border-cyan-500/40 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-white font-mono">{acc.bank}</div>
                        <div className="text-sm font-mono text-cyan-300 font-bold tracking-wider mt-0.5">
                          {acc.accountNumber}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase mt-0.5">a.n {acc.accountName}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(acc.accountNumber, acc.id || String(idx))}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white transition cursor-pointer"
                        title="Salin No Rekening"
                      >
                        {copiedId === (acc.id || String(idx)) ? (
                          <CheckCircle2 size={15} className="text-emerald-400" />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              
              
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  
                  

                  {/* WhatsApp Button */}
                  <a
                    href={getWhatsAppMessage()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer text-center"
                  >
                    <MessageSquare size={14} />
                    <span>Konfirmasi via WhatsApp Admin</span>
                  </a>
                </div>
              {/* Back to package selection */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="text-xs font-mono text-gray-400 hover:text-white transition cursor-pointer"
                >
                  &larr; Ganti Pilihan Paket
                </button>
                <span className="text-[11px] text-gray-500 font-mono">
                  Akun tujuan: <strong>{userEmail}</strong>
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Success Toast */}
        {isSuccessToast && (
          <div className="p-3 bg-emerald-950 border-t border-emerald-500 text-center text-xs font-bold text-emerald-300 animate-pulse">
            ✅ Saldo Kredit Berhasil Ditambahkan ke Akun Anda!
          </div>
        )}

      </div>
    </div>
  );
};
