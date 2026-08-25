import { ProviderStatus, Scene } from "../../shared/types";
import { VideoGenerationProvider, getSampleVideoForScene } from "./VideoProvider";
import { FounderService } from "../fcc/FounderService";


export class RunwayAdapter implements VideoGenerationProvider {
  name = 'Runway Gen-3 Alpha';
  isMock = false;

  async getStatus(): Promise<ProviderStatus> {
    return 'READY';
  }

  async generateScene(scene: Scene, context: string): Promise<string> {
    const apiKey = process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET;
    const prompt = scene.promptImageToVideo || `${scene.visualDirection}. Runway Gen-3 Alpha Cinematic Motion, 4K rendering. Context: ${context}`;
    
    console.log(`[Runway Adapter] Processing scene with prompt: "${prompt}"`);

    // Check if valid Runway API Key starting with 'key_' is configured
    const cleanKey = apiKey ? apiKey.trim() : '';
    const isValidRunwayKey = cleanKey.startsWith('key_');

    if (cleanKey && !isValidRunwayKey) {
      console.warn(`[Runway Adapter] RUNWAY_API_KEY invalid format: Key must start with 'key_'. Using high-fidelity video preview fallback.`);
    }

    if (isValidRunwayKey) {
      try {
        console.log(`[Runway Adapter] Submitting Image-to-Video task to Runway Gen-4 API...`);
        const isVertical = Boolean(
          scene.promptImageToVideo?.includes('9:16') || 
          scene.visualDirection?.includes('9:16') || 
          scene.visualDirection?.includes('TikTok') || 
          scene.visualDirection?.includes('Affiliate')
        );
        const baseUrl = FounderService.getRunwayEndpoint().replace(/\/$/, '');
        let endpoint = `${baseUrl}/image_to_video`;
        let bodyData: any = {
          promptText: prompt,
          model: 'gen4_turbo', // runway gen4
          duration: 5,
          ratio: isVertical ? '720:1280' : '1280:720'
        };

        const isUGC = context.includes('AFFILIATE') || scene.visualDirection?.includes('UGC') || scene.promptImageToVideo?.includes('UGC');
        
        const characterImg = scene.imageUrl || scene.metadata?.characterImage;
        const productImg = scene.assetUrl || scene.metadata?.productImage;

        if (isUGC && characterImg && productImg && characterImg !== productImg) {
           console.log('[Runway Adapter] Using Product UGC Recipe endpoint for Affiliate video!');
           endpoint = `${baseUrl}/recipes/product_ugc`;
           bodyData = {
              characterImage: characterImg, // Face/Creator
              productImage: productImg,     // Product
              productInfo: prompt,          // Instructions
              seed: Math.floor(Math.random() * 1000000)
           };
        } else {
           const img = scene.imageUrl || productImg || characterImg;
           if (typeof img === 'string' && img.length > 0) {
              bodyData.promptImage = img;
           } else if (Array.isArray(img) && img.length > 0) {
              bodyData.promptImage = img[0];
           } else {
              // No image available, fallback to text-to-video endpoint
              console.log('[Runway Adapter] No image provided, switching to text_to_video endpoint');
              endpoint = `${baseUrl}/text_to_video`;
              bodyData = {
                promptText: prompt,
                model: 'gen4.5', // Required model for text_to_video based on deprecation notice
                duration: 5,
                ratio: isVertical ? '720:1280' : '1280:720'
              };
           }
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cleanKey}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': '2024-11-06'
          },
          body: JSON.stringify(bodyData)
        });

        if (response.ok) {
          const taskData = await response.json();
          const taskId = taskData.id;
          console.log(`[Runway Adapter] Task created ID: ${taskId}, polling status...`);

          // Poll for task completion (up to 3 minutes for video generation)
          for (let i = 0; i < 45; i++) {
            await new Promise(r => setTimeout(r, 4000));
            const statusRes = await fetch(`${baseUrl}/tasks/${taskId}`, {
              headers: {
                'Authorization': `Bearer ${cleanKey}`,
                'X-Runway-Version': '2024-11-06'
              }
            });

            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === 'SUCCEEDED' && statusData.output?.[0]) {
                console.log(`[Runway Adapter] Real Runway Gen-3 Video Generated: ${statusData.output[0]}`);
                return statusData.output[0];
              } else if (statusData.status === 'FAILED') {
                console.error(`[Runway Adapter] Task failed:`, statusData.failure);
                throw new Error(`Runway API task failed: ${statusData.failure}`);
              }
            }
          }
          throw new Error(`Runway API polling timeout: Video generation took too long.`);
        } else {
          const errText = await response.text();
          console.warn(`[Runway Adapter] API returned status ${response.status}: ${errText}`);
          throw new Error(`Runway API returned status ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.error(`[Runway Adapter] Runway API call error:`, err?.message || err);
        throw err;
      }
    }


    throw new Error('[Runway Adapter] RUNWAY_API_KEY is missing or invalid. Real generation requires a valid API key starting with "key_".');

  }
}

