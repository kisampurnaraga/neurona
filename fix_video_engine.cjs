const fs = require('fs');
let content = fs.readFileSync('server/services/queueService.ts', 'utf8');

const oldTargetModel = `      const targetModelId = modelId || FounderService.getFalConfig()?.model || FAL_TIER_DEFAULTS.balanced;`;

const newTargetModel = `      const targetModelId = modelId || FounderService.getFalConfig()?.model || FAL_TIER_DEFAULTS.balanced;
      
      let videoUrl: string = '';
      if (targetModelId === 'veo-asli') {
        const bananaConfig = FounderService.getGeminiBananaConfig();
        const apiKey = bananaConfig.apiKey;
        if (!apiKey) throw new Error('API Key Google Gemini Banana Config kosong (Founder Settings).');
        
        console.log(\`[Worker] Using Google Veo Asli engine via @google/genai\`);
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        // NOTE: Google's generateContent doesn't natively do text-to-video for Veo yet via typical SDK endpoints without specific alpha configs, 
        // but we'll map this to use the Veo API format. Wait, let's use Fal's Veo endpoint if Google's native isn't exposed, but wait, the user asked for Google resmi. 
        // We will make a direct fetch to the Google AI Studio REST API or use SDK if available.
        // Actually, just pass to Fal's Veo for now but labeled as Veo Asli? No, user explicitly said "Nano Asli" using Google Gemini Banana config.
      }`;

// Wait, I should look closer at the user's prompt.
// "sekarang di dropwdown model generate gambar dan video tambahkan jalur ke Image Banana Resmi google kasih nama aja (nano-asli) dan untuk generate video tambahkan dropdownnya (veo-asli) . Nanti Pipelinenya gunakan setting di founder untuk image dan video ya. Bisa kan tanpa merusak Pipeline fal.ai?"
