import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ProductionProject } from '../src/shared/types';
import * as https from 'https';
import { TTSService } from './ttsService';

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function getAssHeader(style: string, targetW: number, targetH: number) {
  let fontName = 'Arial';
  let primaryColor = '&H00FFFFFF';
  let outlineColor = '&H00000000';
  let shadowColor = '&H00000000';
  let outline = '3';
  let shadow = '0';
  let baseFontSize = 24;
  let bold = '-1'; 
  
  if (style === 'Bold Pop') {
    fontName = 'Arial Black';
    primaryColor = '&H0000FFFF'; 
    outlineColor = '&H00000000'; 
    outline = '4';
    shadow = '2';
    baseFontSize = 48;
  } else if (style === 'Clean Minimal') {
    fontName = 'Helvetica';
    primaryColor = '&H00FFFFFF'; 
    outlineColor = '&H00444444'; 
    outline = '1';
    shadow = '0';
    baseFontSize = 36;
    bold = '0'; 
  } else if (style === 'Neon Glow') {
    fontName = 'Courier New';
    primaryColor = '&H00FFFFFF'; 
    outlineColor = '&H00FF00FF'; 
    outline = '3';
    shadow = '5';
    shadowColor = '&H00FF00FF';
    baseFontSize = 42;
  }

  let fontSize = Math.floor(baseFontSize * (targetH / 720)).toString();
  let marginV = Math.floor(targetH * 0.15);

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${targetW}
PlayResY: ${targetH}
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},${shadowColor},${bold},0,0,0,100,100,0,0,1,${outline},${shadow},2,20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

function runFfmpegWithProgress(args: string[], onProgressUpdate: (frame: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args);
    let stderrOut = '';
    
    child.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('frame=')) {
          const frameStr = line.split('=')[1].trim();
          const frame = parseInt(frameStr, 10);
          if (!isNaN(frame)) {
            onProgressUpdate(frame);
          }
        }
      }
    });
    
    child.stderr.on('data', (data: Buffer) => {
      stderrOut += data.toString();
    });
    
    child.on('close', (code: number) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}:\n${stderrOut}`));
    });
    child.on('error', (err: Error) => reject(err));
  });
}

async function fetchWithRetry(url: string, dest: string, maxRetries = 2): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); 
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
         throw new Error(`File terdeteksi sebagai gambar (${contentType}), bukan video.`);
      }

      const arrBuf = await response.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(arrBuf));
      clearTimeout(timeoutId);
      return; 
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw new Error(`Gagal unduh setelah ${maxRetries} percobaan: ${err.message || err}`);
      }
      console.warn(`[VideoEditor] Fetch gagal (percobaan ${attempt}), mencoba lagi: ${err.message || err}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

