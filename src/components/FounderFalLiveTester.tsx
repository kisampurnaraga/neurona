import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Sparkles, 
  Image as ImageIcon, 
  Film, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Key, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Download, 
  Maximize2,
  Terminal,
  Zap,
  ShieldAlert,
  X
} from 'lucide-react';

interface TestItemResult {
  testId: string;
  name: string;
  modelId: string;
  type: 'image' | 'video';
  tier?: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  durationSec: number;
  resultUrl?: string;
  error?: string;
  logs: string[];
}

interface TestSuiteResponse {
  success: boolean;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  apiKeyUsed: string;
  results: TestItemResult[];
}

export function FounderFalLiveTester() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [target, setTarget] = useState<'all' | 'image_4k' | 'video_budget' | 'video_balanced' | 'video_premium'>('all');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [testResults, setTestResults] = useState<TestSuiteResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedZoomImg, setSelectedZoomImg] = useState<string | null>(null);
  const [activeLogAccordion, setActiveLogAccordion] = useState<string | null>(null);

  // Timer while running
  useEffect(() => {
    let timer: any = null;
    if (isRunning) {
      setElapsedTime(0);
      timer = setInterval(() => {
        setElapsedTime(prev => Number((prev + 0.5).toFixed(1)));
      }, 500);
    } else {
      if (timer) clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning]);

  const handleRunLiveTest = async (overrideTarget?: typeof target) => {
    const effectiveTarget = overrideTarget || target;
    setIsRunning(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/fcc/fal-live-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'founder'
        },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          target: effectiveTarget,
          customPrompt: customPrompt.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Gagal mengeksekusi live test`);
      }

      setTestResults(data);
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-blue-950/40 border border-purple-800/40 rounded-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                <Zap size={20} />
              </span>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                  Fal.ai Live Render Studio Test
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-900/60 text-purple-200 border border-purple-700/60 font-mono uppercase tracking-wider">
                    Real Render Execution
                  </span>
                </h2>
                <p className="text-xs text-gray-300 mt-0.5">
                  Uji render nyata secara langsung dengan API Key Anda sendiri (1 Gambar 4K + 3 Video Tier). Mengukur waktu render aktual dan memverifikasi kualitas output visual.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">
              Status: {isRunning ? (
                <span className="text-amber-400 font-bold animate-pulse">RENDER SEDANG BERJALAN ({elapsedTime}s)...</span>
              ) : testResults ? (
                <span className="text-emerald-400 font-bold">TERAKHIR DIUJI: {testResults.successfulTests}/{testResults.totalTests} SUKSES</span>
              ) : (
                <span className="text-gray-400">SIAP DIUJI</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Input Control Box */}
      <div className="p-5 bg-[#080808] border border-[#1e1e1e] rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* API Key Input */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key size={14} className="text-purple-400" />
                Fal.ai API Key (FAL_KEY)
              </span>
              <span className="text-[10px] font-normal text-gray-500">
                Opsional jika sudah ada di Key Rotator
              </span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Masukkan FAL_KEY untuk pengujian langsung (key_id:key_secret)..."
                className="w-full bg-[#121212] border border-[#262626] focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-gray-600 outline-none pr-10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Test Target Selector */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-400" />
              Pilih Target Render Uji Coba
            </label>
            <select
              value={target}
              onChange={e => setTarget(e.target.value as any)}
              className="w-full bg-[#121212] border border-[#262626] focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs font-medium text-white outline-none transition-colors cursor-pointer"
            >
              <option value="all" className="bg-[#181818] text-white py-2">
                🚀 Full Suite (1 Gambar 4K + 3 Tier Video: Budget, Balanced, Premium)
              </option>
              <option value="image_4k" className="bg-[#181818] text-white py-2">
                🖼️ Gambar 4K UHD Saja (Nano Banana Pro Edit - 4K)
              </option>
              <option value="video_budget" className="bg-[#181818] text-white py-2">
                🎬 Video Tier Budget Saja (Wan 2.1 14B I2V)
              </option>
              <option value="video_balanced" className="bg-[#181818] text-white py-2">
                🎬 Video Tier Balanced Saja (Kling 2.1 Standard)
              </option>
              <option value="video_premium" className="bg-[#181818] text-white py-2">
                🎬 Video Tier Premium Saja (Kling 3.0 Pro)
              </option>
            </select>
          </div>

          {/* Custom Prompt Override */}
          <div className="md:col-span-12 space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>Prompt Uji Coba Visual (Opsional)</span>
              <span className="text-[10px] text-gray-500 font-normal">Kosongkan untuk memakai prompt uji sinematik bawaan</span>
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Contoh: A high-end luxury mechanical wristwatch resting on black volcanic stone, 4K UHD, volumetric rim light..."
              className="w-full bg-[#121212] border border-[#262626] focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div className="pt-3 border-t border-[#1c1c1c] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              disabled={isRunning}
              onClick={() => handleRunLiveTest()}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                isRunning
                  ? 'bg-purple-800/50 text-gray-400 cursor-not-allowed border border-purple-700/50'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/30 shadow-purple-900/30 hover:scale-[1.02]'
              }`}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Merender ({elapsedTime}s)...
                </>
              ) : (
                <>
                  <Play size={14} className="fill-white" />
                  Jalankan Live Test Render
                </>
              )}
            </button>

            <button
              disabled={isRunning}
              onClick={() => handleRunLiveTest('image_4k')}
              className="px-3.5 py-2.5 bg-[#141414] hover:bg-[#202020] border border-[#2a2a2a] hover:border-gray-500 rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ImageIcon size={13} className="text-purple-400" />
              Test 4K Image
            </button>

            <button
              disabled={isRunning}
              onClick={() => handleRunLiveTest('video_budget')}
              className="px-3.5 py-2.5 bg-[#141414] hover:bg-[#202020] border border-[#2a2a2a] hover:border-gray-500 rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Film size={13} className="text-emerald-400" />
              Test Wan 2.1 (Budget)
            </button>

            <button
              disabled={isRunning}
              onClick={() => handleRunLiveTest('video_balanced')}
              className="px-3.5 py-2.5 bg-[#141414] hover:bg-[#202020] border border-[#2a2a2a] hover:border-gray-500 rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Film size={13} className="text-blue-400" />
              Test Kling Std (Balanced)
            </button>

            <button
              disabled={isRunning}
              onClick={() => handleRunLiveTest('video_premium')}
              className="px-3.5 py-2.5 bg-[#141414] hover:bg-[#202020] border border-[#2a2a2a] hover:border-gray-500 rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Film size={13} className="text-amber-400" />
              Test Kling Pro (Premium)
            </button>
          </div>

          {isRunning && (
            <div className="flex items-center gap-2 text-xs font-mono text-purple-300 bg-purple-950/40 border border-purple-800/40 px-3 py-1.5 rounded-lg">
              <Clock size={14} className="animate-spin text-purple-400" />
              <span>Menunggu antrean & polling status fal.ai: <strong>{elapsedTime} detik</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-3 text-xs text-red-200">
          <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold">Gagal Melakukan Live Test:</span>
            <p className="mt-0.5 font-mono text-[11px] text-red-300">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {testResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-widest font-bold text-gray-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Hasil Uji Coba Render Riil ({testResults.successfulTests} Sukses / {testResults.totalTests} Total)
            </h3>
            <span className="text-[11px] font-mono text-gray-500">
              Key: {testResults.apiKeyUsed}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testResults.results.map((res) => {
              const isSuccess = res.status === 'SUCCESS';
              const isImage = res.type === 'image';

              return (
                <div
                  key={res.testId}
                  className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                    isSuccess
                      ? 'bg-[#090909] border-emerald-800/40 shadow-[0_0_20px_rgba(16,185,129,0.06)]'
                      : 'bg-[#090909] border-red-900/40 shadow-[0_0_20px_rgba(239,68,68,0.06)]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Metadata */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg ${isImage ? 'bg-purple-950 text-purple-300' : 'bg-blue-950 text-blue-300'}`}>
                            {isImage ? <ImageIcon size={14} /> : <Film size={14} />}
                          </span>
                          <span className="text-xs font-bold text-white">{res.name}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-1">
                          Model: <span className="text-gray-300">{res.modelId}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono ${
                            isSuccess
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                              : 'bg-red-950/80 text-red-300 border border-red-700/60'
                          }`}
                        >
                          {res.status}
                        </span>
                        <span className="text-[11px] font-bold font-mono text-purple-300 flex items-center gap-1">
                          <Clock size={11} /> {res.durationSec} detik
                        </span>
                      </div>
                    </div>

                    {/* Media Preview Box */}
                    {isSuccess && res.resultUrl && (
                      <div className="rounded-xl overflow-hidden border border-[#222] bg-black relative group">
                        {isImage ? (
                          <div className="relative aspect-video flex items-center justify-center bg-[#050505]">
                            <img
                              src={res.resultUrl}
                              alt={res.name}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={() => setSelectedZoomImg(res.resultUrl || null)}
                            />
                            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg">
                              <button
                                onClick={() => setSelectedZoomImg(res.resultUrl || null)}
                                className="text-gray-300 hover:text-white p-1"
                                title="Zoom Image"
                              >
                                <Maximize2 size={13} />
                              </button>
                              <a
                                href={res.resultUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-300 hover:text-white p-1"
                                title="Open Original URL"
                              >
                                <ExternalLink size={13} />
                              </a>
                            </div>
                            <span className="absolute top-2 left-2 text-[9px] font-mono px-2 py-0.5 rounded bg-black/70 text-purple-300 border border-purple-800/40">
                              4K UHD KEYFRAME
                            </span>
                          </div>
                        ) : (
                          <div className="relative aspect-video bg-[#050505] flex items-center justify-center">
                            <video
                              src={res.resultUrl}
                              controls
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover rounded-xl"
                            />
                            <span className="absolute top-2 left-2 text-[9px] font-mono px-2 py-0.5 rounded bg-black/70 text-blue-300 border border-blue-800/40 pointer-events-none">
                              {res.tier?.toUpperCase()} VIDEO PREVIEW
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error Box if Failed */}
                    {!isSuccess && (
                      <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl space-y-1">
                        <div className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-red-400" />
                          Detail Error Render:
                        </div>
                        <p className="text-[11px] font-mono text-red-400 break-words">
                          {res.error || 'Generasi gagal tanpa pesan error eksplisit.'}
                        </p>
                      </div>
                    )}

                    {/* Execution Logs Dropdown */}
                    <div>
                      <button
                        onClick={() => setActiveLogAccordion(activeLogAccordion === res.testId ? null : res.testId)}
                        className="text-[10px] font-mono text-gray-500 hover:text-gray-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Terminal size={11} />
                        {activeLogAccordion === res.testId ? 'Sembunyikan Log Eksekusi' : 'Lihat Log Polling & Response'}
                      </button>

                      {activeLogAccordion === res.testId && (
                        <div className="mt-2 p-3 bg-[#050505] border border-[#1a1a1a] rounded-lg max-h-36 overflow-y-auto font-mono text-[10px] text-gray-400 space-y-1">
                          {res.logs.map((log, idx) => (
                            <div key={idx} className="leading-relaxed">
                              {log}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action bar */}
                  {isSuccess && res.resultUrl && (
                    <div className="pt-3 border-t border-[#181818] flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-gray-500 truncate max-w-[200px]">
                        URL: {res.resultUrl}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={res.resultUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-[#141414] hover:bg-purple-600 hover:text-white border border-[#282828] hover:border-purple-500 rounded-lg text-[10px] uppercase tracking-wider font-bold text-gray-300 transition-all flex items-center gap-1.5"
                        >
                          <ExternalLink size={11} />
                          Buka Media
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {selectedZoomImg && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedZoomImg(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img
              src={selectedZoomImg}
              alt="4K Render Zoom"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-[#333] shadow-2xl"
            />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <a
                href={selectedZoomImg}
                target="_blank"
                rel="noreferrer"
                download="neurona-4k-render.png"
                className="p-2 rounded-xl bg-black/80 text-white border border-gray-700 hover:bg-white hover:text-black transition"
                title="Download 4K Image"
              >
                <Download size={16} />
              </a>
              <button
                onClick={() => setSelectedZoomImg(null)}
                className="p-2 rounded-xl bg-black/80 text-white border border-gray-700 hover:bg-white hover:text-black transition cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
