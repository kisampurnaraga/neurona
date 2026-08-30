// Multi-Provider AI Voice Engine for NEURONA
// Centralized Source of Truth for Google Cloud TTS (Journey, WaveNet, Neural2, Standard) & Custom Voice Cloning
// Synchronized with Founder Center & Video Stitch Settings.

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  provider: 'google' | 'openai' | 'tryaudio' | 'elevenlabs' | 'webspeech' | 'minimax_clone';
  engine: string;
  voiceKey: string;
  lang: string;
  description: string;
  avatar: string;
  badge: string;
  badgeColor: string;
  creditCost: number;
  creditCostText: string;
  category: 'Journey' | 'Wavenet' | 'Neural2' | 'Standard' | 'Free' | 'Clone' | 'OpenAI';
  demoText: string;
  sampleUrl?: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  // 0. Free Browser TTS
  {
    id: 'webspeech',
    name: 'Browser TTS (Web Speech API)',
    gender: 'female',
    provider: 'webspeech',
    engine: 'webspeech',
    voiceKey: 'webspeech',
    lang: 'id-ID',
    description: 'Sintesis vokal bawaan browser HP/PC (id-ID). Gratis 0 kredit.',
    avatar: '🌐',
    badge: 'GRATIS',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    creditCost: 0,
    creditCostText: '0 CR / Video',
    category: 'Free',
    demoText: 'Halo! Ini adalah contoh sampel suara narator gratis dari browser Anda.'
  },

  // 1. Google Cloud Text-to-Speech (Journey Tier)
  {
    id: 'id-ID-Journey-O',
    name: 'Google Journey-O (ID ♀ Natural)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Journey-O',
    lang: 'id-ID',
    description: 'Suara wanita Indonesia ultra-realistis dengan intonasi natural ekspresif & jernih',
    avatar: '🌟',
    badge: 'GOOGLE JOURNEY',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    creditCost: 25,
    creditCostText: '25 CR / Video',
    category: 'Journey',
    demoText: 'Assalamu Alaikum! Ini contoh sampel suara Google Journey-O yang sangat alami dan ekspresif.'
  },
  {
    id: 'en-US-Journey-D',
    name: 'Google Journey-D (EN ♂ Cinematic)',
    gender: 'male',
    provider: 'google',
    engine: 'google',
    voiceKey: 'en-US-Journey-D',
    lang: 'en-US',
    description: 'Suara pria Amerika karismatik, berat & berkarakter khas narator film bioskop',
    avatar: '🎬',
    badge: 'GOOGLE JOURNEY',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    creditCost: 25,
    creditCostText: '25 CR / Video',
    category: 'Journey',
    demoText: 'Hello! This is a sample of Google Journey-D, offering deep cinematic narration.'
  },
  {
    id: 'en-US-Journey-F',
    name: 'Google Journey-F (EN ♀ Natural)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'en-US-Journey-F',
    lang: 'en-US',
    description: 'Suara wanita Amerika modern & ramah untuk konten berskala global',
    avatar: '✨',
    badge: 'GOOGLE JOURNEY',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    creditCost: 25,
    creditCostText: '25 CR / Video',
    category: 'Journey',
    demoText: 'Hello! This is a sample of Google Journey-F with a warm and expressive tone.'
  },

  // 2. Google Cloud Text-to-Speech (Neural2 Tier)
  {
    id: 'id-ID-Neural2-A',
    name: 'Google Neural2-A (ID ♀ Modern)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Neural2-A',
    lang: 'id-ID',
    description: 'Suara wanita Indonesia modern, segar & sangat manusiawi untuk vlog & lifestyle',
    avatar: '🌸',
    badge: 'GOOGLE NEURAL2',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    creditCost: 20,
    creditCostText: '20 CR / Video',
    category: 'Neural2',
    demoText: 'Halo sahabat! Ini contoh vokal Google Neural2-A yang modern, ramah, dan mengalir santai.'
  },
  {
    id: 'id-ID-Neural2-B',
    name: 'Google Neural2-B (ID ♂ Commercial)',
    gender: 'male',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Neural2-B',
    lang: 'id-ID',
    description: 'Suara pria Indonesia artikulatif & bernada komersial, cocok untuk ulasan produk',
    avatar: '👔',
    badge: 'GOOGLE NEURAL2',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    creditCost: 20,
    creditCostText: '20 CR / Video',
    category: 'Neural2',
    demoText: 'Halo kawan! Ini adalah vokal Google Neural2-B yang mantap dan berbobot komersial.'
  },
  {
    id: 'ja-JP-Neural2-B',
    name: 'Google Neural2-B (JA ♀ Seiyuu)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'ja-JP-Neural2-B',
    lang: 'ja-JP',
    description: 'Suara seiyuu anime Jepang ceria & ekspresif untuk animasi & promo anime',
    avatar: '🎌',
    badge: 'GOOGLE NEURAL2',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    creditCost: 20,
    creditCostText: '20 CR / Video',
    category: 'Neural2',
    demoText: 'こんにちは！これはGoogle Neural2-Bの日本語ボイスサンプルです。'
  },

  // 3. Google Cloud Text-to-Speech (WaveNet Tier)
  {
    id: 'id-ID-Wavenet-A',
    name: 'Google Wavenet-A (ID ♀ Professional)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Wavenet-A',
    lang: 'id-ID',
    description: 'Suara wanita Indonesia formal & berwibawa, ideal untuk edukasi & tutorial',
    avatar: '🎙️',
    badge: 'GOOGLE WAVENET',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    creditCost: 15,
    creditCostText: '15 CR / Video',
    category: 'Wavenet',
    demoText: 'Selamat datang! Ini contoh sampel suara Google WaveNet-A dengan artikulasi jernih dan profesional.'
  },
  {
    id: 'id-ID-Wavenet-B',
    name: 'Google Wavenet-B (ID ♂ Energetic)',
    gender: 'male',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Wavenet-B',
    lang: 'id-ID',
    description: 'Suara pria Indonesia bertenaga & dinamis, ideal untuk promo affiliate & TikTok',
    avatar: '⚡',
    badge: 'GOOGLE WAVENET',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    creditCost: 15,
    creditCostText: '15 CR / Video',
    category: 'Wavenet',
    demoText: 'Gila sih! Ini sampel suara Google WaveNet-B yang dinamis dan berenergi tinggi!'
  },

  // 4. Google Cloud Text-to-Speech (Standard Tier)
  {
    id: 'id-ID-Standard-A',
    name: 'Google Standard-A (ID ♀ Basic)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Standard-A',
    lang: 'id-ID',
    description: 'Suara sintesis dasar Google Indonesia. Ekonomis & hemat penggunaan kredit.',
    avatar: '🍃',
    badge: 'GOOGLE STANDARD',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    creditCost: 5,
    creditCostText: '5 CR / Video',
    category: 'Standard',
    demoText: 'Halo! Ini sampel suara Google Standard-A yang ekonomis dan hemat penggunaan kredit.'
  },
  {
    id: 'id-ID-Standard-B',
    name: 'Google Standard-B (ID ♂ Basic)',
    gender: 'male',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Standard-B',
    lang: 'id-ID',
    description: 'Suara sintesis pria standar Google Indonesia. Opsi hemat biaya.',
    avatar: '🌱',
    badge: 'GOOGLE STANDARD',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    creditCost: 5,
    creditCostText: '5 CR / Video',
    category: 'Standard',
    demoText: 'Halo! Ini contoh sampel suara Google Standard-B pria yang hemat dan efisien.'
  },

  // 5. MiniMax Voice Cloning
  {
    id: 'voice_clone',
    name: 'Voice Cloning (MiniMax Voice Clone)',
    gender: 'female',
    provider: 'minimax_clone',
    engine: 'minimax_clone',
    voiceKey: 'voice_clone',
    lang: 'id-ID',
    description: 'Kloning vokal kustom Anda dari sampel audio (min. 10 detik). Bebas allow-list & publik.',
    avatar: '🎙️',
    badge: 'VOICE CLONE',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    creditCost: 50,
    creditCostText: '50 CR Setup + 15 CR/Gen',
    category: 'Clone',
    demoText: 'Halo! Ini sampel suara hasil kloning vokal kustom Anda.',
    sampleUrl: '/demos/voice_clone.mp3'
  }
];

