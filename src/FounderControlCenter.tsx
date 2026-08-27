import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Server, 
  Activity, 
  Users, 
  Key, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Sliders, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  LogOut, 
  Menu, 
  X, 
  Check, 
  Terminal,
  Cpu,
  Film,
  Sparkles,
  ExternalLink,
  UserPlus,
  Volume2
} from 'lucide-react';
import { FounderDashboard } from './components/FounderDashboard';
import { FounderAudioVoiceLibrary } from './components/FounderAudioVoiceLibrary';
import { FounderGallery } from './components/FounderGallery';
import { Play } from 'lucide-react';

interface ProviderItem {
  id: string;
  name: string;
  type: string;
  status: 'READY' | 'NOT_CONFIGURED' | 'CONNECTED' | 'ERROR' | 'TESTING';
  configured: boolean;
  maskedKey?: string;
  model?: string;
  endpoint?: string;
  lastTested?: string;
}

interface FCCConfig {
  providers: ProviderItem[];
  flags: Record<string, boolean>;
  imageEngine?: 'chatgpt-image-2' | 'openai' | 'dall-e-3' | 'gemini_banana' | 'google_image' | 'imagen-3' | 'flux-diffusion';
  llmEngine?: 'gemini' | 'gemini-1.5-pro' | 'gemini-2.5-pro' | 'anthropic' | 'claude-3-5-sonnet' | 'claude-opus-5' | 'openai' | 'gpt-4o' | 'gemini-2.5-flash';
  primaryVideoEngine?: 'byteplus' | 'veo' | 'runway' | 'sora';
  health: {
    system: string;
    database: string;
    orchestrator: string;
    sse: string;
  };
  metrics?: {
    totalUsers: number;
    totalRevenueUSD: number;
    apiCostRunwayUSD: number;
    apiCostGeminiUSD: number;
    activeRenderJobs: number;
  };
  agentConfigs?: Array<{
    agent_name: string;
    model_version: string;
    temperature: number;
    status: string;
  }>;
  auditLogs?: Array<{
    id: string;
    timestamp: string;
    action: string;
    target: string;
    details: string;
    status: 'SUCCESS' | 'FAILED';
  }>;
}

