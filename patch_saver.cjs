const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const targetCode = `    } else if (urlOrData.startsWith('http://') || urlOrData.startsWith('https://')) {
      console.log(\`[LocalSaver] Downloading external asset with retries from \${urlOrData} ...\`);
      const response = await fetchWithRetry(urlOrData);
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }`;

const replacementCode = `    } else if (urlOrData.startsWith('http://') || urlOrData.startsWith('https://')) {
      let downloadUrl = urlOrData;
      const fetchHeaders: any = {};
      
      // Inject Google API Key if it's a Google Generative AI File URI
      if (downloadUrl.includes('generativelanguage.googleapis.com')) {
         const apiKey = process.env.VEO_API_KEY || process.env.GEMINI_API_KEY || '';
         if (apiKey && !downloadUrl.includes('key=')) {
             fetchHeaders['x-goog-api-key'] = apiKey;
             console.log(\`[LocalSaver] Injecting API Key for Google Generative AI asset download.\`);
         }
      }

      console.log(\`[LocalSaver] Downloading external asset with retries from \${downloadUrl} ...\`);
      
      // We must pass headers to fetchWithRetry! Wait, fetchWithRetry doesn't support headers.
      // Let's do a custom fetch here with retries.
      let response = null;
      for (let i = 0; i < 3; i++) {
        try {
          response = await fetch(downloadUrl, { headers: fetchHeaders });
          if (response.ok) break;
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        } catch (err) {
          if (i === 2) throw err;
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
      }
      
      if (!response || !response.ok) {
         throw new Error(\`Failed to download external asset after 3 retries: \${downloadUrl}\`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }`;

if (code.includes(targetCode)) {
  code = code.replace(targetCode, replacementCode);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
}
