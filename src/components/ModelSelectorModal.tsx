import React, { useState } from 'react';
import { 
  Sliders, 
  Video, 
  Mic, 
  Sparkles, 
  Check, 
  Volume2, 
  VolumeX,
  Layers, 
  X, 
  Info,
  Play,
  Lock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { AVAILABLE_VOICES, neuronaVoice, VoiceOption } from '../utils/speechSynthesis';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVideoModel: string;
  onSelectVideoModel: (model: string) => void;
  selectedVoiceId: string;
  onSelectVoiceId: (voiceId: string) => void;
}

export const VIDEO_MODELS = [
    {
    id: 'fal-ai/veo3.1/lite/image-to-video',
    name: 'Google Veo 3.1 Lite (Bisu)',
    tag: 'Cheapest & Fastest',
    badge: 'PALING MURAH',
    disabled: false,
    color: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300 font-bold',
    description: 'Model video 720p termurah dari Google. Sangat cepat tetapi menghasilkan video tanpa audio (Bisu).',
    capabilities: ['Veo 3.1 Engine', 'Ultra Fast', 'No Audio', 'Cost Efficient']
  },
  {
    id: 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
    name: 'Seedance 1.0 Lite',
    tag: 'Budget with Audio',
    badge: 'BUDGET + AUDIO',
    disabled: false,
    color: 'border-teal-500/60 bg-teal-950/40 text-teal-300 font-bold',
    description: 'Model budget dari ByteDance. Lebih murah dari Wan, dengan kualitas baik dan native audio.',
    capabilities: ['Seedance 1.0', 'Native Audio', 'Good Motion', 'Budget Friendly']
  },
  {
    id: 'fal-ai/wan-i2v',
    name: 'Wan 2.1 Image-to-Video',
    tag: 'Classic Budget',
    badge: 'FAL.AI BUDGET',
    disabled: false,
    color: 'border-green-500/60 bg-green-950/40 text-green-300 font-bold',
    description: 'Model video hemat dan efisien dari Fal.ai dengan gerakan natural untuk scene umum.',
    capabilities: ['Wan 2.1 Engine', 'High Efficiency', 'Natural Motion', 'Fast Generation']
  },
  {
    id: 'bytedance/seedance-2.5/image-to-video',
    name: 'ByteDance Seedance 2.5 Sinematik',
    tag: 'Cinematic & Long Form',
    badge: 'FAL.AI PREMIUM',
    disabled: false,
    color: 'border-amber-500/60 bg-amber-950/40 text-amber-300 font-bold',
    description: 'Model video kelas sinematik tertinggi ByteDance melalui Fal.ai. Kualitas gerak & sinkronisasi audio terbaik.',
    capabilities: ['Seedance 2.5 Engine', 'Native Audio Synchrony', 'Ultra Cinematic', 'Dynamic Camera']
  },
  {
    id: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    name: 'Kling 2.1 Standard Image-to-Video',
    tag: 'Character & Lighting Consistency',
    badge: 'FAL.AI BALANCED',
    disabled: false,
    color: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300 font-bold',
    description: 'Model rendering video Kling 2.1 dengan keseimbangan luar biasa antara konsistensi karakter dan pergerakan.',
    capabilities: ['Kling 2.1 Engine', 'Character Rig Lock', 'Volumetric Lighting', 'Smooth Panning']
  },
  {
    id: 'fal-ai/hunyuan-video-image-to-video',
    name: 'Tencent Hunyuan Video',
    tag: 'High Fidelity Motion',
    badge: 'FAL.AI BALANCED',
    disabled: false,
    color: 'border-blue-500/60 bg-blue-950/40 text-blue-300 font-bold',
    description: 'Model difusi video open architecture berkemampuan tinggi untuk transisi dinamis.',
    capabilities: ['Hunyuan Motion Engine', 'High Fidelity Physics', 'Volumetric Depth', 'Dynamic Movement']
  },
  {
    id: 'fal-ai/minimax/video-01/image-to-video',
    name: 'MiniMax Hailuo Video-01',
    tag: 'Extreme Dynamics & High-Fidelity Physics',
    badge: 'FAL.AI BALANCED',
    disabled: false,
    color: 'border-purple-500/60 bg-purple-950/40 text-purple-300 font-bold',
    description: 'Engine video MiniMax Hailuo untuk simulasi fisik presisi dan ekspresi karakter yang hidup.',
    capabilities: ['Hailuo Motion Engine', 'Organic Movement', 'Facial Fidelity', 'Commercial Quality']
  }
];

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedVideoModel,
  onSelectVideoModel,
  selectedVoiceId,
  onSelectVoiceId
}) => {
  if (!isOpen) return null;

  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [activeVoiceError, setActiveVoiceError] = useState<string | null>(null);

  const currentVoice = AVAILABLE_VOICES.find(v => v.id === selectedVoiceId) || AVAILABLE_VOICES[0];

  const handleTestVoice = async (voice: VoiceOption) => {
    neuronaVoice.setVoice(voice.id);
    onSelectVoiceId(voice.id);
    setLoadingVoiceId(voice.id);
    setActiveVoiceError(null);

    const testPhrase = voice.gender === 'male'
      ? `Halo! Saya pengisi suara ${voice.name}. Siap membawakan narasi video Anda dengan artikulasi jernih dan berwibawa.`
      : `Halo! Saya ${voice.name}. Siap mengisi suara narasi video Anda agar tampil memikat, emosional, dan viral!`;

    const res = await neuronaVoice.speak(testPhrase);
    setLoadingVoiceId(null);

    if (!res.success && res.error && res.error !== 'Muted') {
      setActiveVoiceError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 via-purple-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Pengaturan Model AI (Gambar, Video & Suara)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 uppercase">
                  Apex Matrix
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gambar T2I: <strong className="text-purple-300 font-mono">ChatGPT Image 2</strong> • Video I2V: <strong className="text-blue-300 font-mono">Fal.ai Video Studio Engine</strong> • Voiceover: TryAudio AI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          
          {/* SECTION 1: T2I IMAGE ENGINE (ChatGPT Image 2) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  1. Model Generator Teks-ke-Gambar (Keyframe Adegan & Konsistensi Karakter)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-purple-400">
                Aktif: ChatGPT Image 2 (GPT Image 2)
              </span>
            </div>

            <div className="p-4 rounded-2xl border-2 border-purple-500/60 bg-purple-950/30 shadow-[0_0_25px_rgba(168,85,247,0.25)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>ChatGPT Image 2 (GPT Image 2)</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-purple-400/40 bg-purple-950/60 text-purple-300 font-bold">
                        DEFAULT T2I ENGINE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                      Model teks-ke-gambar generasi terbaru dengan pemahaman konteks visual tinggi, konsistensi wajah/pakaian karakter antar-adegan (*seed anchoring*), dan pencahayaan sinematik tanpa artefak sintetis.
                    </p>
                  </div>
                </div>
                <span className="w-5 h-5 rounded-full bg-purple-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                  <Check size={12} />
                </span>
              </div>

              <div className="pt-2 border-t border-purple-500/20 flex flex-wrap gap-1.5">
                {['Character Consistency Anchor', 'Ultra-Realistic Lighting', 'Prompt Adherence', 'No DALL-E Distortion', '8K UHD Upscale'].map((cap, i) => (
                  <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/50 text-purple-300 border border-purple-500/20">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: AI VIDEO GENERATION MODELS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Video size={16} className="text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  2. Pilih Model Generator Video (I2V / T2V)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">
                Aktif: {VIDEO_MODELS.find(m => m.id === selectedVideoModel)?.name || 'Wan 2.1 Image-to-Video'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VIDEO_MODELS.map((model) => {
                const isSelected = selectedVideoModel === model.id;
                const isDisabled = model.disabled;
                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      if (!isDisabled) {
                        onSelectVideoModel(model.id);
                        neuronaVoice.playChime('CLICK');
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isDisabled 
                        ? 'bg-slate-950/40 border-slate-800/80 opacity-60 hover:opacity-80' 
                        : isSelected
                          ? 'bg-emerald-950/40 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-[1.01]'
                          : 'bg-slate-950/60 border-white/10 hover:border-emerald-500/40 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-bold ${isDisabled ? 'text-slate-400' : 'text-white'}`}>
                            {model.name}
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${model.color}`}>
                            {model.badge}
                          </span>
                        </div>
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
                            <Check size={12} />
                          </span>
                        ) : isDisabled ? (
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                            <Lock size={11} />
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {model.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap gap-1">
                      {model.capabilities.map((cap, i) => (
                        <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: TTS & VOICEOVER PROVIDERS & GENDER */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mic size={16} className="text-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  3. Pengisi Suara Voiceover (ChatGPT OpenAI / Google Gemini / ElevenLabs)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  ⚡ Suara Robot: OFF
                </span>
                <span className="text-[10px] font-mono text-rose-400">
                  {currentVoice.gender === 'male' ? 'Laki-Laki' : 'Perempuan'}
                </span>
              </div>
            </div>

            {/* Notification if API Key is not yet set */}
            {activeVoiceError && (
              <div className="p-3 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-300">Voiceover AI Memerlukan API Key</div>
                  <div className="text-[11px] text-amber-200/90 leading-relaxed">
                    {activeVoiceError}. Suara robot browser telah dinonaktifkan permanen agar kualitas audio tetap natural dan jernih.
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_VOICES.map((voice) => {
                const isSelected = selectedVoiceId === voice.id;
                const isTesting = loadingVoiceId === voice.id;
                return (
                  <div
                    key={voice.id}
                    className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-2 border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.4)] scale-[1.01]'
                        : 'bg-slate-950/60 border-white/10 hover:border-rose-500/40 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-xl">{voice.avatar}</span>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{voice.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                voice.gender === 'male' 
                                  ? 'bg-blue-950 text-blue-300 border border-blue-500/30' 
                                  : 'bg-pink-950 text-pink-300 border border-pink-500/30'
                              }`}>
                                {voice.gender === 'male' ? '♂ Pria' : '♀ Wanita'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Engine: {voice.provider === 'google' ? 'GOOGLE CLOUD TTS' : voice.provider.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        {voice.badge && (
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                            voice.provider === 'google'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : voice.provider === 'openai'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : voice.provider === 'elevenlabs'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}>
                            {voice.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {voice.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => handleTestVoice(voice)}
                        disabled={isTesting}
                        className={`px-2.5 py-1 rounded-xl border text-[10px] flex items-center gap-1.5 transition cursor-pointer ${
                          isTesting 
                            ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                            : 'bg-slate-900 hover:bg-slate-800 border-white/10 text-cyan-300'
                        }`}
                      >
                        {isTesting ? (
                          <>
                            <Loader2 size={11} className="text-rose-400 animate-spin" />
                            <span>Memutar Suara AI...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={11} className="text-rose-400" />
                            <span>Dengarkan Suara</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          neuronaVoice.setVoice(voice.id);
                          onSelectVoiceId(voice.id);
                        }}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold font-mono transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? <Check size={11} /> : null}
                        <span>{isSelected ? 'TERPILIH' : 'PILIH SUARA'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info size={14} className="text-cyan-400" />
            <span>Konfigurasi ini akan otomatis diterapkan ke pipeline orkestrasi 8 Agen AI.</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/30 transition cursor-pointer"
          >
            SIMPAN & TERAPKAN
          </button>
        </div>

      </div>
    </div>
  );
};
