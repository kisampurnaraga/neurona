import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string | null;
}

/**
 * Checks whether an error is caused by external browser extensions,
 * third-party wallet injectors (e.g. MetaMask, Phantom, Coinbase), or benign browser noise.
 */
function isIgnoredExtensionError(errText: string): boolean {
  const lower = errText.toLowerCase();
  return (
    lower.includes('metamask') ||
    lower.includes('failed to connect to metamask') ||
    lower.includes('ethereum') ||
    lower.includes('chrome-extension') ||
    lower.includes('moz-extension') ||
    lower.includes('safari-web-extension') ||
    lower.includes('inpage.js') ||
    lower.includes('resizeobserver loop') ||
    lower.includes('script error.')
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    const msg = error?.message || error?.toString() || '';
    if (isIgnoredExtensionError(msg)) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error: msg || 'Terjadi kesalahan rendering pada antarmuka' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = error?.message || error?.toString() || '';
    if (isIgnoredExtensionError(msg)) {
      console.warn('Silently suppressed third-party extension error in ErrorBoundary:', msg);
      return;
    }
    console.error('Captured React component tree error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleClearStorageAndReset = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
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

            {this.state.error && (
              <div className="p-3 bg-black/60 border border-rose-500/20 rounded-xl text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-36">
                {this.state.error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
                onClick={this.handleClearStorageAndReset}
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

    return this.props.children;
  }
}
