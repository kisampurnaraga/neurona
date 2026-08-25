import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ProductionProject } from '../src/shared/types';
import * as https from 'https';
import { TTSService } from './ttsService';

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
      const SCENE_DURATION = 5; 

      // ------------------------------------------------------------------
      // FASE 1: PERSIAPAN ASET PARALEL (Video, TTS, BGM, dan Early Mixing)
      // ------------------------------------------------------------------
      console.log(`[VideoEditor] Memulai pengunduhan dan persiapan aset paralel untuk ${scenes.length} adegan...`);
      
      const scenePromises = scenes.map(async (scene, i) => {
        const url = scene.videoUrl || scene.assetUrl as string;
        const localPath = path.join(tempDir, `scene_${i}.mp4`);
        const localTtsPath = path.join(tempDir, `tts_${i}.mp3`);
        const localMixedPath = path.join(tempDir, `scene_mixed_${i}.mp4`);
        const text = scene.subtitle || scene.textOverlay || scene.voiceOver || '';
        let hasTts = false;

        try {
          // 1a. Download Video
          if (url.startsWith('http')) {
             const response = await fetch(url);
             if (!response.ok) throw new Error(`Gagal mengunduh adegan dari URL: ${url}`);
             const arrayBuffer = await response.arrayBuffer();
             fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
             
             // Convert to video if it's an image
             const contentType = response.headers.get('content-type') || '';
             if (contentType.startsWith('image/') || url.match(/\.(jpeg|jpg|png|gif)/i)) {
                fs.renameSync(localPath, localPath + '.img');
                await execAsync(`ffmpeg -y -loop 1 -i "scene_${i}.mp4.img" -t ${SCENE_DURATION} -c:v libx264 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "scene_${i}.mp4"`, { cwd: tempDir });
             }
          } else if (url.startsWith('data:video/')) {
             const base64Data = url.split(',')[1];
             fs.writeFileSync(localPath, base64Data, 'base64');
          } else if (url.startsWith('data:image/')) {
             const base64Data = url.split(',')[1];
             const imagePath = path.join(tempDir, `scene_img_${i}.jpg`);
             fs.writeFileSync(imagePath, base64Data, 'base64');
             await execAsync(`ffmpeg -y -loop 1 -i "scene_img_${i}.jpg" -t ${SCENE_DURATION} -c:v libx264 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "scene_${i}.mp4"`, { cwd: tempDir });
          } else {
             fs.copyFileSync(url, localPath);
          }

          // 1b. Download TTS
          if (text) {
             try {
                 const ttsProvider = project.ttsVoiceConfig?.provider || 'google';
                 
                 if (ttsProvider === 'tryaudio') {
                     const buffer = await TTSService.generateTTS('tryaudio', text, project.ttsVoiceConfig);
                     fs.writeFileSync(localTtsPath, buffer);
                     hasTts = true;
                 } else {
                     const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=id&client=tw-ob`;
                     await downloadFile(ttsUrl, localTtsPath);
                     hasTts = true;
                 }
             } catch(e) {
                 console.error(`[VideoEditor] Gagal TTS untuk adegan ${i+1}, fallback ke audio hening.`, e);
             }
          }

          // 1c. Mixing per scene (Video + TTS)
          if (hasTts) {
              await execAsync(`ffmpeg -y -i "scene_${i}.mp4" -i "tts_${i}.mp3" -filter_complex "[1:a]apad[a]" -map 0:v:0 -map "[a]" -c:v copy -c:a aac -shortest "scene_mixed_${i}.mp4"`, { cwd: tempDir });
          } else {
              await execAsync(`ffmpeg -y -i "scene_${i}.mp4" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "scene_mixed_${i}.mp4"`, { cwd: tempDir });
          }
          
          return { index: i, success: true, text };
        } catch (err) {
          console.error(`[VideoEditor] Gagal memproses adegan ${i+1}:`, err);
          return { index: i, success: false, text }; // Tangkap error agar Promise.all tidak crash
        }
      });

      // 1d. Download BGM secara paralel bersama adegan
      const bgmPromise = (async () => {
         const bgmPath = path.join(tempDir, 'bgm.mp3');
         try {
            const bgmRes = await fetch('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
            const bgmBuf = await bgmRes.arrayBuffer();
            fs.writeFileSync(bgmPath, Buffer.from(bgmBuf));
         } catch(e) {
            console.warn("[VideoEditor] Gagal unduh BGM, membuat audio sunyi fallback...");
            await execAsync(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 300 "bgm.mp3"`, { cwd: tempDir });
         }
      })();

      // Menunggu semua proses unduhan dan mixing-awal selesai (Paralel)
      const results = await Promise.all([...scenePromises, bgmPromise]);
      const sceneResults = results.filter(r => r && typeof r === 'object' && 'index' in r) as {index: number, success: boolean, text: string}[];

      // ------------------------------------------------------------------
      // FASE 2: KONSTRUKSI PLAYLIST (CONCAT) & SUBTITLE
      // ------------------------------------------------------------------
      console.log(`[VideoEditor] Membangun urutan playlist dan file subtitle...`);
      let listContent = '';
      let srtContent = '';
      let currentTime = 0;

      // Urutkan ulang berdasarkan index (karena eksekusi paralel tidak menjamin urutan selesai)
      sceneResults.sort((a, b) => a.index - b.index);

      for (const res of sceneResults) {
        if (!res.success) continue; 
        
        const i = res.index;
        listContent += `file 'scene_mixed_${i}.mp4'\n`;

        if (res.text) {
           const startTime = formatSrtTime(currentTime + 0.2);
           const endTime = formatSrtTime(currentTime + SCENE_DURATION - 0.2);
           srtContent += `${i + 1}\n${startTime} --> ${endTime}\n${res.text}\n\n`;
        }
        currentTime += SCENE_DURATION;
      }
      
      const listFilePath = path.join(tempDir, 'list.txt');
      fs.writeFileSync(listFilePath, listContent.replace(/\\n/g, '\n'));
      
      const srtPath = path.join(tempDir, 'subs.srt');
      fs.writeFileSync(srtPath, srtContent.replace(/\\n/g, '\n'));

      // ------------------------------------------------------------------
      // FASE 3: RENDERING FFmpeg (PENJAHITAN AKHIR)
      // ------------------------------------------------------------------
      const finalVideoName = `final_${projectId}.mp4`;
      const finalVideoPath = path.join(outputsDir, finalVideoName);
      
      console.log(`[VideoEditor] Menjahit video...`);
      await execAsync(`ffmpeg -y -f concat -safe 0 -i list.txt -c copy concat.mp4`, { cwd: tempDir });

      console.log(`[VideoEditor] Menerapkan gaya teks ala CapCut dan Audio BGM...`);
      const style = "FontName=Arial,FontSize=22,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2.5,Shadow=1.5,Alignment=2,MarginV=25";
      
      // TODO: Implementasi background job queue (seperti BullMQ) atau worker threads untuk proses rendering ini 
      // di masa depan, agar tidak memblokir event loop Node.js dan menaikkan skalabilitas server.
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