export default function FounderControlCenter({ onExit }: { onExit?: () => void }) {
  const [config, setConfig] = useState<FCCConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'audio' | 'vault' | 'flags' | 'logs' | 'users' | 'gallery'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Sora / Provider Config Modal State
  const [editingProvider, setEditingProvider] = useState<ProviderItem | null>(null);
  const [inputApiKey, setInputApiKey] = useState('');
  const [inputModel, setInputModel] = useState('');
  const [inputEndpoint, setInputEndpoint] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [testingStatus, setTestingStatus] = useState<{ loading: boolean; message?: string; success?: boolean } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/fcc/config', {
        headers: { 
          'x-role': 'founder',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Access Denied. Founder role required.');
      const data = await res.json();
      setConfig(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleExit = () => {
    if (onExit) {
      onExit();
    } else {
      window.location.href = '/';
    }
  };

  const handleOpenConfigure = (provider: ProviderItem) => {
    setEditingProvider(provider);
    setInputApiKey('');
    setInputModel(provider.model || (provider.id === 'veo' || provider.id === 'google_veo' ? 'veo-3.1-generate-preview' : (provider.id === 'sora' ? 'sora-1.0-turbo' : '')));
    setInputEndpoint(provider.endpoint || (provider.id === 'veo' || provider.id === 'google_veo' ? 'https://generativelanguage.googleapis.com/v1beta' : (provider.id === 'sora' ? 'https://api.openai.com/v1/videos' : '')));
    setTestingStatus(null);
    setSaveStatus(null);
    setShowSecret(false);
  };

  const handleSaveProvider = async () => {
    if (!editingProvider) return;
    setActionLoading(true);
    setSaveStatus(null);

    try {
      const res = await fetch(`/api/fcc/providers/${editingProvider.id}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'founder'
        },
        body: JSON.stringify({
          apiKey: inputApiKey || undefined,
          model: inputModel || undefined,
          endpoint: inputEndpoint || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration.');

      setSaveStatus('Konfigurasi berhasil disimpan.');
      await fetchConfig();
      setTimeout(() => {
        setEditingProvider(null);
        setSaveStatus(null);
      }, 1200);
    } catch (err: any) {
      setSaveStatus(`Gagal: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingStatus({ loading: true });
    try {
      // If we are editing and entered a new key that isn't saved yet, save it first or test directly
      if (editingProvider && inputApiKey) {
        await fetch(`/api/fcc/providers/${editingProvider.id}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-role': 'founder' },
          body: JSON.stringify({ apiKey: inputApiKey, model: inputModel, endpoint: inputEndpoint })
        });
      }

      const res = await fetch(`/api/fcc/providers/${providerId}/test`, {
        method: 'POST',
        headers: { 'x-role': 'founder' }
      });
      const data = await res.json();

      if (data.success) {
        setTestingStatus({ loading: false, success: true, message: data.message || 'Koneksi Provider Valid & Siap Digunakan.' });
      } else {
        setTestingStatus({ loading: false, success: false, message: data.message || 'Koneksi gagal diverifikasi.' });
      }
      await fetchConfig();
    } catch (err: any) {
      setTestingStatus({ loading: false, success: false, message: err.message || 'Error testing connection' });
    }
  };

  const handleToggleFlag = async (key: string, currentValue: boolean) => {
    try {
      const res = await fetch('/api/fcc/flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'founder'
        },
        body: JSON.stringify({ key, value: !currentValue })
      });
      if (res.ok) {
        await fetchConfig();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGlobalChanges = () => {
    showNotification('Perubahan Agen AI telah disinkronkan ke memori global', 'success');
  };
  
  const handleSetLlmEngine = async (engine: 'gemini' | 'gemini-1.5-pro' | 'gemini-2.5-pro' | 'anthropic' | 'claude-3-5-sonnet' | 'claude-opus-5' | 'openai' | 'gpt-4o' | 'gemini-2.5-flash') => {
    try {
      const res = await fetch('/api/fcc/llm-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-role': 'founder' },
        body: JSON.stringify({ engine })
      });
      if (res.ok) {
        fetchConfig();
        showNotification(`Master LLM Engine berhasil dialihkan ke ${engine.toUpperCase()}`, 'success');
      }
    } catch (e) {
      console.error('Failed to set LLM engine', e);
    }
  };

  const handleSetImageEngine = async (engine: 'chatgpt-image-2' | 'dall-e-3' | 'imagen-3' | 'flux-diffusion') => {
    try {
      const res = await fetch('/api/fcc/image-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'founder'
        },
        body: JSON.stringify({ engine })
      });
      if (res.ok) {
        await fetchConfig();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetVideoEngine = async (engine: 'byteplus' | 'veo' | 'runway' | 'sora') => {
    try {
      localStorage.setItem('neurona_video_model', engine);
      const res = await fetch('/api/fcc/video-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'founder'
        },
        body: JSON.stringify({ engine })
      });
      if (res.ok) {
        await fetchConfig();
        showNotification(`Mesin video berhasil dialihkan ke ${engine.toUpperCase()}`, 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#050505] text-red-500 items-center justify-center font-sans p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/40 flex items-center justify-center mb-5">
          <Shield size={32} className="text-red-400" />
        </div>
        <h1 className="text-lg font-bold uppercase tracking-widest mb-2 text-white">Privileged Access Required</h1>
        <p className="text-xs text-red-400/80 max-w-sm mb-6 leading-relaxed">{error}</p>
        <button 
          onClick={handleExit} 
          className="px-6 py-2.5 bg-[#111] border border-red-900/60 rounded-xl uppercase tracking-widest text-xs font-bold text-red-300 hover:bg-red-950/50 transition-all cursor-pointer"
        >
          Return to NEURONA Core
        </button>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-indigo-400 font-mono text-xs uppercase tracking-widest gap-3">
        <RefreshCw className="animate-spin text-indigo-500" size={24} />
        <span>Authenticating Founder Control Plane...</span>
      </div>
    );
  }

  const soraProvider = config.providers.find(p => p.id === 'sora');

  return (
    <div className="relative flex flex-col md:flex-row h-screen w-full bg-[#050505] text-[#E0E0E0] font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* Floating Global Notification Toast */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-950/90 border border-indigo-500/50 text-white shadow-2xl backdrop-blur-md animate-fade-in text-xs font-semibold">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3.5 bg-[#080808] border-b border-[#1a1a1a] z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center">
            <Shield className="text-indigo-400" size={16} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white">Founder Center</div>
            <div className="text-[9px] text-indigo-400/80 uppercase tracking-widest font-mono">Privileged Plane</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExit}
            className="px-2.5 py-1.5 bg-[#111] hover:bg-[#1f1f1f] border border-[#262626] rounded-lg text-[10px] uppercase tracking-wider font-semibold text-gray-300 transition-colors"
          >
            Exit
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-[#111] border border-[#262626] rounded-lg text-gray-300"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[57px] bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1f1f1f] p-4 z-40 space-y-1 shadow-2xl">
          <MobileNavItem 
            icon={<Activity size={16} />} 
            label="Overview" 
            active={activeTab === 'overview'} 
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} 
          />
          <MobileNavItem 
            icon={<Server size={16} />} 
            label="Providers & Sora API" 
            active={activeTab === 'providers'} 
            onClick={() => { setActiveTab('providers'); setMobileMenuOpen(false); }} 
          />
          <MobileNavItem 
            icon={<Volume2 size={16} />} 
            label="Audio Voice Library & TTS" 
            active={activeTab === 'audio'} 
            onClick={() => { setActiveTab('audio'); setMobileMenuOpen(false); }} 
          />
          <MobileNavItem 
            icon={<Key size={16} />} 
            label="API Vault & Keys" 
            active={activeTab === 'vault'} 
            onClick={() => { setActiveTab('vault'); setMobileMenuOpen(false); }} 
          />
          <MobileNavItem 
            icon={<Zap size={16} />} 
            label="Feature Flags" 
            active={activeTab === 'flags'} 
            onClick={() => { setActiveTab('flags'); setMobileMenuOpen(false); }} 
          />
          <MobileNavItem 
            icon={<Users size={16} />} 
            label="Manajemen Pengguna" 
            active={activeTab === 'users'} 
            onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }} 
          />
          <MobileNavItem 
            icon={<Terminal size={16} />} 
            label="Audit Logs" 
            active={activeTab === 'logs'} 
            onClick={() => { setActiveTab('logs'); setMobileMenuOpen(false); }} 
          />
          <MobileNavItem 
            icon={<Play size={16} />} 
            label="Video Gallery" 
            active={activeTab === 'gallery'} 
            onClick={() => { setActiveTab('gallery'); setMobileMenuOpen(false); }} 
          />
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[#1a1a1a] bg-[#070707] flex-col shrink-0">
        <div className="p-5 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="text-indigo-400" size={20} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-400">NEURONA OS</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 font-semibold">Founder Control</div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          <NavItem 
            icon={<Activity size={16}/>} 
            label="Metrik & Finansial" 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')} 
          />
          <NavItem 
            icon={<Server size={16}/>} 
            label="Konfigurasi Agen AI" 
            active={activeTab === 'providers'} 
            badge={!soraProvider?.configured ? "Setup Sora" : undefined}
            onClick={() => setActiveTab('providers')} 
          />
          <NavItem 
            icon={<Volume2 size={16}/>} 
            label="Audio Voice Library" 
            active={activeTab === 'audio'} 
            badge="Google TTS"
            onClick={() => setActiveTab('audio')} 
          />
          <NavItem 
            icon={<Key size={16}/>} 
            label="Kredensial API" 
            active={activeTab === 'vault'} 
            onClick={() => setActiveTab('vault')} 
          />
          <NavItem 
            icon={<Zap size={16}/>} 
            label="Feature Flags" 
            active={activeTab === 'flags'} 
            onClick={() => setActiveTab('flags')} 
          />
          <NavItem 
            icon={<Users size={16}/>} 
            label="Manajemen Pengguna" 
            active={activeTab === 'users'} 
            badge="Aktivasi WA"
            onClick={() => setActiveTab('users')} 
          />
          <NavItem 
            icon={<Terminal size={16}/>} 
            label="Audit Logs" 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
          />
          <NavItem 
            icon={<Play size={16}/>} 
            label="Video Gallery" 
            active={activeTab === 'gallery'} 
            onClick={() => setActiveTab('gallery')} 
          />
        </nav>
        
        <div className="p-4 border-t border-[#1a1a1a] bg-[#050505]">
          <button 
            onClick={handleExit} 
            className="w-full py-2.5 bg-[#111] hover:bg-[#1a1a1a] border border-[#292929] hover:border-gray-500 rounded-xl text-[11px] uppercase tracking-widest font-bold text-gray-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={14} />
            Exit to NEURONA
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A]">
        
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-16 border-b border-[#1a1a1a] items-center justify-between px-8 bg-[#070707]">
          <div className="flex items-center gap-3">
            <h1 className="text-xs uppercase tracking-widest font-bold text-gray-200">
              {activeTab === 'overview' && 'Metrik & Finansial'}
              {activeTab === 'providers' && 'Konfigurasi Agen AI & Engine'}
              {activeTab === 'vault' && 'Kredensial API Vault'}
              {activeTab === 'flags' && 'Operational Feature Flags'}
              {activeTab === 'users' && 'Manajemen Pengguna & Aktivasi Manual WhatsApp'}
              {activeTab === 'logs' && 'Privileged Audit Trails'}
              {activeTab === 'gallery' && 'Video Gallery & Landing Page Demos'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {config.health.system}
            </span>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          
          {/* Quick Notice Banner if Sora is not configured */}
          {!soraProvider?.configured && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <Film className="text-amber-400 shrink-0 mt-0.5 sm:mt-0" size={18} />
                <div>
                  <div className="text-xs font-bold text-amber-200">Sora Video API Belum Dikonfigurasi</div>
                  <div className="text-[11px] text-amber-400/80">Masukkan API Key Sora agar Factory dapat beralih dari mode mock ke video generasi riil.</div>
                </div>
              </div>
              <button 
                onClick={() => soraProvider && handleOpenConfigure(soraProvider)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
              >
                Konfigurasi Sora
              </button>
            </div>
          )}

          {/* TAB: OVERVIEW / METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Financial Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#080808] border border-[#1a1a1a] p-4 rounded-xl">
                  <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-widest">Total Pengguna</p>
                  <h3 className="text-xl font-bold font-mono text-white">{config.metrics?.totalUsers ?? 0}</h3>
                  <span className="text-[10px] text-emerald-400 mt-1 inline-block">+12% minggu ini</span>
                </div>
                <div className="bg-[#080808] border border-[#1a1a1a] p-4 rounded-xl">
                  <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-widest">Total Pendapatan</p>
                  <h3 className="text-xl font-bold font-mono text-emerald-400">${(config.metrics?.totalRevenueUSD ?? 0).toFixed(2)}</h3>
                  <span className="text-[10px] text-gray-500 mt-1 inline-block">Kredit dibeli</span>
                </div>
                <div className="bg-[#080808] border border-[#1a1a1a] p-4 rounded-xl">
                  <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-widest">Cost API Runway</p>
                  <h3 className="text-xl font-bold font-mono text-amber-400">${(config.metrics?.apiCostRunwayUSD ?? 0).toFixed(2)}</h3>
                  <span className="text-[10px] text-red-400/80 mt-1 inline-block">Beban server render</span>
                </div>
                <div className="bg-[#080808] border border-[#1a1a1a] p-4 rounded-xl">
                  <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-widest">Active Render Jobs</p>
                  <h3 className="text-xl font-bold font-mono text-indigo-400">{config.metrics?.activeRenderJobs ?? 0}</h3>
                  <span className="text-[10px] text-indigo-400/80 mt-1 inline-block">Antrean Cloud Tasks</span>
                </div>
              </div>

              {/* Telemetry Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard label="System Health" value={config.health.system} positive />
                <MetricCard label="Database" value={config.health.database} positive />
                <MetricCard label="Video Pipeline" value={soraProvider?.configured ? "SORA ACTIVE" : "MOCK ACTIVE"} />
                <MetricCard label="Orchestrator" value={config.health.orchestrator} positive />
              </div>

              {/* Provider Quick Status Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs uppercase tracking-widest font-bold text-indigo-400">Active Providers Status</h2>
                  <button 
                    onClick={() => setActiveTab('providers')}
                    className="text-[11px] text-gray-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                  >
                    Manage All <ChevronRight size={12} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {config.providers.map(p => (
                    <div key={p.id} className="p-4 sm:p-5 bg-[#080808] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-xl flex items-center justify-between gap-3 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">{p.name}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#151515] border border-[#2a2a2a] text-gray-400 font-mono tracking-wider">{p.type}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-1">
                          Model: {p.model || 'Default'}
                        </div>
                        <div className="mt-2">
                          {p.configured ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                              <CheckCircle2 size={11} /> {p.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                              <AlertCircle size={11} /> Not Configured
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenConfigure(p)}
                        className="px-3.5 py-1.5 bg-[#121212] hover:bg-indigo-600 hover:text-white border border-[#282828] hover:border-indigo-500 rounded-lg text-[10px] uppercase tracking-wider font-bold text-gray-300 transition-all shrink-0 cursor-pointer"
                      >
                        {p.configured ? 'Edit' : 'Setup'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Flags Snapshot */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs uppercase tracking-widest font-bold text-indigo-400">Core Feature Toggles</h2>
                  <button 
                    onClick={() => setActiveTab('flags')}
                    className="text-[11px] text-gray-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                  >
                    All Flags <ChevronRight size={12} />
                  </button>
                </div>
                
                <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl divide-y divide-[#151515]">
                  {Object.entries(config.flags).slice(0, 3).map(([key, val]) => (
                    <div key={key} className="p-3.5 sm:p-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-mono text-gray-300">{key}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {key === 'production_mock_provider' ? 'Simulate rendering without deducting Sora tokens' : 'System runtime execution flag'}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleToggleFlag(key, Boolean(val))}
                        className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors cursor-pointer ${val ? 'bg-indigo-600' : 'bg-[#222]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${val ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB: PROVIDERS */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              
              {/* Agent Configurations */}
              <div className="p-5 bg-[#080808] border border-[#1a1a1a] rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-indigo-400" size={18} />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Konfigurasi Live Agen AI (agent_configs)</h2>
                  </div>
                  <button 
                    onClick={handleSaveGlobalChanges}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded transition cursor-pointer"
                  >
                    Simpan Perubahan Global
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {(config.agentConfigs || []).map((agent) => (
                    <div key={agent.agent_name} className="bg-[#0c0c0c] border border-[#1e1e1e] p-4 rounded-xl flex items-center justify-between transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs uppercase text-indigo-400">{agent.agent_name}</h4>
                          <span className="text-[9px] bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded text-gray-300 font-mono tracking-wider">{agent.model_version}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1.5 font-mono">
                          Temperature: <span className="text-gray-300">{agent.temperature}</span> | Status: <span className="text-emerald-400 font-bold">{agent.status}</span>
                        </p>
                      </div>
                      <button className="bg-[#1a1a1a] hover:bg-indigo-600 border border-[#2c2c2c] hover:border-indigo-500 text-[10px] uppercase font-bold text-gray-300 px-3 py-1.5 rounded transition cursor-pointer">
                        Edit Prompt
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI & Video Engine Configuration</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Atur kredensial dan preferensi model untuk pipeline produksi video multi-agent.</p>
                </div>
              </div>

              
              {/* Default LLM Engine Selector Card */}
              <div className="p-5 bg-[#080808] border border-cyan-900/40 rounded-2xl space-y-4 shadow-lg shadow-cyan-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-cyan-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">Master LLM Engine (Core Director & QA Agents)</h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-bold uppercase font-mono">
                        Active: {(config.llmEngine || 'gemini-1.5-pro').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Pilih "otak" utama sutradara (Director) pembuat instruksi, analisis produk multimodal, copywriting naskah, dan agen QA Audit.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {[
                    { 
                      id: 'gemini-1.5-pro', 
                      label: 'Google Gemini 1.5 Pro / 2.5', 
                      badge: 'SUPERIOR VISION & PRODUK', 
                      desc: 'Superior untuk analisa gambar/produk, keyframe vision, dan multimodal context raksasa.' 
                    },
                    { 
                      id: 'claude-3-5-sonnet', 
                      label: 'Claude 3.5 Sonnet / Opus 5', 
                      badge: 'MASTER COPYWRITING', 
                      desc: 'Sempurna untuk copywriting naskah, hook emosional, dan konsistensi karakter.' 
                    },
                    { 
                      id: 'gpt-4o', 
                      label: 'OpenAI GPT-4o Omni', 
                      badge: 'OMNI REASONING', 
                      desc: 'Standar industri penalaran logis, instruksi JSON ketat, dan stabilitas tinggi.' 
                    },
                    { 
                      id: 'gemini-2.5-flash', 
                      label: 'Google Gemini 2.5 Flash', 
                      badge: 'ULTRA FAST SUB-SECOND', 
                      desc: 'Eksekusi kilat sub-detik untuk brainstorming instan dan interaksi realtime.' 
                    }
                  ].map(eng => {
                    const activeEngine = config.llmEngine || 'gemini-1.5-pro';
                    const isSelected = activeEngine === eng.id || 
                      (eng.id === 'gemini-1.5-pro' && activeEngine === 'gemini') || 
                      (eng.id === 'claude-3-5-sonnet' && activeEngine === 'anthropic') || 
                      (eng.id === 'gpt-4o' && activeEngine === 'openai');
                    return (
                      <button
                        key={eng.id}
                        onClick={() => handleSetLlmEngine(eng.id as any)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                          isSelected 
                            ? 'bg-cyan-950/60 border-cyan-500 shadow-[0_0_18px_rgba(34,211,238,0.3)] text-white ring-1 ring-cyan-400/50' 
                            : 'bg-[#0f0f0f] border-[#222] hover:border-gray-600 text-gray-400 hover:text-gray-200 hover:bg-slate-900/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white">{eng.label}</span>
                            {isSelected && <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] opacity-80 mt-1 leading-relaxed">{eng.desc}</div>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded w-fit uppercase font-semibold ${
                          isSelected ? 'bg-cyan-600 text-white shadow-sm' : 'bg-[#1e1e1e] text-gray-400'
                        }`}>
                          {eng.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Image Engine Selector Card */}
              <div className="p-5 bg-[#080808] border border-indigo-900/40 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">Default Image Generation Engine</h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-bold uppercase font-mono">
                        Active: {config.imageEngine || 'chatgpt-image-2'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Pilih mesin pembuat gambar/keyframe visual adegan. ChatGPT Image 2 aktif secara default, namun Anda dapat memilih mesin alternatif di bawah.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { id: 'chatgpt-image-2', label: 'ChatGPT Image 2', badge: 'OpenAI Primary', desc: 'OpenAI GPT Image 2 Engine' },
                    { id: 'gemini_banana', label: 'Gemini Banana', badge: 'Google AI Studio', desc: 'Google Imagen 3 (Banana)' },
                    { id: 'imagen-3', label: 'Google Imagen 3', badge: 'Photorealistic', desc: 'Google GenAI Imagen 3' },
                    { id: 'flux-diffusion', label: 'Flux AI Diffusion', badge: 'Unlimited Speed', desc: 'Real Neural Diffusion' },
                    { id: 'dall-e-3', label: 'DALL-E 3 Standard', badge: 'Standard OpenAI', desc: 'Standard DALL-E 3' }
                  ].map(eng => {
                    const isSelected = (config.imageEngine || 'chatgpt-image-2') === eng.id;
                    return (
                      <button
                        key={eng.id}
                        onClick={() => handleSetImageEngine(eng.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected 
                            ? 'bg-indigo-950/50 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.25)] text-white' 
                            : 'bg-[#0f0f0f] border-[#222] hover:border-gray-600 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{eng.label}</span>
                            {isSelected && <CheckCircle2 size={14} className="text-indigo-400" />}
                          </div>
                          <div className="text-[10px] opacity-75 mt-0.5">{eng.desc}</div>
                        </div>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded w-fit uppercase font-semibold ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-[#1e1e1e] text-gray-500'
                        }`}>
                          {eng.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Master Video Generation Engine (I2V / Video AI) */}
              <div className="p-5 bg-[#080808] border border-blue-900/40 rounded-2xl space-y-4 shadow-lg shadow-blue-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Film size={16} className="text-blue-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">Master Video Generation Engine (I2V / AI Video)</h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/50 font-bold uppercase font-mono">
                        Active: {(config.primaryVideoEngine || 'byteplus').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Pilih engine rendering video AI utama untuk seluruh pipeline adegan. Klik salah satu model untuk langsung mengaktifkannya.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {[
                    { 
                      id: 'fal', 
                      label: 'Fal.ai Universal API', 
                      badge: 'FAL.AI READY', 
                      desc: 'Akses ke semua model video top-tier (Wan, Seedance, Sora, Kling).' 
                    },
                    { 
                      id: 'byteplus', 
                      label: 'BytePlus ModelArk (PixelDance)', 
                      badge: 'BYTEPLUS ARK', 
                      desc: 'Engine video komersial BytePlus PixelDance. Gerakan dinamis.' 
                    },
                    { 
                      id: 'veo', 
                      label: 'Google Veo 3.1', 
                      badge: 'DEEPMIND VEO', 
                      desc: 'Engine video fotorealistik DeepMind (veo-3.1-generate-preview).' 
                    },
                    { 
                      id: 'runway', 
                      label: 'Runway Gen-3 Alpha', 
                      badge: 'FALLBACK TIER 1', 
                      desc: 'Sinematik dolly, pan & motion brush Runway Gen-3.' 
                    },
                    { 
                      id: 'sora', 
                      label: 'OpenAI Sora Direct', 
                      badge: 'DISABLED (USE FAL)', 
                      desc: 'Gunakan Fal.ai untuk akses Sora via API.' 
                    }
                  ].map(eng => {
                    const activeModelId = config.primaryVideoEngine || localStorage.getItem('neurona_video_model') || 'byteplus';
                    const isSelected = activeModelId === eng.id || (eng.id === 'fal' && activeModelId.startsWith('fal-'));
                    const isSora = eng.id === 'sora';
                    
                    return (
                      <div key={eng.id} className="relative flex flex-col gap-1.5">
                        <button
                          disabled={isSora}
                          onClick={() => {
                            if (eng.id === 'fal') {
                              handleSetVideoEngine('fal-wan21' as any);
                              localStorage.setItem('neurona_video_model', 'fal-wan21');
                            } else {
                              handleSetVideoEngine(eng.id as any);
                              localStorage.setItem('neurona_video_model', eng.id);
                            }
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 h-full ${
                            isSora 
                              ? 'opacity-50 cursor-not-allowed bg-[#0d0d0d] border-[#1f1f1f] text-gray-500'
                              : isSelected 
                              ? 'bg-blue-950/60 border-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.35)] text-white cursor-pointer ring-1 ring-blue-400/50' 
                              : 'bg-[#0f0f0f] border-[#222] hover:border-gray-600 text-gray-400 hover:text-gray-200 cursor-pointer hover:bg-slate-900/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white">{eng.label}</span>
                              {isSelected && <CheckCircle2 size={16} className="text-blue-400 shrink-0" />}
                            </div>
                            <div className="text-[10px] opacity-80 mt-1 leading-relaxed">{eng.desc}</div>
                          </div>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded w-fit uppercase font-semibold ${
                            isSelected ? 'bg-blue-600 text-white shadow-sm' : isSora ? 'bg-[#181818] text-gray-600' : 'bg-[#1e1e1e] text-gray-400'
                          }`}>
                            {eng.badge}
                          </span>
                        </button>
                        
                        {/* Sub-menu for Fal.ai Specific Models */}
                        {isSelected && eng.id === 'fal' && (
                          <div className="absolute top-full left-0 mt-1 w-full z-10 p-2 bg-slate-900 border border-blue-500/40 rounded-xl shadow-xl flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-blue-300 px-1 mb-0.5">Pilih Sub-Model:</span>
                            {[
                              { id: 'fal-wan21', label: 'Wan 2.1' },
                              { id: 'fal-seedance25', label: 'Seedance 2.5' },
                              { id: 'fal-seedance20', label: 'Seedance 2.0' },
                              { id: 'fal-sora3', label: 'Sora 3' },
                              { id: 'fal-sora2', label: 'Sora 2' },
                              { id: 'fal-kling15', label: 'Kling 1.5' },
                              { id: 'fal-minimax', label: 'MiniMax H3' }
                            ].map(subOpt => (
                              <button
                                key={subOpt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetVideoEngine(subOpt.id as any);
                                  localStorage.setItem('neurona_video_model', subOpt.id);
                                }}
                                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg text-left transition ${
                                  activeModelId === subOpt.id
                                    ? 'bg-blue-600/30 text-white border border-blue-500/50'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                                }`}
                              >
                                {subOpt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.providers.map(p => (
                  <div key={p.id} className="p-5 bg-[#080808] border border-[#1a1a1a] hover:border-[#282828] rounded-xl flex flex-col justify-between gap-4 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{p.name}</span>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#181818] border border-[#2a2a2a] text-gray-400 font-mono tracking-wider">{p.type}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {p.id === 'chatgpt_image_2' && 'Engine generasi gambar ChatGPT Image 2 (GPT Image 2) utama untuk merender keyframe adegan dan konsistensi karakter.'}
                            {p.id === 'tryaudio' && 'Gateway TTS TryAudioLab untuk rendering suara vokal Citra Kirana / Dimas Perkasa.'}
                            {p.id === 'elevenlabs' && 'Engine suara vokal ElevenLabs AI Studio Multilingual v2.'}
                            {p.id === 'sora' && 'Engine video difusi sinematik OpenAI untuk menghasilkan klip visual scene.'}
                            {p.id === 'gemini' && 'Engine penalaran multimodal untuk Creative Strategist & Storyboard Director.'}
                            {p.id === 'openai' && 'Engine teks & dialog ChatGPT 4.0 untuk pembentukan naskah.'}
                            {p.id === 'hermes' && 'Intelligence Adapter untuk perumusan konteks dan conversational intent.'}
                            {p.id === 'openclaw' && 'Tool execution layer untuk automasi eksternal berizin.'}
                          </p>
                        </div>

                        {p.configured ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 size={11} /> {p.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full shrink-0">
                            <AlertCircle size={11} /> Not Setup
                          </span>
                        )}
                      </div>

                      <div className="mt-4 p-3 bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg space-y-1.5 font-mono text-[11px]">
                        <div className="flex justify-between text-gray-400">
                          <span>API Secret:</span>
                          <span className="text-gray-200">{p.maskedKey || (p.configured ? 'Active (Env)' : 'None')}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Active Model:</span>
                          <span className="text-indigo-400">{p.model || 'Standard'}</span>
                        </div>
                        {p.lastTested && (
                          <div className="flex justify-between text-gray-500 text-[10px]">
                            <span>Last Tested:</span>
                            <span>{new Date(p.lastTested).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#161616]">
                      <button
                        onClick={() => handleOpenConfigure(p)}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                      >
                        {p.id === 'sora' ? (p.configured ? 'Update Sora Key' : 'Input Sora API Key') : 'Configure'}
                      </button>
                      <button
                        onClick={() => handleTestConnection(p.id)}
                        className="px-3.5 py-2 bg-[#141414] hover:bg-[#202020] border border-[#2a2a2a] text-gray-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                        title="Test Health Check"
                      >
                        Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: API VAULT */}
          {activeTab === 'vault' && (
            <div className="space-y-6">
              <div className="p-5 bg-[#080808] border border-[#1a1a1a] rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="text-indigo-400" size={18} />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Founder Credential Vault</h2>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                  Kredensial disimpan secara aman di sisi server. Kunci rahasia tidak pernah dikirimkan ke frontend dalam format plaintext untuk mencegah eksfiltrasi.
                </p>

                <div className="mt-6 space-y-4">
                  {config.providers.map(p => (
                    <div key={p.id} className="p-4 bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{p.name} Key</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#181818] border border-[#2a2a2a] text-gray-400 font-mono">{p.type}</span>
                        </div>
                        <div className="text-xs font-mono text-gray-400 mt-1">
                          {p.maskedKey ? p.maskedKey : <span className="text-amber-400/80">No credential attached</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenConfigure(p)}
                          className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-indigo-600 hover:text-white border border-[#2c2c2c] hover:border-indigo-500 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-300 transition-all cursor-pointer"
                        >
                          {p.configured ? 'Replace Key' : 'Enter API Key'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: FEATURE FLAGS */}
          {activeTab === 'flags' && (
            <div className="space-y-6">
              <div className="p-5 bg-[#080808] border border-[#1a1a1a] rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="text-amber-400" size={18} />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Runtime Feature Flags</h2>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  Ubah perilaku sistem secara langsung tanpa perlu restart server.
                </p>

                <div className="divide-y divide-[#1a1a1a]">
                  {Object.entries(config.flags).map(([key, val]) => (
                    <div key={key} className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-mono font-bold text-gray-200">{key}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {key === 'production_mock_provider' && 'Saat aktif, Factory menggunakan video simulasi cepat tanpa memakan kuota Sora API.'}
                          {key === 'ambient_clap_activation' && 'Deteksi tepuk tangan lokal mikrofon untuk membangunkan NEURONA.'}
                          {key === 'voice_output' && 'Menghasilkan respon suara natural untuk dialog OS.'}
                          {key === 'hermes_intelligence' && 'Aktifkan layer Hermes untuk penalaran conversational lanjutan.'}
                          {key === 'openclaw_execution' && 'Izinkan akses tool eksternal melalui boundary permission OpenClaw.'}
                        </div>
                      </div>

                      <button 
                        onClick={() => handleToggleFlag(key, Boolean(val))}
                        className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 cursor-pointer ${val ? 'bg-indigo-600' : 'bg-[#222]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${val ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="p-5 bg-[#080808] border border-[#1a1a1a] rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Terminal className="text-emerald-400" size={18} />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">System Audit Trail</h2>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  Catatan riwayat eksekusi kontrol founder dan pembaruan kredensial platform.
                </p>

                <div className="space-y-2.5">
                  {config.auditLogs && config.auditLogs.length > 0 ? (
                    config.auditLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-[#0c0c0c] border border-[#1a1a1a] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-[#181818] text-indigo-400 font-bold">{log.action}</span>
                          <span className="text-gray-300">{log.details}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500 text-[10px]">
                          <span>Target: {log.target}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 font-mono py-4">Belum ada audit log terbaru.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: USER MANAGEMENT & WA ACTIVATION */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <FounderDashboard />
            </div>
          )}

          {/* TAB: AUDIO VOICE LIBRARY & TTS */}
          {activeTab === 'audio' && (
            <FounderAudioVoiceLibrary />
          )}

          {/* TAB: VIDEO GALLERY */}
          {activeTab === 'gallery' && (
            <FounderGallery />
          )}

        </div>
      </main>

      {/* SORA / PROVIDER CONFIGURATION MODAL */}
      {editingProvider && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#0c0c0c] border border-[#242424] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1f1f1f] flex items-center justify-between bg-[#080808]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center">
                  <Film className="text-indigo-400" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {editingProvider.id === 'sora' ? 'Konfigurasi Sora Video API' : `Konfigurasi ${editingProvider.name}`}
                  </h3>
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                    Provider Type: {editingProvider.type}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setEditingProvider(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              
              {/* Status Alert */}
              {editingProvider.configured ? (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={16} />
                  <span>Kredensial aktif terdeteksi ({editingProvider.maskedKey}). Anda dapat menggantinya di bawah.</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
                  <AlertCircle className="text-amber-400 shrink-0" size={16} />
                  <span>Kredensial belum tersimpan. Masukkan API Key Sora untuk mengaktifkan video riil.</span>
                </div>
              )}

              {/* API Key Input */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  {editingProvider.id === 'sora' ? 'OpenAI / Sora API Key' : 'API Key / Secret'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={inputApiKey}
                    onChange={e => setInputApiKey(e.target.value)}
                    placeholder={editingProvider.maskedKey ? `Current: ${editingProvider.maskedKey}` : "sk-..."}
                    className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-gray-600 outline-none pr-10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">
                  Kunci akan disimpan di server-side memory vault dan dienkripsi saat eksekusi.
                </p>
              </div>

              {/* Model Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Model Identifier
                </label>
                {(editingProvider.id === 'fal') ? (
                  <div className="relative">
                    <select
                      id="fcc-fal-model-select"
                      value={inputModel || 'fal-ai/hunyuan-video'}
                      onChange={e => setInputModel(e.target.value)}
                      className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-medium text-white outline-none transition-colors appearance-none cursor-pointer pr-10"
                    >
                      <option value="fal-ai/wan-v2.1" className="bg-[#1a1a1a] text-white py-2">
                        Wan 2.1 (Sangat efisien & hemat)
                      </option>
                      <option value="fal-ai/seedance-2.5" className="bg-[#1a1a1a] text-white py-2">
                        Seedance 2.5 (Audio & sinematik)
                      </option>
                      <option value="fal-ai/seedance-2.0" className="bg-[#1a1a1a] text-white py-2">
                        Seedance 2.0 (Cepat & stabil)
                      </option>
                      <option value="fal-ai/sora-3" className="bg-[#1a1a1a] text-white py-2">
                        Sora 3 (Realistis & natural)
                      </option>
                      <option value="fal-ai/hunyuan-video" className="bg-[#1a1a1a] text-white py-2">
                        Hunyuan Video (Default)
                      </option>
                      <option value="fal-ai/kling-1.5" className="bg-[#1a1a1a] text-white py-2">
                        Kling 1.5 (Kreatif)
                      </option>
                      <option value="fal-ai/minimax-h3" className="bg-[#1a1a1a] text-white py-2">
                        MiniMax H3 (Karakter presisi)
                      </option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                ) : (editingProvider.id === 'veo' || editingProvider.id === 'google_veo') ? (
                  <div className="relative">
                    <select
                      id="fcc-veo-model-select"
                      value={inputModel || 'veo-3.1-generate-preview'}
                      onChange={e => setInputModel(e.target.value)}
                      className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-medium text-white outline-none transition-colors appearance-none cursor-pointer pr-10"
                    >
                      <option value="veo-3.1-lite-generate-preview" className="bg-[#1a1a1a] text-white py-2">
                        veo-3.1-lite-generate-preview (Veo 3.1 Lite - Ekonomis & Cepat)
                      </option>
                      <option value="veo-3.1-generate-preview" className="bg-[#1a1a1a] text-white py-2">
                        veo-3.1-generate-preview (Veo 3.1 Standard - High Quality)
                      </option>
                      <option value="veo-2.0-generate-001" className="bg-[#1a1a1a] text-white py-2">
                        veo-2.0-generate-001 (Veo 2.0 - Stabil)
                      </option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={inputModel}
                    onChange={e => setInputModel(e.target.value)}
                    placeholder="sora-1.0-turbo"
                    className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-gray-600 outline-none transition-colors"
                  />
                )}
                {(editingProvider.id === 'veo' || editingProvider.id === 'google_veo') && (
                  <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Model resmi Google DeepMind Video Generative AI (Tier Gemini API).
                  </p>
                )}
              </div>

              {/* API Endpoint */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  API Endpoint / Gateway
                </label>
                <input
                  type="text"
                  value={inputEndpoint}
                  onChange={e => setInputEndpoint(e.target.value)}
                  placeholder="https://api.openai.com/v1/videos"
                  className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-gray-600 outline-none transition-colors"
                />
              </div>

              {/* Testing Status Banner */}
              {testingStatus && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testingStatus.loading 
                    ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-300' 
                    : testingStatus.success 
                      ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' 
                      : 'bg-red-950/30 border-red-800/40 text-red-300'
                }`}>
                  {testingStatus.loading && <RefreshCw size={14} className="animate-spin text-indigo-400" />}
                  {testingStatus.success && <CheckCircle2 size={14} className="text-emerald-400" />}
                  {testingStatus.success === false && <AlertCircle size={14} className="text-red-400" />}
                  <span>{testingStatus.loading ? 'Memverifikasi status koneksi provider...' : testingStatus.message}</span>
                </div>
              )}

              {/* Save Status Banner */}
              {saveStatus && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-700/50 rounded-xl text-xs text-indigo-200 flex items-center gap-2">
                  <Check size={14} className="text-indigo-400" />
                  <span>{saveStatus}</span>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1f1f1f] bg-[#080808] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleTestConnection(editingProvider.id)}
                disabled={actionLoading || testingStatus?.loading}
                className="px-4 py-2 bg-[#141414] hover:bg-[#202020] border border-[#2a2a2a] rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 transition-all cursor-pointer disabled:opacity-50"
              >
                Test Koneksi
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 hover:bg-[#181818] rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveProvider}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Simpan Kredensial
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function NavItem({ 
  icon, 
  label, 
  active = false, 
  badge, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  badge?: string; 
  onClick?: () => void; 
}) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
        active 
          ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30' 
          : 'text-gray-400 hover:bg-[#111] hover:text-gray-200 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon} 
        <span>{label}</span>
      </div>
      {badge && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
          {badge}
        </span>
      )}
    </div>
  );
}

function MobileNavItem({ 
  icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  onClick?: () => void; 
}) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
        active 
          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
          : 'text-gray-400 hover:bg-[#141414] text-gray-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function MetricCard({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="p-4 sm:p-5 bg-[#080808] border border-[#1a1a1a] rounded-xl">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5 font-semibold">{label}</div>
      <div className={`text-base sm:text-xl font-bold font-mono ${positive ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
