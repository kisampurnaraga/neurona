import React, { useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export const ErrorBoundary: React.FC<Props> = ({ children }) => {
  const [errorState, setErrorState] = useState<{ hasError: boolean; error: string | null }>({
    hasError: false,
    error: null,
  });

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      // Ignore non-fatal resource load errors (e.g. <img> or <script> load errors)
      if (event.target && event.target !== window) {
        console.warn('Non-fatal element load error:', event);
        return;
      }
      console.error('Captured global error:', event.error || event.message);
      setErrorState({
        hasError: true,
        error: event.error?.toString() || event.message || 'Error tidak diketahui pada aplikasi',
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Log unhandled promise rejections without crashing the React UI
      console.warn('Captured background unhandled promise rejection (non-fatal):', event.reason);
      // Do not call setErrorState for background promise rejections to prevent crashing the UI
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleReset = () => {
    setErrorState({ hasError: false, error: null });
    window.location.reload();
  };

  const handleClearStorageAndReset = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  if (errorState.hasError) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-lg w-full bg-[#12141D] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle size={28} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Sistem NEURONA Mengalami Gangguan Tampilan
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Terjadi kesalahan tampilan runtime pada aplikasi. Anda dapat memuat ulang halaman atau mereset sesi lokal.
            </p>
          </div>

          {errorState.error && (
            <div className="p-3 bg-black/60 border border-rose-500/20 rounded-xl text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-36">
              {errorState.error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Muat Ulang Halaman</span>
            </button>
            <button
              onClick={handleClearStorageAndReset}
              className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Home size={14} />
              <span>Reset Sesi & Ke Beranda</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
