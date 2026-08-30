import { ProviderStatus, Scene } from "../../shared/types";

export interface VideoGenerationProvider {
  name: string;
  isMock: boolean;
  
  getStatus(): Promise<ProviderStatus>;
  generateScene(scene: Scene, context: string, onProgress?: (msg: string) => void): Promise<string>;
}

// High-speed Same-Origin Local Video Endpoints (100% iFrame compatible, Range headers, zero 403)
const GENRE_VIDEOS: Record<string, string[]> = {
  SPORTS: [
    '/api/videos/sample-sports.mp4',
    '/videos/sample-sports.mp4',
    '/api/videos/sample-ocean.mp4'
  ],
  ANIME: [
    '/api/videos/sample-anime.mp4',
    '/videos/sample-anime.mp4',
    '/api/videos/sample-flower.mp4'
  ],
  COMMERCIAL: [
    '/api/videos/sample-flower.mp4',
    '/videos/sample-flower.mp4',
    '/api/videos/sample-ocean.mp4'
  ],
  EDUCATIONAL: [
    '/api/videos/sample-edu.mp4',
    '/videos/sample-edu.mp4',
    '/api/videos/sample-flower.mp4'
  ],
  DEFAULT: [
    '/api/videos/sample-ocean.mp4',
    '/videos/sample-ocean.mp4',
    '/api/videos/sample-flower.mp4',
    '/api/videos/sample-edu.mp4'
  ]
};

export function getSampleVideoForScene(scene: Scene, context: string = ''): string {
  // 1. If scene has a valid MP4 or WebM video stream, keep it
  if (scene.videoUrl && (!scene.videoUrl.startsWith('data:image/'))) {
    return scene.videoUrl;
  }

  // 2. Determine genre from scene and context
  const fullText = `${context} ${scene.visualDirection || ''} ${scene.promptImageToVideo || ''} ${scene.textOverlay || ''}`.toLowerCase();
  
  let list = GENRE_VIDEOS.DEFAULT;
  if (/sepak bola|soccer|football|stadium|stadion|tsubasa|athlete|sport/i.test(fullText)) {
    list = GENRE_VIDEOS.SPORTS;
  } else if (/anime|shinkai|manga|action|kartun|cartoon|cyberpunk/i.test(fullText)) {
    list = GENRE_VIDEOS.ANIME;
  } else if (/affiliate|produk|product|commercial|unboxing|diskon|promo/i.test(fullText)) {
    list = GENRE_VIDEOS.COMMERCIAL;
  } else if (/edukasi|belajar|tutorial|science|sains|lab|blueprint|diagram/i.test(fullText)) {
    list = GENRE_VIDEOS.EDUCATIONAL;
  }

  // 3. Pick deterministic clip based on scene ID / number
  const seedStr = (scene.id || 'scene') + ((scene as any).scene_number || (scene as any).sequenceNumber || 1);
  const hash = seedStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = Math.abs(hash) % list.length;
  
  return list[idx];
}
