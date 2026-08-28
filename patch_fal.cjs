const fs = require('fs');
let code = fs.readFileSync('src/server/providers/FalVideoAdapter.ts', 'utf8');

const targetStr = `        const res = await fetch(\`https://fal.run/\${modelPath}\`, {`;
const replaceStr = `        // Submit to the asynchronous queue to prevent 504 Gateway Timeouts on long video generations
        const res = await fetch(\`https://queue.fal.run/\${modelPath}\`, {`;

// We also need to change how the response is handled.
const targetHandleStr = `        if (res.ok) {
          const json: any = await res.json();
          const videoUrl = json?.video?.url || json?.video_url || json?.output?.[0] || json?.file?.url;
          if (videoUrl) {
            return videoUrl;
          }
        } else {`;

const replaceHandleStr = `        if (res.ok) {
          const json: any = await res.json();
          const requestId = json.request_id;
          
          if (!requestId) {
             // Fallback if it executed synchronously anyway
             const directUrl = json?.video?.url || json?.video_url || json?.output?.[0] || json?.file?.url;
             if (directUrl) return directUrl;
             throw new Error("No request_id returned from queue.");
          }

          console.log(\`[FAL.AI] Queue request submitted: \${requestId}. Polling for completion...\`);
          
          // Poll for completion
          let attempts = 0;
          while (attempts < 120) { // Max 10 minutes (120 * 5s)
             await new Promise(r => setTimeout(r, 5000));
             attempts++;
             
             const statusRes = await fetch(\`https://queue.fal.run/\${modelPath}/requests/\${requestId}/status\`, {
                headers: {
                  'Authorization': \`Key \${falApiKey.trim()}\`
                }
             });
             
             if (!statusRes.ok) continue; // ignore transient errors
             
             const statusJson: any = await statusRes.json();
             if (statusJson.status === 'COMPLETED') {
                 // Fetch the actual result
                 const resultRes = await fetch(\`https://queue.fal.run/\${modelPath}/requests/\${requestId}\`, {
                    headers: { 'Authorization': \`Key \${falApiKey.trim()}\` }
                 });
                 if (resultRes.ok) {
                     const resultJson: any = await resultRes.json();
                     const videoUrl = resultJson?.video?.url || resultJson?.video_url || resultJson?.output?.[0] || resultJson?.file?.url;
                     if (videoUrl) return videoUrl;
                 }
                 throw new Error("Failed to extract video URL from completed request.");
             } else if (statusJson.status === 'IN_PROGRESS' || statusJson.status === 'IN_QUEUE') {
                 console.log(\`[FAL.AI] \${requestId} status: \${statusJson.status} (Attempt \${attempts})\`);
             } else {
                 throw new Error(\`Queue returned failure status: \${statusJson.status}\`);
             }
          }
          throw new Error("Polling timeout exceeded 10 minutes.");
        } else {`;

if (code.includes(targetStr) && code.includes(targetHandleStr)) {
  code = code.replace(targetStr, replaceStr);
  code = code.replace(targetHandleStr, replaceHandleStr);
  fs.writeFileSync('src/server/providers/FalVideoAdapter.ts', code);
  console.log('Successfully patched FalVideoAdapter.ts for queue polling');
} else {
  console.log('Target strings not found in FalVideoAdapter.ts');
}
