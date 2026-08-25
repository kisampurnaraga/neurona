import { ProviderStatus, Scene } from "../../shared/types";
import { VideoGenerationProvider, getSampleVideoForScene } from "./VideoProvider";

export class MockVideoProvider implements VideoGenerationProvider {
  name = 'Development AI Engine';
  isMock = false;

  async getStatus(): Promise<ProviderStatus> {
    return 'READY';
  }

  async generateScene(scene: Scene, context: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return getSampleVideoForScene(scene, context);
  }
}
