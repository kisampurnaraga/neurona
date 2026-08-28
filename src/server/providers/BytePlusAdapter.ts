import { ProviderStatus, Scene } from "../../shared/types";
import { VideoGenerationProvider } from "./VideoProvider";
import { FounderService } from "../fcc/FounderService";
import fetch from "node-fetch";

export class BytePlusAdapter implements VideoGenerationProvider {
  name = 'BytePlus ModelArk (PixelDance/Doubao)';
  isMock = false;

  async getStatus(): Promise<ProviderStatus> {
    const config = FounderService.getBytePlusConfig();
    const apiKey = config.apiKey || process.env.BYTEPLUS_API_KEY;
    if (!apiKey) return 'NOT_CONFIGURED';
    return config.status === 'ERROR' ? 'ERROR' : 'READY';
  }

  async generateScene(scene: Scene, context: string, onProgress?: (msg: string) => void): Promise<string> {
    const config = FounderService.getBytePlusConfig();
    const apiKey = config.apiKey || process.env.BYTEPLUS_API_KEY;
    const endpoint = config.endpoint || process.env.BYTEPLUS_BASE_URL || 'https://ark.ap-southeast-1.byteplusapi.com/api/v3';
    const model = config.model || process.env.BYTEPLUS_MODEL || 'dreamina-seedance-2-0-mini-260615';
    
    const prompt = scene.promptImageToVideo || `${scene.visualDirection}. BytePlus PixelDance commercial motion, ultra-realistic. Context: ${context}`;
    console.log(`[BytePlus Adapter] Processing scene ${scene.id} with prompt: "${prompt.substring(0, 100)}..." using model: ${model}`);

    if (!apiKey) {
      throw new Error('[BytePlus Adapter] BYTEPLUS_API_KEY is not configured. Real generation requires a valid API key.');
    }

    try {
      const baseUrl = endpoint.replace(/\/$/, '');
      const taskEndpoint = `${baseUrl}/contents/generations/tasks`;
      const requestBody = {
        model: model,
        prompt: prompt,
        image_url: scene.imageUrl || scene.assetUrl || undefined,
        ratio: scene.visualDirection?.includes('9:16') ? '9:16' : '16:9',
        duration: 5
      };

      console.log(`[BytePlus Adapter] Submitting task to ${taskEndpoint}...`);
      
      const response = await fetch(taskEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data: any = await response.json();
        console.log(`[BytePlus Adapter] Task successfully submitted. Task ID:`, data.id || data.task_id);
        
        if (data.video_url || data.url) {
          return data.video_url || data.url;
        } else {
            throw new Error(`[BytePlus Adapter] No video URL returned from API: ${JSON.stringify(data)}`);
        }
      } else {
        const errText = await response.text();
        throw new Error(`[BytePlus Adapter] API call returned HTTP ${response.status}: ${errText}`);
      }
    } catch (err: any) {
      console.error(`[BytePlus Adapter] Error:`, err);
      throw err;
    }
  }
}
