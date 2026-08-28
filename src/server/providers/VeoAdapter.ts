import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { ProviderStatus, Scene } from "../../shared/types";
import { VideoGenerationProvider } from "./VideoProvider";
import { FounderService } from "../fcc/FounderService";

export class VeoAdapter implements VideoGenerationProvider {
  name = 'Google Veo 3.1 (DeepMind Video AI)';
  isMock = false;

  async getStatus(): Promise<ProviderStatus> {
    const apiKey = FounderService.getVeoConfig().apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) return 'NOT_CONFIGURED';
    return 'READY';
  }

  async generateScene(scene: Scene, context: string, onProgress?: (msg: string) => void): Promise<string> {
    const apiKey = FounderService.getVeoConfig().apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY tidak terdeteksi. Silakan atur GEMINI_API_KEY di Settings > Secrets untuk menggunakan Google Veo.");
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const isVertical = Boolean(
      scene.promptImageToVideo?.includes('9:16') ||
      scene.visualDirection?.includes('9:16') ||
      scene.visualDirection?.includes('TikTok') ||
      scene.visualDirection?.includes('Shorts') ||
      scene.visualDirection?.includes('Reels') ||
      context.includes('AFFILIATE') ||
      context.includes('VERTICAL')
    );

    const aspectRatio: '16:9' | '9:16' = isVertical ? '9:16' : '16:9';
    const promptText = scene.promptImageToVideo || scene.visualDirection || 'Cinematic realistic high resolution motion scene';
    
    console.log(`[Google Veo 3.1] Menghubungi API Google Veo untuk Adegan ${scene.id || 'Scene'}...`);
    console.log(`[Google Veo 3.1] Prompt: "${promptText.substring(0, 150)}..." | AspectRatio: ${aspectRatio}`);
    onProgress?.(`Menghubungkan ke engine Google Veo 3.1 (${aspectRatio})...`);

    // Check if starting image exists (Base64 or URL)
    let imageData: { imageBytes: string; mimeType: string } | undefined = undefined;
    if (scene.imageUrl && typeof scene.imageUrl === 'string') {
      try {
        if (scene.imageUrl.startsWith('data:image/')) {
          const parts = scene.imageUrl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          const imageBytes = parts[1];
          if (imageBytes && imageBytes.length > 50) {
            imageData = { imageBytes, mimeType };
          }
        } else if (scene.imageUrl.startsWith('/api/images/')) {
          // Local image
          const filename = scene.imageUrl.split('/').pop();
          if (filename) {
            const filepath = path.join(process.cwd(), 'public', 'images', filename);
            if (fs.existsSync(filepath)) {
              const buffer = fs.readFileSync(filepath);
              const ext = path.extname(filename).toLowerCase();
              const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
              imageData = { imageBytes: buffer.toString('base64'), mimeType };
            }
          }
        } else if (scene.imageUrl.startsWith('http')) {
          // External URL
          const imgRes = await fetch(scene.imageUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const contentType = imgRes.headers.get('content-type') || 'image/png';
            imageData = { imageBytes: buffer.toString('base64'), mimeType: contentType };
          }
        }
      } catch (err) {
        console.warn(`[Google Veo 3.1] Gagal memuat gambar referensi, menggunakan mode text-to-video. Detail:`, err);
      }
    }

    const modelName = FounderService.getVeoModel() || process.env.VEO_MODEL || 'veo-3.1-generate-preview';

    try {
      console.log(`[Google Veo 3.1] Mengirim payload ke model '${modelName}' (Image-to-Video mode: ${imageData ? 'YES' : 'Text-to-Video'})...`);
      onProgress?.(`Mengirim permintaan render video ke Google DeepMind (${modelName})...`);

      let operation: any;
      try {
        operation = await ai.models.generateVideos({
          model: modelName,
          prompt: promptText,
          image: imageData ? {
            imageBytes: imageData.imageBytes,
            mimeType: imageData.mimeType,
          } : undefined,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
          }
        });
      } catch (sdkErr: any) {
        const sdkMsg = sdkErr?.message || String(sdkErr);
        console.error('[Google Veo 3.1] SDK Call Error:', sdkMsg);
        
        // Handle 401 Unauthorized specifically
        if (sdkMsg.includes('401') || sdkMsg.includes('Unauthorized') || sdkMsg.includes('API_KEY_INVALID') || sdkMsg.includes('API key not valid')) {
          throw new Error(`[Google Veo 3.1] Autentikasi Gagal (401 Unauthorized / Invalid API Key). Pastikan GEMINI_API_KEY yang valid telah diatur di Settings > Secrets dan memiliki akses ke model Google Ve.`);
        }
        
        // Handle 429 Resource Exhausted / Quota
        if (sdkMsg.includes('429') || sdkMsg.includes('RESOURCE_EXHAUSTED') || sdkMsg.includes('Quota exceeded')) {
          throw new Error(`[Google Veo 3.1] Kuota atau kapasitas render Google Veo sedang padat (429 RESOURCE_EXHAUSTED). Silakan coba beberapa saat lagi atau periksa saldo billing Google AI Studio.`);
        }

        throw sdkErr;
      }

      if (!operation || !operation.name) {
        throw new Error("Gagal memulai task Google Veo: Operation name tidak ditemukan dari response API.");
      }

      const operationName = operation.name;
      console.log(`[Google Veo 3.1] Task berhasil dibuat: ${operationName}. Menunggu proses render video Google Cloud...`);
      onProgress?.(`Proses render AI sedang berlangsung di Google Cloud...`);

      // Polling loop for video generation (up to 4 minutes)
      const maxAttempts = 48; // 48 * 5s = 240 seconds
      let completedOperation: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        try {
          const op = new GenerateVideosOperation();
          op.name = operationName;
          const updated = await ai.operations.getVideosOperation({ operation: op });

          console.log(`[Google Veo 3.1] Polling [${attempt}/${maxAttempts}] - Status done: ${updated.done}`);
          if (attempt % 3 === 0) {
            onProgress?.(`Merender frame video Veo (${attempt * 5}s)...`);
          }

          if (updated.done) {
            if (updated.error) {
              throw new Error(`Google Veo Generation Error: ${JSON.stringify(updated.error)}`);
            }
            completedOperation = updated;
            break;
          }
        } catch (pollErr: any) {
          console.warn(`[Google Veo 3.1] Polling retry notice (${attempt}):`, pollErr?.message || pollErr);
        }
      }

      if (!completedOperation || !completedOperation.done) {
        throw new Error("Waktu tunggu render video Google Veo melebihi batas waktu (timeout).");
      }

      const videoUri = completedOperation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) {
        throw new Error("Video URI tidak ditemukan pada response akhir Google Veo.");
      }

      console.log(`[Google Veo 3.1] Video selesai diproses di Google Cloud! Mengunduh video dari URI...`);
      onProgress?.(`Mengunduh hasil video MP4...`);

      // Download the video stream with authorization header
      const videoRes = await fetch(videoUri, {
        headers: { 'x-goog-api-key': apiKey },
      });

      if (!videoRes.ok) {
        throw new Error(`Gagal mengunduh file video dari Google Cloud (HTTP ${videoRes.status})`);
      }

      const buffer = Buffer.from(await videoRes.arrayBuffer());
      const outputDir = path.join(process.cwd(), 'public', 'videos');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const fileName = `veo_${Date.now()}_${(scene.id || 'scene').replace(/[^a-zA-Z0-9]/g, '')}.mp4`;
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, buffer);

      console.log(`[Google Veo 3.1] File MP4 asli berhasil disimpan ke lokal: ${fileName} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
      return `/api/videos/${fileName}`;

    } catch (veoErr: any) {
      const errMsg = veoErr?.message || String(veoErr);
      console.error(`[Google Veo 3.1] API Error:`, errMsg);
      if (
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('prepayment credits') ||
        errMsg.includes('depleted') ||
        errMsg.includes('429')
      ) {
        throw new Error(`[Google Veo 3.1] Kredit / Kuota API Google Gemini Anda telah habis (429 RESOURCE_EXHAUSTED). Silakan lakukan top-up prepayment billing di Google AI Studio (https://ai.studio/projects) atau periksa GEMINI_API_KEY di menu Settings.`);
      }
      if (errMsg.includes('401') || errMsg.includes('Unauthorized') || errMsg.includes('API_KEY_INVALID')) {
        throw new Error(`[Google Veo 3.1] Kunci API Google Gemini (GEMINI_API_KEY) tidak valid atau tidak memiliki akses (401 Unauthorized). Silakan periksa GEMINI_API_KEY di menu Settings > Secrets.`);
      }
      throw new Error(`Google Veo Generation Failed: ${errMsg}`);
    }
  }
}

