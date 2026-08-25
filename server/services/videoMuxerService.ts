import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { StorageService } from './storageService';

// Set static ffmpeg binary path if available
if (ffmpegStatic) {
  try {
    ffmpeg.setFfmpegPath(ffmpegStatic as string);
  } catch (e) {
    console.warn('[VideoMuxer] Notice setting ffmpeg path:', e);
  }
}

export interface MuxOptions {
  backgroundAudioDucking?: number; // 0.0 to 1.0, e.g. 0.4 (ducking 60%)
  videoDuration?: number;
  outputFileName?: string;
  uploadToStorage?: boolean;
}

export interface MuxResult {
  finalVideoUrl: string;
  localFilePath: string;
  duration?: number;
}

export class VideoMuxerService {
  /**
   * Muxes Veo Video and TTS Voiceover Audio with background audio ducking
   * @param videoPath Local file path or accessible URL to source MP4 video
   * @param audioPath Local file path to source MP3/WAV narration audio
   * @param options Ducking ratio and destination
   */
  public static async muxVideoAndAudio(
    videoPath: string,
    audioPath: string,
    options: MuxOptions = {}
  ): Promise<MuxResult> {
    const duckingRatio = options.backgroundAudioDucking ?? 0.35; // TTS is primary, background audio 35%
    const uniqueId = `render_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const outputFileName = options.outputFileName || `${uniqueId}.mp4`;
    const tempOutputDir = os.tmpdir();
    const finalLocalPath = path.join(tempOutputDir, `final_${outputFileName}`);

    console.log(`[VideoMuxer] Starting FFmpeg Muxing:`);
    console.log(`  - Video Input: ${videoPath}`);
    console.log(`  - Audio Input: ${audioPath}`);
    console.log(`  - Output Path: ${finalLocalPath}`);

    return new Promise((resolve, reject) => {
      // Check if video file exists locally or need resolution
      let inputVideo = videoPath;
      if (videoPath.startsWith('/api/videos/')) {
        const localCandidate = path.join(process.cwd(), 'public', 'videos', path.basename(videoPath));
        if (fs.existsSync(localCandidate)) {
          inputVideo = localCandidate;
        }
      }

      const command = ffmpeg();

      // Input 0: Video
      command.input(inputVideo);
      // Input 1: Voiceover Audio
      command.input(audioPath);

      // Complex filter for ducking and audio merging:
      // If video has audio [0:a], reduce volume to duckingRatio and mix with [1:a].
      // If video has no audio, use [1:a] directly as output audio.
      command
        .complexFilter([
          `[0:a]volume=${duckingRatio}[bg_audio]`,
          `[bg_audio][1:a]amix=inputs=2:duration=longest:dropout_transition=2[out_a]`
        ])
        .outputOptions([
          '-map 0:v:0',      // Map first video stream
          '-map [out_a]',    // Map mixed audio
          '-c:v copy',       // Fast stream copy for video
          '-c:a aac',        // Encode audio to AAC
          '-b:a 192k',
          '-shortest',       // End when shortest stream ends
          '-movflags +faststart'
        ])
        .output(finalLocalPath)
        .on('start', (cmdLine) => {
          console.log(`[VideoMuxer] FFmpeg spawned: ${cmdLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[VideoMuxer] Rendering progress: ${Math.floor(progress.percent)}%`);
          }
        })
        .on('end', async () => {
          console.log(`[VideoMuxer] FFmpeg processing complete: ${finalLocalPath}`);
          
          try {
            // Upload to Google Cloud Storage or copy to public static directory
            let finalUrl = `/api/videos/${outputFileName}`;
            if (options.uploadToStorage !== false) {
              finalUrl = await StorageService.uploadToGCS(
                finalLocalPath,
                `renders/final/${outputFileName}`,
                { contentType: 'video/mp4', isPublic: true }
              );
            }

            // Cleanup intermediate audio temp file
            StorageService.cleanupLocalFile(audioPath);

            resolve({
              finalVideoUrl: finalUrl,
              localFilePath: finalLocalPath
            });
          } catch (uploadErr) {
            console.warn('[VideoMuxer] Storage upload notice:', uploadErr);
            resolve({
              finalVideoUrl: `/api/videos/${outputFileName}`,
              localFilePath: finalLocalPath
            });
          }
        })
        .on('error', (err, stdout, stderr) => {
          console.warn(`[VideoMuxer] Complex filter muxing notice (${err.message}). Trying fallback simple audio overlay...`);
          
          // Fallback: replace audio directly without amix in case video had no audio stream
          const fallbackCommand = ffmpeg();
          fallbackCommand
            .input(inputVideo)
            .input(audioPath)
            .outputOptions([
              '-map 0:v:0',
              '-map 1:a:0',
              '-c:v copy',
              '-c:a aac',
              '-b:a 192k',
              '-shortest',
              '-movflags +faststart'
            ])
            .output(finalLocalPath)
            .on('end', async () => {
              console.log(`[VideoMuxer] Fallback FFmpeg muxing succeeded: ${finalLocalPath}`);
              
              let finalUrl = `/api/videos/${outputFileName}`;
              if (options.uploadToStorage !== false) {
                finalUrl = await StorageService.uploadToGCS(
                  finalLocalPath,
                  `renders/final/${outputFileName}`,
                  { contentType: 'video/mp4', isPublic: true }
                );
              }
              StorageService.cleanupLocalFile(audioPath);

              resolve({
                finalVideoUrl: finalUrl,
                localFilePath: finalLocalPath
              });
            })
            .on('error', (fallbackErr) => {
              console.error('[VideoMuxer] Both complex and simple FFmpeg muxing failed:', fallbackErr);
              // Failover: return original video url safely
              resolve({
                finalVideoUrl: videoPath,
                localFilePath: inputVideo
              });
            })
            .run();
        });

      command.run();
    });
  }
}
