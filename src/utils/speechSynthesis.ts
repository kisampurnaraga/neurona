// Multi-Provider AI Voice Engine for NEURONA
// Dedicated Natural Neural Voiceover (ChatGPT OpenAI TTS / Google Gemini Speech / TryAudio / ElevenLabs)
// Robotic Browser TTS is disabled by default for studio-grade acoustic quality.

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  provider: 'google' | 'openai' | 'tryaudio' | 'elevenlabs';
  engine: 'google' | 'openai' | 'tryaudio' | 'elevenlabs';
  voiceKey: string;
  lang: string;
  description: string;
  avatar: string;
  badge?: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  // 1. Google Cloud Text-to-Speech (Journey, Wavenet & Neural2)
  {
    id: 'id-ID-Journey-O',
    name: 'Google Journey-O (ID ♀ Natural)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Journey-O',
    lang: 'id-ID',
    description: 'Suara wanita Indonesia ultra-realistis dengan intonasi natural ekspresif dan jernih',
    avatar: '🌟',
    badge: 'GOOGLE JOURNEY'
  },
  {
    id: 'id-ID-Wavenet-A',
    name: 'Google Wavenet-A (ID ♀ Professional)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Wavenet-A',
    lang: 'id-ID',
    description: 'Suara wanita Indonesia formal & berwibawa, sangat cocok untuk edukasi dan company profile',
    avatar: '🎙️',
    badge: 'GOOGLE WAVENET'
  },
  {
    id: 'id-ID-Wavenet-B',
    name: 'Google Wavenet-B (ID ♂ Energetic)',
    gender: 'male',
    provider: 'google',
    engine: 'google',
    voiceKey: 'id-ID-Wavenet-B',
    lang: 'id-ID',
    description: 'Suara pria Indonesia berenergi & dinamis, ideal untuk hook promosi affiliate & TikTok',
    avatar: '⚡',
    badge: 'GOOGLE WAVENET'
  },
  {
    id: 'en-US-Journey-D',
    name: 'Google Journey-D (EN ♂ Cinematic Male)',
    gender: 'male',
    provider: 'google',
    engine: 'google',
    voiceKey: 'en-US-Journey-D',
    lang: 'en-US',
    description: 'Suara pria Amerika karismatik, berat & berkarakter khas narator film bioskop dan sains',
    avatar: '🎬',
    badge: 'GOOGLE JOURNEY'
  },
  {
    id: 'en-US-Journey-F',
    name: 'Google Journey-F (EN ♀ Natural Female)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'en-US-Journey-F',
    lang: 'en-US',
    description: 'Suara wanita Amerika modern, ramah, artikulatif dan natural untuk audiens global',
    avatar: '✨',
    badge: 'GOOGLE JOURNEY'
  },
  {
    id: 'ja-JP-Neural2-B',
    name: 'Google Neural2-B (JA ♀ Seiyuu Anime)',
    gender: 'female',
    provider: 'google',
    engine: 'google',
    voiceKey: 'ja-JP-Neural2-B',
    lang: 'ja-JP',
    description: 'Suara seiyuu anime Jepang ceria, imersif & penuh emosi untuk animasi dan game',
    avatar: '🌸',
    badge: 'GOOGLE NEURAL2'
  },
  // 2. ChatGPT / OpenAI Neural TTS Voices
  {
    id: 'openai-female-nova',
    name: 'ChatGPT Nova',
    gender: 'female',
    provider: 'openai',
    engine: 'openai',
    voiceKey: 'nova',
    lang: 'id-ID',
    description: 'Suara wanita resmi ChatGPT, energik, ramah, artikulatif & natural',
    avatar: '🎙️',
    badge: 'CHATGPT'
  },
  {
    id: 'openai-male-onyx',
    name: 'ChatGPT Onyx',
    gender: 'male',
    provider: 'openai',
    engine: 'openai',
    voiceKey: 'onyx',
    lang: 'id-ID',
    description: 'Suara pria berwibawa, berat & berkarakter dalam khas podcast host',
    avatar: '🎩',
    badge: 'CHATGPT'
  },
  {
    id: 'openai-female-shimmer',
    name: 'ChatGPT Shimmer',
    gender: 'female',
    provider: 'openai',
    engine: 'openai',
    voiceKey: 'shimmer',
    lang: 'id-ID',
    description: 'Suara wanita lembut, jernih, ekspresif & berkelas untuk narasi estetik',
    avatar: '✨',
    badge: 'OPENAI'
  },
  {
    id: 'openai-male-echo',
    name: 'ChatGPT Echo',
    gender: 'male',
    provider: 'openai',
    engine: 'openai',
    voiceKey: 'echo',
    lang: 'id-ID',
    description: 'Suara pria hangat, bersahabat, santai & mengalir natural',
    avatar: '🎧',
    badge: 'OPENAI'
  },
  {
    id: 'openai-neutral-alloy',
    name: 'ChatGPT Alloy',
    gender: 'female',
    provider: 'openai',
    engine: 'openai',
    voiceKey: 'alloy',
    lang: 'id-ID',
    description: 'Suara legendaris ChatGPT yang seimbang, netral & sangat jelas',
    avatar: '🤖',
    badge: 'ORIGINAL'
  },
  // 3. Neural AI Indonesian Regional Voices
  {
    id: 'tryaudio-female-citra',
    name: 'Citra Kirana (Neural AI)',
    gender: 'female',
    provider: 'tryaudio',
    engine: 'tryaudio',
    voiceKey: 'citra',
    lang: 'id-ID',
    description: 'Suara wanita ceria, ramah & artikulatif, formula hook TikTok & Shopee video',
    avatar: '🌸',
    badge: 'POPULAR'
  },
  {
    id: 'tryaudio-male-dimas',
    name: 'Dimas Perkasa (Neural AI)',
    gender: 'male',
    provider: 'tryaudio',
    engine: 'tryaudio',
    voiceKey: 'dimas',
    lang: 'id-ID',
    description: 'Suara pria epik, mantap, cocok untuk narasi cinematic & promosi',
    avatar: '⚡',
    badge: 'CINEMATIC'
  },
  // 4. ElevenLabs Multilingual
  {
    id: 'eleven-female-rachel',
    name: 'Rachel Storyteller (ElevenLabs)',
    gender: 'female',
    provider: 'elevenlabs',
    engine: 'elevenlabs',
    voiceKey: 'rachel',
    lang: 'id-ID',
    description: 'Suara wanita emosional dan jernih untuk anime, edukasi & dongeng',
    avatar: '📖',
    badge: 'ELEVENLABS'
  },
  {
    id: 'eleven-male-adam',
    name: 'Adam Narrator (ElevenLabs)',
    gender: 'male',
    provider: 'elevenlabs',
    engine: 'elevenlabs',
    voiceKey: 'adam',
    lang: 'id-ID',
    description: 'Suara pria kelas Hollywood dengan intonasi dinamis & emosional',
    avatar: '🎬',
    badge: 'HOLLYWOOD'
  }
];

