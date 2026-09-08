import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  RefreshCw, 
  Save, 
  ExternalLink,
  Lock,
  Radio,
  Server,
  KeyRound,
  Sparkles,
  Info
} from 'lucide-react';

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface DomainConfig {
  environment: AppEnvironment;
  productionAppUrl: string;
  stagingAppUrl?: string;
  developmentAppUrl?: string;
  canonicalUrl: string;
  publicUrl: string;
  allowedOrigins: string[];
  trustedOAuthOrigins: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface DerivedOAuthUrls {
  oauthCallbackBaseUrl: string;
  openArtOAuthCallbackUrl: string;
  higgsfieldOAuthCallbackUrl: string;
  telegramWebhookUrl: string;
}

export const FounderDomainConfigPanel: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);

  // Form State
  const [environment, setEnvironment] = useState<AppEnvironment>('development');
  const [productionAppUrl, setProductionAppUrl] = useState<string>('https://app.neurona.ai');
  const [stagingAppUrl, setStagingAppUrl] = useState<string>('https://staging.neurona.ai');
  const [developmentAppUrl, setDevelopmentAppUrl] = useState<string>('http://localhost:3000');
  const [canonicalUrl, setCanonicalUrl] = useState<string>('https://app.neurona.ai');
  const [publicUrl, setPublicUrl] = useState<string>('https://app.neurona.ai');
  
  const [allowedOriginsText, setAllowedOriginsText] = useState<string>('');
  const [trustedOAuthOriginsText, setTrustedOAuthOriginsText] = useState<string>('');

  // Derived & Status
  const [derivedUrls, setDerivedUrls] = useState<DerivedOAuthUrls | null>(null);
  const [domainStatus, setDomainStatus] = useState<'VALID' | 'INVALID'>('VALID');
  const [productionReadiness, setProductionReadiness] = useState<'READY' | 'ACTION_REQUIRED'>('READY');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token') || '';
    return {
      'x-role': 'founder',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchDomainConfig = async () => {
    setLoading(true);
    setErrors([]);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/fcc/domain-config', {
        headers: getAuthHeader()
      });
      if (!res.ok) {
        throw new Error(`Gagal memuat konfigurasi domain (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.domainConfig) {
        const cfg: DomainConfig = data.domainConfig;
        setEnvironment(cfg.environment || 'development');
        setProductionAppUrl(cfg.productionAppUrl || 'https://app.neurona.ai');
        setStagingAppUrl(cfg.stagingAppUrl || 'https://staging.neurona.ai');
        setDevelopmentAppUrl(cfg.developmentAppUrl || 'http://localhost:3000');
        setCanonicalUrl(cfg.canonicalUrl || 'https://app.neurona.ai');
        setPublicUrl(cfg.publicUrl || 'https://app.neurona.ai');
        
        setAllowedOriginsText((cfg.allowedOrigins || []).join('\n'));
        setTrustedOAuthOriginsText((cfg.trustedOAuthOrigins || []).join('\n'));
      }
      if (data.derivedOAuthUrls) {
        setDerivedUrls(data.derivedOAuthUrls);
      }
      setDomainStatus(data.status || 'VALID');
      setProductionReadiness(data.productionReadiness || 'READY');
      setWarnings(data.warnings || []);
    } catch (err: any) {
      setErrors([err.message || 'Terjadi kesalahan saat memuat konfigurasi domain']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomainConfig();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const buildPayload = (): Partial<DomainConfig> => {
    const allowed = allowedOriginsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    const trusted = trustedOAuthOriginsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    return {
      environment,
      productionAppUrl: productionAppUrl.trim(),
      stagingAppUrl: stagingAppUrl.trim() || undefined,
      developmentAppUrl: developmentAppUrl.trim() || undefined,
      canonicalUrl: canonicalUrl.trim(),
      publicUrl: publicUrl.trim(),
      allowedOrigins: allowed,
      trustedOAuthOrigins: trusted
    };
  };

  const handleValidate = async () => {
    setValidating(true);
    setErrors([]);
    setSuccessMessage(null);
    try {
      const payload = buildPayload();
      const res = await fetch('/api/fcc/domain-config/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.valid) {
        setDomainStatus('INVALID');
        setErrors(data.errors || ['Konfigurasi domain tidak valid']);
        setWarnings(data.warnings || []);
      } else {
        setDomainStatus('VALID');
        setErrors([]);
        setWarnings(data.warnings || []);
        if (data.derivedUrls) {
          setDerivedUrls(data.derivedUrls);
        }
        setSuccessMessage('✅ Validasi berhasil: Seluruh format URL dan exact origin memenuhi standar keamanan.');
      }
    } catch (err: any) {
      setDomainStatus('INVALID');
      setErrors([err.message || 'Gagal memvalidasi konfigurasi']);
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);
    setSuccessMessage(null);
    try {
      const payload = buildPayload();
      const res = await fetch('/api/fcc/domain-config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDomainStatus('INVALID');
        setErrors(data.errors || [data.message || 'Gagal menyimpan konfigurasi']);
        setWarnings(data.warnings || []);
      } else {
        setDomainStatus('VALID');
        setErrors([]);
        setWarnings(data.warnings || []);
        if (data.derivedOAuthUrls) {
          setDerivedUrls(data.derivedOAuthUrls);
        }
        setSuccessMessage('🎉 Konfigurasi Domain & URL berhasil disimpan secara aman ke database SQLite!');
        fetchDomainConfig();
      }
    } catch (err: any) {
      setDomainStatus('INVALID');
      setErrors([err.message || 'Gagal menyimpan konfigurasi']);
    } finally {
      setSaving(false);
    }
  };

  // Quick helper to fill standard production domain
  const applyPreset = (targetDomain: string) => {
    const clean = targetDomain.trim().replace(/\/+$/, '');
    setProductionAppUrl(clean);
    setCanonicalUrl(clean);
    setPublicUrl(clean);
    
    // Add to allowed and oauth lists if not present
    const allowed = allowedOriginsText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!allowed.includes(clean)) {
      setAllowedOriginsText([clean, ...allowed].join('\n'));
    }
    const trusted = trustedOAuthOriginsText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!trusted.includes(clean)) {
      setTrustedOAuthOriginsText([clean, ...trusted].join('\n'));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#0A0A12] border border-white/10 rounded-2xl">
        <RefreshCw className="animate-spin text-cyan-400 mb-3" size={28} />
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Memuat Konfigurasi Domain & URL...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner & Status Cards */}
      <div className="bg-gradient-to-r from-[#0d1117] via-[#090d16] to-[#0A0A12] border border-cyan-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50">
              <Globe size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-wide">Domain & URL Management</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                  FCC v2.5
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">
                Konfigurasi domain aplikasi NEURONA, canonical origin, dan security allowlist tanpa hard-code.
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider ${
              domainStatus === 'VALID' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                : 'bg-red-950/40 border-red-500/40 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${domainStatus === 'VALID' ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
              <span>Domain: {domainStatus === 'VALID' ? '🟢 Valid' : '🔴 Invalid'}</span>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider ${
              productionReadiness === 'READY'
                ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}>
              <ShieldCheck size={14} />
              <span>Prod Readiness: {productionReadiness === 'READY' ? 'READY' : 'ACTION REQUIRED'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification / Messages */}
      {successMessage && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs font-mono">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs font-mono space-y-1">
          <div className="flex items-center gap-2 font-bold text-red-400">
            <AlertTriangle size={15} />
            <span>Terdapat Kesalahan Validasi:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-300/90 pl-1">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs font-mono space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Info size={15} />
            <span>Pemberitahuan Sinkronisasi Eksternal:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/90 pl-1">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Application Environment & Domain */}
          <div className="bg-[#0A0A12] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-mono text-xs font-bold uppercase tracking-wider">
                <Server size={15} className="text-cyan-400" />
                <span>1. Application Environment & URLs</span>
              </div>
              <span className="text-[10px] font-mono text-gray-500">Tier 1 Hierarchy</span>
            </div>

            {/* Environment Radio Selector */}
            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                Active Environment Target
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['development', 'staging', 'production'] as AppEnvironment[]).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      environment === env
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/40'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            {/* Production App URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-gray-300 uppercase tracking-wider">
                  Production App URL <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] font-mono text-gray-500">Wajib HTTPS (e.g. https://app.domainbaru.com)</span>
              </div>
              <input
                type="text"
                value={productionAppUrl}
                onChange={(e) => setProductionAppUrl(e.target.value)}
                placeholder="https://app.neurona.ai"
                className="w-full px-3.5 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>

            {/* Canonical & Public URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-gray-300 uppercase tracking-wider mb-1">
                  Canonical URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://app.neurona.ai"
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-300 uppercase tracking-wider mb-1">
                  Public Assets / Frontend URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={publicUrl}
                  onChange={(e) => setPublicUrl(e.target.value)}
                  placeholder="https://app.neurona.ai"
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Staging & Dev URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                  Staging URL (Optional)
                </label>
                <input
                  type="text"
                  value={stagingAppUrl}
                  onChange={(e) => setStagingAppUrl(e.target.value)}
                  placeholder="https://staging.neurona.ai"
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                  Development URL (Optional)
                </label>
                <input
                  type="text"
                  value={developmentAppUrl}
                  onChange={(e) => setDevelopmentAppUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Security & Allowed Origins */}
          <div className="bg-[#0A0A12] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-mono text-xs font-bold uppercase tracking-wider">
                <Lock size={15} className="text-emerald-400" />
                <span>2. Security & Origin Allowlist (Exact Match)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">Anti-Wildcard Enforced</span>
            </div>

            {/* Allowed Origins */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-gray-300 uppercase tracking-wider">
                  CORS & Platform Allowed Origins (1 per baris)
                </label>
                <span className="text-[10px] font-mono text-gray-500">Exact origins only (No *)</span>
              </div>
              <textarea
                rows={4}
                value={allowedOriginsText}
                onChange={(e) => setAllowedOriginsText(e.target.value)}
                placeholder="http://localhost:3000&#10;https://app.neurona.ai&#10;https://app.domainbaru.com"
                className="w-full p-3 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-400 leading-relaxed resize-y"
              />
            </div>

            {/* Trusted OAuth Origins */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-gray-300 uppercase tracking-wider">
                  Trusted OAuth Origins (Higgsfield & OpenArt PKCE)
                </label>
                <span className="text-[10px] font-mono text-gray-500">Origin untuk targetOrigin postMessage</span>
              </div>
              <textarea
                rows={3}
                value={trustedOAuthOriginsText}
                onChange={(e) => setTrustedOAuthOriginsText(e.target.value)}
                placeholder="http://localhost:3000&#10;https://app.neurona.ai&#10;https://app.domainbaru.com"
                className="w-full p-3 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-400 leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating || saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white font-mono text-xs uppercase font-bold tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={validating ? 'animate-spin' : ''} />
              <span>{validating ? 'Memvalidasi...' : 'Validate Configuration'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || validating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-mono text-xs uppercase font-bold tracking-wider shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save size={15} className={saving ? 'animate-spin' : ''} />
              <span>{saving ? 'Menyimpan...' : 'Save Configuration'}</span>
            </button>
          </div>

        </div>

        {/* Right Column (5 cols): Derived OAuth Callbacks & Quick Presets */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 3: Live Derived OAuth Callbacks */}
          <div className="bg-[#0A0A12] border border-cyan-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-mono text-xs font-bold uppercase tracking-wider">
                <KeyRound size={15} className="text-cyan-400" />
                <span>3. Derived OAuth & Webhook URLs</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">Live Computed</span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              Nilai di bawah ini dihitung otomatis dari Canonical URL. Salin dan tempelkan ke developer console provider masing-masing jika domain berubah.
            </p>

            {derivedUrls && (
              <div className="space-y-3.5">
                {/* Higgsfield OAuth Callback */}
                <div className="bg-black/50 border border-purple-500/20 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">
                      Higgsfield OAuth Callback URL
                    </span>
                    <button
                      onClick={() => handleCopy(derivedUrls.higgsfieldOAuthCallbackUrl, 'higgsfield')}
                      className="flex items-center gap-1 text-[10px] font-mono text-purple-400 hover:text-purple-200 cursor-pointer"
                    >
                      {copiedKey === 'higgsfield' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'higgsfield' ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-gray-200 bg-black/60 px-2.5 py-1.5 rounded border border-white/5 break-all select-all">
                    {derivedUrls.higgsfieldOAuthCallbackUrl}
                  </div>
                </div>

                {/* OpenArt OAuth Callback */}
                <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                      OpenArt OAuth Callback URL
                    </span>
                    <button
                      onClick={() => handleCopy(derivedUrls.openArtOAuthCallbackUrl, 'openart')}
                      className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-200 cursor-pointer"
                    >
                      {copiedKey === 'openart' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'openart' ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-gray-200 bg-black/60 px-2.5 py-1.5 rounded border border-white/5 break-all select-all">
                    {derivedUrls.openArtOAuthCallbackUrl}
                  </div>
                </div>

                {/* Telegram Webhook Callback */}
                <div className="bg-black/50 border border-emerald-500/20 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
                      Telegram Payment Webhook URL
                    </span>
                    <button
                      onClick={() => handleCopy(derivedUrls.telegramWebhookUrl, 'telegram')}
                      className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-200 cursor-pointer"
                    >
                      {copiedKey === 'telegram' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'telegram' ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-gray-200 bg-black/60 px-2.5 py-1.5 rounded border border-white/5 break-all select-all">
                    {derivedUrls.telegramWebhookUrl}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Domain Deployment Guide */}
          <div className="bg-[#0A0A12] border border-white/10 rounded-2xl p-5 space-y-3 text-xs font-mono text-gray-400">
            <div className="flex items-center gap-2 text-white font-bold uppercase text-[11px] tracking-wider">
              <Sparkles size={14} className="text-cyan-400" />
              <span>Production Deployment Steps</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-gray-300 leading-relaxed">
              <li>Ubah <span className="text-cyan-300 font-bold">Production App URL</span> ke domain kustom Anda (misal: <code className="text-white bg-black/50 px-1 py-0.5 rounded">https://app.domainbaru.com</code>).</li>
              <li>Klik <span className="text-white font-bold">"Save Configuration"</span> untuk menyimpan ke database secara permanen.</li>
              <li>Salin <span className="text-purple-300 font-bold">Higgsfield</span> & <span className="text-cyan-300 font-bold">OpenArt Callback URLs</span> ke konsol OAuth pihak ketiga.</li>
              <li>Sistem secara otomatis mengarahkan seluruh flow PKCE ke domain baru tanpa restart container.</li>
            </ol>
          </div>

        </div>

      </div>
    </div>
  );
};