export type VoiceStateListener = (state: { isSpeaking: boolean; isPlayingAI: boolean; error?: string; speechCompleted?: boolean }) => void;

class NeuronaVoiceEngine {
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private isSpeaking: boolean = false;
  private isPlayingAI: boolean = false;
  private currentVoice: VoiceOption = AVAILABLE_VOICES[1]; // default Google Journey-O
  private stateListeners: VoiceStateListener[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private speechEndListeners: Array<() => void> = [];

  constructor() {
    //
  }

  onSpeechEnd(cb: () => void) {
    this.speechEndListeners.push(cb);
    return () => {
      this.speechEndListeners = this.speechEndListeners.filter(l => l !== cb);
    };
  }

  private triggerSpeechEnd() {
    this.speechEndListeners.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  setVoice(voiceId: string) {
    const found = AVAILABLE_VOICES.find(v => v.id === voiceId);
    if (found) {
      this.currentVoice = found;
      this.playChime('CLICK');
    }
  }

  getCurrentVoice(): VoiceOption {
    return this.currentVoice;
  }

  setGender(gender: 'male' | 'female') {
    const target = AVAILABLE_VOICES.find(v => v.gender === gender);
    if (target) {
      this.currentVoice = target;
    }
  }

  private setupAnalyser(audio: HTMLAudioElement) {
    try {
      const ctx = this.getAudioContext();
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      
      this.sourceNode = ctx.createMediaElementSource(audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(ctx.destination);
    } catch (e) {
      this.analyser = null;
    }
  }

  getRealtimeWaveform(): number[] {
    if (!this.analyser || !this.isSpeaking) {
      return Array(12).fill(0);
    }
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    const result: number[] = [];
    const step = Math.max(1, Math.floor(dataArray.length / 12));
    for (let i = 0; i < 12; i++) {
      const idx = Math.min(dataArray.length - 1, i * step);
      const val = dataArray[idx] || 0;
      result.push(val / 255);
    }
    return result;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playChime(type: 'ACTIVATE' | 'ALERT' | 'SUCCESS' | 'CLICK' | 'INTERRUPT') {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      if (type === 'ACTIVATE') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'SUCCESS') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'ALERT' || type === 'INTERRUPT') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.setValueAtTime(450, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      // Audio context might be blocked
    }
  }

  /**
   * "UJI SUARA" PERMANENT SAMPLE PLAYER (0 CR Cost)
   * Uses pre-rendered audio sample or zero-credit browser speech synthesis
   * so user testing NEVER charges credits or invokes paid API endpoints.
   */
  async playSample(voiceId: string): Promise<boolean> {
    this.stop();
    const voice = AVAILABLE_VOICES.find(v => v.id === voiceId) || this.currentVoice;

    if (voice.sampleUrl) {
      try {
        this.currentAudio = new Audio(voice.sampleUrl);
        this.isSpeaking = true;
        this.isPlayingAI = true;
        this.notifyListeners();

        return new Promise((resolve) => {
          if (!this.currentAudio) {
            this.isSpeaking = false;
            this.notifyListeners();
            resolve(false);
            return;
          }

          this.currentAudio.onended = () => {
            this.isSpeaking = false;
            this.isPlayingAI = false;
            this.notifyListeners(undefined, true);
            this.triggerSpeechEnd();
            resolve(true);
          };

          this.currentAudio.onerror = () => {
            this.isSpeaking = false;
            this.isPlayingAI = false;
            this.notifyListeners();
            resolve(false);
          };

          this.currentAudio.play().catch(() => {
            this.isSpeaking = false;
            this.notifyListeners();
            resolve(false);
          });
        });
      } catch (e) {
        console.warn("[Voice Sample] Audio element failed, falling back to WebSpeech:", e);
      }
    }

    // Zero-Cost Static WebSpeech Preview with pitch/rate/gender tuning
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voice.demoText);
      utterance.lang = voice.lang || 'id-ID';
      
      // Fine-tune pitch/rate per voice persona
      if (voice.gender === 'male') {
        utterance.pitch = 0.85;
        utterance.rate = 0.95;
      } else {
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
      }

      this.isSpeaking = true;
      this.isPlayingAI = true;
      this.notifyListeners();

      return new Promise((resolve) => {
        utterance.onend = () => {
          this.isSpeaking = false;
          this.isPlayingAI = false;
          this.notifyListeners(undefined, true);
          this.triggerSpeechEnd();
          resolve(true);
        };
        utterance.onerror = () => {
          this.isSpeaking = false;
          this.isPlayingAI = false;
          this.notifyListeners();
          resolve(false);
        };

        window.speechSynthesis.speak(utterance);
      });
    }

    return false;
  }

