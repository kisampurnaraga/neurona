import React, { useState, useEffect } from 'react';
import {
  Server,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Sparkles,
  Play,
  Trash2,
  Clock,
  ShieldCheck,
  Cpu,
  ChevronDown,
  ChevronUp,
  LogIn,
  X,
  Video
} from 'lucide-react';

interface HiggsfieldStatusResponse {
  success: boolean;
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'CONFIGURED_OFFLINE' | 'ERROR';
  endpoint: string;
  model: string;
  authenticated: boolean;
  maskedKey: string | null;
  capabilities: string[];
  tools: Array<{ name: string; description?: string; inputSchema?: any }>;
  toolsCount: number;
  supportedModels: Array<{ id: string; name: string; type: string; tier: string; costUsd: number; description: string }>;
  lastConnected: string | null;
  lastError: string | null;
  latencyMs: number;
}

export const FounderHiggsfieldPanel: React.FC = () => {
  const [statusData, setStatusData] = useState<HiggsfieldStatusResponse | null>(null);
  const [sessionTokenInput, setSessionTokenInput] = useState('');
  const [endpointInput, setEndpointInput] = useState('https://mcp.higgsfield.ai/mcp');
  const [selectedModel, setSelectedModel] = useState('higgsfield-video-pro');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testPrompt, setTestPrompt] = useState('A futuristic high-speed cybernetic transport gliding through illuminated neo-tokyo skyscrapers, 8k cinematic lighting');
  const [testVideoResult, setTestVideoResult] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showToolsList, setShowToolsList] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/fcc/higgsfield/status', {
        headers: { 'x-role': 'founder' }
      });
      if (res.ok) {
        const data: HiggsfieldStatusResponse = await res.json();
        setStatusData(data);
        if (data.endpoint) setEndpointInput(data.endpoint);
        if (data.model) setSelectedModel(data.model);
      }
    } catch (err: any) {
      console.warn('Failed to fetch Higgsfield status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTokenInput.trim()) {
      showFeedback('error', 'Silakan masukkan API Key / Session Token Higgsfield.');
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch('/api/fcc/higgsfield/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-role': 'founder' },
        body: JSON.stringify({
          apiKey: sessionTokenInput.trim(),
          endpoint: endpointInput.trim(),
          model: selectedModel
        })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', `✓ Higgsfield MCP berhasil terhubung (${data.toolsCount ?? 0} tools ditemukan)!`);
        setSessionTokenInput('');
        await fetchStatus();
      } else {
        showFeedback('error', data.message || data.error || 'Gagal menghubungkan Higgsfield MCP.');
      }
    } catch (err: any) {
      showFeedback('error', `Error: ${err?.message || 'Jaringan bermasalah'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/fcc/higgsfield/test', {
        method: 'POST',
        headers: { 'x-role': 'founder' }
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', data.message || '✓ Koneksi Higgsfield MCP aktif & terverifikasi!');
        await fetchStatus();
      } else {
        showFeedback('error', data.message || data.error || 'Uji koneksi gagal.');
      }
    } catch (err: any) {
      showFeedback('error', `Error: ${err?.message || 'Gagal menghubungi server'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDiscoverTools = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/fcc/higgsfield/discover-tools', {
        method: 'POST',
        headers: { 'x-role': 'founder' }
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', `✓ Ditemukan ${data.toolsCount} MCP Tools (${data.latencyMs}ms)`);
        await fetchStatus();
      } else {
        showFeedback('error', data.error || 'Gagal discovery tools.');
      }
    } catch (err: any) {
      showFeedback('error', `Error: ${err?.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Putuskan koneksi Higgsfield MCP?')) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/fcc/higgsfield/disconnect', {
        method: 'POST',
        headers: { 'x-role': 'founder' }
      });
      if (res.ok) {
        showFeedback('info', 'Higgsfield MCP terputus.');
        await fetchStatus();
      }
    } catch (err: any) {
      showFeedback('error', `Error: ${err?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestGeneration = async () => {
    if (!testPrompt.trim()) return;
    setIsGeneratingTest(true);
    setTestVideoResult(null);
    try {
      const res = await fetch('/api/fcc/higgsfield/test-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-role': 'founder' },
        body: JSON.stringify({ prompt: testPrompt })
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setTestVideoResult(data.videoUrl);
        showFeedback('success', '✓ Uji coba render Higgsfield video berhasil!');
      } else {
        showFeedback('error', data.error || 'Gagal render uji coba Higgsfield.');
      }
    } catch (err: any) {
      showFeedback('error', `Error: ${err?.message}`);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const isConnected = statusData?.status === 'CONNECTED';

  return (
    <div id="founder-higgsfield-panel" className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-purple-950/40 via-black/60 to-indigo-950/30 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Video className="w-6 h-6 text-white" />
              </div>
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${
                isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-rose-500'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Higgsfield MCP Gateway</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Model Context Protocol
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Official MCP adapter untuk Text-to-Video & Image-to-Video generation berkecepatan tinggi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-xs font-mono text-red-400 flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-mono flex items-center gap-2 border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-950/50 border-rose-500/30 text-rose-300'
              : 'bg-cyan-950/50 border-cyan-500/30 text-cyan-300'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* Grid: Config Form & Health Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Connection Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl space-y-4">
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              Koneksi & Kredensial MCP
            </h3>

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">MCP Endpoint</label>
                <input
                  type="text"
                  value={endpointInput}
                  onChange={(e) => setEndpointInput(e.target.value)}
                  placeholder="https://mcp.higgsfield.ai/mcp"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">
                  Session Token / API Key
                  {statusData?.maskedKey && (
                    <span className="ml-2 text-[10px] text-gray-500 font-mono">
                      (Tersimpan: {statusData.maskedKey})
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={sessionTokenInput}
                    onChange={(e) => setSessionTokenInput(e.target.value)}
                    placeholder={statusData?.authenticated ? '•••••••••••••••• (Terotentikasi)' : 'Masukkan Higgsfield Session Token / Key'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Model Default</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-black/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500/50"
                >
                  <option value="higgsfield-video-pro">Higgsfield Video Pro (Cinematic T2V / I2V - 15 cr)</option>
                  <option value="higgsfield-anim">Higgsfield Anim (Character Animation I2V - 10 cr)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  {isTesting ? 'Memverifikasi...' : 'Simpan & Verifikasi Otorisasi'}
                </button>
                {isConnected && (
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-mono py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Ping Health
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Test Generation Box */}
          {isConnected && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-400" />
                Live Video Generation Tester
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Uji langsung kemampuan render Text-to-Video via Higgsfield MCP pipeline.
              </p>

              <div className="space-y-3">
                <textarea
                  rows={2}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Ketik deskripsi scene video..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                />

                <button
                  onClick={handleTestGeneration}
                  disabled={isGeneratingTest || !testPrompt.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-mono font-semibold py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingTest ? 'animate-spin' : ''}`} />
                  {isGeneratingTest ? 'Sedang Me-render Video MCP...' : 'Jalankan Test Video Render'}
                </button>

                {testVideoResult && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-3 space-y-2">
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Output Video Berhasil Dibuat
                    </span>
                    <video
                      src={testVideoResult}
                      controls
                      autoPlay
                      loop
                      className="w-full rounded-lg max-h-60 bg-black object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: MCP Telemetry & Tools Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl space-y-4">
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Status & Telemetri
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400 font-mono">Status Koneksi</span>
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
                  isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {statusData?.status || 'UNKNOWN'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400 font-mono">Latency MCP</span>
                <span className="text-xs font-mono text-white">
                  {statusData?.latencyMs ? `${statusData.latencyMs} ms` : '-'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400 font-mono">Discovered Tools</span>
                <span className="text-xs font-mono text-purple-300 font-bold">
                  {statusData?.toolsCount ?? 0} Tools
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400 font-mono">Protocol Ver.</span>
                <span className="text-xs font-mono text-gray-300">2024-11-05</span>
              </div>
            </div>

            {isConnected && (
              <div className="pt-2">
                <button
                  onClick={handleDiscoverTools}
                  disabled={isDiscovering}
                  className="w-full py-2 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 flex items-center justify-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                  Refresh Tool Discovery (tools/list)
                </button>
              </div>
            )}
          </div>

          {/* Tools List Accordion */}
          {statusData?.tools && statusData.tools.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl space-y-2">
              <button
                onClick={() => setShowToolsList(!showToolsList)}
                className="w-full flex items-center justify-between text-xs font-mono text-gray-300 hover:text-white"
              >
                <span>Daftar Tools Terdaftar ({statusData.tools.length})</span>
                {showToolsList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showToolsList && (
                <div className="space-y-2 pt-2 max-h-60 overflow-y-auto">
                  {statusData.tools.map((t, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-[11px] font-mono">
                      <div className="font-semibold text-purple-300">{t.name}</div>
                      <div className="text-gray-400 text-[10px] mt-0.5">{t.description || 'No description'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
