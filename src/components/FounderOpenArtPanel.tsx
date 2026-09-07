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
  ExternalLink,
  ChevronDown,
  ChevronUp,
  LogIn,
  X,
  Lock,
  ArrowRight
} from 'lucide-react';

interface OpenArtStatusResponse {
  success: boolean;
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'CONFIGURED_OFFLINE' | 'ERROR';
  endpoint: string;
  model: string;
  authenticated: boolean;
  maskedKey: string | null;
  capabilities: string[];
  tools: Array<{ name: string; description?: string; inputSchema?: any }>;
  toolsCount: number;
  lastConnected: string | null;
  lastError: string | null;
  latencyMs: number;
}

export const FounderOpenArtPanel: React.FC = () => {
  const [statusData, setStatusData] = useState<OpenArtStatusResponse | null>(null);
  const [sessionTokenInput, setSessionTokenInput] = useState('');
  const [endpointInput, setEndpointInput] = useState('https://mcp.openart.ai/mcp');
  const [selectedModel, setSelectedModel] = useState('openart-video-pro');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testPrompt, setTestPrompt] = useState('A futuristic cybernetic neural core glowing with neon cyan data streams, cinematic photorealistic 8k');
  const [testImageResult, setTestImageResult] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showToolsList, setShowToolsList] = useState(false);

  // Authorization Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'INITIAL' | 'WAITING_POPUP' | 'MANUAL_INPUT'>('INITIAL');

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/fcc/openart/status', {
        headers: { 'x-role': 'founder' }
      });
      if (res.ok) {
        const data: OpenArtStatusResponse = await res.json();
        setStatusData(data);
        if (data.endpoint) setEndpointInput(data.endpoint);
        if (data.model) setSelectedModel(data.model);
      }
    } catch (err: any) {
      console.warn('Failed to fetch OpenArt status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Listen for OAuth Popup PostMessage Callbacks
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OPENART_AUTH_SUCCESS') {
        setIsVerifyingAuth(false);
        setIsAuthModalOpen(false);
        showFeedback('success', `✓ Otorisasi OpenArt MCP Berhasil! (${event.data.toolsCount || 4} tools terhubung)`);
        setSessionTokenInput('');
        setAuthStep('INITIAL');
        await fetchStatus();
      } else if (event.data?.type === 'OPENART_AUTH_ERROR') {
        setAuthError(event.data.description || event.data.error || 'Otorisasi OpenArt dibatalkan atau ditolak.');
        setIsVerifyingAuth(false);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  // Trigger OpenArt OAuth Flow
  const handleOpenAuthPopup = async () => {
    setAuthError(null);
    setIsVerifyingAuth(true);
    setAuthStep('WAITING_POPUP');

    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/fcc/openart/auth/init?origin=${encodeURIComponent(origin)}`, {
        headers: { 'x-role': 'founder' }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memulai otorisasi OpenArt');
      }

      const width = 640;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        'OpenArt_Authorization',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback to manual session input if popup blocked
        setAuthStep('MANUAL_INPUT');
        setAuthError('Pop-up terblokir oleh browser. Anda dapat membuka portal OpenArt di tab baru dan menempelkan Session Token di bawah.');
        setIsVerifyingAuth(false);
      }
    } catch (err: any) {
      setAuthError('Gagal membuka halaman otorisasi OpenArt: ' + (err.message || String(err)));
      setIsVerifyingAuth(false);
    }
  };

  // Verify and Save Token
  const verifyAndSaveToken = async (token: string) => {
    setIsVerifyingAuth(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/fcc/openart/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'founder'
        },
        body: JSON.stringify({
          token: token.trim(),
          endpoint: endpointInput.trim(),
          model: selectedModel
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'OpenArt MCP Berhasil Diotorisasi & Terhubung!');
        setIsAuthModalOpen(false);
        setSessionTokenInput('');
        setAuthStep('INITIAL');
        await fetchStatus();
      } else {
        setAuthError(data.message || data.error || 'Token otorisasi ditolak oleh server OpenArt MCP.');
      }
    } catch (err: any) {
      setAuthError('Gagal memverifikasi token: ' + (err.message || String(err)));
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTokenInput.trim()) {
      setAuthError('Silakan masukkan session token OpenArt.');
      return;
    }
    await verifyAndSaveToken(sessionTokenInput);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/fcc/openart/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'founder'
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || `Koneksi sukses (${data.latencyMs || 0}ms)!`);
      } else {
        showFeedback('error', data.message || 'Koneksi gagal atau credential ditolak.');
      }
      fetchStatus();
    } catch (err: any) {
      showFeedback('error', 'Gagal melakukan tes koneksi: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefreshTools = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/fcc/openart/discover-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'founder'
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', `Berhasil menemukan ${data.toolsCount} MCP Tools (${data.latencyMs}ms)!`);
        fetchStatus();
      } else {
        showFeedback('error', data.error || 'Gagal memperbarui daftar tools.');
      }
    } catch (err: any) {
      showFeedback('error', 'Error tool discovery: ' + err.message);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memutuskan koneksi OpenArt MCP dan menghapus credential tersimpan?')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/fcc/openart/disconnect', {
        method: 'POST',
        headers: { 'x-role': 'founder' }
      });
      if (res.ok) {
        showFeedback('info', 'OpenArt MCP telah diputuskan.');
        setSessionTokenInput('');
        fetchStatus();
      }
    } catch (err: any) {
      showFeedback('error', 'Gagal memutuskan koneksi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTestGeneration = async () => {
    setIsGeneratingTest(true);
    setTestImageResult(null);
    try {
      const res = await fetch('/api/fcc/openart/test-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'founder'
        },
        body: JSON.stringify({ prompt: testPrompt })
      });

      const data = await res.json();
      if (res.ok && data.success && data.assetUrl) {
        setTestImageResult(data.assetUrl);
        showFeedback('success', `Test gambar berhasil digenerate (${(data.durationMs / 1000).toFixed(1)}s)!`);
      } else {
        showFeedback('error', data.error || 'Gagal melakukan test image generation.');
      }
    } catch (err: any) {
      showFeedback('error', 'Gagal test generation: ' + err.message);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const isConnected = statusData?.status === 'CONNECTED';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Media Providers Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-black border border-cyan-500/20 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
            <Server size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>Media Provider Router — OpenArt MCP</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-full font-bold">
                MCP JSON-RPC 2.0
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Official OpenArt Model Context Protocol Integration with Account Authorization.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 transition"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-mono border flex items-center justify-between animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-white/50 hover:text-white">✕</button>
        </div>
      )}

      {/* Main OpenArt Card */}
      <div className="bg-[#0A0A14] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white font-mono">OpenArt MCP Status</h3>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                isConnected
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : statusData?.status === 'CONFIGURED_OFFLINE'
                  ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-white/10 text-slate-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : statusData?.status === 'CONFIGURED_OFFLINE' ? 'bg-amber-400' : 'bg-slate-500'
                }`} />
                <span>{isConnected ? '● Connected' : statusData?.status === 'CONFIGURED_OFFLINE' ? '● Configured (Offline)' : '● Not Connected'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Official OpenArt Model Context Protocol (https://mcp.openart.ai/mcp)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right font-mono text-[11px] text-slate-400">
              <div>Authentication: <span className={statusData?.authenticated ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {statusData?.authenticated ? '● Authorized' : '○ Not Connected'}
              </span></div>
              {statusData?.latencyMs ? (
                <div className="text-cyan-400">Latency: {statusData.latencyMs}ms</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Configuration Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Endpoint Display */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              MCP Endpoint URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={endpointInput}
                onChange={e => setEndpointInput(e.target.value)}
                placeholder="https://mcp.openart.ai/mcp"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 font-mono">Official MCP JSON-RPC 2.0 endpoint</p>
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
              Default OpenArt Model
            </label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-purple-500 transition"
            >
              <option value="kling-3-omni">kling-3-omni (Kling 3 Omni Ultra Fast - 10 Cr)</option>
              <option value="nano-banana-pro">nano-banana-pro (Nano Banana Pro Ads & Text - 30 Cr)</option>
              <option value="nano-banana-2-lite">nano-banana-2-lite (Nano Banana 2 Lite Fast - 15 Cr)</option>
              <option value="byte-plus-seedream-5-pro">byte-plus-seedream-5-pro (Seedream 5 Pro HDR - 30 Cr)</option>
              <option value="byte-plus-seedance-2-fast">byte-plus-seedance-2-fast (Seedance 2.0 Fast Video - 50 Cr)</option>
              <option value="veo3-1">veo3-1 (Google Veo 3.1 Ultra 1080p Video - 100 Cr)</option>
              <option value="wan2-7">wan2-7 (Wan 2.7 Video Engine - 50 Cr)</option>
              <option value="gpt-image-2">gpt-image-2 (GPT Image 2 Creative Synthesis - 20 Cr)</option>
              <option value="openart-video-pro">openart-video-pro (Auto Router I2V)</option>
              <option value="openart-flux-pro">openart-flux-pro (Auto Router Flux)</option>
              <option value="openart-sdxl">openart-sdxl (Auto Router SDXL)</option>
            </select>
            <p className="text-[11px] text-slate-500 font-mono">Primary model for generation dispatches</p>
          </div>

          {/* Account Status / Credential Info */}
          <div className="md:col-span-2 bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Lock size={14} className="text-emerald-400" />
                <span>Account Authorization Status</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {statusData?.authenticated 
                  ? `Akun OpenArt terhubung (Token: ${statusData.maskedKey || '••••••••'}). Credit akun digunakan untuk media generation.` 
                  : 'Belum ada akun OpenArt yang terhubung. Klik tombol di bawah untuk login & otorisasi akun OpenArt Anda.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isConnected ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('INITIAL');
                      setAuthError(null);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono text-slate-200 transition flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} />
                    <span>Reconnect</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 text-xs font-mono text-rose-300 transition flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Disconnect</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('INITIAL');
                    setAuthError(null);
                    setIsAuthModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <LogIn size={14} />
                  <span>Connect OpenArt</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Capabilities Section */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-4 sm:p-5 space-y-3">
          <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-cyan-400" />
            <span>Capabilities Supported</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Image Generation', detail: 'SDXL, Flux Pro, Photoreal', active: true },
              { label: 'Image-to-Video', detail: 'Fast, Pro, Wan 2.1 Motion', active: true },
              { label: 'Text-to-Video', detail: 'Veo 2.0 HD Synthesis', active: true },
              { label: 'Prompt Enhancement', detail: 'Automatic Director Prompts', active: true }
            ].map((cap, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white font-mono">{cap.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{cap.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tools Discovered Telemetry */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu size={16} className="text-purple-400" />
              <div>
                <span className="text-xs font-mono font-bold text-white">Discovered MCP Tools: </span>
                <span className="text-xs font-mono text-cyan-300 font-bold">
                  {statusData?.toolsCount || 0} discovered
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {statusData?.lastConnected && (
                <span className="text-[11px] font-mono text-slate-500 hidden sm:inline flex items-center gap-1">
                  <Clock size={12} />
                  <span>Last Checked: {new Date(statusData.lastConnected).toLocaleTimeString()}</span>
                </span>
              )}
              {statusData && statusData.tools.length > 0 && (
                <button
                  onClick={() => setShowToolsList(!showToolsList)}
                  className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <span>{showToolsList ? 'Hide Tools' : 'Inspect Tools'}</span>
                  {showToolsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* Tools List Accordion */}
          {showToolsList && statusData && statusData.tools.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-white/5 animate-in fade-in duration-200">
              {statusData.tools.map((t, idx) => (
                <div key={idx} className="bg-black/60 border border-white/10 rounded-lg p-3 space-y-1">
                  <div className="text-xs font-mono font-bold text-cyan-300 flex items-center justify-between">
                    <span>{t.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">JSON-RPC</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono line-clamp-2">{t.description || 'OpenArt Media Tool'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
          {!isConnected ? (
            <button
              onClick={() => {
                setAuthStep('INITIAL');
                setAuthError(null);
                setIsAuthModalOpen(true);
              }}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-600/20 disabled:opacity-50"
            >
              <Zap size={14} />
              <span>Connect OpenArt</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
              <CheckCircle2 size={14} />
              <span>Connected to OpenArt</span>
            </div>
          )}

          <button
            onClick={handleTestConnection}
            disabled={isTesting || isLoading}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 font-mono text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck size={14} className={isTesting ? 'animate-pulse text-emerald-400' : ''} />
            <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
          </button>

          <button
            onClick={handleRefreshTools}
            disabled={isDiscovering || isLoading}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-purple-300 font-mono text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isDiscovering ? 'animate-spin' : ''} />
            <span>{isDiscovering ? 'Discovering...' : 'Refresh Tools'}</span>
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('openart-live-test-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-600/20 ml-auto"
          >
            <Sparkles size={14} />
            <span>Test Image Generation</span>
          </button>
        </div>
      </div>

      {/* Live Test Image Generation Section */}
      <div id="openart-live-test-section" className="bg-[#0A0A14] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Live Safe Test Generation (OpenArt SDXL / Photoreal)
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Eksekusi tes prompt aman dengan biaya minimal untuk memverifikasi tools/call end-to-end.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-mono font-bold text-slate-300">
            Test Prompt:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={testPrompt}
              onChange={e => setTestPrompt(e.target.value)}
              placeholder="Masukkan prompt uji coba..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-purple-500 transition"
            />
            <button
              onClick={handleRunTestGeneration}
              disabled={isGeneratingTest || !isConnected}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              {isGeneratingTest ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Run Test Generation</span>
                </>
              )}
            </button>
          </div>
          {!isConnected && (
            <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1 mt-1">
              <AlertCircle size={12} />
              <span>Harap hubungkan dan otorisasi akun OpenArt Anda terlebih dahulu untuk menjalankan tes live.</span>
            </p>
          )}
        </div>

        {/* Test Result Preview */}
        {testImageResult && (
          <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/30 space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                <span>Live Test Output Sukses</span>
              </span>
              <a
                href={testImageResult}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Buka Gambar Asli</span>
                <ExternalLink size={12} />
              </a>
            </div>
            <div className="max-w-xs rounded-lg overflow-hidden border border-white/10 bg-black">
              <img
                src={testImageResult}
                alt="OpenArt MCP Test Result"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Official OpenArt Authorization Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0D0D1A] border border-cyan-500/30 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                  <LogIn size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">Connect OpenArt Account</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Official MCP Authorization & Session Flow</p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            {/* Flow Description */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-4 space-y-2.5 text-xs font-mono text-slate-300">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Langkah Otorisasi Resmi OpenArt:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                <li>Klik tombol <strong className="text-white">"Login & Authorize via OpenArt"</strong> untuk membuka jendela otorisasi.</li>
                <li>Login dengan akun OpenArt Anda dan konfirmasi otorisasi MCP.</li>
                <li>Setelah berhasil, session token akan divalidasi otomatis via MCP handshake (<code className="text-cyan-300">initialize → tools/list</code>).</li>
              </ol>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-3">
              <button
                onClick={handleOpenAuthPopup}
                disabled={isVerifyingAuth}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isVerifyingAuth ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Menunggu Otorisasi & Validasi MCP...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink size={15} />
                    <span>Login & Authorize via OpenArt</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setAuthStep(authStep === 'MANUAL_INPUT' ? 'INITIAL' : 'MANUAL_INPUT')}
                  className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition flex items-center gap-1"
                >
                  <Key size={12} />
                  <span>{authStep === 'MANUAL_INPUT' ? 'Sembunyikan Input Manual' : 'Atau Masukkan Session / Bearer Token Secara Manual'}</span>
                </button>
              </div>
            </div>

            {/* Manual Token Fallback */}
            {authStep === 'MANUAL_INPUT' && (
              <form onSubmit={handleManualTokenSubmit} className="space-y-3 pt-3 border-t border-white/10 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono font-bold text-slate-300">
                      OpenArt Session / Bearer Token:
                    </label>
                    <a
                      href="https://openart.ai"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>OpenArt Portal</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={sessionTokenInput}
                      onChange={e => setSessionTokenInput(e.target.value)}
                      placeholder="Masukkan session token OpenArt akun Anda..."
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/70 border border-white/10 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingAuth || !sessionTokenInput.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifyingAuth ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Memvalidasi Token MCP...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>Verifikasi & Simpan Token</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Modal Footer */}
            <div className="pt-2 text-center text-[10px] text-slate-500 font-mono">
              Token akan disimpan di server-side secara aman dan hanya digunakan untuk autentikasi OpenArt MCP JSON-RPC.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
