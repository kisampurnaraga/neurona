const fs = require('fs');
let content = fs.readFileSync('server/falQueueRunner.ts', 'utf8');

const oldLogic = `        if (resResult.ok) {
          const resultJson: any = await resResult.json();
          const videoUrl = resultJson?.video?.url || resultJson?.video_url || resultJson?.url || resultJson?.file?.url || (Array.isArray(resultJson?.output) ? (resultJson.output[0]?.url || resultJson.output[0]) : resultJson?.output?.url) || (typeof resultJson?.output === 'string' ? resultJson.output : null);
          if (videoUrl && typeof videoUrl === 'string') {
            console.log(\`[FAL QUEUE RUNNER] Video generated successfully for \${modelPath}: \${videoUrl}\`);
            return videoUrl;
          }
        }
        throw new Error(\`[FAL.AI] Generation COMPLETED but failed to extract video URL from response payload. Payload keys: \${Object.keys(resultJson || {}).join(',')}. Payload: \${JSON.stringify(resultJson).substring(0, 300)}\`);`;

const newLogic = `        if (resResult.ok) {
          const resultJson: any = await resResult.json();
          const videoUrl = resultJson?.video?.url || resultJson?.video_url || resultJson?.url || resultJson?.file?.url || (Array.isArray(resultJson?.output) ? (resultJson.output[0]?.url || resultJson.output[0]) : resultJson?.output?.url) || (typeof resultJson?.output === 'string' ? resultJson.output : null);
          if (videoUrl && typeof videoUrl === 'string') {
            console.log(\`[FAL QUEUE RUNNER] Video generated successfully for \${modelPath}: \${videoUrl}\`);
            return videoUrl;
          }
          throw new Error(\`[FAL.AI] Generation COMPLETED but failed to extract video URL. Payload keys: \${Object.keys(resultJson || {}).join(',')}. Payload: \${JSON.stringify(resultJson).substring(0, 300)}\`);
        } else {
          const errText = await resResult.text();
          throw new Error(\`[FAL.AI] Generation COMPLETED but failed to fetch responseUrl (\${resResult.status}). Body: \${errText}\`);
        }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server/falQueueRunner.ts', content);
