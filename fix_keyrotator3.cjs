const fs = require('fs');
let content = fs.readFileSync('server/keyRotator.ts', 'utf8');

const newReportKeyError = `  public reportKeyError(provider: 'gemini' | 'openai' | 'fal', key: string, error: any): void {
    const map = this.getMap(provider);
    const health = map.get(key);
    if (!health) return;

    health.totalErrors++;
    
    // Better error parsing
    let errMsg = '';
    if (error && typeof error === 'object') {
        errMsg = error.message || (error.error && error.error.message) || JSON.stringify(error);
    } else {
        errMsg = String(error);
    }
    health.lastErrorReason = errMsg;

    const isDepleted = errMsg.toLowerCase().includes('prepayment credits are depleted');
    
    const isRateLimit = !isDepleted && (errMsg.includes('429') || 
                        errMsg.toLowerCase().includes('resource_exhausted') || 
                        errMsg.toLowerCase().includes('rate limit') ||
                        errMsg.toLowerCase().includes('quota') ||
                        errMsg.includes('503') ||
                        errMsg.toLowerCase().includes('unavailable') ||
                        errMsg.toLowerCase().includes('high demand'));

    const isInvalid = isDepleted || errMsg.includes('401') || 
                      errMsg.includes('403') || 
                      errMsg.toLowerCase().includes('api_key_invalid') || 
                      errMsg.toLowerCase().includes('invalid api key') ||
                      errMsg.toLowerCase().includes('unauthenticated');

    if (isInvalid) {
      health.status = 'DISABLED';
      console.error(\`[KeyRotator] \${provider.toUpperCase()} Key (\${health.maskedKey}) marked as DISABLED due to auth failure: \${errMsg}\`);
    } else if (isRateLimit) {
      if (health.status !== 'DISABLED') {
        let cooldownMs = 60 * 1000; // default 60s cooldown
        const match = errMsg.match(/retry in ([0-9.]+)s/);
        if (match && match[1]) {
            const parsedDelay = parseFloat(match[1]) * 1000;
            if (!isNaN(parsedDelay) && parsedDelay > 0) {
                cooldownMs = parsedDelay + 1000; // Add 1s buffer
            }
        }
        health.status = 'COOLDOWN';
        health.cooldownUntil = Date.now() + cooldownMs;
        console.warn(\`[KeyRotator] \${provider.toUpperCase()} Key (\${health.maskedKey}) hit Rate Limit/Quota. Put on COOLDOWN for \${(cooldownMs/1000).toFixed(1)}s.\`);
      }
    }
  }`;

content = content.replace(/  public reportKeyError\([\s\S]*?    \}\n  \}/, newReportKeyError);

fs.writeFileSync('server/keyRotator.ts', content);
