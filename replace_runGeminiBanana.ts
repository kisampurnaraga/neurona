import fs from 'fs';

let content = fs.readFileSync('server/imageService.ts', 'utf8');

const regex = /\/\/ -----------------------------------------------------------------------\s*const runGeminiBanana = async \(\): Promise<string \| null> => \{[\s\S]*?\n    \};\n\n    \/\/ -----------------------------------------------------------------------\n    \/\/ Engine 3:/;

const replacement = `// -----------------------------------------------------------------------
    const runGeminiBanana = async (): Promise<string | null> => {
      const bananaConfig = FounderService.getGeminiBananaConfig();
      const customKey = bananaConfig.apiKey;
      
      // EXPLICIT ENGINE ROUTING: Only use gemini-2.5-flash-image for Nano Banana Asli
      const modelName = 'gemini-2.5-flash-image';
      const maxAttempts = 3; // For intra-provider key rotation (e.g. rate limits)

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let apiKey = (attempt === 0 && customKey) ? customKey : keyRotator.getNextGeminiKey();
        
        // Loop up to 5 times to find a valid key, skipping bad formats
        let formatRetries = 0;
        while (apiKey && formatRetries < 5 && (apiKey.startsWith('fal_') || (apiKey.includes(':') && !apiKey.startsWith('AIza')))) {
          console.warn(\`[runGeminiBanana] Ignored Fal format key in Gemini request: \${apiKey.substring(0, 8)}...\`);
          keyRotator.removeKey('gemini', apiKey);
          apiKey = keyRotator.getNextGeminiKey();
          formatRetries++;
        }

        if (!apiKey || apiKey.startsWith('fal_')) {
          lastGeminiError = 'API Key Google Gemini resmi belum dikonfigurasi atau tidak valid di server. Mohon isi API Key Gemini yang benar (AIza...).';
          return null;
        }

        const keySourceName = (attempt === 0 && customKey) ? 'FounderService.customGeminiBananaConfig' : 'KeyRotator.GeminiPool';
        const vRes = validateCredentialFormat('gemini', apiKey, keySourceName);
        if (!vRes.valid) {
          logCredentialAudit('gemini', keySourceName, apiKey, 'GENERATE_KEYFRAME', 'BLOCKED', vRes.reason);
          lastGeminiError = vRes.reason || 'Invalid credential format';
          continue; // Try next key
        }

        logCredentialAudit('gemini', keySourceName, apiKey, 'GENERATE_KEYFRAME', 'SUCCESS');
        
        console.log(\`[Google Gemini Nano Asli Engine] Attempting keyframe generation for Scene \${sceneIndex + 1} with \${modelName}...\`);
        if (onLog) onLog(\`Generating keyframe Adegan \${sceneIndex + 1} dengan Google Nano Asli [\${modelName}]...\`, 'INFO');
        
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          // Multimodal content parts (Reference Images + Prompt)
          const parts: any[] = [...localGeminiParts, { text: finalPrompt }];
          const config: any = { responseModalities: ["IMAGE"] };

          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config
          });

          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                if (onLog) onLog(\`Keyframe Adegan \${sceneIndex + 1} berhasil digenerate via Google Nano Asli [\${modelName}]!\`, 'SUCCESS');
                return \`data:image/png;base64,\${part.inlineData.data}\`;
              }
            }
          }
          
          lastGeminiError = "Berhasil memanggil model, tapi tidak ada gambar di response Google.";
          return null;

        } catch (sdkErr: any) {
          const msg = sdkErr?.message || String(sdkErr);
          console.log(\`[Google Gemini Nano Asli] Model \${modelName} error on key: \${msg}\`);
          
          lastGeminiError = 'FULL ERROR RESPONSE (' + modelName + '): ' + msg;
          keyRotator.reportKeyError('gemini', apiKey, sdkErr);

          // If it's a rate limit (429), we can continue to the next key.
          // Otherwise, it's a hard error (401, 404, 400, etc) - DO NOT fallback to other keys or models.
          if (!msg.includes('429') && !msg.toLowerCase().includes('quota') && !msg.toLowerCase().includes('rate limit')) {
             return null; // Stop trying other keys, return null so STRICT ENGINE DISPATCH throws this exact error
          }
          
          // If we are here, it was a 429 quota error, loop will try next key
        }
      }
      return null;
    };

    // -----------------------------------------------------------------------
    // Engine 3:`;

content = content.replace(regex, replacement);
fs.writeFileSync('server/imageService.ts', content);
