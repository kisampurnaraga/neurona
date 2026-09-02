import { ProviderStatus, Scene } from "../../shared/types";
import { VideoGenerationProvider } from "./VideoProvider";
import { FounderService } from "../fcc/FounderService";
import { keyRotator } from "../../../server/keyRotator";
import { getFalModel, buildFalPayload, FAL_TIER_DEFAULTS, resolveToDataUriOrPublic } from "../../../server/falModelConfig";
import { renderWithFalQueue } from "../../../server/falQueueRunner";
import { ImageGenerationService } from "../../../server/imageService";
import fetch from "node-fetch";

export class FalVideoAdapter implements VideoGenerationProvider {
  name = 'Fal.ai Video Engine';
  isMock = false;

  async getStatus(): Promise<ProviderStatus> {
    const falApiKey = keyRotator.getNextFalKey();
    if (!falApiKey) return 'NOT_CONFIGURED';
    
    try {
      // Lightweight check against fal queue endpoint
      const res = await fetch('https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Intentionally empty to test auth / availability
      });
      if (res.status === 401) {
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
    const falApiKey = keyRotator.getNextFalKey();
    if (!falApiKey) {
      throw new Error(`HTTP 429 Quota Exceeded / Missing FAL_KEY for Fal.ai Video Engine.`);
    }

    const falConfig: any = FounderService.getFalConfig() || {};
    const sceneExplicitModel = (scene as any)?.videoModel || (scene as any)?.metadata?.model;
    const userModel = (sceneExplicitModel && (sceneExplicitModel.startsWith('fal-ai/') || sceneExplicitModel.startsWith('bytedance/'))) 
      ? sceneExplicitModel 
      : undefined;
    const configuredModel = userModel || falConfig.model || FAL_TIER_DEFAULTS.budget;
    const modelDef = getFalModel(configuredModel);
    const modelPath = modelDef.id;

    const prompt = scene.promptImageToVideo || scene.promptTextToImage || scene.visualDirection || 'High quality cinematic scene';
    const rawImageUrl = scene.imageUrl || scene.assetUrl || '';
    let imageUrl = rawImageUrl;
    if (rawImageUrl) {
      imageUrl = (await ImageGenerationService.ensurePublicFalImageUrl(rawImageUrl, falApiKey)) || await resolveToDataUriOrPublic(rawImageUrl);
    }

    console.log(`[FAL.AI VIDEO ADAPTER] Rendering scene using single source model: ${modelPath}`);
    if (onProgress) onProgress(`Rendering scene with ${modelDef.name}...`);

    const payload = await buildFalPayload(modelPath, {
      prompt,
      imageUrl,
      duration: scene.duration || modelDef.defaultDuration,
      aspectRatio: (scene as any).metadata?.aspectRatio || (scene as any).aspectRatio || '16:9',
      generateAudio: modelDef.supportsAudio
    });

    try {
      const videoUrl = await renderWithFalQueue(modelPath, payload, falApiKey, onProgress);
      return videoUrl;
    } catch (err: any) {
      console.error(`[FAL.AI VIDEO ADAPTER] Error generating scene on model ${modelPath}:`, err.message);
      keyRotator.reportKeyError('fal', falApiKey, err);
      throw err;
    }
  }
}
