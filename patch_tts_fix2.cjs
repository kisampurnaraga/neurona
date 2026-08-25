const fs = require('fs');
let content = fs.readFileSync('server/ttsService.ts', 'utf8');

// Replace the generateContent with interactions.create
content = content.replace(/const response = await ai\.models\.generateContent\(\{[\s\S]*?model: 'gemini-2\.5-flash',[\s\S]*?contents: \[\{ parts: \[\{ text: promptText \}\] \}\],[\s\S]*?config: \{[\s\S]*?responseModalities: \[Modality\.AUDIO\],[\s\S]*?speechConfig: \{[\s\S]*?voiceConfig: \{[\s\S]*?prebuiltVoiceConfig: \{ voiceName: geminiVoice \}[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}\);/m, 
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

fs.writeFileSync('server/ttsService.ts', content);
console.log('Patched ttsService.ts 2');
