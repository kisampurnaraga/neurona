import { ProviderStatus, Scene } from "../../shared/types";
import { VideoGenerationProvider } from "./VideoProvider";
import { FounderService } from "../fcc/FounderService";
import { keyRotator } from "../../../server/keyRotator";
import { GoogleGenAI } from "@google/genai";
import fetch from "node-fetch";

export class GoogleVeoAdapter implements VideoGenerationProvider {
  name = 'Google Veo Video Engine (Asli)';
  isMock = false;

  async getStatus(): Promise<ProviderStatus> {
    const veoConfig = FounderService.getVeoConfig();
    const apiKey = veoConfig.apiKey || keyRotator.getNextVeoKey() || process.env.VEO_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return 'NOT_CONFIGURED';

    try {
      const endpoint = veoConfig.endpoint || 'https://generativelanguage.googleapis.com/v1beta';
      const baseUrl = endpoint.replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/models?key=${apiKey.trim()}`);
      if (res.status === 401 || res.status === 403) {
        return 'NOT_CONFIGURED';
      }
      if (res.status >= 500) {
        return 'ERROR';
      }
      return 'READY';
    } catch (err) {
      return 'UNAVAILABLE';
    }
  }

  async generateScene(scene: Scene, context: string, onProgress?: (msg: string) => void): Promise<string> {
    const veoConfig = FounderService.getVeoConfig();
    const apiKey = veoConfig.apiKey || keyRotator.getNextVeoKey() || process.env.VEO_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(`[VEO_API_KEY_MISSING] API Key Google Veo (Asli) belum dikonfigurasi di Pengaturan Founder atau Key Rotator.`);
    }

    const videoModelId = (scene as any).videoModel || veoConfig.model || 'veo-2.0-generate-001';
    let targetVeoModel = 'veo-2.0-generate-001';
    if (videoModelId.includes('3.0') || videoModelId.includes('pro')) {
      targetVeoModel = 'veo-2.0-generate-001'; // Default stable Veo 2.0
    }

    const promptText = scene.promptImageToVideo || scene.promptTextToImage || scene.visualDirection || 'High quality cinematic video scene';

    if (onProgress) onProgress(`Rendering scene with Google Veo (${targetVeoModel})...`);
    console.log(`[GOOGLE VEO ADAPTER] Rendering scene using model: ${targetVeoModel}`);

    try {
      const isOAuth = apiKey.trim().startsWith('ya29.') || apiKey.trim().startsWith('AQ.');
      let ai: GoogleGenAI;
      if (isOAuth) {
        const tempKey = process.env.GEMINI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        ai = new GoogleGenAI({ 
          apiKey: undefined, 
          httpOptions: { headers: { 'User-Agent': 'aistudio-build', 'Authorization': `Bearer ${apiKey.trim()}` } } 
        });
        if (tempKey) process.env.GEMINI_API_KEY = tempKey;
      } else {
        ai = new GoogleGenAI({ apiKey: apiKey.trim(), httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      }
      
      const operation = await ai.models.generateVideos({
        model: targetVeoModel,
        prompt: promptText,
        config: {
          aspectRatio: (scene as any).aspectRatio === '16:9' ? '16:9' : '9:16',
          numberOfVideos: 1
        }
      });

      let currentOp = operation;
      let attempts = 0;
      const maxAttempts = 60; // Up to 5 minutes

      while (!currentOp.done && attempts < maxAttempts) {
        attempts++;
        if (onProgress) onProgress(`Google Veo processing video (${attempts * 5}s)...`);
        await new Promise((r) => setTimeout(r, 5000));
        if (currentOp.name) {
          currentOp = await ai.operations.getVideosOperation({ operation: currentOp });
        }
      }

      if (currentOp.error) {
        throw new Error(`Google Veo Error: ${currentOp.error.message || JSON.stringify(currentOp.error)}`);
      }

      const generated = currentOp.response?.generatedVideos?.[0];
      const videoUri = generated?.video?.uri;

      if (!videoUri) {
        throw new Error(`Google Veo did not return a valid video URI.`);
      }

      return videoUri;
    } catch (err: any) {
      console.error(`[GOOGLE VEO ADAPTER] Error generating scene video:`, err.message);
      keyRotator.reportKeyError('veo', apiKey, err);
      throw new Error(`[GOOGLE_VEO_ERROR] Gagal render Google Veo (${targetVeoModel}): ${err.message}`);
    }
  }
}

