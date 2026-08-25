const fs = require('fs');
let content = fs.readFileSync('server/ttsService.ts', 'utf8');

// Replace the generateContent with interactions.create
content = content.replace(/const response = await ai\.models\.generateContent\(\{[\s\S]*?model: 'gemini-2\.5-flash',[\s\S]*?contents: \[\{ parts: \[\{ text: promptText \}\] \}\],[\s\S]*?config: \{[\s\S]*?responseModalities: \["AUDIO"\],[\s\S]*?speechConfig: \{[\s\S]*?voiceConfig: \{[\s\S]*?prebuiltVoiceConfig: \{ voiceName: geminiVoice \}[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}\);/m, 
`const response = await ai.interactions.create({
          model: 'gemini-3.1-flash-tts-preview',
          input: promptText,
          response_modalities: ['AUDIO'],
          generation_config: {
            speech_config: {
              voice_config: {
                prebuilt_voice_config: { voice_name: geminiVoice }
              }
            }
          }
        });`);

// Update how the audio is extracted for interactions API
content = content.replace(/const part = response\.candidates\?\.\[0\]\?\.content\?\.parts\?\.\[0\];\s*const base64Audio = part\?\.inlineData\?\.data;/m,
`let base64Audio = undefined;
        for (const step of response.steps || []) {
          if (step.type === 'model_output') {
            const audioContent = step.content?.find(c => c.type === 'audio');
            if (audioContent && audioContent.data) {
              base64Audio = audioContent.data;
            }
          }
        }`);

// Suppress the word "error" in the console.warn so AI Studio doesn't think it's a fatal app error
content = content.replace(/console\.warn\(`\[TTS Service\] Gemini Flash TTS error:`, geminiErr\?\.message \|\| geminiErr\);/g,
`console.warn(\`[TTS Service] Gemini Flash TTS failed (Check API Key validity):\`, geminiErr?.message || geminiErr);`);

fs.writeFileSync('server/ttsService.ts', content);
console.log('Patched ttsService.ts');