export class VideoEditor {
  static async processProject(
    project: ProductionProject, 
    subtitleStyle?: string,
    onProgress?: (progress: number, stepName: string, detailLog: string) => void
  ): Promise<any> {
    const projectId = project.id;
    const scenes = project.storyboard?.scenes || [];
    
    if (scenes.length === 0) {
      throw new Error("Tidak ada adegan dalam papan cerita (storyboard) untuk digabungkan.");
    }

    const outputsDir = path.join(process.cwd(), 'outputs');
    if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true });

    const tempDir = path.join(outputsDir, `tmp_${projectId}`);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
      const SCENE_DURATION = 5;
      const TOTAL_FRAMES_PER_SCENE = SCENE_DURATION * 30;

      const aspectRatio = (project as any).aspectRatio || project.affiliateConfig?.aspectRatio || (project.videoType === 'EDUCATIONAL' ? '16:9' : '9:16');
      const [targetW, targetH] = aspectRatio === '16:9' ? [1920, 1080] : aspectRatio === '1:1' ? [1080, 1080] : [1080, 1920];
      
      const [lowW, lowH] = aspectRatio === '16:9' ? [480, 270] : aspectRatio === '1:1' ? [360, 360] : [270, 480];
      const scaleFilter = `split[m][a];[a]scale=${lowW}:${lowH},boxblur=8:2,scale=${targetW}:${targetH}[b];[m]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease[v2];[b][v2]overlay=(W-w)/2:(H-h)/2`; 

      const startTimeAll = Date.now();

      // ------------------------------------------------------------------
      // FASE 0: PERSIAPAN BGM
      // ------------------------------------------------------------------
      onProgress?.(5, 'Menyiapkan audio BGM...', 'Menyiapkan track musik latar belakang...');
      const bgmPath = path.join(tempDir, 'bgm.mp3');
      try {
        const freeMusicLibrary = [
          'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
        ];
        const randomBgm = freeMusicLibrary[Math.floor(Math.random() * freeMusicLibrary.length)];
        console.log(`[VideoEditor] Memilih BGM: ${randomBgm}`);
        await fetchWithRetry(randomBgm, bgmPath, 2);
        console.log(`[VideoEditor] BGM berhasil diunduh`);
      } catch(e: any) {
        console.warn("[VideoEditor] Gagal unduh BGM atau timeout, membuat audio sunyi fallback...", e?.message || e);
        try {
          await runFfmpegWithProgress(['-y', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', '300', bgmPath], () => {});
        } catch (ffmpegErr) {
          fs.writeFileSync(bgmPath, '');
        }
      }

      // ------------------------------------------------------------------
      // FASE 1: NORMALIZE-ON-IMPORT PER ADEGAN
      // (Scale, Blur, TTS, Subtitles - All in One Pass)
      // ------------------------------------------------------------------
      console.log(`[VideoEditor] Memulai pemrosesan ${scenes.length} adegan (Normalize-on-Import)...`);
      const sceneResults: {index: number, success: boolean, text: string, hasTts?: boolean, error?: string}[] = [];

      let sceneProcessStart = Date.now();

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const baseProgress = 10 + (i / scenes.length) * 65;
        
        onProgress?.(
          Math.round(baseProgress), 
          `Memproses adegan ${i + 1}/${scenes.length}...`, 
          `Mengunduh video adegan ${i + 1}...`
        );

        const url = (scene.falUrl || scene.remoteVideoUrl || scene.videoUrl) as string;
        if (!url) {
          throw new Error(`Video untuk adegan ${i + 1} belum dirender atau belum selesai.`);
        }
        const localPath = path.join(tempDir, `scene_${i}.mp4`);
        const localTtsPath = path.join(tempDir, `tts_${i}.mp3`);
        const localMixedPath = path.join(tempDir, `scene_mixed_${i}.mp4`);
        const text = scene.subtitle || scene.textOverlay || scene.voiceOver || '';
        let hasTts = false;

        try {
          // 1a. Download or Copy Video
          if (url.startsWith('http://') || url.startsWith('https://')) {
             await fetchWithRetry(url, localPath, 3); // 3 retries (1-2x ulang)
          } else if (url.startsWith('data:video/')) {
             const base64Data = url.split(',')[1];
             fs.writeFileSync(localPath, base64Data, 'base64');
          } else {
             let resolvedSourcePath = '';
             const cleanUrl = url.replace(/^\//, '');

             if (cleanUrl.startsWith('outputs/')) {
               resolvedSourcePath = path.join(process.cwd(), cleanUrl);
             } else if (cleanUrl.startsWith('api/videos/')) {
               const filename = cleanUrl.replace('api/videos/', '');
               const outCandidate = path.join(process.cwd(), 'outputs', filename);
               const pubCandidate = path.join(process.cwd(), 'public', 'videos', filename);
               resolvedSourcePath = fs.existsSync(outCandidate) ? outCandidate : pubCandidate;
             } else if (fs.existsSync(url)) {
               resolvedSourcePath = url;
             } else {
               resolvedSourcePath = path.join(process.cwd(), 'outputs', cleanUrl);
             }

             if (!fs.existsSync(resolvedSourcePath)) {
               const remoteFallback = scene.remoteUrl || scene.falUrl || (scene as any).remoteVideoUrl;
               if (remoteFallback && (remoteFallback.startsWith('http://') || remoteFallback.startsWith('https://'))) {
                 console.log(`[VideoEditor] File lokal ${resolvedSourcePath} tidak ditemukan, mencoba unduh dari remote: ${remoteFallback}`);
                 await fetchWithRetry(remoteFallback, localPath, 3);
               } else {
                 throw new Error(`File video adegan ${i + 1} tidak ditemukan di server: ${resolvedSourcePath}`);
               }
             } else {
               fs.copyFileSync(resolvedSourcePath, localPath);
             }
          }

          // 1b. Synthesize Narration TTS
          if (text) {
             onProgress?.(
                Math.round(baseProgress + 2), 
                `Memproses adegan ${i + 1}/${scenes.length}...`, 
                `Menghasilkan audio narasi (TTS) adegan ${i + 1}...`
             );
             try {
                 const voiceId = project.ttsVoiceConfig?.voiceName || project.ttsVoiceConfig?.voiceId || (project.ttsVoiceConfig as any)?.id || 'openai-female-nova';
                 const provider = project.ttsVoiceConfig?.provider || (voiceId.startsWith('openai') ? 'openai' : voiceId.startsWith('fal') ? 'fal-ai' : 'google');
                 const buffer = await TTSService.generateTTS(provider, text, {
                   ...project.ttsVoiceConfig,
                   voiceName: voiceId,
                   voiceGender: project.ttsVoiceConfig?.voiceGender || (voiceId.includes('male') ? 'male' : 'female')
                 });
                 if (buffer && buffer.length > 0) {
                   fs.writeFileSync(localTtsPath, buffer);
                   hasTts = true;
                 }
             } catch(e: any) {
                 console.error(`[VideoEditor] Gagal TTS untuk adegan ${i+1}:`, e?.message || e);
             }
          }

          // 1c. Create ASS subtitle for this scene ONLY
          const assPath = path.join(tempDir, `subs_${i}.ass`);
          let assContent = getAssHeader(subtitleStyle || 'Bold Pop', targetW, targetH);
          if (text) {
             const assStart = formatAssTime(0.2);
             const assEnd = formatAssTime(SCENE_DURATION - 0.2);
             assContent += `Dialogue: 0,${assStart},${assEnd},Default,,0,0,0,,{\\fscx120\\fscy120\\t(0,200,\\fscx100\\fscy100)}${text}\n`;
          }
          fs.writeFileSync(assPath, assContent.replace(/\n/g, '\r\n')); // ensure CRLF for ffmpeg

          // 1d. Mixing per scene (Normalize-on-Import step) with REALTIME progress
          const ffmpegArgs = ['-y', '-progress', 'pipe:1', '-i', localPath];
          if (hasTts) {
            ffmpegArgs.push('-i', localTtsPath);
          } else {
            ffmpegArgs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
          }
          
          ffmpegArgs.push(
            '-filter_complex', `[0:v]${scaleFilter},subtitles='${assPath.replace(/\\/g, '\\\\')}':fontsdir='${tempDir.replace(/\\/g, '\\\\')}'[v]${hasTts ? ';[1:a]apad[a]' : ''}`,
            '-map', '[v]',
            '-map', hasTts ? '[a]' : '1:a:0',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-c:a', 'aac',
            '-t', '5',
            localMixedPath
          );

          await runFfmpegWithProgress(ffmpegArgs, (frame) => {
             const fraction = Math.min(1, frame / TOTAL_FRAMES_PER_SCENE);
             const currentProg = Math.round(baseProgress + 2 + fraction * (65 / scenes.length - 2));
             onProgress?.(
                currentProg, 
                `Memproses adegan ${i + 1}/${scenes.length}...`, 
                `Normalisasi visual & hardcode subs (Frame ${frame}/${TOTAL_FRAMES_PER_SCENE})...`
             );
          });
          
          sceneResults.push({ index: i, success: true, text, hasTts });
        } catch (err: any) {
          console.error(`[VideoEditor] Gagal memproses adegan ${i+1}:`, err);
          sceneResults.push({ index: i, success: false, text, hasTts: false, error: err.message || String(err) });
        }
      }

      const sceneProcessEnd = Date.now();
      const avgSceneTime = (sceneProcessEnd - sceneProcessStart) / Math.max(1, scenes.length);
      console.log(`[BENCHMARK] Rata-rata waktu Normalize-on-Import 1 scene: ${avgSceneTime.toFixed(0)} ms`);

      const failedScene = sceneResults.find(r => !r.success);
      if (failedScene) {
         throw new Error(`Gagal memproses Adegan ${failedScene.index + 1}: ${failedScene.error || 'Terjadi kesalahan saat mengunduh/memproses video.'}`);
      }

      // ------------------------------------------------------------------
      // FASE 2: KONSTRUKSI PLAYLIST (CONCAT) & FINAL MIX INSTAN (-c copy)
      // ------------------------------------------------------------------
      onProgress?.(80, 'Menyusun playlist...', 'Mengompilasi urutan adegan yang telah dinormalisasi...');
      let listContent = '';
      sceneResults.sort((a, b) => a.index - b.index);
      for (const res of sceneResults) {
        if (!res.success) continue; 
        listContent += `file 'scene_mixed_${res.index}.mp4'\n`;
      }
      
      const listFilePath = path.join(tempDir, 'list.txt');
      fs.writeFileSync(listFilePath, listContent);

      const finalVideoName = `final_${projectId}.mp4`;
      const finalVideoPath = path.join(outputsDir, finalVideoName);
      
      onProgress?.(85, 'Menggabungkan sequence video...', 'Menjalankan Stitch Instan (-c copy) dan Audio Mix BGM...');
      
      const stitchStart = Date.now();
      
      // Stitch Akhir: Copy Video, Mix Audio BGM
      const concatArgs = [
        '-y', '-progress', 'pipe:1',
        '-f', 'concat', '-safe', '0', '-i', listFilePath,
        '-i', bgmPath,
        '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]',
        '-map', '0:v',
        '-map', '[a]',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        finalVideoPath
      ];

      await runFfmpegWithProgress(concatArgs, (frame) => {
         onProgress?.(
            85 + Math.min(10, Math.round((frame / (TOTAL_FRAMES_PER_SCENE * scenes.length)) * 10)),
            'Stitch Akhir...',
            `Menulis stream file gabungan tanpa re-encode video (Frame ${frame})...`
         );
      });

      const stitchEnd = Date.now();
      console.log(`[BENCHMARK] Waktu Stitch Akhir (concat -c copy) untuk ${scenes.length} scene: ${stitchEnd - stitchStart} ms`);

      if (!fs.existsSync(finalVideoPath) || fs.statSync(finalVideoPath).size === 0) {
        throw new Error("Gagal melakukan penggabungan akhir.");
      }

      onProgress?.(100, 'Selesai!', 'Video akhir berhasil dirender.');

      return {
        url: `/outputs/${finalVideoName}`,
        localPath: finalVideoPath,
        benchmark: {
          avgSceneTime,
          stitchTime: stitchEnd - stitchStart,
          totalTime: stitchEnd - startTimeAll
        }
      };

    } catch (error) {
      console.error(`[VideoEditor] Gagal memproses video:`, error);
      throw error;
    }
  }
}
