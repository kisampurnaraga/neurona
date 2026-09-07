import React, { useState, useEffect } from 'react';
import {
  Server,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Sparkles,
  Play,
  Trash2,
  ShieldCheck,
  Cpu,
  ChevronDown,
  ChevronUp,
  LogIn,
  X,
  Video,
  ExternalLink,
  Layers,
  Check
} from 'lucide-react';

interface HiggsfieldStatusResponse {
  success: boolean;
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'CONNECTING' | 'CONFIGURED_OFFLINE' | 'ERROR';
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
  const [endpointInput, setEndpointInput] = useState('https://mcp.higgsfield.ai/mcp');
  const [selectedModel, setSelectedModel] = useState('higgsfield-video-pro');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testPrompt, setTestPrompt] = useState('A futuristic high-speed cybernetic transport gliding through illuminated neo-tokyo skyscrapers, 8k cinematic lighting');
  const [testVideoResult, setTestVideoResult] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showToolsList, setShowToolsList] = useState(false);

  // Authorization Modal State (OAuth PKCE Flow)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authDirectUrl, setAuthDirectUrl] = useState<string | null>(null);

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

    // Listen for OAuth Popup PostMessage Callbacks
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'HIGGSFIELD_AUTH_SUCCESS') {
        setIsConnectingOAuth(false);
        setIsAuthModalOpen(false);
        showFeedback('success', `✓ Otorisasi Akun Higgsfield MCP Berhasil! (${event.data.toolsCount ?? 2} tools terverifikasi)`);
        await fetchStatus();
      } else if (event.data?.type === 'HIGGSFIELD_AUTH_ERROR') {
        setAuthError(event.data.description || event.data.error || 'Otorisasi Higgsfield dibatalkan atau ditolak.');
        setIsConnectingOAuth(false);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  // Launch Higgsfield Official OAuth PKCE Flow
  const handleOpenAuthPopup = async () => {
    setAuthError(null);
    setIsConnectingOAuth(true);
    setIsAuthModalOpen(true);

    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/fcc/higgsfield/auth/init?origin=${encodeURIComponent(origin)}`, {
        headers: { 'x-role': 'founder' }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menginisialisasi sesi otorisasi Higgsfield');
      }

      setAuthDirectUrl(data.directAuthUrl || data.authUrl);

      const width = 640;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        'Higgsfield_Authorization',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setAuthError('Pop-up terblokir oleh browser. Klik tombol di bawah untuk membuka halaman otorisasi Higgsfield secara manual.');
      }
    } catch (err: any) {
      setAuthError('Gagal membuka portal otorisasi Higgsfield: ' + (err.message || String(err)));
      setIsConnectingOAuth(false);
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
    if (!confirm('Putuskan dan cabut otorisasi sesi Higgsfield MCP? Sesi terenkripsi akan dihapus secara aman.')) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/fcc/higgsfield/disconnect', {
        method: 'POST',
        headers: { 'x-role': 'founder' }
      });
      if (res.ok) {
        showFeedback('info', 'Higgsfield MCP disconnected dan otorisasi dicabut secara aman.');
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

  const isConnected = statusData?.status === 'CONNECTED' && statusData?.authenticated;
  const isError = statusData?.status === 'ERROR';

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
                isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : isError ? 'bg-rose-500' : 'bg-slate-500'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Higgsfield MCP Gateway</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Official OAuth / Account Authorization
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Official Model Context Protocol (MCP) video provider dengan otentikasi akun aman OAuth 2.0 PKCE.
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

      {/* Grid: OAuth Action / Connection Status & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: OAuth Authorization & MCP Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-400" />
                Higgsfield MCP Account Connection
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Endpoint: https://mcp.higgsfield.ai/mcp
              </span>
            </div>

            {/* Architecture Separation Notice */}
            <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-950/20 text-xs font-mono text-purple-200/90 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-purple-300">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Otorisasi Resmi OAuth 2.0 PKCE
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Higgsfield MCP menggunakan otorisasi akun resmi (OAuth/PKCE), bukan API Key manual. Kredensial sesi disimpan terenkripsi di SQLite server, menjamin keamanan data dan integritas billing CreditService.
              </p>
            </div>

            {/* Connection State Card */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-gray-400">Status Otorisasi Sesi</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-mono font-bold ${
                      isConnected ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-gray-300'
                    }`}>
                      {isConnected ? 'CONNECTED / READY' : isError ? 'ERROR' : isConnectingOAuth ? 'CONNECTING...' : 'NOT CONNECTED'}
                    </span>
                    {isConnected && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Active MCP Session
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isConnected ? (
                    <button
                      type="button"
                      id="btn-connect-higgsfield"
                      onClick={handleOpenAuthPopup}
                      disabled={isConnectingOAuth}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      <LogIn className="w-4 h-4" />
                      CONNECT HIGGSFIELD
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-mono py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Ping Health
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-mono py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Endpoint & Model Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/5">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">MCP Endpoint</label>
                  <input
                    type="text"
                    readOnly
                    value={endpointInput}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">Model Default</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="higgsfield-video-pro">Higgsfield Video Pro (Cinematic T2V / I2V - 15 cr)</option>
                    <option value="higgsfield-anim">Higgsfield Anim (Character Animation I2V - 10 cr)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Test Generation Box */}
          {isConnected && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-400" />
                Live Video Generation Tester
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Uji langsung kemampuan render Text-to-Video via Higgsfield MCP pipeline yang terotorisasi.
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
                    : isError
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                }`}>
                  {isConnected ? 'CONNECTED' : isError ? 'ERROR' : isConnectingOAuth ? 'CONNECTING' : 'NOT_CONNECTED'}
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

      {/* OAuth Connecting Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-purple-500/30 bg-slate-950 p-6 shadow-2xl shadow-purple-950/50 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <LogIn className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Otorisasi Akun Higgsfield MCP</h3>
                  <p className="text-xs text-gray-400">OAuth 2.0 PKCE Account Handshake</p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs font-mono text-purple-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-purple-300">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                  Menunggu Otorisasi di Jendela Higgsfield...
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Silakan login dan setujui permintaan otorisasi akun NEURONA di jendela pop-up Higgsfield. Setelah selesai, jendela akan tertutup otomatis dan MCP session akan terhubung.
                </p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                  {authDirectUrl && (
                    <a
                      href={authDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-mono border border-rose-500/40 transition-colors"
                    >
                      Buka Otorisasi Higgsfield <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 transition-colors"
                >
                  Batal / Tutup
                </button>
                <button
                  type="button"
                  onClick={handleOpenAuthPopup}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-mono text-white font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Buka Ulang Pop-up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
