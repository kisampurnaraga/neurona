import fetch from 'node-fetch';
import { GoogleGenAI, Modality } from '@google/genai';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FounderService } from '../../src/server/fcc/FounderService';

export interface VoiceOption {
  id: string;
  name: string;
  languageCode: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  category: 'Journey' | 'Neural2' | 'Wavenet' | 'Studio' | 'Standard';
  description: string;
}

export const SUPPORTED_VOICE_PRESETS: VoiceOption[] = [
  {
    id: 'id-ID-Journey-O',
    name: 'Indonesian Natural Female (Journey-O)',
    languageCode: 'id-ID',
    ssmlGender: 'FEMALE',
    category: 'Journey',
    description: 'Suara wanita Indonesia ultra-realistis dengan intonasi natural ekspresif'
  },
  {
    id: 'id-ID-Wavenet-A',
    name: 'Indonesian Professional Female (Wavenet-A)',
    languageCode: 'id-ID',
    ssmlGender: 'FEMALE',
    category: 'Wavenet',
    description: 'Suara wanita Indonesia formal dan jernih, cocok untuk edukasi & tutorial'
  },
  {
    id: 'id-ID-Wavenet-B',
    name: 'Indonesian Energetic Male (Wavenet-B)',
    languageCode: 'id-ID',
    ssmlGender: 'MALE',
    category: 'Wavenet',
    description: 'Suara pria Indonesia bertenaga, ideal untuk konten promo & marketing'
  },
  {
    id: 'en-US-Journey-D',
    name: 'English Cinematic Male (Journey-D)',
    languageCode: 'en-US',
    ssmlGender: 'MALE',
    category: 'Journey',
    description: 'Suara pria Amerika karismatik narator dokumenter & film'
  },
  {
    id: 'en-US-Journey-F',
    name: 'English Natural Female (Journey-F)',
    languageCode: 'en-US',
    ssmlGender: 'FEMALE',
    category: 'Journey',
    description: 'Suara wanita Amerika modern, ramah, dan artikulatif'
  },
  {
    id: 'ja-JP-Neural2-B',
    name: 'Japanese Seiyuu Female (Neural2-B)',
    languageCode: 'ja-JP',
    ssmlGender: 'FEMALE',
    category: 'Neural2',
    description: 'Suara anime seiyuu Jepang bersemangat dan ekspresif'
  }
];

export class TTSService {
  private static gcpTtsClient: TextToSpeechClient | null = null;

