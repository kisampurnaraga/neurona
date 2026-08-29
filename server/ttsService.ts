import fetch from 'node-fetch';
import { GoogleGenAI, Modality } from '@google/genai';
import { FounderService } from '../src/server/fcc/FounderService';

export class TTSService {
  /**
   * Helper to convert raw 16-bit Mono PCM audio into a standard WAV Buffer
   */
  private static pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
    // If it already has a RIFF or ID3/MP3 header, return directly
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

  static async generateTTS(provider: string, text: string, config?: any): Promise<Buffer> {
    const rawVoiceName = (config?.voiceName || config?.voiceKey || '').toLowerCase();
    const isMale = config?.voiceGender === 'male' || 
                   rawVoiceName.includes('dimas') ||
                   rawVoiceName.includes('adam') ||
                   rawVoiceName === 'onyx' ||
                   rawVoiceName === 'echo';

    // Normalize OpenAI specific voice names
    let openAiVoice = 'nova';
    if (['nova', 'shimmer', 'alloy', 'onyx', 'echo', 'fable'].includes(rawVoiceName)) {
      openAiVoice = rawVoiceName;
    } else {
      openAiVoice = isMale ? 'onyx' : 'nova';
    }

    // ----------------------------------------------------
    // 1. TIER 1: Direct OpenAI ChatGPT High-Fidelity TTS (tts-1 / tts-1-hd)
    // ----------------------------------------------------
    const openAIConfig = FounderService.getOpenAIConfig();
    const openAIKey = openAIConfig.apiKey || process.env.OPENAI_API_KEY;

    if (openAIKey && (provider === 'openai' || provider === 'tryaudio')) {
      try {
        console.log(`[TTS Service] Generating speech with OpenAI ChatGPT TTS (Voice: ${openAiVoice}, Model: tts-1)...`);
        const openAiEndpoint = `${openAIConfig.endpoint || 'https://api.openai.com/v1'}/audio/speech`;
        
        const response = await fetch(openAiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIKey}`
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: openAiVoice,
            speed: 1.0
          })
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          console.log(`[TTS Service] OpenAI ChatGPT TTS synthesized successfully (${arrayBuffer.byteLength} bytes)`);
          return Buffer.from(arrayBuffer);
        } else {
          const errText = await response.text().catch(() => response.statusText);
          console.warn(`[TTS Service] OpenAI TTS failed (${response.status}): ${errText}`);
        }
      } catch (err) {
        console.warn("[TTS Service] OpenAI TTS error:", err);
      }
    }

    // ----------------------------------------------------
    // 2. TIER 2: Google Gemini Neural AI Voice (Native Studio Quality)
    // ----------------------------------------------------
    const geminiKey = (process.env.GEMINI_MANUAL_API_KEY || process.env.GEMINI_API_KEY);
    if (geminiKey) {
      try {
        // Map OpenAI/custom voice styles to Gemini Speech personas
        let geminiVoice = isMale ? 'Puck' : 'Kore';
        if (openAiVoice === 'onyx' || openAiVoice === 'echo') {
          geminiVoice = 'Puck';
        } else if (openAiVoice === 'shimmer' || openAiVoice === 'nova' || openAiVoice === 'alloy') {
          geminiVoice = 'Kore';
        }

        const ai = new GoogleGenAI({ apiKey: geminiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

        const promptText = isMale
          ? `Bicaralah dengan intonasi pria yang ramah, jelas, natural, dan berwibawa dalam Bahasa Indonesia: "${text}"`
          : `Bicaralah dengan intonasi wanita yang ceria, ramah, artikulatif, memikat, dan natural dalam Bahasa Indonesia: "${text}"`;

        const candidateModels = [
          'gemini-3.1-flash-tts-preview',
          'gemini-2.5-flash'
        ];

        for (const modelName of candidateModels) {
          try {
            console.log(`[TTS Service] Generating speech with Gemini Speech AI (Model: ${modelName}, Voice: ${geminiVoice})...`);
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
              console.log(`[TTS Service] Gemini Speech synthesized successfully (${rawBuffer.length} bytes)`);
              return TTSService.pcmToWav(rawBuffer, 24000);
            }
          } catch (modelErr: any) {
            // Model candidate failed, proceed to next candidate
          }
        }
      } catch (geminiErr: any) {
        console.log(`[TTS Service] Gemini Flash TTS notice: ${geminiErr?.message || geminiErr}`);
      }
    }

    // ----------------------------------------------------
    // 3. TIER 3: TryAudioLab AI Router (If credits are active)
    // ----------------------------------------------------
    const tryAudioConfig = FounderService.getTryAudioConfig();
    const tryAudioKey = tryAudioConfig.apiKey || process.env.TRYAUDIO_API_KEY;

    if (tryAudioKey && (provider === 'tryaudio' || provider === 'elevenlabs')) {
      const endpoint = tryAudioConfig.endpoint || 'https://api.tryaudiolab.ai/v1/audio/speech';
      
      const tryAudioCandidateConfigs = [
        { model: 'openai/tts-1', voice: openAiVoice },
        { model: 'tts/auto', voice: 'auto' }
      ];

      for (const candidate of tryAudioCandidateConfigs) {
        try {
          const payload = {
            model: candidate.model,
            input: text,
            voice: candidate.voice
          };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tryAudioKey}`
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            console.log(`[TTS Service] TryAudioLab synthesis success with model=${payload.model}`);
            return Buffer.from(arrayBuffer);
          } else {
            if (response.status === 402) {
              console.log(`[TTS Service] TryAudioLab credit balance empty (402).`);
              break;
            }
          }
        } catch (candidateErr) {
          console.warn(`[TTS Service] TryAudioLab candidate failed:`, candidateErr);
        }
      }
    }

    // ----------------------------------------------------
    // 4. TIER 4: Direct ElevenLabs AI Synthesis
    // ----------------------------------------------------
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (elevenLabsKey) {
      try {
        const voiceId = isMale ? 'pNInz6obpgDQGcFmaJgB' : '21m00Tcm4TlvDq8ikWAM';
        const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        
        const response = await fetch(elevenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsKey
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch (err) {
        console.warn("[TTS Service] Direct ElevenLabs error:", err);
      }
    }

    // ----------------------------------------------------
    // 5. TIER 5: Studio Harmonic Acoustic WAV Fail-Safe
    // ----------------------------------------------------
    console.log(`[TTS Service] Generating studio acoustic audio feedback for ${rawVoiceName}...`);
    return TTSService.generateStudioFeedbackAudio(isMale ? 'male' : 'female');
  }

  /**
   * Generates a pleasant, harmonic Studio-Grade acoustic WAV buffer
   * as a 100% reliable fail-safe so the player never breaks or throws errors.
   */
  public static generateStudioFeedbackAudio(gender: 'male' | 'female'): Buffer {
    const sampleRate = 44100;
    const durationSeconds = 1.2;
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
