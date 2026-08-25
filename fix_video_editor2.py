import sys

new_video_editor = """import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ProductionProject } from '../src/shared/types';
import https from 'https';

const execAsync = promisify(exec);

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

async function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
             https.get(response.headers.location!, (res2) => {
                 res2.pipe(file);
                 file.on('finish', () => { file.close(); resolve(); });
             });
             return;
        }
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

export class VideoEditor {
  static async processProject(project: ProductionProject): Promise<string> {
    const projectId = project.id;
    const scenes = project.storyboard?.scenes?.filter(s => s.status === 'COMPLETED' && (s.videoUrl || s.assetUrl)) || [];
    
    if (scenes.length === 0) throw new Error("Tidak ada adegan yang bisa digabungkan.");

    const outputsDir = path.join(process.cwd(), 'outputs');
    if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true });

    const tempDir = path.join(outputsDir, `tmp_${projectId}`);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
      const listFilePath = path.join(tempDir, 'list.txt');
      let listContent = '';
      let srtContent = '';
      let currentTime = 0;
      const SCENE_DURATION = 5; 

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const url = scene.videoUrl || scene.assetUrl as string;
        const localPath = path.join(tempDir, `scene_${i}.mp4`);
        const localTtsPath = path.join(tempDir, `tts_${i}.mp3`);
        const localMixedPath = path.join(tempDir, `scene_mixed_${i}.mp4`);
        
        console.log(`[VideoEditor] Mengunduh adegan ${i+1}...`);
        
        if (url.startsWith('http')) {
           const response = await fetch(url);
           if (!response.ok) throw new Error(`Gagal mengunduh adegan dari Runway: ${url}`);
           const arrayBuffer = await response.arrayBuffer();
           fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
        } else if (url.startsWith('data:video/')) {
           const base64Data = url.split(',')[1];
           fs.writeFileSync(localPath, base64Data, 'base64');
        } else {
           fs.copyFileSync(url, localPath);
        }

        const text = scene.subtitle || scene.textOverlay || scene.voiceOver || '';
        let hasTts = false;
        if (text) {
           console.log(`[VideoEditor] Mengunduh TTS adegan ${i+1}...`);
           try {
               const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=id&client=tw-ob`;
               await downloadFile(ttsUrl, localTtsPath);
               hasTts = true;
           } catch(e) {
               console.error(`[VideoEditor] Gagal TTS untuk adegan ${i+1}:`, e);
           }
        }

        console.log(`[VideoEditor] Menggabungkan TTS ke adegan ${i+1}...`);
        if (hasTts) {
            // Pad audio so if it's shorter than video, video isn't cut. If it's longer, -shortest cuts audio at video end.
            await execAsync(`ffmpeg -y -i "scene_${i}.mp4" -i "tts_${i}.mp3" -filter_complex "[1:a]apad[a]" -map 0:v:0 -map "[a]" -c:v copy -c:a aac -shortest "scene_mixed_${i}.mp4"`, { cwd: tempDir });
        } else {
            // No TTS -> Silent audio track so concat works
            await execAsync(`ffmpeg -y -i "scene_${i}.mp4" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "scene_mixed_${i}.mp4"`, { cwd: tempDir });
        }

        listContent += `file 'scene_mixed_${i}.mp4'\\n`;

        if (text) {
           const startTime = formatSrtTime(currentTime + 0.2);
           const endTime = formatSrtTime(currentTime + SCENE_DURATION - 0.2);
           srtContent += `${i + 1}\\n${startTime} --> ${endTime}\\n${text}\\n\\n`;
        }
        currentTime += SCENE_DURATION;
      }
      
      fs.writeFileSync(listFilePath, listContent.replace(/\\\\n/g, '\\n'));
      const srtPath = path.join(tempDir, 'subs.srt');
      fs.writeFileSync(srtPath, srtContent.replace(/\\\\n/g, '\\n'));

      console.log(`[VideoEditor] Menyiapkan Background Music...`);
      const bgmPath = path.join(tempDir, 'bgm.mp3');
      try {
         const bgmRes = await fetch('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
         const bgmBuf = await bgmRes.arrayBuffer();
         fs.writeFileSync(bgmPath, Buffer.from(bgmBuf));
      } catch(e) {
         console.warn("[VideoEditor] Gagal unduh BGM, membuat audio sunyi fallback...");
         await execAsync(`ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t ${currentTime} "bgm.mp3"`, { cwd: tempDir });
      }

      const finalVideoName = `final_${projectId}.mp4`;
      const finalVideoPath = path.join(outputsDir, finalVideoName);
      const concatPath = path.join(tempDir, 'concat.mp4');

      console.log(`[VideoEditor] Menjahit video...`);
      await execAsync(`ffmpeg -y -f concat -safe 0 -i list.txt -c copy concat.mp4`, { cwd: tempDir });

      console.log(`[VideoEditor] Menerapkan gaya teks ala CapCut dan Audio BGM...`);
      const style = "FontName=Arial,FontSize=22,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2.5,Shadow=1.5,Alignment=2,MarginV=25";
      
      // We have TTS in [0:a] (from concat.mp4). We have BGM in [1:a]. We mix them. BGM volume lowered.
      // And we scale video to ensure even dimensions for libx264.
      const ffmpegCmd = `ffmpeg -y -i concat.mp4 -i bgm.mp3 -filter_complex "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,subtitles=subs.srt:force_style='${style}'[v];[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]" -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -shortest "${finalVideoPath}"`;
      
      await execAsync(ffmpegCmd, { cwd: tempDir });

      console.log(`[VideoEditor] Render Master Final selesai!`);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}

      return `/outputs/${finalVideoName}`;
    } catch (err: any) {
      console.error(`[VideoEditor] Gagal memproses video:`, err);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
      throw err;
    }
  }
}
"""

with open('server/VideoEditor.ts', 'w') as f:
    f.write(new_video_editor)
print("Updated VideoEditor.ts")

