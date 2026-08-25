import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  Play, 
  Square, 
  Check, 
  RefreshCw, 
  Key, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Radio, 
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { AVAILABLE_VOICES, VoiceOption, neuronaVoice } from '../utils/speechSynthesis';

export const FounderAudioVoiceLibrary: React.FC = () => {
  // Active voice state
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    return localStorage.getItem('neurona_ui_voice') || 'id-ID-Journey-O';
  });

  // Filter category
  const [filterCategory, setFilterCategory] = useState<'all' | 'google' | 'openai' | 'tryaudio'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');

  // Preview audio state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);

  // Gemini API Key state
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => {
    return localStorage.getItem('neurona_gemini_api_key') || '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [keySaveMessage, setKeySaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Toast notification for voice selection
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Synchronize on mount and external events
  useEffect(() => {
    const handleVoiceChange = () => {
      const current = localStorage.getItem('neurona_ui_voice') || 'id-ID-Journey-O';
      setSelectedVoiceId(current);
    };

    window.addEventListener('neurona_voice_changed', handleVoiceChange);
    return () => {
      window.removeEventListener('neurona_voice_changed', handleVoiceChange);
    };
  }, []);

  const handleSelectVoice = (voice: VoiceOption) => {
    localStorage.setItem('neurona_ui_voice', voice.id);
    setSelectedVoiceId(voice.id);
    neuronaVoice.setVoice(voice.id);
    window.dispatchEvent(new Event('neurona_voice_changed'));
    showToast(`Model Suara "${voice.name}" aktif untuk Asisten Neurona.`);
  };

  const handlePreviewVoice = async (voice: VoiceOption) => {
    if (playingVoiceId === voice.id) {
      neuronaVoice.stop();
      setPlayingVoiceId(null);
      return;
    }

    try {
      setLoadingVoiceId(voice.id);
      neuronaVoice.stop();

      const sampleText = voice.lang === 'ja-JP' 
        ? "こんにちは、ボス！私はノイロナです。お手伝いできることはありますか？"
        : voice.lang === 'en-US'
        ? "Hello Boss! I am Neurona, your creative AI video director. How can I assist you today?"
        : "Assalamu Alaikum Boss! Ini adalah contoh suara saya untuk asisten dan video produksi Anda.";

      await neuronaVoice.speak(sampleText, voice.gender, voice.provider, voice.voiceKey);
      setPlayingVoiceId(voice.id);
    } catch (err) {
      console.error("Preview voice failed:", err);
      showToast("Gagal memutar audio sampel suara.");
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('neurona_gemini_api_key', trimmed);
      try {
        await fetch('/api/founder/update-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: trimmed })
        });
      } catch {
        // Ignored
      }
      setKeySaveMessage({ type: 'success', text: 'Gemini API Key tersimpan! Semua request Chat & TTS akan memprioritaskan kunci ini.' });
      showToast('Kunci API Gemini berhasil diperbarui.');
    } else {
      localStorage.removeItem('neurona_gemini_api_key');
      try {
        await fetch('/api/founder/update-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: '' })
        });
      } catch {
        // Ignored
      }
      setKeySaveMessage({ type: 'success', text: 'Kunci API manual dihapus. Sistem kembali ke default server key.' });
      showToast('Kunci API manual dikosongkan.');
    }

    setTimeout(() => setKeySaveMessage(null), 4000);
  };

  const handleTestApiKey = async () => {
    const keyToTest = apiKeyInput.trim() || localStorage.getItem('neurona_gemini_api_key');
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Masukkan API Key terlebih dahulu sebelum melakukan uji koneksi.' });
      return;
    }

    setTestingKey(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/neurona-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-custom-api-key': keyToTest
        },
        body: JSON.stringify({
          userId: 'founder-test',
          message: 'Ping test',
          history: []
        })
      });

      if (res.ok) {
        setTestResult({ success: true, message: 'Koneksi Gemini API Valid & Quota Tersedia!' });
      } else {
        const data = await res.json().catch(() => ({}));
        setTestResult({ success: false, message: data.error || 'API Key gagal diverifikasi atau kuota terbatas.' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Gagal menghubungi server Gemini.' });
    } finally {
      setTestingKey(false);
    }
  };

  // Filter voices
  const filteredVoices = AVAILABLE_VOICES.filter((v) => {
    if (filterCategory !== 'all' && v.provider !== filterCategory) return false;
    if (genderFilter !== 'all' && v.gender !== genderFilter) return false;
    return true;
  });

  const activeCustomKey = localStorage.getItem('neurona_gemini_api_key');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#0d0d17] via-[#090910] to-[#0d0d17] border border-white/10 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-fuchsia-950/50 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.15)]">
            <Volume2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider font-mono">
                Audio Voice Library & Engine
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 uppercase font-mono">
                Studio TTS
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Kelola pustaka suara Google Cloud TTS & OpenAI untuk Asisten Neurona dan Voiceover Video.
            </p>
          </div>
        </div>

        {/* Quick Selected Indicator */}
        <div className="flex items-center gap-3 px-4 py-2 bg-black/60 border border-white/10 rounded-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-widest text-gray-400">Suara Aktif Saat Ini</div>
            <div className="text-xs font-bold text-emerald-300 font-mono">
              {AVAILABLE_VOICES.find(v => v.id === selectedVoiceId)?.name || selectedVoiceId}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: GEMINI API KEY & QUOTA MANAGEMENT */}
      <div className="p-6 bg-[#08080c] border border-white/10 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Key size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Gemini API Key & Quota Engine
              </h2>
              <p className="text-[11px] text-gray-400 font-mono">
                Konfigurasi kunci Google AI Studio mandiri untuk menghindari batas kuota gratisan (*Rate Limit 429*).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeCustomKey ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono rounded-lg">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Custom Key Aktif
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono rounded-lg">
                <AlertCircle size={13} className="text-amber-400" />
                Default Server Key
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-300 mb-2 font-semibold">
              Google Gemini API Key (Manual Override)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/80 border border-white/15 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-gray-600 outline-none pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTestApiKey}
                  disabled={testingKey}
                  className="px-4 py-2.5 bg-[#161622] hover:bg-[#202032] border border-white/10 hover:border-amber-500/40 text-gray-200 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testingKey ? <RefreshCw size={14} className="animate-spin text-amber-400" /> : <Sparkles size={14} className="text-amber-400" />}
                  <span>Test Koneksi</span>
                </button>

                <button
                  onClick={handleSaveApiKey}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <Check size={15} />
                  <span>Simpan Key</span>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 mt-2 text-[11px] text-gray-400 font-mono">
              <Info size={13} className="text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Kunci ini akan disuntikkan secara otomatis pada setiap pemanggilan <code className="text-amber-300 font-mono">/api/neurona-chat</code> dan <code className="text-amber-300 font-mono">/api/tts</code> untuk menjamin ketersediaan kuota tanpa antrean.
              </span>
            </div>
          </div>

          {/* Key Save Message */}
          {keySaveMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>{keySaveMessage.text}</span>
            </div>
          )}

          {/* Key Test Result */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 animate-in fade-in ${
              testResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}>
              {testResult.success ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" /> : <AlertCircle size={15} className="text-red-400 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: AUDIO VOICE LIBRARY (GOOGLE CLOUD TTS & OPENAI) */}
      <div className="p-6 bg-[#08080c] border border-white/10 rounded-2xl shadow-lg space-y-6">
        
        {/* Subheader and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Radio size={16} className="text-fuchsia-400" />
              Pustaka Model Suara (Google Cloud TTS & Neural Engine)
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Pilih model suara yang ingin digunakan sebagai identitas vokal Asisten Neurona.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  filterCategory === 'all' ? 'bg-fuchsia-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Semua ({AVAILABLE_VOICES.length})
              </button>
              <button
                onClick={() => setFilterCategory('google')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  filterCategory === 'google' ? 'bg-fuchsia-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Google Cloud ({AVAILABLE_VOICES.filter(v => v.provider === 'google').length})
              </button>
              <button
                onClick={() => setFilterCategory('openai')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  filterCategory === 'openai' ? 'bg-fuchsia-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                ChatGPT ({AVAILABLE_VOICES.filter(v => v.provider === 'openai').length})
              </button>
              <button
                onClick={() => setFilterCategory('tryaudio')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  filterCategory === 'tryaudio' ? 'bg-fuchsia-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Neural AI ({AVAILABLE_VOICES.filter(v => v.provider === 'tryaudio').length})
              </button>
            </div>

            {/* Gender Filter */}
            <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setGenderFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  genderFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Semua Gender
              </button>
              <button
                onClick={() => setGenderFilter('female')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  genderFilter === 'female' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                ♀ Wanita
              </button>
              <button
                onClick={() => setGenderFilter('male')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  genderFilter === 'male' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                ♂ Pria
              </button>
            </div>
          </div>
        </div>

        {/* Voice Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoiceId === voice.id;
            const isPlaying = playingVoiceId === voice.id;
            const isLoading = loadingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                onClick={() => handleSelectVoice(voice)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-fuchsia-950/40 via-indigo-950/20 to-black border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/10'
                    : 'bg-black/50 hover:bg-[#11111a] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Active Corner Badge */}
                {isSelected && (
                  <div className="absolute top-0 right-0 bg-fuchsia-600 text-white text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Check size={11} />
                    Aktif
                  </div>
                )}

                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                      {voice.avatar || '🎙️'}
                    </div>

                    <div className="flex-1 pr-12">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white font-mono">
                          {voice.name}
                        </span>
                        
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                          voice.provider === 'google'
                            ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                            : voice.provider === 'openai'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                        }`}>
                          {voice.badge || voice.provider}
                        </span>

                        <span className="text-[10px] font-mono text-gray-400">
                          {voice.lang}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-400 font-mono mt-1 leading-relaxed">
                        {voice.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-semibold ${voice.gender === 'female' ? 'text-fuchsia-400' : 'text-cyan-400'}`}>
                      {voice.gender === 'female' ? '♀ Karakter Wanita' : '♂ Karakter Pria'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Audio Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(voice);
                      }}
                      disabled={isLoading}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        isPlaying
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                          : 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {isLoading ? (
                        <RefreshCw size={12} className="animate-spin text-fuchsia-400" />
                      ) : isPlaying ? (
                        <Square size={12} className="text-amber-400" />
                      ) : (
                        <Play size={12} className="text-fuchsia-400" />
                      )}
                      <span>{isLoading ? 'Memuat...' : isPlaying ? 'Stop' : 'Uji Suara'}</span>
                    </button>

                    {/* Choose Voice Radio / Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectVoice(voice);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-md shadow-fuchsia-500/20'
                          : 'bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border-indigo-500/30 hover:border-indigo-500/50'
                      }`}
                    >
                      {isSelected ? 'Terpilih' : 'Pilih Suara'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-[#0a0a14] border border-fuchsia-500/40 rounded-2xl shadow-2xl text-xs font-mono text-white flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 shrink-0">
            <Check size={14} />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
