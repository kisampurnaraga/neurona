import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, RefreshCw, Plus, Trash2, RotateCcw, AlertTriangle, CheckCircle2, Zap, X, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface KeyHealthItem {
  key: string;
  maskedKey: string;
  provider: 'gemini' | 'veo' | 'openai' | 'fal';
  status: 'ACTIVE' | 'COOLDOWN' | 'DISABLED';
  cooldownUntil?: number;
  totalRequests: number;
  totalErrors: number;
  lastUsedAt?: string;
  lastErrorReason?: string;
}

interface KeyRotatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyRotatorModal: React.FC<KeyRotatorModalProps> = ({ isOpen, onClose }) => {
  const [providerTab, setProviderTab] = useState<'gemini' | 'veo' | 'openai' | 'fal'>('gemini');
  const [report, setReport] = useState<{ gemini: KeyHealthItem[]; veo: KeyHealthItem[]; openai: KeyHealthItem[]; fal: KeyHealthItem[] }>({ gemini: [], veo: [], openai: [], fal: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [bulkKeysInput, setBulkKeysInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchHealthReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/fcc/key-rotator?t=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        setReport({
          gemini: data.gemini || [],
          veo: data.veo || [],
          openai: data.openai || [],
          fal: data.fal || []
        });
      }
    } catch (err) {
      console.warn('Failed to fetch Key Rotator report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealthReport();
      const interval = setInterval(fetchHealthReport, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleAddKeys = async () => {
    if (!bulkKeysInput.trim()) {
      showToast('⚠️ Silakan masukkan minimal satu API Key.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/fcc/key-rotator/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerTab,
          keys: bulkKeysInput
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✅ Berhasil menambahkan ${data.count || 1} API Key baru ke Pool ${providerTab.toUpperCase()}!`);
        setBulkKeysInput('');
        if (data.report) {
          setReport({
            gemini: data.report.gemini || [],
            veo: data.report.veo || [],
            openai: data.report.openai || [],
            fal: data.report.fal || []
          });
        } else {
          fetchHealthReport();
        }
      } else {
        showToast(`❌ Gagal: ${data.error || 'Terjadi kesalahan format key.'}`);
      }
    } catch (err: any) {
      showToast('❌ Gagal menambahkan API Key: ' + (err.message || 'Error server'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (item: KeyHealthItem) => {
    try {
      const res = await fetch('/api/fcc/key-rotator/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: item.provider, key: item.key || item.maskedKey })
      });
      if (res.ok) {
        showToast(`🔄 Status kunci (${item.maskedKey}) berhasil di-reset ke ACTIVE.`);
        fetchHealthReport();
      }
    } catch (err) {
      showToast('❌ Gagal mereset status kunci.');
    }
  };

  const handleDelete = async (item: KeyHealthItem) => {
    if (!window.confirm(`Hapus kunci ${item.maskedKey} dari pool ${item.provider.toUpperCase()}?`)) return;

    try {
      const res = await fetch('/api/fcc/key-rotator/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: item.provider, key: item.key || item.maskedKey })
      });
      if (res.ok) {
        showToast(`🗑️ Kunci (${item.maskedKey}) dihapus dari pool.`);
        fetchHealthReport();
      }
    } catch (err) {
      showToast('❌ Gagal menghapus kunci.');
    }
  };

  const handleClearPool = async (target: string = 'all') => {
    if (!window.confirm(`Kosongkan semua API Key di pool ${target === 'all' ? 'SEMUA PROVIDER' : target.toUpperCase()}?`)) return;

    try {
      const res = await fetch('/api/fcc/key-rotator/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: target })
      });
      if (res.ok) {
        showToast(`🧹 Pool ${target === 'all' ? 'semua provider' : target.toUpperCase()} berhasil dikosongkan. Silakan input API Key manual.`);
        fetchHealthReport();
      }
    } catch (err) {
      showToast('❌ Gagal mengosongkan pool.');
    }
  };

  if (!isOpen) return null;

  const currentList = Array.isArray(
    providerTab === 'gemini' 
      ? report?.gemini 
      : (providerTab === 'veo' 
        ? report?.veo 
        : (providerTab === 'openai' ? report?.openai : report?.fal))
  ) ? (providerTab === 'gemini' 
      ? report.gemini 
      : (providerTab === 'veo' 
        ? report.veo 
        : (providerTab === 'openai' ? report.openai : report.fal))) : [];

  const activeCount = currentList.filter(k => k && k.status === 'ACTIVE').length;
  const cooldownCount = currentList.filter(k => k && k.status === 'COOLDOWN').length;
  const disabledCount = currentList.filter(k => k && k.status === 'DISABLED').length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-[#0B0C10] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-black to-slate-950">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-black font-mono tracking-wide text-white uppercase flex items-center gap-2">
                  Smart API Key Rotator Pool
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                    ACTIVE AUTO-FAILOVER
                  </span>
                </h2>
                <p className="text-xs text-gray-400 font-mono">
                  Tambahkan dan kelola multiple API Keys (Gemini / OpenAI / Fal.ai) untuk rotasi otomatis & pencegahan rate limit (429).
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="px-6 py-2.5 bg-cyan-500/20 border-b border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center justify-between animate-fadeIn">
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* Provider Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProviderTab('gemini')}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    providerTab === 'gemini'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Zap size={14} className={providerTab === 'gemini' ? 'text-cyan-400' : ''} />
                  <span>Google Gemini ({(report.gemini || []).length})</span>
                </button>

                <button
                  onClick={() => setProviderTab('veo')}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    providerTab === 'veo'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-lg shadow-rose-500/10'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Zap size={14} className={providerTab === 'veo' ? 'text-rose-400' : ''} />
                  <span>Google Veo ({(report.veo || []).length})</span>
                </button>

                <button
                  onClick={() => setProviderTab('openai')}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    providerTab === 'openai'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-lg shadow-purple-500/10'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Key size={14} className={providerTab === 'openai' ? 'text-purple-400' : ''} />
                  <span>OpenAI ({report.openai.length})</span>
                </button>

                <button
                  onClick={() => setProviderTab('fal')}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    providerTab === 'fal'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Cpu size={14} className={providerTab === 'fal' ? 'text-amber-400' : ''} />
                  <span>Fal.ai (Flux/Kling) ({(report.fal || []).length})</span>
                </button>
              </div>

              <button
                onClick={fetchHealthReport}
                disabled={isLoading}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh Status Key"
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
              </button>
            </div>

            {/* Live Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">Kunci Aktif (Ready)</span>
                  <span className="text-xl font-black text-white">{activeCount} Key</span>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">Cooldown (Rate Limit)</span>
                  <span className="text-xl font-black text-white">{cooldownCount} Key</span>
                </div>
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">Disabled (Error Auth)</span>
                  <span className="text-xl font-black text-white">{disabledCount} Key</span>
                </div>
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
            </div>

            {/* Input Form: Add Keys */}
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3 font-mono">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>+ Tambah {providerTab.toUpperCase()} API Key Baru</span>
                <span className="text-[10px] text-gray-500">Pisahkan dengan koma atau baris baru</span>
              </label>

              <textarea
                value={bulkKeysInput}
                onChange={(e) => setBulkKeysInput(e.target.value)}
                placeholder={`Masukkan API Key ${providerTab === 'gemini' ? 'Google AI Studio (AIzaSy...)' : (providerTab === 'openai' ? 'OpenAI (sk-proj-...)' : 'Fal.ai (FAL_KEY / Key ID:Secret)')} di sini...\nBisa memasukkan banyak kunci sekaligus (satu kunci per baris).`}
                rows={3}
                className="w-full p-3 rounded-xl bg-black/80 border border-white/10 text-xs font-mono text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleAddKeys}
                  disabled={isSubmitting || !bulkKeysInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Plus size={14} />
                  <span>{isSubmitting ? 'Menambahkan...' : '+ Simpan ke Pool Rotator'}</span>
                </button>
              </div>
            </div>

            {/* Key List Display */}
            <div className="space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Daftar API Key dalam Pool ({currentList.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleClearPool(providerTab)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Kosongkan Pool {providerTab.toUpperCase()}</span>
                  </button>
                  <button
                    onClick={() => handleClearPool('all')}
                    className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Kosongkan Semua Pool</span>
                  </button>
                </div>
              </div>

              {currentList.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-black/40 border border-dashed border-white/10 text-gray-500 text-xs">
                  Pool {providerTab.toUpperCase()} kosong (0 Key). Silakan tambahkan API Key manual Anda pada kolom di atas.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentList.map((item, idx) => (
                    <div
                      key={item.key || `key_${idx}`}
                      className="p-3.5 rounded-xl bg-[#0D0E15] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-white/20 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-mono">{item.maskedKey}</span>

                          {item.status === 'ACTIVE' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ACTIVE
                            </span>
                          )}

                          {item.status === 'COOLDOWN' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle size={10} />
                              COOLDOWN (60s)
                            </span>
                          )}

                          {item.status === 'DISABLED' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              DISABLED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-gray-400">
                          <span>Total Request: <strong className="text-white">{item.totalRequests}</strong></span>
                          <span>Error: <strong className="text-rose-400">{item.totalErrors}</strong></span>
                          {item.lastUsedAt && (
                            <span>Terakhir Digunakan: <strong className="text-gray-300">{new Date(item.lastUsedAt).toLocaleTimeString()}</strong></span>
                          )}
                        </div>

                        {item.lastErrorReason && (
                          <p className="text-[10px] text-amber-400/90 font-mono italic">
                            Catatan error: {item.lastErrorReason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
                        {item.status !== 'ACTIVE' && (
                          <button
                            onClick={() => handleReactivate(item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            title="Reset status ke Active"
                          >
                            <RotateCcw size={12} />
                            <span>Reaktifkan</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(item)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Hapus dari pool"
                        >
                          <Trash2 size={12} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-white/10 bg-black/60 flex items-center justify-between font-mono text-xs text-gray-400">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <ShieldCheck size={14} />
              Kunci API disimpan aman di memori server dan dirotasi otonom saat HTTP 429.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