  private static getGcpTtsClient(): TextToSpeechClient | null {
    if (!this.gcpTtsClient) {
      try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
        this.gcpTtsClient = new TextToSpeechClient({
          projectId: projectId || undefined,
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
        });
      } catch (err: any) {
        console.warn('[TTSService] Notice initializing Google Cloud TTS client:', err?.message || err);
        return null;
      }
    }
    return this.gcpTtsClient;
  }

  /**
   * Helper to convert raw 16-bit Mono PCM audio into a standard WAV Buffer
   */
  public static pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
    if (pcmBuffer.length > 4 && (pcmBuffer.toString('utf8', 0, 4) === 'RIFF' || pcmBuffer.toString('utf8', 0, 3) === 'ID3')) {
      return pcmBuffer;
    }
    const wavHeader = Buffer.alloc(44);
    const dataSize = pcmBuffer.length;
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36 + dataSize, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20); // PCM
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
    wavHeader.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    return Buffer.concat([wavHeader, pcmBuffer]);
  }

  /**
   * Generates voice narration using Google Cloud TTS API (Journey, Neural2, Wavenet)
   * with automated fallbacks to Gemini Flash TTS, OpenAI TTS, and harmonic audio.
   * @param text Script text to synthesize
   * @param voiceType Voice ID (e.g. 'id-ID-Journey-O', 'en-US-Journey-D', 'ja-JP-Neural2-B')
   */
  public static async generateVoice(text: string, voiceType = 'id-ID-Journey-O'): Promise<{ buffer: Buffer; tempFilePath: string }> {
    const cleanText = text.trim();
    if (!cleanText) {
      const emptyBuffer = this.generateStudioFeedbackAudio('female');
      const tempPath = path.join(os.tmpdir(), `tts_empty_${Date.now()}.wav`);
      fs.writeFileSync(tempPath, emptyBuffer);
      return { buffer: emptyBuffer, tempFilePath: tempPath };
    }

    // ----------------------------------------------------
    // 1. Google Cloud Text-to-Speech API
    // ----------------------------------------------------
    const client = this.getGcpTtsClient();
    if (client) {
      try {
        console.log(`[TTSService] Generating Google Cloud TTS with voice '${voiceType}'...`);
        
        // Find matching preset or parse language code
        const preset = SUPPORTED_VOICE_PRESETS.find(p => p.id === voiceType) || {
          id: voiceType,
          languageCode: voiceType.startsWith('en') ? 'en-US' : voiceType.startsWith('ja') ? 'ja-JP' : 'id-ID',
          ssmlGender: voiceType.toLowerCase().includes('male') || voiceType.endsWith('B') || voiceType.endsWith('D') ? 'MALE' : 'FEMALE'
        };

        const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
          input: { text: cleanText },
          voice: {
            languageCode: preset.languageCode,
            name: voiceType.includes('-') ? voiceType : undefined,
            ssmlGender: (preset.ssmlGender as any) || 'NEUTRAL',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
          },
        };

        const [response] = await client.synthesizeSpeech(request);
        if (response.audioContent && response.audioContent.length > 0) {
          const audioBuffer = Buffer.from(response.audioContent);
          const tempPath = path.join(os.tmpdir(), `gcp_tts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.mp3`);
          fs.writeFileSync(tempPath, audioBuffer);
          console.log(`[TTSService] Google Cloud TTS synthesis success (${audioBuffer.length} bytes) -> ${tempPath}`);
          return { buffer: audioBuffer, tempFilePath: tempPath };
        }
      } catch (gcpErr: any) {
        console.warn(`[TTSService] Google Cloud TTS Notice (${gcpErr?.message}). Falling back to Gemini Flash TTS...`);
      }
    }

    // ----------------------------------------------------
    // 2. Gemini Flash Native Speech AI (via GEMINI_API_KEY)
    // ----------------------------------------------------
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const isMale = voiceType.toLowerCase().includes('male') || voiceType.endsWith('B') || voiceType.endsWith('D');
        const geminiVoice = isMale ? 'Puck' : 'Kore';

        console.log(`[TTSService] Synthesizing via Gemini Speech AI (Persona: ${geminiVoice})...`);
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const promptText = isMale
          ? `Bicaralah dengan intonasi pria yang ramah, artikulatif, natural, dan berwibawa: "${cleanText}"`
          : `Bicaralah dengan intonasi wanita yang ceria, ramah, memikat, artikulatif, dan natural: "${cleanText}"`;

        const candidateModels = [
          'gemini-3.6-flash',
          'gemini-3.1-flash-tts-preview',
          'gemini-2.5-flash'
        ];

        for (const modelName of candidateModels) {
          try {
            console.log(`[TTSService] Synthesizing via Gemini Speech AI (Model: ${modelName}, Persona: ${geminiVoice})...`);
            const response = await ai.models.generateContent({
              model: modelName,
              contents: [{ parts: [{ text: promptText }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: geminiVoice }
                  }
                }
              }
            });

            const part = response.candidates?.[0]?.content?.parts?.[0];
            const base64Audio = part?.inlineData?.data;

            if (base64Audio) {
              const rawBuffer = Buffer.from(base64Audio, 'base64');
              const wavBuffer = this.pcmToWav(rawBuffer, 24000);
              const tempPath = path.join(os.tmpdir(), `gemini_tts_${Date.now()}.wav`);
              fs.writeFileSync(tempPath, wavBuffer);
              console.log(`[TTSService] Gemini Speech synthesized successfully (${wavBuffer.length} bytes)`);
              return { buffer: wavBuffer, tempFilePath: tempPath };
            }
          } catch (mErr: any) {
            // Proceed to next candidate
          }
        }
      } catch (geminiErr: any) {
        console.log(`[TTSService] Gemini Flash TTS notice: ${geminiErr?.message || geminiErr}`);
      }
    }

    // ----------------------------------------------------
    // 3. Fallback: OpenAI TTS / Acoustic WAV Fail-Safe
    // ----------------------------------------------------
    const openAIConfig = FounderService.getOpenAIConfig();
    const openAIKey = openAIConfig.apiKey || process.env.OPENAI_API_KEY;

    if (openAIKey) {
      try {
        const isMale = voiceType.toLowerCase().includes('male') || voiceType.endsWith('B') || voiceType.endsWith('D');
        const openAiVoice = isMale ? 'onyx' : 'nova';
        
        console.log(`[TTSService] Calling OpenAI TTS fallback (Voice: ${openAiVoice})...`);
        const openAiEndpoint = `${openAIConfig.endpoint || 'https://api.openai.com/v1'}/audio/speech`;
        
        const response = await fetch(openAiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIKey}`
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: cleanText,
            voice: openAiVoice,
            speed: 1.0
          })
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const tempPath = path.join(os.tmpdir(), `openai_tts_${Date.now()}.mp3`);
          fs.writeFileSync(tempPath, buffer);
          return { buffer, tempFilePath: tempPath };
        }
      } catch (openAiErr) {
        console.warn("[TTSService] OpenAI TTS error:", openAiErr);
      }
    }

    // Acoustic Harmonic fail-safe
    console.log(`[TTSService] Using studio acoustic audio fallback.`);
    const isMale = voiceType.toLowerCase().includes('male') || voiceType.endsWith('B') || voiceType.endsWith('D');
    const fallbackBuffer = this.generateStudioFeedbackAudio(isMale ? 'male' : 'female');
    const tempPath = path.join(os.tmpdir(), `studio_harmonic_${Date.now()}.wav`);
    fs.writeFileSync(tempPath, fallbackBuffer);
    return { buffer: fallbackBuffer, tempFilePath: tempPath };
  }

  public static async generateTTS(provider: string, text: string, config?: any): Promise<Buffer> {
    const voiceType = config?.voiceName || config?.voiceKey || 'id-ID-Journey-O';
    const result = await this.generateVoice(text, voiceType);
    return result.buffer;
  }

  /**
   * Generates a pleasant, harmonic Studio-Grade acoustic WAV buffer
   */
  public static generateStudioFeedbackAudio(gender: 'male' | 'female'): Buffer {
    const sampleRate = 44100;
    const durationSeconds = 1.5;
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const buffer = Buffer.alloc(44 + numSamples * 2);

    // RIFF WAV Header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    const f1 = gender === 'female' ? 659.25 : 329.63; // E5 / E4
    const f2 = gender === 'female' ? 783.99 : 392.00; // G5 / G4
    const f3 = gender === 'female' ? 1046.50 : 523.25; // C6 / C5

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = t / durationSeconds;
      const env = Math.sin(Math.PI * Math.min(progress * 6, 1)) * Math.exp(-progress * 3.5);
      
      const sample = (
        Math.sin(2 * Math.PI * f1 * t) * 0.45 +
        Math.sin(2 * Math.PI * f2 * t) * 0.35 +
        Math.sin(2 * Math.PI * f3 * t) * 0.20
      ) * env;

      const intSample = Math.floor(sample * 32767);
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, intSample)), 44 + i * 2);
    }

    return buffer;
  }
}
