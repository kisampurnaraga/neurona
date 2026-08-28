import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import os from "os";
import { StorageService } from "./storageService";
import { FounderService } from "../../src/server/fcc/FounderService";

export interface VeoOptions {
  model?: string;
  aspectRatio?: '9:16' | '16:9';
  durationSeconds?: number;
  resolution?: '720p' | '1080p';
  numberOfVideos?: number;
  personGeneration?: 'allow_adult' | 'dont_allow';
  fps?: number;
  uploadToStorage?: boolean;
}

export interface VeoRenderResult {
  success: boolean;
  videoUrl: string;
  localFilePath?: string;
  operationName?: string;
  duration?: number;
  aspectRatio?: string;
  modelUsed: string;
  fallbackUsed?: boolean;
  notice?: string;
}

/**
 * Service Handler for Google Veo Video Generation (via @google/genai SDK)
 */
export class GoogleVeoService {
  private static getAIClient(apiKey?: string): GoogleGenAI {
    const key = apiKey || FounderService.getVeoConfig().apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is missing. Real Veo generation requires a valid API key.");
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  /**
   * Generates a video using Google Veo model with optional reference image (Product Lock)
   * @param promptText Descriptive prompt for scene motion & cinematography
   * @param referenceImageUrl Optional base64 or URL image for image-to-video conditioning
   * @param options Aspect ratio, resolution, duration, etc.
   */
  public static async generateVeoVideo(
    promptText: string,
    referenceImageUrl?: string,
    options: VeoOptions = {}
  ): Promise<VeoRenderResult> {
    const apiKey = FounderService.getVeoConfig().apiKey || process.env.GEMINI_API_KEY;
    const aspectRatio: '9:16' | '16:9' = options.aspectRatio || '9:16';
    const resolution = options.resolution || '720p';
    const modelName = options.model || FounderService.getVeoModel() || process.env.VEO_MODEL || 'veo-3.1-generate-preview';
    
    console.log(`[GoogleVeoService] Starting Veo render with prompt: "${promptText.substring(0, 100)}..."`);
    console.log(`[GoogleVeoService] Config: AspectRatio=${aspectRatio}, Resolution=${resolution}, Model=${modelName}`);

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Real Veo generation requires a valid API key in Settings > Secrets.");
    }

    try {
      const ai = this.getAIClient(apiKey);

      // Process reference image for Image-to-Video (Product Lock)
      let imageData: { imageBytes: string; mimeType: string } | undefined = undefined;
      
      if (referenceImageUrl && typeof referenceImageUrl === 'string' && referenceImageUrl.trim().length > 0) {
        if (referenceImageUrl.startsWith('data:image/')) {
          const parts = referenceImageUrl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          const imageBytes = parts[1];
          if (imageBytes && imageBytes.length > 50) {
            imageData = { imageBytes, mimeType };
            console.log(`[GoogleVeoService] Image-to-Video condition attached (Format: ${mimeType}, Size: ${imageBytes.length} chars)`);
          }
        } else if (referenceImageUrl.startsWith('http://') || referenceImageUrl.startsWith('https://')) {
          try {
            console.log(`[GoogleVeoService] Fetching reference image from URL: ${referenceImageUrl.substring(0, 60)}...`);
            const imgRes = await fetch(referenceImageUrl);
            if (imgRes.ok) {
              const buffer = await imgRes.buffer();
              const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
              imageData = {
                imageBytes: buffer.toString('base64'),
                mimeType
              };
              console.log(`[GoogleVeoService] Downloaded reference image condition (${buffer.length} bytes)`);
            }
          } catch (fetchErr) {
            console.warn('[GoogleVeoService] Failed fetching reference image URL, proceeding with Text-to-Video:', fetchErr);
          }
        }
      }

      console.log(`[GoogleVeoService] Preparing video generation request to Google Veo API (${modelName})...`);
      
      let operation: any;
      try {
        operation = await ai.models.generateVideos({
          model: modelName,
          prompt: promptText,
          image: imageData ? {
            imageBytes: imageData.imageBytes,
            mimeType: imageData.mimeType
          } : undefined,
          config: {
            numberOfVideos: options.numberOfVideos || 1,
            resolution: resolution,
            aspectRatio: aspectRatio,
          }
        });
      } catch (sdkErr: any) {
        const sdkMsg = sdkErr?.message || String(sdkErr);
        if (sdkMsg.includes('401') || sdkMsg.includes('Unauthorized') || sdkMsg.includes('API_KEY_INVALID')) {
          throw new Error(`[Google Veo 3.1] Autentikasi Gagal (401 Unauthorized / Invalid API Key). Pastikan GEMINI_API_KEY yang valid telah diatur di Settings > Secrets.`);
        }
        if (sdkMsg.includes('429') || sdkMsg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error(`[Google Veo 3.1] Kuota atau kapasitas render Google Veo sedang padat (429 RESOURCE_EXHAUSTED). Silakan coba beberapa saat lagi.`);
        }
        throw sdkErr;
      }
      
      if (!operation || !operation.name) {
        throw new Error("Gagal memulai render Google Veo: Operasi tidak mengembalikan operation name.");
      }
      
      const operationName = operation.name;
      console.log(`[GoogleVeoService] Task created: ${operationName}. Waiting for Google Cloud render...`);
      
      // Polling loop for Veo render operation completion
      const maxAttempts = 48; // Max ~4 minutes
      let completedOperation: any = null;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        try {
          const op = new GenerateVideosOperation();
          op.name = operationName;
          const updated = await ai.operations.getVideosOperation({ operation: op });
          
          if (attempt % 3 === 0 || updated.done) {
            console.log(`[GoogleVeoService] Polling [${attempt}/${maxAttempts}] - Done: ${updated.done}`);
          }
          
          if (updated.done) {
            if (updated.error) {
              throw new Error(`Google Veo Error: ${JSON.stringify(updated.error)}`);
            }
            completedOperation = updated;
            break;
          }
        } catch (pollErr: any) {
          console.warn(`[GoogleVeoService] Polling notice (attempt ${attempt}):`, pollErr?.message || pollErr);
        }
      }
      
      if (!completedOperation || !completedOperation.done) {
        throw new Error("Waktu tunggu render video Google Veo melebihi batas (Timeout).");
      }
      
      const videoUri = completedOperation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) {
        throw new Error("Video URI tidak ditemukan pada respon akhir Google Veo.");
      }
      