  async speak(text: string, overrideGender?: 'male' | 'female', overrideProvider?: string, overrideVoiceKey?: string): Promise<{ success: boolean; error?: string }> {
    if (this.isMuted) return { success: false, error: 'Muted' };
    
    this.stop();
    this.playChime('ACTIVATE');

    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\{.*?\}/g, '')
      .substring(0, 350);

    const effectiveProvider = overrideProvider || this.currentVoice.provider || 'google';
    const isMale = overrideGender ? (overrideGender === 'male') : (this.currentVoice.gender === 'male');
    const voiceKey = overrideVoiceKey || this.currentVoice.voiceKey || 'id-ID-Journey-O';

    try {
      this.isSpeaking = true;
      this.isPlayingAI = true;
      this.notifyListeners();

      const customKey = localStorage.getItem('neurona_gemini_api_key');
      const headers: any = { 'Content-Type': 'application/json' };
      if (customKey) {
        headers['x-custom-api-key'] = customKey;
      }
      
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          text: cleanText, 
          provider: effectiveProvider,
          voiceName: voiceKey,
          voiceKey: voiceKey,
          voiceGender: isMale ? 'male' : 'female'
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        this.currentAudio = new Audio(url);
        this.currentAudio.crossOrigin = "anonymous";
        this.setupAnalyser(this.currentAudio);
        
        return new Promise((resolve) => {
          if (!this.currentAudio) {
            this.isSpeaking = false;
            this.isPlayingAI = false;
            this.notifyListeners();
            resolve({ success: false, error: 'No audio player' });
            return;
          }

          this.currentAudio.onplay = () => {
            this.isSpeaking = true;
            this.isPlayingAI = true;
            this.notifyListeners();
          };

          this.currentAudio.onended = () => {
            this.isSpeaking = false;
            this.isPlayingAI = false;
            this.notifyListeners(undefined, true);
            this.triggerSpeechEnd();
            URL.revokeObjectURL(url);
            resolve({ success: true });
          };

          this.currentAudio.onerror = () => {
            this.isSpeaking = false;
            this.isPlayingAI = false;
            this.notifyListeners();
            this.triggerSpeechEnd();
            URL.revokeObjectURL(url);
            resolve({ success: false, error: 'Playback error' });
          };
          
          this.currentAudio.play().catch((playErr) => {
            this.isSpeaking = false;
            this.isPlayingAI = false;
            this.notifyListeners();
            this.triggerSpeechEnd();
            resolve({ success: false, error: 'Autoplay blocked' });
          });
        });
      } else {
        const errJson = await res.json().catch(() => ({ error: 'Gagal generate audio AI' }));
        this.isSpeaking = false;
        this.isPlayingAI = false;
        this.notifyListeners(errJson.error || 'API Key Voiceover AI belum aktif');
        this.playChime('ALERT');
        return { success: false, error: errJson.error || 'TTS API Error' };
      }
    } catch (e: any) {
      this.isSpeaking = false;
      this.isPlayingAI = false;
      this.notifyListeners(e?.message || 'Koneksi TTS gagal');
      this.playChime('ALERT');
      return { success: false, error: e?.message || 'TTS Error' };
    }
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.isPlayingAI = false;
    this.notifyListeners();
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stop();
    }
    return this.isMuted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  subscribe(listener: (speaking: boolean) => void) {
    const wrapper: VoiceStateListener = (state) => listener(state.isSpeaking);
    this.stateListeners.push(wrapper);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== wrapper);
    };
  }

  subscribeDetailed(listener: VoiceStateListener) {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(error?: string, speechCompleted: boolean = false) {
    this.stateListeners.forEach(l => l({
      isSpeaking: this.isSpeaking,
      isPlayingAI: this.isPlayingAI,
      error,
      speechCompleted
    }));
  }
}

export const neuronaVoice = new NeuronaVoiceEngine();
