const fs = require('fs');
let code = fs.readFileSync('src/server/providers/FalVideoAdapter.ts', 'utf8');

const targetStr = `  async getStatus(): Promise<ProviderStatus> {
    const falApiKey = keyRotator.getNextFalKey();
    if (!falApiKey) return 'NOT_CONFIGURED';
    return 'READY';
  }`;

const replaceStr = `  async getStatus(): Promise<ProviderStatus> {
    const falApiKey = keyRotator.getNextFalKey();
    if (!falApiKey) return 'NOT_CONFIGURED';
    
    // Perform a lightweight check to see if the provider is returning 5xx
    try {
      // Just check the base fal endpoint or a lightweight status check if available.
      // We will ping queue.fal.run without payload to check for 5xx
      const res = await fetch('https://queue.fal.run/fal-ai/minimax-video', {
        method: 'POST',
        headers: {
          'Authorization': \`Key \${falApiKey.trim()}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Intentionally empty to get a 400 or 422, not 5xx
      });
      if (res.status >= 500) {
        return 'ERROR';
      }
      return 'READY';
    } catch (err) {
      return 'OFFLINE';
    }
  }`;

if (code.includes('if (!falApiKey) return \'NOT_CONFIGURED\';')) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/server/providers/FalVideoAdapter.ts', code);
  console.log('Updated FalVideoAdapter getStatus');
} else {
  console.log('Could not find target string');
}
