const fs = require('fs');
let content = fs.readFileSync('server/imageService.ts', 'utf8');

const targetStr = `    const throwApiError = () => {
      console.log(\`[Image Synthesis Engine] All configured API models failed or API key exhausted.\`);
      throw new Error("Gagal generate gambar — kuota API sedang bermasalah atau error dari penyedia layanan AI. Silakan coba lagi nanti.");
    };`;

const engineBlockRegex = /\/\/ Primary & Fallback Engine Execution Flow([\s\S]*?)  \/\*\*/;

const newContent = `    const throwApiError = (engineName = 'utama') => {
      console.log(\`[Image Synthesis Engine] All configured API models failed or API key exhausted.\`);
      throw new Error(\`Gagal generate gambar — Provider \${engineName} dan cadangan gagal. Silakan periksa koneksi/API key Anda dan coba lagi.\`);
    };

    // Primary & Fallback Engine Execution Flow
    if (preferredEngine === 'fal') {
      const falResult = await runFalImage();
      if (falResult) return falResult;

      // Check if Fal.ai quota/token was exhausted
      if (falQuotaErrorOccurred) {
        if (onLog) onLog(\`[ERROR] \${falQuotaErrorMessage || 'Provider utama (Fal.ai) sedang bermasalah'}\`, 'ERROR');
        throw new Error(\`[NANO_QUOTA_EXHAUSTED] \${falQuotaErrorMessage || 'Gagal generate gambar — kuota API (Fal.ai) sedang bermasalah, silakan coba lagi nanti.'}\`);
      }

      if (onLog) onLog('Provider utama (Fal.ai) gagal. Mencoba provider cadangan (Gemini)...', 'WARN');
      const bananaResult = await runGeminiBanana();
      if (bananaResult) {
        if (onLog) onLog('Gambar berhasil digenerate menggunakan provider cadangan (Gemini)', 'SUCCESS');
        return bananaResult;
      }

      if (onLog) onLog('Provider cadangan (Gemini) juga gagal. Mencoba provider cadangan (OpenAI)...', 'WARN');
      const gptResult = await runGptImage2();
      if (gptResult) {
        if (onLog) onLog('Gambar berhasil digenerate menggunakan provider cadangan (OpenAI)', 'SUCCESS');
        return gptResult;
      }

      return throwApiError('Fal.ai');
    } else if (preferredEngine === 'chatgpt-image-2') {
      const gptResult = await runGptImage2();
      if (gptResult) return gptResult;

      if (onLog) onLog('Provider utama (OpenAI) gagal. Mencoba provider cadangan (Fal.ai)...', 'WARN');
      const falResult = await runFalImage();
      if (falResult) {
        if (onLog) onLog('Gambar berhasil digenerate menggunakan provider cadangan (Fal.ai)', 'SUCCESS');
        return falResult;
      }

      if (onLog) onLog('Provider cadangan (Fal.ai) juga gagal. Mencoba provider cadangan (Gemini)...', 'WARN');
      const bananaResult = await runGeminiBanana();
      if (bananaResult) {
        if (onLog) onLog('Gambar berhasil digenerate menggunakan provider cadangan (Gemini)', 'SUCCESS');
        return bananaResult;
      }

      return throwApiError('OpenAI');
    } else if (preferredEngine === 'gemini-imagen-3' || preferredEngine === 'gemini-banana') {
      const bananaResult = await runGeminiBanana();
      if (bananaResult) return bananaResult;

      if (onLog) onLog('Provider utama (Gemini) gagal. Mencoba provider cadangan (Fal.ai)...', 'WARN');
      const falResult = await runFalImage();
      if (falResult) {
        if (onLog) onLog('Gambar berhasil digenerate menggunakan provider cadangan (Fal.ai)', 'SUCCESS');
        return falResult;
      }

      if (onLog) onLog('Provider cadangan (Fal.ai) juga gagal. Mencoba provider cadangan (OpenAI)...', 'WARN');
      const gptResult = await runGptImage2();
      if (gptResult) {
        if (onLog) onLog('Gambar berhasil digenerate menggunakan provider cadangan (OpenAI)', 'SUCCESS');
        return gptResult;
      }

      return throwApiError('Gemini');
    } else {
      const falResult = await runFalImage();
      if (falResult) return falResult;

      if (onLog) onLog('Provider utama gagal. Mencoba provider cadangan (Gemini)...', 'WARN');
      const bananaResult = await runGeminiBanana();
      if (bananaResult) return bananaResult;

      if (onLog) onLog('Provider cadangan (Gemini) juga gagal. Mencoba provider cadangan (OpenAI)...', 'WARN');
      const gptResult = await runGptImage2();
      if (gptResult) return gptResult;

      return throwApiError('Default');
    }
  }

  /**`;

content = content.replace(targetStr, '');
content = content.replace(engineBlockRegex, newContent);

fs.writeFileSync('server/imageService.ts', content);
