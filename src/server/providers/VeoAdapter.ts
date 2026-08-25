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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return 'NOT_CONFIGURED';
    return 'READY';
  }

  async generateScene(scene: Scene, context: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY tidak terdeteksi. Silakan atur GEMINI_API_KEY untuk menggunakan Google Veo.");
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

    // Check if starting image exists (Base64 or URL)
    let imageData: { imageBytes: string; mimeType: string } | undefined = undefined;
    if (scene.imageUrl && typeof scene.imageUrl === 'string') {
      if (scene.imageUrl.startsWith('data:image/')) {
        const parts = scene.imageUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const imageBytes = parts[1];
        if (imageBytes && imageBytes.length > 50) {
          imageData = { imageBytes, mimeType };
        }
      }
    }

    const modelName = FounderService.getVeoModel() || process.env.VEO_MODEL || 'veo-3.1-generate-preview';

    try {
      console.log(`[Google Veo 3.1] Mengirim payload ke model '${modelName}' (Image-to-Video mode: ${imageData ? 'YES' : 'Text-to-Video'})...`);
      
      const payload: any = {
        model: modelName,
        prompt: promptText,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio,
        }
      };

      if (imageData) {
        payload.image = imageData;
      }

      let operation = await ai.models.generateVideos(payload);

      if (!operation || !operation.name) {
        throw new Error("Gagal memulai task Google Veo: Operation name tidak ditemukan dari response API.");
      }

      const operationName = operation.name;
      console.log(`[Google Veo 3.1] Task berhasil dibuat: ${operationName}. Menunggu proses render video Google Cloud...`);

      // Polling loop for video generation (up to 3-4 minutes)
      const maxAttempts = 60;
      let completedOperation: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        try {
          const op = new GenerateVideosOperation();
          op.name = operationName;
          const updated = await ai.operations.getVideosOperation({ operation: op });

          console.log(`[Google Veo 3.1] Polling [${attempt}/${maxAttempts}] - Status done: ${updated.done}`);

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

      console.log(`[Google Veo 3.1] Video selesai diproses di Google Cloud! Mengunduh video dari URI: ${videoUri.substring(0, 80)}...`);

      // Download the video stream with authorization header
      const videoRes = await fetch(videoUri, {
        headers: { 'x-goog-api-key': apiKey },
      });

      if (!videoRes.ok) {
        throw new Error(`Gagal mengunduh file video dari Google Cloud (HTTP ${videoRes.status})`);
      }

      const buffer = await videoRes.buffer();
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
      throw new Error(`Google Veo Generation Failed: ${errMsg}`);
    }
  }
}