export type VoiceStateListener = (state: { isSpeaking: boolean; isPlayingAI: boolean; error?: string }) => void;

class NeuronaVoiceEngine {
  private isMuted: boolean = false;
  private disableRoboticTTS: boolean = true; // ROBOTIC TTS DISABLED PERMANENTLY
  private audioCtx: AudioContext | null = null;
  private isSpeaking: boolean = false;
  private isPlayingAI: boolean = false;
  private currentVoice: VoiceOption = AVAILABLE_VOICES[0]; // default ChatGPT Nova
  private stateListeners: VoiceStateListener[] = [];
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    // Robotic browser window.speechSynthesis is intentionally OFF
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

  setDisableRoboticTTS(disabled: boolean) {
    this.disableRoboticTTS = disabled;
  }

  getDisableRoboticTTS(): boolean {
    return this.disableRoboticTTS;
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

  // Futuristic Sound Effects
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
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
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
      // Audio context might be blocked prior to user interaction
    }
  }

  async speak(text: string, overrideGender?: 'male' | 'female', overrideProvider?: string, overrideVoiceKey?: string): Promise<{ success: boolean; error?: string }> {
    if (this.isMuted) return { success: false, error: 'Muted' };
    
    this.stop();
    this.playChime('ACTIVATE');

    // Clean text from markdown, emojis, or code tags
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\{.*?\}/g, '')
      .substring(0, 350);

    const effectiveProvider = overrideProvider || this.currentVoice.provider || 'openai';
    const isMale = overrideGender ? (overrideGender === 'male') : (this.currentVoice.gender === 'male' || this.currentVoice.id.includes('male'));
    const voiceKey = overrideVoiceKey || this.currentVoice.voiceKey || (isMale ? 'onyx' : 'nova');

    try {
      this.isSpeaking = true;
      this.isPlayingAI = true;
      this.notifyListeners();

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            this.notifyListeners();
            URL.revokeObjectURL(url);
            resolve({ success: true });
          };

          this.currentAudio.onerror = () => {
            this.isSpeaking = false;
            this.isPlayingAI = false;
            this.notifyListeners();
            URL.revokeObjectURL(url);
            resolve({ success: false, error: 'Playback error' });
          };
          
          this.currentAudio.play().catch((playErr) => {
            console.warn("[TTS] Audio playback blocked by browser:", playErr);
            this.isSpeaking = false;
            this.isPlayingAI = false;
            this.notifyListeners();
            resolve({ success: false, error: 'Autoplay blocked' });
          });
        });
      } else {
        const errJson = await res.json().catch(() => ({ error: 'Gagal generate audio AI' }));
        console.warn("[TTS Engine] Backend error:", errJson);
        this.isSpeaking = false;
        this.isPlayingAI = false;
        this.notifyListeners(errJson.error || 'API Key Voiceover AI belum aktif');
        
        // Play elegant alert chime instead of noisy robot
        this.playChime('ALERT');
        return { success: false, error: errJson.error || 'TTS API Error' };
      }
    } catch (e: any) {
      console.warn("[TTS Engine] Request failed:", e);
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

  private notifyListeners(error?: string) {
    this.stateListeners.forEach(l => l({
      isSpeaking: this.isSpeaking,
      isPlayingAI: this.isPlayingAI,
      error
    }));
  }
}

export const neuronaVoice = new NeuronaVoiceEngine();