      console.log(`[GoogleVeoService] Video generated successfully. Downloading stream from: ${videoUri.substring(0, 60)}...`);
      
      // Download the video stream with authorization header
      const videoRes = await fetch(videoUri, {
        headers: { 'x-goog-api-key': apiKey },
      });
      
      if (!videoRes.ok) {
        throw new Error(`Gagal mengunduh file video dari Google Cloud (HTTP ${videoRes.status})`);
      }
      
      const videoBuffer = await videoRes.buffer();
      const tempDir = os.tmpdir();
      const uniqueId = `veo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileName = `${uniqueId}.mp4`;
      const tempFilePath = path.join(tempDir, fileName);
      
      fs.writeFileSync(tempFilePath, videoBuffer);
      console.log(`[GoogleVeoService] Video saved locally: ${tempFilePath} (${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);
      
      // Upload to GCS or fallback to local static serving
      let finalVideoUrl = `/api/videos/${fileName}`;
      if (options.uploadToStorage !== false) {
        finalVideoUrl = await StorageService.uploadToGCS(
          tempFilePath,
          `renders/veo/${fileName}`,
          { contentType: 'video/mp4', isPublic: true }
        );
      }
      
      return {
        success: true,
        videoUrl: finalVideoUrl,
        localFilePath: tempFilePath,
        operationName,
        aspectRatio,
        modelUsed: modelName
      };

    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error(`[GoogleVeoService] Veo API Error:`, errMsg);
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
      throw new Error(`Veo Generation Failed: ${errMsg}`);
    }
  }
}
