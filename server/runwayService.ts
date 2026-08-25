import { VideoRenderService, VideoRenderPipelineParams, RenderPipelineResult } from "./videoRenderService";

export type { VideoRenderPipelineParams, RenderPipelineResult };
export { VideoRenderService };

export const executeVideoRenderPipeline = VideoRenderService.executeVideoRenderPipeline;
export const runwayService = VideoRenderService;
export default VideoRenderService;
