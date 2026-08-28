import React, { useState, useEffect } from 'react';
import { Activity, X, Server, Zap, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  model: string;
  status: string;
  request_id?: string;
  error?: string;
  latency?: number;
}

interface SystemHealthDashboardProps {
  onClose: () => void;
}

export const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({ onClose }) => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/diagnostics/video-models');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setResults(data.results || []);
          setLastUpdated(new Date());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const formatModelName = (path: string) => {
    if (path.includes('wan')) return 'Wan v2.1 (Image/Text to Video)';
    if (path.includes('kling')) return 'Kling 1.5 Pro';
    if (path.includes('minimax')) return 'Minimax H3';
    if (path.includes('seedance')) return 'ByteDance Seedance 2.5';
    if (path.includes('hunyuan')) return 'Hunyuan Video';
    if (path.includes('luma')) return 'Luma Dream Machine';
    return path;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1115] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">System Health Dashboard</h2>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>Video Engine Telemetry</span>
                {lastUpdated && (
                  <span className="text-cyan-400/70">
                    • Last check: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiagnostics}
              disabled={isLoading}
              className={`p-2 rounded-lg border flex items-center gap-1.5 transition ${
                isLoading ? 'bg-slate-900 border-slate-700 text-slate-500' : 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span className="text-xs font-semibold hidden sm:inline">Refresh</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {isLoading && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <RefreshCw size={32} className="animate-spin mb-4 text-cyan-500" />
              <p className="text-sm font-mono">Running diagnostic tests on all integrated video engines...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((res, idx) => {
                const isHealthy = res.status === 'SUCCESS';
                return (
                  <div key={idx} className={`${
                    isHealthy ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'
                  } border rounded-xl p-4 flex flex-col justify-between transition-all hover:bg-opacity-40`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isHealthy ? (
                          <CheckCircle2 size={18} className="text-emerald-400" />
                        ) : (
                          <AlertTriangle size={18} className="text-rose-400" />
                        )}
                        <h3 className="font-bold text-sm text-slate-200">{formatModelName(res.model)}</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isHealthy ? 'bg-emerald-900/50 text-emerald-300' : 'bg-rose-900/50 text-rose-300'
                      }`}>
                        {res.status}
                      </span>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5"><Server size={12}/> Endpoint</span>
                        <span className="font-mono text-slate-400 truncate max-w-[200px]" title={res.model}>/{res.model.split('/').slice(0, 2).join('/')}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5"><Clock size={12}/> Latency</span>
                        <span className={`font-mono font-bold ${
                          !res.latency ? 'text-slate-500' :
                          res.latency < 500 ? 'text-emerald-400' : 
                          res.latency < 1500 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {res.latency ? `${res.latency}ms` : 'N/A'}
                        </span>
                      </div>
                      {!isHealthy && res.error && (
                        <div className="mt-3 p-2 rounded bg-rose-950/50 border border-rose-900/50 text-[10px] font-mono text-rose-300 break-words">
                          {res.error}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
