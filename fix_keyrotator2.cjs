const fs = require('fs');
let content = fs.readFileSync('server/keyRotator.ts', 'utf8');

const newExecute = `  public async executeGeminiWithRotation<T>(
    operation: (ai: GoogleGenAI, apiKey: string) => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const apiKey = this.getNextGeminiKey();
      if (!apiKey) {
        if (lastError) {
          throw lastError; // If we already tried and failed, throw the actual API error
        }
        throw new Error("Token API habis atau tidak ada API Key Gemini yang aktif. Silakan isi GEMINI_API_KEY di .env");
      }

      // If the key we got is currently in cooldown (fallback), we should wait until it's ready if possible
      const map = this.getMap('gemini');
      const health = map.get(apiKey);
      if (health && health.status === 'COOLDOWN' && health.cooldownUntil) {
          const waitMs = health.cooldownUntil - Date.now();
          if (waitMs > 0 && waitMs < 25000) { // Only wait if it's less than 25s to avoid huge hangups
              console.log(\`[KeyRotator] Fallback key is on cooldown. Waiting \${waitMs}ms before reusing...\`);
              await new Promise(r => setTimeout(r, waitMs));
          }
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

      try {
        const result = await operation(ai, apiKey);
        return result;
      } catch (err: any) {
        lastError = err;
        
        let errMsg = '';
        if (err && typeof err === 'object') {
            errMsg = err.message || (err.error && err.error.message) || JSON.stringify(err);
        } else {
            errMsg = String(err);
        }

        console.warn(\`[KeyRotator] Gemini attempt \${attempt}/\${maxAttempts} failed on key (\${this.maskKey(apiKey)}): \${errMsg}\`);
        this.reportKeyError('gemini', apiKey, err);

        const isTransient = errMsg.includes('429') || 
                            errMsg.toLowerCase().includes('resource_exhausted') ||
                            errMsg.includes('500') ||
                            errMsg.includes('503') ||
                            errMsg.toLowerCase().includes('fetch failed');

        if (!isTransient) {
          throw err;
        }
        
        // If it's the last attempt, don't loop
        if (attempt >= maxAttempts) {
            throw err;
        }
      }
    }

    throw lastError || new Error("Gagal mengeksekusi request setelah rotasi API Key.");
  }`;

content = content.replace(/  public async executeGeminiWithRotation[\s\S]*?throw lastError \|\| new Error\("Gagal mengeksekusi request setelah rotasi API Key\."\);\n  \}/, newExecute);

fs.writeFileSync('server/keyRotator.ts', content);
