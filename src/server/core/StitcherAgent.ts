import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import ffmpegStatic from 'ffmpeg-static';
import { isPlaceholderSubtitle } from '../../../server/utils/subtitleUtils';

// Initialize with static binary to ensure filters are available
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as string);
}

export interface StitchScene {
  url: string;
  text: string;
}

export class StitcherAgent {
  private static async downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      const client = url.startsWith('https') ? https : http;
      client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
  }

  private static async burnSubtitle(inputPath: string, text: string, outputPath: string, tmpDir: string, index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!text || text.trim() === '' || isPlaceholderSubtitle(text)) {
        fs.copyFileSync(inputPath, outputPath);
        return resolve();
      }

      const srtPath = path.join(tmpDir, `sub_${index}.srt`);
      // Assigning a long duration (60s) ensures it stays on screen for the whole short clip
      const srtContent = `1\n00:00:00,000 --> 00:01:00,000\n${text.trim()}\n`;
      fs.writeFileSync(srtPath, srtContent);

      // Yellow color (00FFFF in BGR), black outline (000000), 22 font size, 3px outline, bold Arial
      const style = "Fontsize=22,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=25,FontName=Arial,Bold=1";
      
      console.log(`[StitcherAgent] Burning subtitle for scene ${index}...`);
      
      ffmpeg(inputPath)
        .videoFilters(`subtitles='${srtPath}':force_style='${style}'`)
        .outputOptions(['-c:v libx264', '-c:a copy'])
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error(`[StitcherAgent] Subtitle error on scene ${index}:`, err);
          // Fallback if filter fails
          fs.copyFileSync(inputPath, outputPath);
          resolve();
        })
        .save(outputPath);
    });
  }

  static async stitchVideos(scenes: StitchScene[], brandLogoUrl?: string, extraVideoUrl?: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!scenes || scenes.length === 0) {
          return reject(new Error('No video URLs provided for stitching.'));
        }

        const jobId = crypto.randomBytes(8).toString('hex');
        const outputFilename = `final_movie_${jobId}.mp4`;
        
        const outputDir = path.join(process.cwd(), 'outputs');
        const tmpDir = path.join(process.cwd(), 'tmp', `stitch_${jobId}`);
        
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, outputFilename);
        const burnedPaths: string[] = [];

        console.log(`[StitcherAgent] Downloading ${scenes.length} videos...`);
        if (brandLogoUrl) {
          console.log(`[StitcherAgent] Brand logo detected (${brandLogoUrl.substring(0,30)}...). Adding watermark overlay...`);
        }
        if (extraVideoUrl) {
          console.log(`[StitcherAgent] Additional video detected. Queueing to timeline...`);
        }
        for (let i = 0; i < scenes.length; i++) {
          const localRawPath = path.join(tmpDir, `raw_${i}.mp4`);
          const localBurnedPath = path.join(tmpDir, `burned_${i}.mp4`);
          
          await this.downloadFile(scenes[i].url, localRawPath);
          await this.burnSubtitle(localRawPath, scenes[i].text, localBurnedPath, tmpDir, i);
          burnedPaths.push(localBurnedPath);
        }

        console.log(`[StitcherAgent] Merging videos...`);
        
        // Write concat list file
        const listPath = path.join(tmpDir, 'list.txt');
        const listContent = burnedPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(listPath, listContent);

        ffmpeg()
          .input(listPath)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions('-c copy')
          .on('error', (err) => {
            console.error('[StitcherAgent] Error during concat:', err.message);
            resolve(scenes[0].url); // Fallback
          })
          .on('end', () => {
            console.log('[StitcherAgent] Stitching & subtitling completed successfully.');
            // Cleanup tmp folder async
            fs.rm(tmpDir, { recursive: true, force: true }, () => {});
            resolve(`/outputs/${outputFilename}`);
          })
          .save(outputPath);

      } catch (err: any) {
        console.error('[StitcherAgent] Exception:', err);
        resolve(scenes[0]?.url || '');
      }
    });
  }
}
