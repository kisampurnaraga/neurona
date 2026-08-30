const fs = require('fs');
let content = fs.readFileSync('server/falQueueRunner.ts', 'utf8');

// Replace the extraction logic in falQueueRunner.ts
const oldExtract = `const videoUrl = resultJson?.video?.url || resultJson?.video_url || resultJson?.output?.[0] || resultJson?.file?.url;
          if (videoUrl) {
            console.log(\`[FAL QUEUE RUNNER] Video generated successfully for \${modelPath}: \${videoUrl}\`);
            return videoUrl;
          }
        }
        throw new Error(\`[FAL.AI] Generation COMPLETED but failed to extract video URL from response payload.\`);`;

const newExtract = `const videoUrl = resultJson?.video?.url || resultJson?.video_url || resultJson?.url || resultJson?.file?.url || (Array.isArray(resultJson?.output) ? (resultJson.output[0]?.url || resultJson.output[0]) : resultJson?.output?.url) || (typeof resultJson?.output === 'string' ? resultJson.output : null);
          if (videoUrl && typeof videoUrl === 'string') {
            console.log(\`[FAL QUEUE RUNNER] Video generated successfully for \${modelPath}: \${videoUrl}\`);
            return videoUrl;
          }
        }
        throw new Error(\`[FAL.AI] Generation COMPLETED but failed to extract video URL from response payload. Payload keys: \${Object.keys(resultJson || {}).join(',')}. Payload: \${JSON.stringify(resultJson).substring(0, 300)}\`);`;

content = content.replace(oldExtract, newExtract);

// Do the same for the sync response case
const oldSyncExtract = `const directVideoUrl = queueJson?.video?.url || queueJson?.video_url || queueJson?.output?.[0] || queueJson?.file?.url;
  if (directVideoUrl && !requestId) {`;

const newSyncExtract = `const directVideoUrl = queueJson?.video?.url || queueJson?.video_url || queueJson?.url || queueJson?.file?.url || (Array.isArray(queueJson?.output) ? (queueJson.output[0]?.url || queueJson.output[0]) : queueJson?.output?.url) || (typeof queueJson?.output === 'string' ? queueJson.output : null);
  if (directVideoUrl && typeof directVideoUrl === 'string' && !requestId) {`;

content = content.replace(oldSyncExtract, newSyncExtract);

fs.writeFileSync('server/falQueueRunner.ts', content);
