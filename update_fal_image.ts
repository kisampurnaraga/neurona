import fs from 'fs';

let content = fs.readFileSync('server/imageService.ts', 'utf8');

const regexFal = /\/\/ -----------------------------------------------------------------------\s*\n\s*\/\/ Engine 1: Fal\.ai Engine[\s\S]*?const runFalImage = async \(\): Promise<string \| null> => \{([\s\S]*?)\};\n\n    \/\/ -----------------------------------------------------------------------\n    \/\/ Engine 2: Google Gemini/m;

const replacementFal = `// -----------------------------------------------------------------------
    // Engine 1: Fal.ai Engine (Executed ONLY when user selects Fal.ai / Standard / Precision / Draft)
    // -----------------------------------------------------------------------
    const runFalImage = async (): Promise<string | null> => {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const falApiKey = keyRotator.getNextFalKey();
        if (!falApiKey) {
          falQuotaErrorOccurred = true;
          falQuotaErrorMessage = 'Kunci API Fal.ai belum dikonfigurasi di server.';
          return null;
        }

        const selectedTier = (rawEngine === 'draft' || rawEngine === 'precision' || rawEngine === 'standard') ? rawEngine : undefined;
        const isDraftMode = selectedTier === 'draft' || rawEngine === 'flux-diffusion' || rawEngine === 'fal-ai/flux/schnell';
        const effectiveRefImages = isDraftMode ? [] : referenceImageUrls;

        const targetModelDef = getFalImageModelForStudio(videoType, {
          isSubsequentScene: sceneIndex > 0,
          hasReferenceImages: effectiveRefImages.length > 0,
          tier: selectedTier,
          forceModelId: rawEngine.startsWith('fal-ai/') ? rawEngine : undefined
        });

        console.log(\`[Fal.ai Engine] Studio [\${videoType}] -> Selected Model: \${targetModelDef.id} (Tier: \${selectedTier || 'default'})\`);
        if (onLog) onLog(\`Routing Scene \${sceneIndex + 1} ke fal.ai [\${targetModelDef.id}]...\`, 'INFO');

        const modelPath = targetModelDef.id;
        try {
          const payload = buildFalImagePayload(modelPath, {
            prompt: finalPrompt,
            imageUrls: (modelPath.includes('/edit') && effectiveRefImages.length > 0) ? effectiveRefImages : undefined,
            aspectRatio: cleanAspect,
            resolution: resolution as any,
            safetyTolerance: videoType === 'AFFILIATE' ? '6' : '5'
          });

          const isHighResQueue = resolution === '4K' || resolution === '2K';
          const startTime = Date.now();
          
          let resStatus = 0;
          let imageUrl: string | undefined;

          if (isHighResQueue) {
            console.log(\`[Fal.ai Queue] Submitting 4K/2K payload to https://queue.fal.run/\${modelPath}...\`);
            const queueRes = await fetch(\`https://queue.fal.run/\${modelPath}\`, {
              method: 'POST',
              headers: {
                'Authorization': \`Key \${falApiKey.trim()}\`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
            
            resStatus = queueRes.status;

            if (!queueRes.ok) {
              const errText = await queueRes.text().catch(() => '');
              let parsedDetail = errText;
              try { parsedDetail = JSON.parse(errText).detail || errText; } catch(e) {}
              lastFalError = \`HTTP \${resStatus}: \${parsedDetail}\`;
            } else {
               // ... simplified queue wait for this demo script
               const queueJson: any = await queueRes.json();
               const requestId = queueJson.request_id;
               const statusUrl = queueJson.status_url || \`https://queue.fal.run/\${modelPath}/requests/\${requestId}/status\`;
               const responseUrl = queueJson.response_url || \`https://queue.fal.run/\${modelPath}/requests/\${requestId}\`;
               
               let completedJson: any = null;
               while (Date.now() - startTime < 180000) {
                  await new Promise((resolve) => setTimeout(resolve, 2500));
                  const pollRes = await fetch(statusUrl, { headers: { 'Authorization': \`Key \${falApiKey.trim()}\` } });
                  if (pollRes.ok) {
                    const pollJson: any = await pollRes.json();
                    if ((pollJson.status || '').toUpperCase() === 'COMPLETED') {
                      const finalRes = await fetch(responseUrl, { headers: { 'Authorization': \`Key \${falApiKey.trim()}\` } });
                      completedJson = finalRes.ok ? await finalRes.json() : pollJson;
                      break;
                    } else if ((pollJson.status || '').toUpperCase() === 'FAILED') {
                      lastFalError = JSON.stringify(pollJson.error || 'Queue task failed');
                      break;
                    }
                  }
               }
               imageUrl = completedJson?.images?.[0]?.url || completedJson?.output?.[0];
            }
          } else {
            // DIRECT SYNC MODE
            const res = await fetch(\`https://fal.run/\${modelPath}\`, {
              method: 'POST',
              headers: {
                'Authorization': \`Key \${falApiKey.trim()}\`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
            
            resStatus = res.status;
            if (res.ok) {
              const json: any = await res.json();
              imageUrl = json?.images?.[0]?.url || json?.output?.[0];
            } else {
              const errText = await res.text().catch(() => '');
              let parsedDetail = errText;
              try { parsedDetail = JSON.parse(errText).detail || errText; } catch(e) {}
              lastFalError = \`HTTP \${resStatus}: \${parsedDetail}\`;
            }
          }

          if (imageUrl) {
             const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
             if (onLog) onLog(\`Keyframe Adegan \${sceneIndex + 1} berhasil digenerate via Fal [\${modelPath}] (\${durationSec}s)\`, 'SUCCESS');
             return imageUrl;
          }

          // Error handling based on status
          if (resStatus === 402 || resStatus === 401 || resStatus === 403 || resStatus === 429) {
             keyRotator.reportKeyError('fal', falApiKey, new Error(lastFalError));
             continue; // try next key
          } else {
             return null; // hard error, bubble up
          }
        } catch (err: any) {
           lastFalError = String(err.message || err);
           return null;
        }
      }
      return null;
    };

    // -----------------------------------------------------------------------
    // Engine 2: Google Gemini`;

content = content.replace(regexFal, replacementFal);
fs.writeFileSync('server/imageService.ts', content);
