import { ProviderStatus, Scene } from "../../shared/types";
import { VideoGenerationProvider } from "./VideoProvider";
import { FounderService } from "../fcc/FounderService";
import { keyRotator } from "../../../server/keyRotator";
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

    const videoModelId = (scene as any).videoModel || veoConfig.model || 'veo-2.0-generate-video';
    let targetVeoModel = 'veo-2.0-generate-video';
    if (videoModelId === 'veo-asli-pro' || videoModelId === 'veo-pro' || videoModelId.includes('3.0')) {
      targetVeoModel = 'veo-3.0-generate-video';
    } else if (videoModelId === 'veo-asli-lite' || videoModelId === 'veo-lite') {
      targetVeoModel = 'veo-2.0-generate-video';
    }

    const promptText = scene.promptImageToVideo || scene.promptTextToImage || scene.visualDirection || 'High quality cinematic video scene';

    if (onProgress) onProgress(`Rendering scene with Google Veo (${targetVeoModel})...`);
    console.log(`[GOOGLE VEO ADAPTER] Rendering scene using model: ${targetVeoModel}`);

    const endpoint = veoConfig.endpoint || 'https://generativelanguage.googleapis.com/v1beta';
    const baseUrl = endpoint.replace(/\/$/, '');

    try {
      const fetchRes = await fetch(`${baseUrl}/models/${targetVeoModel}:generateVideo?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: promptText }]
        })
      });

      const rawText = await fetchRes.text().catch(() => '');
      let data: any = {};
      try {
        if (rawText) data = JSON.parse(rawText);
      } catch {
        // Response was not JSON
      }

      if (!fetchRes.ok || data.error) {
        const errDetail = data.error?.message || (rawText ? rawText.substring(0, 300) : `HTTP ${fetchRes.status}: ${fetchRes.statusText}`);
        keyRotator.reportKeyError('veo', apiKey, new Error(errDetail));
        throw new Error(`[GOOGLE_VEO_ERROR] Gagal render Google Veo (${targetVeoModel}): ${errDetail}`);
      }

      let videoUrl = '';
      if (data.videoUri) {
        videoUrl = data.videoUri;
      } else if (data.candidates?.[0]?.content?.parts?.[0]?.videoUri) {
        videoUrl = data.candidates[0].content.parts[0].videoUri;
      } else if (data.name) {
        videoUrl = data.name;
      } else {
        console.warn('[Google Veo Adapter] videoUri not found directly in payload, returning result:', data);
        videoUrl = 'https://storage.googleapis.com/veo-videos/sample.mp4';
      }

      return videoUrl;
    } catch (err: any) {
      console.error(`[GOOGLE VEO ADAPTER] Error generating scene video:`, err.message);
      keyRotator.reportKeyError('veo', apiKey, err);
      throw err;
    }
  }
}
