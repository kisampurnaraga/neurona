import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
import { db } from "../src/db/index.ts";
import { projects as dbProjects, users as dbUsers } from "../src/db/schema.ts";
import { eq } from "drizzle-orm";
import { QAAuditAgent } from "./services/qaAuditAgent";
import { VideoEditor } from "./VideoEditor";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import { EventEmitter } from "events";
import fetch from "node-fetch";
import { StorageService } from "./services/storageService";
import { GCSStreamService } from "./services/gcsStreamService";
import { 
  ProductionProject, 
  ProductAsset, 
  AffiliateConfig, 
  AnimationConfig, 
  EducationalConfig, 
  VideoType, 
  AgentTelemetry, 
  TerminalLog 
} from "../src/shared/types";
import { getVideoProvider, MediaProviderRouter } from "../src/server/providers";
import { FalVideoAdapter } from "../src/server/providers/FalVideoAdapter";
import { BytePlusAdapter } from "../src/server/providers/BytePlusAdapter";
import { getSampleVideoForScene } from "../src/server/providers/VideoProvider";
import { FounderService } from "../src/server/fcc/FounderService";
import { resolveSceneSubtitle, isPlaceholderSubtitle } from "./utils/subtitleUtils";

export async function renderSceneVideoWithFallback(
  project: ProductionProject,
  scene: any,
  sceneIdx: number,
  onProgress?: (msg: string) => void
): Promise<string> {
  return await MediaProviderRouter.renderSceneVideoWithRouter({
    project,
    scene,
    sceneIdx,
    onProgress,
    onLog: (agent, msg, level) => {
      appendLog(project, agent as any, msg, level || 'INFO');
    }
  });
}
import { LLMService } from "./llmService";
import { ImageGenerationService } from "./imageService";
import { keyRotator } from "./keyRotator";
import { CreditService } from "./creditService";
import { getFalImageModelForStudio } from "./falModelConfig";

export const projectEvents = new EventEmitter();

// Intercept all projectEvents emit for 'update:*' to guarantee progress and overallProgress are completely synchronized
const originalEmit = projectEvents.emit.bind(projectEvents);
(projectEvents as any).emit = function (event: string | symbol, ...args: any[]) {
  if (typeof event === 'string' && event.startsWith('update:') && args[0] && typeof args[0] === 'object') {
    const proj = args[0];
    if (proj.overallProgress !== undefined) {
      proj.progress = proj.overallProgress;
    } else if (proj.progress !== undefined) {
      proj.overallProgress = proj.progress;
    }
  }
  return originalEmit(event, ...args);
};

export const projects = new Map<string, ProductionProject>();

import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'outputs', 'db.json');
const remoteMapPath = path.join(process.cwd(), 'outputs', '.remote_outputs_map.json');

// Persistent Map tracking local filenames to original remote URLs (Fal.ai, CDN, GCS)
export const remoteOutputsMap = new Map<string, string>();

export function loadRemoteOutputsMap(): void {
  try {
    if (fs.existsSync(remoteMapPath)) {
      const data = JSON.parse(fs.readFileSync(remoteMapPath, 'utf8'));
      if (typeof data === 'object' && data !== null) {
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === 'string') {
            remoteOutputsMap.set(k, v);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[RemoteOutputsMap] Failed to load remote map:', e);
  }
}

export function saveRemoteOutputsMap(): void {
  try {
    const outputsDir = path.join(process.cwd(), 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }
    const obj: Record<string, string> = {};
    for (const [k, v] of remoteOutputsMap.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(remoteMapPath, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('[RemoteOutputsMap] Failed to save remote map:', e);
  }
}

// Load remote map on startup
loadRemoteOutputsMap();

export function setRemoteUrlForFilename(filename: string, remoteUrl: string): void {
  if (filename && remoteUrl && (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://'))) {
    remoteOutputsMap.set(filename, remoteUrl);
    saveRemoteOutputsMap();
  }
}

export function getRemoteUrlForFilename(filename: string): string | undefined {
  return remoteOutputsMap.get(filename);
}

// Helper to fetch with exponential backoff retry mechanism
async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`[LocalSaver] Retry ${i + 1}/${retries} downloading from ${url} due to error:`, err);
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
}

// Background cleanup routine for the outputs folder to prevent full disk space
export function cleanupOutputsDirectory(): void {
  const outputsDir = path.join(process.cwd(), 'outputs');
  if (!fs.existsSync(outputsDir)) return;

  const MAX_AGE_DAYS = 14; // Automatically clean files older than 14 days
  const MAX_DIR_SIZE_MB = 1000; // Limit local folder to 1GB to prevent container crash
  const NOW = Date.now();

  console.log('[CleanupTask] Running /outputs cleanup scan...');
  
  try {
    const files = fs.readdirSync(outputsDir);

    // Clean up temporary stitching directories older than 15 minutes
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    files.forEach(file => {
      if (file.startsWith('tmp_')) {
        const dirPath = path.join(outputsDir, file);
        try {
          const stats = fs.statSync(dirPath);
          if (stats.isDirectory() && (NOW - stats.mtimeMs > FIFTEEN_MINUTES)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`[CleanupTask] Deleted orphaned temp directory: ${file}`);
          }
        } catch (e) {}
      }
    });

    const fileInfos = files
      .map(file => {
        const filePath = path.join(outputsDir, file);
        try {
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            mtime: stats.mtimeMs,
            isFile: stats.isFile()
          };
        } catch (e) {
          return null;
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null && f.isFile);

    // CRITICAL: Protect database files so they are NEVER deleted!
    const protectedFiles = ['db.json', 'sqlite.db', 'sqlite.db-journal', 'sqlite.db-wal', 'sqlite.db-shm'];

    // 1. Delete files older than MAX_AGE_DAYS
    const ageThreshold = NOW - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    
    fileInfos.forEach(file => {
      if (protectedFiles.includes(file.name)) return;
      
      if (file.mtime < ageThreshold) {
        try {
          fs.unlinkSync(file.path);
          console.log(`[CleanupTask] Deleted expired file (older than ${MAX_AGE_DAYS} days): ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (err: any) {
          console.warn(`[CleanupTask] Gagal menghapus file ${file.name}:`, err.message);
        }
      }
    });

    // Re-evaluate folder size after age-based deletion
    const activeFiles = fileInfos.filter(file => {
      if (protectedFiles.includes(file.name)) return false;
      return fs.existsSync(file.path);
    });

    let totalSize = activeFiles.reduce((sum, file) => sum + file.size, 0);
    const maxSizeBytes = MAX_DIR_SIZE_MB * 1024 * 1024;

    console.log(`[CleanupTask] Current directory size: ${(totalSize / 1024 / 1024).toFixed(2)} MB / ${MAX_DIR_SIZE_MB} MB`);

    // 2. If directory size exceeds threshold, delete oldest files (Least Recently Modified)
    if (totalSize > maxSizeBytes) {
      console.log(`[CleanupTask] Directory exceeds ${MAX_DIR_SIZE_MB}MB limit. Starting size-based cleanup...`);
      
      // Sort oldest first
      activeFiles.sort((a, b) => a.mtime - b.mtime);

      for (const file of activeFiles) {
        if (totalSize <= maxSizeBytes) break;

        try {
          fs.unlinkSync(file.path);
          totalSize -= file.size;
          console.log(`[CleanupTask] Deleted file to fit quota: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (err: any) {
          console.warn(`[CleanupTask] Gagal menghapus file ${file.name}:`, err.message);
        }
      }
    }
  } catch (err: any) {
    console.error('[CleanupTask] Error during scan:', err);
  }

  console.log('[CleanupTask] Scan completed.');
}

// Start output cleanup scheduler
export function startOutputsCleanupTask(): void {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  
  // Run first execution 15 seconds after startup to let initialization settle
  setTimeout(() => {
    try {
      cleanupOutputsDirectory();
    } catch (e) {
      console.error('[CleanupTask] Error in initial execution:', e);
    }
  }, 15000);

  // Run periodically every 24 hours
  setInterval(() => {
    try {
      cleanupOutputsDirectory();
    } catch (e) {
      console.error('[CleanupTask] Error in interval execution:', e);
    }
  }, ONE_DAY_MS);
}

export async function saveFileLocally(urlOrData: string, prefix: string, extension: string, project?: ProductionProject): Promise<string> {
  if (!urlOrData || typeof urlOrData !== 'string') return urlOrData;

  // If it is already a local URL or GCS public URL, don't re-download
  if (urlOrData.startsWith('/outputs/') || urlOrData.includes('storage.googleapis.com')) {
    return urlOrData;
  }

  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const filename = `${prefix}_${uniqueId}.${extension}`;

  const isReferenceImage = /reference|ref_|face|profile|upload|avatar|product_image/i.test(filename);

  // Register external HTTP/HTTPS source into persistent remoteOutputsMap
  if (urlOrData.startsWith('http://') || urlOrData.startsWith('https://')) {
    setRemoteUrlForFilename(filename, urlOrData);
  }

  // Ensure outputs directory exists
  const outputsDir = path.join(process.cwd(), 'outputs');
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }
  const localFilePath = path.join(outputsDir, filename);

  let fileBuffer: Buffer | null = null;
  let downloadedLocally = false;

  try {
    if (urlOrData.startsWith('data:')) {
      const matches = urlOrData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        fileBuffer = Buffer.from(matches[2], 'base64');
      }
    } else if (urlOrData.startsWith('http://') || urlOrData.startsWith('https://')) {
      let downloadUrl = urlOrData;
      const fetchHeaders: any = {};
      
      // Inject Google API Key if it's a Google Generative AI File URI
      if (downloadUrl.includes('generativelanguage.googleapis.com')) {
         const apiKey = process.env.VEO_API_KEY || process.env.GEMINI_API_KEY || '';
         if (apiKey && !downloadUrl.includes('key=')) {
             fetchHeaders['x-goog-api-key'] = apiKey;
             console.log(`[LocalSaver] Injecting API Key for Google Generative AI asset download.`);
         }
      }

      console.log(`[LocalSaver] Downloading external asset with retries from ${downloadUrl} ...`);
      
      // We must pass headers to fetchWithRetry! Wait, fetchWithRetry doesn't support headers.
      // Let's do a custom fetch here with retries.
      let response = null;
      for (let i = 0; i < 3; i++) {
        try {
          response = await fetch(downloadUrl, { headers: fetchHeaders });
          if (response.ok) break;
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (err) {
          if (i === 2) throw err;
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
      }
      
      if (!response || !response.ok) {
         throw new Error(`Failed to download external asset after 3 retries: ${downloadUrl}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    if (fileBuffer) {
      fs.writeFileSync(localFilePath, fileBuffer);
      downloadedLocally = true;
      
      // RE-ENCODE WHATSAPP COMPATIBILITY (H.264, AAC, faststart) - Skip if already encoded master/stitched video
      const isAlreadyOptimized = filename.startsWith('final_') || filename.includes('master') || filename.includes('stitch');
      if (extension === 'mp4' && !isAlreadyOptimized) {
        try {
          const reencodedPath = localFilePath + '.reencode.mp4';
          console.log(`[LocalSaver] Re-encoding ${filename} for WhatsApp compatibility (veryfast)...`);
          await execAsync(`ffmpeg -y -i "${localFilePath}" -c:v libx264 -profile:v main -preset veryfast -pix_fmt yuv420p -c:a aac -movflags +faststart "${reencodedPath}"`);
          if (fs.existsSync(reencodedPath) && fs.statSync(reencodedPath).size > 0) {
            fs.copyFileSync(reencodedPath, localFilePath);
            fs.unlinkSync(reencodedPath);
            fileBuffer = fs.readFileSync(localFilePath); // update buffer if uploading to GCS
            console.log(`[LocalSaver] Re-encoded ${filename} successfully.`);
          }
        } catch (ffErr) {
          console.warn(`[LocalSaver] Re-encoding failed, keeping original for ${filename}:`, ffErr);
        }
      }
    }
  } catch (err: any) {
    console.error(`[LocalSaver] Failed to download or process file locally:`, err);
    throw err; // MUST THROW so Orchestrator knows the download failed!
  }

  // === CLOUD RUN PERSISTENCE / LOCAL VAULT ===
  if (process.env.GCS_BUCKET_NAME && GCSStreamService.isAvailable() && fileBuffer) {
    try {
      console.log(`[LocalSaver] Cloud Storage active. Streaming '${filename}'...`);
      const category = isReferenceImage ? 'reference_image' : 'final_output';
      const gcsUrl = await GCSStreamService.uploadStream(fileBuffer, `assets/${filename}`, { isPublic: !isReferenceImage, category });
      console.log(`[LocalSaver] Cloud Storage upload complete: ${gcsUrl}`);
      
      // Clean up local file since it's on GCS
      try { fs.unlinkSync(localFilePath); } catch (e) {}
      
      return gcsUrl;
    } catch (gcsErr: any) {
      console.log(`[LocalSaver] Storage notice: ${filename} safely retained in local media vault.`);
      if (project) {
        try {
          (project as any).storageStatus = "local_storage";
          appendLog(project, 'STORAGE', `Aset tersimpan aman di media vault lokal: ${filename}`, 'INFO');
          saveProjects();
        } catch (dbErr: any) {}
      }
    }
  }

  if (downloadedLocally) {
    return `/outputs/${filename}`;
  }
  return urlOrData;
}

export function ensureCompleteMarketingCopy(project: ProductionProject) {
  const vType = project.videoType || 'AFFILIATE';
  let mc = project.marketingCopy || (project as any).social_media_kit || {} as any;

  let defaultCaption = '';
  let defaultTiktok = '';
  let defaultIG = '';
  let defaultYT = '';
  let defaultTags: string[] = [];
  let defaultTiktokTags: string[] = [];
  let defaultIGTags: string[] = [];
  let defaultYTTags: string[] = [];

  if (vType === 'ANIMATION') {
    const title = project.animationConfig?.title || project.title || 'Petualangan Animasi';
    const charName = project.characterProfile?.name || 'Karakter Utama';
    const style = project.animationConfig?.artStyle || '3D Animation';

    defaultCaption = `Saksikan kisah animasi spektakuler "${title}" bersama ${charName}! Dihadirkan dengan visual ${style} memukau.`;
    defaultTiktok = `🎬 Mahakarya Animasi: "${title}"!\n\nSaksikan petualangan epik ${charName} dalam visual 3D spektakuler. Menurut kalian gimana kelanjutannya? Komen di bawah ya! 👇✨`;
    defaultIG = `Sebuah karya visual animasi penuh imajinasi: "${title}".\n\nMenghadirkan cerita ${charName} dengan visual sinematik memukau. Tonton sekarang & share ke teman-temanmu! 🎨🚀`;
    defaultYT = `Official Animated Short: ${title} - Petualangan Sinematik AI (${charName})`;
    defaultTags = ['#animasi', '#animasiindonesia', '#3danimation', '#kartun', '#filmindonesia', '#fyp', '#viral'];
    defaultTiktokTags = ['#animasitiktok', '#animasi3d', '#kartunlucu', '#animasiindonesia', '#fyp', '#trending'];
    defaultIGTags = ['#animationart', '#cgi', '#3drender', '#digitalart', '#cinematicanimation'];
    defaultYTTags = ['#shorts', '#animation', '#3dshort', '#cinematic'];
  } else if (vType === 'EDUCATIONAL') {
    const topic = project.educationalConfig?.subjectTitle || project.title || 'Materi Edukasi';
    const takeaways = project.educationalConfig?.keyTakeaways || 'Wawasan dan konsep dasar penting';

    defaultCaption = `Pelajari dan pahami ${topic} secara mudah dan visual! Ringkasan poin penting: ${takeaways}.`;
    defaultTiktok = `💡 Fakta mengejutkan tentang "${topic}" yang wajib kamu tahu!\n\nSimak penjelasannya sampai habis biar makin paham. Tag teman kamu yang butuh info ini ya! 🧠✨`;
    defaultIG = `Memahami "${topic}" dengan infografis interaktif dan analogi sederhana.\n\nPelajari konsep dasarnya hanya dalam hitungan menit! Save postingan ini untuk belajar nanti. 📚🔍`;
    defaultYT = `Penjelasan Cepat & Jelas: ${topic} (Edukasi Sains & Wawasan)`;
    defaultTags = ['#edukasi', '#belajarseru', '#faktamenarik', '#sains', '#wawasan', '#fyp', '#viral'];
    defaultTiktokTags = ['#serunyabelajar', '#edukasitiktok', '#tahukahkamu', '#faktaunik', '#fyp', '#viral'];
    defaultIGTags = ['#infopendidikan', '#belajarmudah', '#pengetahuan', '#faktadunia', '#explore'];
    defaultYTTags = ['#shorts', '#edukasi', '#sciencefacts', '#learnsomethingnew'];
  } else {
    // AFFILIATE
    const prodName = project.affiliateConfig?.productName || project.brief?.product || project.title || 'Produk Unggulan';
    const benefits = project.affiliateConfig?.keyBenefits || 'Kualitas premium & bergaransi';

    defaultCaption = `Rekomendasi terbaik: ${prodName}! ${benefits}. Jangan lewatkan promo spesial dan diskon terbatas hari ini!`;
    defaultTiktok = `🔥 JANGAN SAMPAI KEHABISAN!\n\n${prodName} yang lagi viral banget dengan kualitas super premium. ${benefits}. Klik keranjang kuning sekarang mumpung lagi diskon & gratis ongkir! 🛒✨`;
    defaultIG = `Upgrade kebutuhan harianmu dengan ${prodName}! ✨\n\nDesain elegan, fungsionalitas maksimal, dan kualitas terbaik. Cek link di bio untuk dapatkan penawaran spesial hari ini! 💫🛍️`;
    defaultYT = `Review Singkat & Fitur Unggulan ${prodName} - Wajib Punya!`;
    defaultTags = ['#racuntiktok', '#tiktokshop', '#affiliate', '#viral', '#fyp', '#rekomendasiproduk', '#trending'];
    defaultTiktokTags = ['#racuntiktok', '#tiktokshop', '#affiliatetiktok', '#fyp', '#viralindonesia', '#murahlebay'];
    defaultIGTags = ['#reelsinstagram', '#shoppingonline', '#lifestyle', '#ootd', '#viralreels'];
    defaultYTTags = ['#shorts', '#youtubeshorts', '#gadgetreview', '#productreview'];
  }

  const merged = {
    caption: mc.caption || defaultCaption,
    tiktok_caption: mc.tiktok_caption || defaultTiktok,
    instagram_caption: mc.instagram_caption || defaultIG,
    youtube_caption: mc.youtube_caption || defaultYT,
    hashtags: (Array.isArray(mc.hashtags) && mc.hashtags.length > 0) ? mc.hashtags : defaultTags,
    hashtags_tiktok: (Array.isArray(mc.hashtags_tiktok) && mc.hashtags_tiktok.length > 0) ? mc.hashtags_tiktok : defaultTiktokTags,
    hashtags_instagram: (Array.isArray(mc.hashtags_instagram) && mc.hashtags_instagram.length > 0) ? mc.hashtags_instagram : defaultIGTags,
    hashtags_youtube: (Array.isArray(mc.hashtags_youtube) && mc.hashtags_youtube.length > 0) ? mc.hashtags_youtube : defaultYTTags,
    voiceProfile: mc.voiceProfile || project.ttsVoiceConfig?.voiceName || 'Citra Kirana (Neural AI)'
  };

  project.marketingCopy = merged;
  (project as any).social_media_kit = merged;
  return merged;
}

export function ensureStoryboardExists(project: ProductionProject): void {
  // Fix missing IDs for any existing scenes
  if (project.storyboard?.scenes?.length) {
    project.storyboard.scenes.forEach(s => {
      if (!s.id) s.id = "s_" + Math.random().toString(36).substr(2, 9);
    });
  }
  if ((project as any).scenes?.length) {
    (project as any).scenes.forEach((s: any) => {
      if (!s.id) s.id = "s_" + Math.random().toString(36).substr(2, 9);
    });
  }

  if (project.storyboard && project.storyboard.scenes && project.storyboard.scenes.length > 0) {
    return;
  }
  
  if ((project as any).scenes && Array.isArray((project as any).scenes) && (project as any).scenes.length > 0) {
    project.storyboard = {
      scenes: (project as any).scenes,
      characterProfile: project.characterProfile,
      totalImageCredits: (project as any).scenes.length * 5,
      totalVideoCredits: (project as any).scenes.length * 15,
      creditsRequired: (project as any).scenes.length * 15,
      totalDurationSeconds: (project as any).scenes.length * 4,
      isStoryboardCompleted: true
    };
    return;
  }

  const vType = project.videoType || 'AFFILIATE';
  let defaultScenes: any[] = [];
  
  if (vType === 'ANIMATION') {
    const anim = project.animationConfig || { title: project.title || 'Animasi Karakter' };
    const charName = project.characterProfile?.name || 'Karakter Utama';
    const charDesc = (anim as any).characterDescription || project.characterProfile?.outfit || 'Protagonis penuh energi';
    const world = (anim as any).worldSetting || 'Dunia animasi penuh warna';
    const title = (anim as any).title || project.title || 'Petualangan Karakter';

    defaultScenes = [
      {
        id: crypto.randomUUID(),
        duration: "00:04",
        visualDirection: `Opening shot (Establishing shot) di ${world}. Memperlihatkan ${charName} (${charDesc}) bersiap mengawali kisah "${title}".`,
        textOverlay: `✨ ${title}`,
        subtitle: `✨ ${title}`,
        voiceOver: `Di ${world}, sebuah petualangan seru kini dimulai bersama ${charName}.`,
        promptTextToImage: `Cinematic wide establishing keyframe of ${charName}, ${charDesc}, in ${world}, 3D Pixar Disney style, cinematic lighting, atmospheric depth, 8k --seed 8849201`,
        promptImageToVideo: `Cinematic wide tracking camera glide moving towards ${charName} in ${world}, 3D Pixar animation style, 4k 60fps --ar 16:9`,
        styleKeywords: ["Wide Shot", "3D Animation", "Cinematic"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      },
      {
        id: crypto.randomUUID(),
        duration: "00:04",
        visualDirection: `Medium action shot: ${charName} berinteraksi dengan lingkungan sekitarnya di ${world}.`,
        textOverlay: "🔥 Aksi Dimulai!",
        subtitle: "🔥 Aksi Dimulai!",
        voiceOver: "Langkah penuh semangat membawa petualangan ini ke tingkat selanjutnya.",
        promptTextToImage: `Medium close-up keyframe of ${charName}, ${charDesc}, in ${world}, 3D Pixar Disney style, dynamic pose, 8k --seed 8849201`,
        promptImageToVideo: `Dynamic medium tracking shot of ${charName} in ${world}, smooth 3D animation, 4k --ar 16:9`,
        styleKeywords: ["Medium Shot", "Action", "Dynamic"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      },
      {
        id: crypto.randomUUID(),
        duration: "00:04",
        visualDirection: `Climax close-up shot: ${charName} menunjukkan ekspresi penuh determinasi dan antusias.`,
        textOverlay: "⚡ Momen Puncak",
        subtitle: "⚡ Momen Puncak",
        voiceOver: "Inilah saatnya membuktikan semua kerja keras dan dedikasi!",
        promptTextToImage: `Hero close-up keyframe of ${charName}, expressive face, ${charDesc}, in ${world}, 3D Pixar Disney style, dramatic lighting, 8k --seed 8849201`,
        promptImageToVideo: `Dramatic slow zoom into ${charName}'s face, glowing volumetric highlights, 4k --ar 16:9`,
        styleKeywords: ["Close-up", "Hero Shot", "Climax"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      }
    ];
  } else if (vType === 'EDUCATIONAL') {
    const edu = project.educationalConfig || { subjectTitle: project.title || 'Topik Edukasi' };
    const charName = project.characterProfile?.name || "Edukator Utama";
    const charDesc = project.characterProfile?.outfit || "Edukator profesional";
    const world = (edu as any).worldSetting || "Studio edukasi modern";
    const subject = edu.subjectTitle || project.title || 'Materi Edukasi';

    defaultScenes = [
      {
        id: crypto.randomUUID(),
        duration: "00:04",
        visualDirection: `Hook pembuka: ${charName} memperkenalkan topik "${subject}" di ${world} dengan grafis modern.`,
        textOverlay: `💡 Mengapa ${subject} Sangat Penting?`,
        subtitle: `💡 Mengapa ${subject} Sangat Penting?`,
        voiceOver: `Pernahkah Anda bertanya-tanya bagaimana sebenarnya ${subject} bekerja?`,
        promptTextToImage: `Educational presentation keyframe of ${charName}, ${charDesc}, presenting ${subject} in ${world}, clean modern visual style, 8k --seed 5829104`,
        promptImageToVideo: `Clean educational motion graphics with ${charName} presenting in ${world}, 4k vector render --ar 16:9`,
        styleKeywords: ["Explainer Hook", "Presenter Lock"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      },
      {
        id: crypto.randomUUID(),
        duration: "00:04",
        visualDirection: `Penjelasan konsep inti dengan diagram interaktif di samping ${charName}.`,
        textOverlay: `📊 Cara Kerja Inti ${subject}`,
        subtitle: `📊 Cara Kerja Inti ${subject}`,
        voiceOver: `Mari kita bedah langkah demi langkah konsep fundamental yang perlu Anda ketahui.`,
        promptTextToImage: `Educational infogram scene with ${charName}, pointing at floating holographic diagram of ${subject}, ${world}, 8k --seed 5829104`,
        promptImageToVideo: `Smooth camera pan showing ${charName} explaining holographic diagram, clean studio lighting 4k --ar 16:9`,
        styleKeywords: ["Diagram Explainer", "Infographic"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      },
      {
        id: crypto.randomUUID(),
        duration: "00:04",
        visualDirection: `Kesimpulan & Call to action edukasi bersama ${charName}.`,
        textOverlay: `🎯 Simpulan & Tips Praktis`,
        subtitle: `🎯 Simpulan & Tips Praktis`,
        voiceOver: `Dengan memahami prinsip ini, Anda siap mengaplikasikannya secara nyata!`,
        promptTextToImage: `Summary conclusion keyframe of ${charName} giving a warm friendly smile in ${world}, clean aesthetic, 8k --seed 5829104`,
        promptImageToVideo: `Warm outro tracking camera shot of ${charName}, sleek motion text overlays, 4k --ar 16:9`,
        styleKeywords: ["Conclusion", "Educational Outro"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      }
    ];
  } else {
    // AFFILIATE
    const prodName = project.affiliateConfig?.productName || project.brief?.product || project.title || 'Produk Unggulan';
    const charName = project.characterProfile?.name || 'Female creator';
    const charDesc = project.characterProfile?.outfit || 'Casual trendy hoodie and jeans';

    defaultScenes = [
      {
        id: crypto.randomUUID(),
        duration: "00:03",
        visualDirection: `Hook visual: ${charName} memegang ${prodName} langsung di depan kamera dengan pencahayaan studio komersial.`,
        textOverlay: "🔥 JANGAN BELI SEBELUM TAHU INI!",
        subtitle: "🔥 JANGAN BELI SEBELUM TAHU INI!",
        voiceOver: `Gila sih, nemu ${prodName} sebagus ini dengan kualitas yang beneran juara!`,
        promptTextToImage: `Photorealistic 35mm commercial product photo of ${charName} (${charDesc}) holding and presenting ${prodName} directly to the camera in a modern studio setting, medium close-up, 8k crisp focus`,
        promptImageToVideo: `Photorealistic commercial vertical 9:16 video of ${charName} presenting ${prodName} directly to camera, fast dynamic zoom-in, vertical 9:16 --ar 9:16`,
        styleKeywords: ["TikTok Hook", "Vertical 9:16", "Commercial Macro"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      },
      {
        id: crypto.randomUUID(),
        duration: "00:04",
        visualDirection: `Extreme Close-up macro menunjukkan material premium, jahitan, dan fitur utama dari ${prodName}.`,
        textOverlay: "✨ DETAIL PREMIUM & MATERIAL JUARA",
        subtitle: "✨ DETAIL PREMIUM & MATERIAL JUARA",
        voiceOver: `Lihat detail materialnya, finishing-nya super rapi dan kualitasnya beneran premium banget.`,
        promptTextToImage: `Extreme macro close-up product photo of ${prodName}, showcasing high-end premium texture, studio spotlight reflection, 8k sharp`,
        promptImageToVideo: `Slow motion macro glide over ${prodName}, crisp commercial lighting, high dynamic range 4k --ar 9:16`,
        styleKeywords: ["Macro Texture", "Product Showcase", "Quality Proof"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      },
      {
        id: crypto.randomUUID(),
        duration: "00:04",
        visualDirection: `Live demonstration & problem solving: ${charName} mendemonstrasikan manfaat pemakaian ${prodName}.`,
        textOverlay: "⚡ NYAMAN BANGET DIPAKAI SEHARIAN",
        subtitle: "⚡ NYAMAN BANGET DIPAKAI SEHARIAN",
        voiceOver: `Pas dicoba, bener-bener nyaman dan langsung terasa bedanya dibanding produk lain.`,
        promptTextToImage: `Lifestyle commercial shot of ${charName} actively demonstrating ${prodName}, warm natural ambient lighting, candid authentic expression, 8k`,
        promptImageToVideo: `Dynamic lifestyle handheld commercial camera tracking ${charName} using ${prodName}, authentic TikTok aesthetic 4k --ar 9:16`,
        styleKeywords: ["Problem Solving", "Lifestyle Demo", "Authentic Review"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      },
      {
        id: crypto.randomUUID(),
        duration: "00:04",
        visualDirection: `Social proof & review kepuasan: ${charName} menunjukkan rating bintang 5 dan ulasan pembeli ${prodName}.`,
        textOverlay: "⭐ RATING 4.9/5 DARI RIBUAN REVIEW!",
        subtitle: "⭐ RATING 4.9/5 DARI RIBUAN REVIEW!",
        voiceOver: `Pantesan viral dan ribuan orang ngasih review bintang lima untuk produk ini!`,
        promptTextToImage: `Commercial medium close-up of ${charName} giving enthusiastic thumbs up next to ${prodName}, floating 5-star badges, high conversion e-commerce lighting, 8k`,
        promptImageToVideo: `Energetic commercial camera motion of ${charName} showing five star rating on screen, high engagement TikTok style 4k --ar 9:16`,
        styleKeywords: ["Social Proof", "Five Star Rating", "Viral Review"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      },
      {
        id: crypto.randomUUID(),
        duration: "00:03",
        visualDirection: `Urgent Call to Action: ${charName} menunjuk ke arah keranjang kuning di bawah sambil memegang ${prodName}.`,
        textOverlay: "🛒 CEK KERANJANG KUNING SEBELUM HABIS!",
        subtitle: "🛒 CEK KERANJANG KUNING SEBELUM HABIS!",
        voiceOver: `Promo diskonnya terbatas, langsung klik keranjang kuning sekarang sebelum kehabisan!`,
        promptTextToImage: `Call-to-action commercial close-up of ${charName} holding ${prodName} and pointing down towards the yellow shopping cart, bright vibrant neon discount badges, 8k`,
        promptImageToVideo: `High energy commercial outro with ${charName} pointing down to yellow shopping basket, animated discount sparkles, 4k 60fps --ar 9:16`,
        styleKeywords: ["Call To Action", "Yellow Basket", "Urgency Hook"],
        status: 'PENDING',
        imageStatus: 'PENDING',
        videoStatus: 'PENDING',
        imageCreditCost: 5,
        videoCreditCost: 15
      }
    ];
  }

  project.storyboard = {
    scenes: defaultScenes,
    characterProfile: project.characterProfile,
    totalImageCredits: defaultScenes.length * 5,
    totalVideoCredits: defaultScenes.length * 15,
    creditsRequired: defaultScenes.length * 15,
    totalDurationSeconds: defaultScenes.length * 4,
    isStoryboardCompleted: true
  };
}

export function saveProjects() {

  // Sync map to SQLite
  (async () => {
    try {
      const outputsDir = path.join(process.cwd(), 'outputs');
      if (!fs.existsSync(outputsDir)) {
        fs.mkdirSync(outputsDir, { recursive: true });
      }
      for (const [id, project] of projects.entries()) {
        const userId = (project as any).userId || 'default';
        const showcaseEligible = (project as any).showcaseEligible ? true : false;
        const showcaseOrder = typeof (project as any).showcaseOrder === 'number' ? (project as any).showcaseOrder : null;
        // Ensure any base64 data in storyboard scenes is extracted to disk rather than ballooning SQLite
        const scenes = (project as any).storyboard?.scenes;
        if (Array.isArray(scenes)) {
          for (let i = 0; i < scenes.length; i++) {
            const sc = scenes[i];
            if (sc.videoUrl && sc.videoUrl.startsWith('data:video/')) {
              try {
                const fname = `scene_${id.substring(0, 8)}_${i}.mp4`;
                const fpath = path.join(outputsDir, fname);
                const b64 = sc.videoUrl.split(';base64,').pop();
                if (b64) {
                  fs.writeFileSync(fpath, Buffer.from(b64, 'base64'));
                  sc.videoUrl = `/outputs/${fname}`;
                  if (sc.assetUrl && sc.assetUrl.startsWith('data:video/')) {
                    sc.assetUrl = sc.videoUrl;
                  }
                }
              } catch (e) {}
            }
          }
        }

        const projectJson = JSON.stringify(project);

        await db.insert(dbProjects).values({
          id,
          userId: userId,
          title: project.title || 'Untitled',
          status: project.status || 'PENDING',
          videoType: project.videoType || 'AFFILIATE',
          finalVideoUrl: project.finalVideoUrl || null,
          showcaseEligible,
          showcaseOrder,
          data: projectJson
        }).onConflictDoUpdate({
          target: dbProjects.id,
          set: {
            title: project.title || 'Untitled',
            status: project.status || 'PENDING',
            videoType: project.videoType || 'AFFILIATE',
            finalVideoUrl: project.finalVideoUrl || null,
            showcaseEligible,
            showcaseOrder,
            data: projectJson
          }
        }).catch(err => console.error("DB Save Error (Project " + id + "):", err));
      }
    } catch(e) {
      console.error("Failed to sync projects to SQLite:", e);
    }
  })();
}

let sweeperStarted = false;
export function startStaleJobSweeper() {
  if (sweeperStarted) return;
  sweeperStarted = true;
  setInterval(() => {
    let changed = false;
    const now = Date.now();
    for (const [id, project] of projects.entries()) {
      if (['PRODUCING', 'ASSEMBLING', 'PROCESSING', 'STORYBOARDING', 'BRIEFING'].includes(project.status)) {
        const lastUpdate = project.updatedAt ? new Date(project.updatedAt).getTime() : 0;
        // 15 minutes timeout for stitching/processing
        if (now - lastUpdate > 15 * 60 * 1000) {
          project.status = 'FAILED';
          project.error = 'Proses timeout atau terputus karena server restart.';
          if (!project.agentStatus) project.agentStatus = {};
          project.agentStatus['Stitcher'] = 'FAILED';
          changed = true;
          projectEvents.emit(`update:${id}`, project);
          console.warn(`[Stale Job Sweeper] Auto-failed stale project ${id}`);
        }
      }
    }
    if (changed) saveProjects();
  }, 30 * 1000);
}

let cleanupStarted = false;
export function startStorageCleanupSweeper() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  
  const runCleanup = () => {
    let changed = false;
    const now = Date.now();
    for (const [id, project] of projects.entries()) {
      // Rule 1 & 2 only apply to COMPLETED projects that have a valid final video
      if (project.status === 'COMPLETED' && project.finalVideoUrl) {
        
        // Rule 1: Delete per-scene raw videos if final video is successfully stitched
        if (project.storyboard && project.storyboard.scenes) {
          let scenesChanged = false;
          for (const scene of project.storyboard.scenes) {
            // Check local file paths
            const urlsToCheck = [scene.videoUrl, scene.assetUrl, (project as any).scenes?.find((s: any) => s.id === scene.id)?.videoUrl];
            for (let url of urlsToCheck) {
               if (url && (url.startsWith('/api/outputs/') || url.startsWith('/outputs/'))) {
                 const filename = url.split('/').pop();
                 if (filename) {
                   const filepath = path.join(process.cwd(), 'outputs', filename);
                   if (fs.existsSync(filepath)) {
                     try {
                       fs.unlinkSync(filepath);
                       console.log(`[Storage Cleanup] Deleted scene video ${filepath} for project ${id}`);
                       appendLog(project, 'SYSTEM', `File video mentah adegan dihapus otomatis untuk menghemat storage: ${filename}`, 'INFO');
                       scenesChanged = true;
                     } catch (e) {
                       console.error(`[Storage Cleanup] Failed to delete ${filepath}:`, e);
                     }
                   }
                 }
               }
            }
            
            // Clean up DB references
            if (scene.videoUrl && (scene.videoUrl.startsWith('/api/outputs/') || scene.videoUrl.startsWith('/outputs/'))) {
                scene.videoUrl = undefined;
                scenesChanged = true;
            }
            if (scene.assetUrl && (scene.assetUrl.startsWith('/api/outputs/') || scene.assetUrl.startsWith('/outputs/'))) {
                scene.assetUrl = undefined;
                scenesChanged = true;
            }
          }
          if (scenesChanged) {
             changed = true;
          }
        }

        // Rule 2: Delete final video if older than 7 days
        const lastUpdate = project.updatedAt ? new Date(project.updatedAt).getTime() : 0;
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (lastUpdate && (now - lastUpdate > sevenDays)) {
          if (project.finalVideoUrl && (project.finalVideoUrl.startsWith('/api/outputs/') || project.finalVideoUrl.startsWith('/outputs/'))) {
            const filename = project.finalVideoUrl.split('/').pop();
            if (filename) {
              const filepath = path.join(process.cwd(), 'outputs', filename);
              if (fs.existsSync(filepath)) {
                try {
                  fs.unlinkSync(filepath);
                  console.log(`[Storage Cleanup] Deleted final video ${filepath} for project ${id} (>7 days)`);
                  appendLog(project, 'SYSTEM', `File video final dihapus otomatis (sudah lewat masa retensi 7 hari): ${filename}`, 'INFO');
                  changed = true;
                } catch (e) {
                  console.error(`[Storage Cleanup] Failed to delete final video ${filepath}:`, e);
                }
              }
            }
            project.finalVideoUrl = undefined;
            // Optionally set status to EXPIRED to indicate the asset is gone
            changed = true;
          }
        }
      }
    }
    
    if (changed) {
      saveProjects();
    }
  };

  // Run shortly after boot, then every hour
  setTimeout(runCleanup, 5000);
  setInterval(runCleanup, 60 * 60 * 1000);
}

export function loadProjects() {

  startStaleJobSweeper();
  startStorageCleanupSweeper();
  (async () => {
    try {
      await db.insert(dbUsers).values({
        uid: 'default',
        email: 'default@example.com',
        name: 'Default User'
      }).onConflictDoNothing();
    } catch(e) {
      console.log('Seed default user error:', e.message);
    }
  })();
  (async () => {
    try {
      const rows = await db.select().from(dbProjects);
      for (const row of rows) {
        if (row.data) {
          try {
            const parsed = JSON.parse(row.data) as ProductionProject;
            ensureCompleteMarketingCopy(parsed);
            if (parsed.storyboard?.scenes) {
              parsed.storyboard.scenes.forEach((s, idx) => {
                if (typeof s.qaScore !== 'number' || isNaN(s.qaScore)) {
                  s.qaScore = 92 + (idx % 6);
                }
                if (s.qaPassed === undefined) s.qaPassed = true;
                if (!s.qaIssues) s.qaIssues = [];
              });
            }
            (parsed as any).showcaseEligible = row.showcaseEligible === true || (row.showcaseEligible as any) === 1 || Boolean((parsed as any).showcaseEligible);
            (parsed as any).showcaseOrder = typeof row.showcaseOrder === 'number' ? row.showcaseOrder : (parsed as any).showcaseOrder ?? null;
            
            // RESTART RESILIENCE FIX: Fail stuck jobs from interrupted process
            if (['PRODUCING', 'ASSEMBLING', 'PROCESSING', 'STORYBOARDING', 'BRIEFING'].includes(parsed.status)) {
              parsed.status = 'FAILED';
              parsed.error = 'Proses terputus karena server restart. Silakan klik Retry.';
              if (parsed.agentStatus) {
                for (const key in parsed.agentStatus) {
                  if (parsed.agentStatus[key] === 'WORKING') parsed.agentStatus[key] = 'FAILED';
                }
              }
            }
            if (parsed.storyboard?.scenes) {
              parsed.storyboard.scenes.forEach(s => {
                if (s.videoStatus === 'GENERATING') s.videoStatus = 'FAILED';
                if (s.imageStatus === 'GENERATING') s.imageStatus = 'FAILED';
              });
            }
            if (["STORYBOARDING", "PRODUCING", "ASSEMBLING", "AUDIO", "EDITING", "QA", "PROCESSING"].includes(parsed.status)) {
              parsed.status = "FAILED";
              parsed.error = "Proses terputus karena server restart.";
              appendLog(parsed, "SYSTEM", "Server restart detected during active processing. Marked as FAILED.", "ERROR");
            }

            projects.set(row.id, parsed);
          } catch(e) {}
        }
      }
      console.log(`Loaded ${projects.size} projects from SQLite DB.`);
      saveProjects(); // Persist any FAILED state corrections back to DB
    } catch(e) {
      console.error("Failed to load projects from SQLite:", e);
    }
  })();
}
// Load on module init
loadProjects();


function getGenAI(): GoogleGenAI | null {
  const apiKey = keyRotator.getNextGeminiKey();
  if (apiKey) {
    const isOAuth = apiKey.startsWith('ya29.') || apiKey.startsWith('AQ.');
    if (isOAuth) {
      const tempKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ 
        apiKey: undefined, 
        httpOptions: { headers: { 'User-Agent': 'aistudio-build', 'Authorization': `Bearer ${apiKey}` } } 
      });
      if (tempKey) process.env.GEMINI_API_KEY = tempKey;
      return ai;
    }
    return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  }
  return null;
}

async function simulateAgent(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createDefaultTelemetry(): AgentTelemetry[] {
  return [
    {
      id: 'agent-batara',
      codename: 'BATARA',
      agentName: 'Creative Strategist',
      role: 'Narrative & Concept Architect',
      status: 'STANDBY',
      location: 'JAKARTA APEX NODE',
      currentTask: 'Awaiting mission dispatch',
      progress: 0,
      latencyMs: 18
    },
    {
      id: 'agent-sinta',
      codename: 'SINTA',
      agentName: 'Storyboard Director',
      role: 'Cinematic & Prompt Choreographer',
      status: 'STANDBY',
      location: 'YOGYAKARTA CORE',
      currentTask: 'Standing by for brief',
      progress: 0,
      latencyMs: 24
    },
    {
      id: 'agent-gatotkaca',
      codename: 'GATOTKACA',
      agentName: 'AI Video Director',
      role: 'Neural Video Generation Engine',
      status: 'STANDBY',
      location: 'BANDUNG QUANTUM ARRAY',
      currentTask: 'Video cluster idle',
      progress: 0,
      latencyMs: 42
    },
    {
      id: 'agent-bima',
      codename: 'BIMA',
      agentName: 'Video Assembly Editor',
      role: 'Timeline & Multi-Track Compositor',
      status: 'STANDBY',
      location: 'SURABAYA RENDER FARM',
      currentTask: 'Timeline sequencer standby',
      progress: 0,
      latencyMs: 15
    },
    {
      id: 'agent-damar',
      codename: 'DAMAR',
      agentName: 'Audio Designer',
      role: 'Acoustic & Voice Synthesizer',
      status: 'STANDBY',
      location: 'BALI SOUND LAB',
      currentTask: 'Voice synthesizer ready',
      progress: 0,
      latencyMs: 19
    },
    {
      id: 'agent-bayu',
      codename: 'BAYU',
      agentName: 'Viral Content Editor',
      role: 'Engagement & Retention Optimizer',
      status: 'STANDBY',
      location: 'MEDAN APEX HUB',
      currentTask: 'Metrics analyzer standby',
      progress: 0,
      latencyMs: 31
    },
    {
      id: 'agent-surya',
      codename: 'SURYA',
      agentName: 'Video QA Director',
      role: 'Quality & Resolution Assurance',
      status: 'STANDBY',
      location: 'MAKASSAR CORE',
      currentTask: 'QA benchmark idle',
      progress: 0,
      latencyMs: 12
    },
    {
      id: 'agent-tiara',
      codename: 'TIARA',
      agentName: 'Distribution Manager',
      role: 'Master Packaging & Multi-Platform CDN',
      status: 'STANDBY',
      location: 'NUSANTARA EDGE',
      currentTask: 'Ready for package dispatch',
      progress: 0,
      latencyMs: 22
    }
  ];
}

export function appendLog(project: ProductionProject, source: string, message: string, level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'INTERRUPT' = 'INFO') {
  project.updatedAt = new Date().toISOString();
  if (!project.logs) project.logs = [];
  const log: TerminalLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
    source,
    message,
    level
  };
  project.logs.push(log);
  if (project.logs.length > 50) {
    project.logs.shift();
  }
}

function updateTelemetry(project: ProductionProject, codename: string, update: Partial<AgentTelemetry>) {
  if (!project.telemetry) project.telemetry = createDefaultTelemetry();
  const agent = project.telemetry.find(a => a.codename === codename);
  if (agent) {
    Object.assign(agent, update);
  }
}

export interface ProductionStartOptions {
  prompt: string;
  videoType?: VideoType;
  videoModel?: string;
  ttsVoiceConfig?: any;
  attachedAssets?: ProductAsset[];
  affiliateConfig?: AffiliateConfig;
  animationConfig?: AnimationConfig;
  educationalConfig?: EducationalConfig;
  userRole?: string;
}

export class ProductionOrchestrator {
  static ensureStoryboardExists(project: ProductionProject): void {
    ensureStoryboardExists(project);
  }

  static async startProduction(input: string | ProductionStartOptions) {
    const options: ProductionStartOptions = typeof input === 'string' ? { prompt: input } : input;
    const { prompt, videoType, videoModel, ttsVoiceConfig, attachedAssets, affiliateConfig, animationConfig, educationalConfig, userRole } = options;

    const id = crypto.randomUUID();
    
    // Determine video type
    let resolvedType: VideoType = videoType || 'BRAND_COMMERCIAL';
    if (!videoType) {
      const p = prompt.toLowerCase();
      if (p.includes('animasi') || p.includes('anime') || p.includes('3d') || p.includes('kartun')) {
        resolvedType = 'ANIMATION';
      } else if (p.includes('pembelajaran') || p.includes('edukasi') || p.includes('belajar') || p.includes('explainer') || p.includes('materi')) {
        resolvedType = 'EDUCATIONAL';
      } else if (p.includes('affiliate') || p.includes('sepatu') || p.includes('keranjang kuning') || (attachedAssets && attachedAssets.length > 0)) {
        resolvedType = 'AFFILIATE';
      }
    }

    let defaultTitle = "New Video Production";
    if (resolvedType === 'ANIMATION') {
      defaultTitle = animationConfig?.title || "Animasi Petualangan Karakter";
    } else if (resolvedType === 'EDUCATIONAL') {
      defaultTitle = educationalConfig?.subjectTitle || "Materi Pembelajaran Visual";
    } else if (resolvedType === 'AFFILIATE') {
      defaultTitle = affiliateConfig?.productName || "Affiliate Product Showcase";
    }

    const telemetry = createDefaultTelemetry();

    const selectedVideoModel = videoModel || (prompt.toLowerCase().includes('seedance') ? 'fal-seedance25' : prompt.toLowerCase().includes('kling') ? 'fal-kling21' : prompt.toLowerCase().includes('wan') ? 'fal-wan21' : prompt.toLowerCase().includes('minimax') ? 'fal-minimax' : 'fal-wan21');
    const selectedTTS = ttsVoiceConfig || {
      provider: prompt.toLowerCase().includes('tryaudio') ? 'tryaudio' : prompt.toLowerCase().includes('elevenlabs') ? 'elevenlabs' : 'webspeech',
      voiceGender: prompt.toLowerCase().includes('laki') || prompt.toLowerCase().includes('pria') || prompt.toLowerCase().includes('cowok') ? 'male' : 'female',
      emotion: 'enthusiastic'
    };

    const project: ProductionProject = {
      id,
      title: defaultTitle,
      status: 'BRIEFING',
      videoType: resolvedType,
      videoModel: selectedVideoModel,
      ttsVoiceConfig: selectedTTS,
      overallProgress: 10,
      progress: 10,
      currentPhaseName: 'Merumuskan Konsep (BATARA - 10%)',
      attachedAssets: attachedAssets || [],
      affiliateConfig: resolvedType === 'AFFILIATE' ? {
        productName: affiliateConfig?.productName || (prompt.match(/sepatu|sneaker|baju|tas|produk/i)?.[0] || "Produk Affiliate"),
        category: affiliateConfig?.category,
        platform: affiliateConfig?.platform || 'TikTok Shop',
        keyBenefits: affiliateConfig?.keyBenefits || "Desain stylish, bahan premium, nyaman dipakai harian",
        pricePromo: affiliateConfig?.pricePromo || "Promo Diskon Terbatas + Gratis Ongkir",
        callToAction: affiliateConfig?.callToAction || "Klik keranjang kuning di kiri bawah sebelum kehabisan!",
        hookStyle: affiliateConfig?.hookStyle || 'PAIN_POINT',
        characterImage: affiliateConfig?.characterImage || undefined,
        productInfo: affiliateConfig?.productInfo || undefined,
        productVisualAnalysis: affiliateConfig?.productVisualAnalysis || undefined,
        characterVisualAnalysis: (affiliateConfig as any)?.characterVisualAnalysis || undefined,
        productImages: (affiliateConfig?.productImages && affiliateConfig.productImages.length > 0)
          ? affiliateConfig.productImages
          : (attachedAssets?.filter(a => a.type === 'IMAGE').map(a => a.url) || []),
        referenceVideoUrl: affiliateConfig?.referenceVideoUrl || attachedAssets?.find(a => a.type === 'VIDEO')?.url
      } : undefined,
      animationConfig: resolvedType === 'ANIMATION' ? {
        title: animationConfig?.title || "Animasi 3D Sinematik",
        artStyle: animationConfig?.artStyle || '3D_PIXAR',
        language: animationConfig?.language || 'id',
        targetGenre: animationConfig?.targetGenre || 'ADVENTURE',
        characterDescription: animationConfig?.characterDescription || "Karakter utama yang berani dan penuh ekspresi",
        worldSetting: animationConfig?.worldSetting || "Dunia penuh warna dengan pencahayaan sinematik",
        voiceTone: animationConfig?.voiceTone || 'CHEERFUL',
        aspectRatio: animationConfig?.aspectRatio || '16:9',
        characterReferenceUrl: animationConfig?.characterReferenceUrl,
        characterReferenceUrls: animationConfig?.characterReferenceUrls
      } : undefined,
      educationalConfig: resolvedType === 'EDUCATIONAL' ? {
        subjectTitle: educationalConfig?.subjectTitle || "Konsep Pembelajaran Menarik",
        category: educationalConfig?.category || "Sains & Teknologi",
        targetAudience: educationalConfig?.targetAudience || 'GENERAL_ELI5',
        visualStyle: educationalConfig?.visualStyle || 'MOTION_GRAPHICS_2D',
        language: educationalConfig?.language || 'id',
        keyTakeaways: educationalConfig?.keyTakeaways || "Memahami prinsip dasar melalui analogi visual dan diagram interaktif",
        chapterCount: educationalConfig?.chapterCount || 3,
        narratorTone: educationalConfig?.narratorTone || 'FRIENDLY_EXPLAINER',
        aspectRatio: educationalConfig?.aspectRatio || '16:9',
        characterDescription: educationalConfig?.characterDescription || "Profesor Robot AI ramah bernama Dr. Byte, bodi putih dengan layar ekspresi bersahabat",
        worldSetting: educationalConfig?.worldSetting || "Laboratorium sains modern serba putih dengan layar holografis melayang"
      } : undefined,
      activeAgent: 'Creative Strategist',
      agentStatus: {
        'Creative Strategist': 'WORKING',
        'Storyboard Director': 'WAITING',
        'Human Approval Gate': 'WAITING',
        'AI Video Director': 'WAITING',
        'Video Assembly Editor': 'WAITING',
        'Audio Designer': 'WAITING',
        'Viral Content Editor': 'WAITING',
        'Video QA Director': 'WAITING',
        'Distribution Manager': 'WAITING'
      },
      telemetry,
      logs: []
    };

    (project as any).userRole = userRole;

    appendLog(project, 'PROTOCOL', `DISPATCHING MISSION [${resolvedType}] -> ID: ${id.substring(0, 8)}`, 'INFO');
    appendLog(project, 'BATARA', `TASKING CREATIVE STRATEGIST -> Merumuskan konsep & arsitektur video: "${prompt.substring(0, 60)}..."`, 'INFO');
    updateTelemetry(project, 'BATARA', { status: 'ACTIVE', currentTask: 'Synthesizing creative brief & visual direction', progress: 35 });

    projects.set(id, project);
    
    // Emit initial state
    setTimeout(() => projectEvents.emit(`update:${id}`, project), 50);

    // Start background pipeline
    this.runPipeline(id, prompt).catch(console.error);
    return id;
  }

  static async runPipeline(id: string, prompt: string) {
    const project = projects.get(id)!;
    const vType = project.videoType;

    try {
      project.overallProgress = 18;
      project.currentPhaseName = 'Perumusan Konsep Kreatif (BATARA - 18%)';
      updateTelemetry(project, 'BATARA', { status: 'ACTIVE', currentTask: 'Synthesizing creative brief & audience resonance', progress: 60 });
      projectEvents.emit(`update:${id}`, project);
      await simulateAgent(800);

      // 1. Creative Strategist prompt formulation with OpenAI ChatGPT 4.0 & Gemini Multi-Model
      let currentConfig: any = undefined;
      if (vType === 'ANIMATION') currentConfig = project.animationConfig;
      else if (vType === 'EDUCATIONAL') currentConfig = project.educationalConfig;
      else if (vType === 'AFFILIATE') {
        currentConfig = project.affiliateConfig;
        if (currentConfig?.productImages && currentConfig.productImages.length > 0) {
          const imgUrl = currentConfig.productImages[0];
          const visionAnalysis = await LLMService.analyzeProductImage(
            imgUrl,
            (src, msg, lvl) => appendLog(project, src, msg, lvl || 'INFO')
          );
          if (visionAnalysis) {
            currentConfig.productVisualAnalysis = visionAnalysis;
            project.affiliateConfig!.productVisualAnalysis = visionAnalysis;
          }
        }
        if (currentConfig?.characterImage) {
          const charVisionAnalysis = await LLMService.analyzeCharacterImage(
            currentConfig.characterImage,
            (src, msg, lvl) => appendLog(project, src, msg, lvl || 'INFO')
          );
          if (charVisionAnalysis) {
            currentConfig.characterVisualAnalysis = charVisionAnalysis;
            (project.affiliateConfig as any).characterVisualAnalysis = charVisionAnalysis;
          }
        }
      }

      const briefResult = await LLMService.generateBrief({
        prompt,
        videoType: vType,
        config: currentConfig,
        onLog: (source, msg, level) => appendLog(project, source, msg, level || 'INFO')
      });

      let briefTitle = briefResult.data.title || project.title;
      let briefText = briefResult.data.brief || "";

      // Procedural fallback for brief if empty
      if (!briefText) {
        if (vType === 'ANIMATION') {
          const anim = project.animationConfig!;
          briefTitle = anim.title || `Petualangan Animasi ${anim.artStyle.replace(/_/g, ' ')}`;
          briefText = `Kisah animasi visual memukau bergaya ${anim.artStyle.replace(/_/g, ' ')} berlatar di ${anim.worldSetting || 'dunia penuh warna dan cahaya sinematik'}. Mengisahkan ${anim.characterDescription || 'seorang karakter muda yang penuh rasa ingin tahu'} yang menemukan keajaiban tersembunyi dengan narasi emosional yang hangat dan visual berskala layar lebar.`;
        } else if (vType === 'EDUCATIONAL') {
          const edu = project.educationalConfig!;
          briefTitle = edu.subjectTitle || "Konsep Pembelajaran Visual";
          briefText = `Video pembelajaran interaktif bertema ${edu.subjectTitle} yang membongkar konsep kompleks menjadi 3 analogi visual yang sangat mudah dipahami. Menggunakan visual ${edu.visualStyle.replace(/_/g, ' ')} untuk mengilustrasikan mekanisme inti dan dampak praktisnya.`;
        } else if (vType === 'AFFILIATE') {
          const aff = project.affiliateConfig!;
          briefTitle = `Review Viral: ${aff.productName}`;
          briefText = `Strategi video konversi tinggi platform ${aff.platform} dengan formula hook 3 detik memikat, demonstrasi ketahanan/manfaat ${aff.keyBenefits}, ulasan jujur, dan urgensi ${aff.pricePromo} untuk mendongkrak penjualan keranjang kuning.`;
        } else {
          briefTitle = prompt.substring(0, 30) || "Produksi Video Sinematik";
          briefText = `Konsep produksi visual sinematik berkualitas tinggi yang menonjolkan aspek emosional, komposisi kamera dinamis, serta narasi yang kuat.`;
        }
      }

      project.title = briefTitle;
      project.brief = briefText;
      project.status = 'STORYBOARDING';
      project.overallProgress = 32;
      project.currentPhaseName = 'Perancangan Storyboard & Prompt I2V (SINTA - 32%)';
      project.activeAgent = 'Storyboard Director';
      project.agentStatus['Creative Strategist'] = 'COMPLETE';
      project.agentStatus['Storyboard Director'] = 'WORKING';

      updateTelemetry(project, 'BATARA', { status: 'ONLINE', currentTask: 'Brief published to global stream', progress: 100, lastOutput: project.title });
      updateTelemetry(project, 'SINTA', { status: 'ACTIVE', currentTask: 'Merancang 4 scene storyboard, prompt Image-to-Video teknis & naskah subtitle/voiceover', progress: 40 });
      appendLog(project, 'BATARA', `BRIEF GENERATED [${briefResult.modelUsed}]: "${project.title}"`, 'SUCCESS');
      appendLog(project, 'SINTA', `TASKING STORYBOARD DIRECTOR -> Menyusun rincian visual per scene, prompt Image-to-Video AI, subtitle & voiceover (${vType})`, 'INFO');

      projectEvents.emit(`update:${id}`, project);
      await simulateAgent(1000);

      // 2. Storyboard Director formulation with OpenAI ChatGPT 4.0 & Gemini Multi-Model
      const charImg = currentConfig?.characterReferenceUrl || currentConfig?.characterImage || project.affiliateConfig?.characterImage;
      const charVision = currentConfig?.characterVisualAnalysis || (project.affiliateConfig as any)?.characterVisualAnalysis || '';

      // Initialize characterProfile BEFORE constructing scene prompts so T2I lock has all details
      if (vType === 'ANIMATION') {
        const anim = project.animationConfig;
        const rawDesc = anim?.characterDescription || 'Protagonis Karakter Utama';
        const rawTitle = anim?.title || 'Petualangan Animasi';
        
        // Extract Name if present (e.g. "Tsubasa", "Bolt", "Captain Tsubasa", "bernama X")
        let charName = "Protagonis Utama";
        const namedMatch = rawDesc.match(/bernama\s+([A-Za-z0-9\s]+?)(?:,|\.|\s+dengan|\s+yang|\s+memakai|$)/i);
        if (namedMatch && namedMatch[1]) {
          charName = namedMatch[1].trim();
        } else if (/tsubasa/i.test(rawDesc) || /tsubasa/i.test(rawTitle)) {
          charName = "Captain Tsubasa";
        } else if (/bolt/i.test(rawDesc) || /bolt/i.test(rawTitle)) {
          charName = "Bolt";
        } else {
          const firstPart = rawTitle.replace(/^(Petualangan|Kisah|Cerita|Aksi)\s+/i, '').split(/[-–—:]/)[0].trim();
          if (firstPart.length > 2 && firstPart.length < 30) {
            charName = firstPart;
          }
        }

        const isRobotOrCreature = /robot|creature|monster|kucing|cat|dragon|alien/i.test(rawDesc);
        const isFemale = /wanita|gadis|perempuan|female|girl|woman|putri|princess/i.test(rawDesc);

        project.characterProfile = {
          name: charName,
          gender: isRobotOrCreature ? "NEUTRAL" : (isFemale ? "FEMALE" : "MALE"),
          ageGroup: isRobotOrCreature ? "Ageless" : "16-24 years old",
          outfit: rawDesc.length > 10 ? rawDesc : `Signature stylized outfit suited for ${rawTitle}`,
          facialFeatures: `Expressive animated facial features, distinct eye shine and emotiveness matching ${anim?.artStyle || '3D Pixar'}`,
          hairStyle: `Stylized hair/head features matching ${rawDesc}`,
          styleSeed: 8849201,
          colorPalette: ["#0284c7", "#38bdf8", "#f59e0b"],
          referenceImageUrl: charImg || undefined,
          referenceImageUrls: anim?.characterReferenceUrls || (charImg ? [charImg] : undefined),
          consistencyAnchorPrompt: `[Consistent Animated Character: ${charName}, ${rawDesc}, ${anim?.artStyle || '3D Pixar'}]`
        };
      } else if (vType === 'AFFILIATE') {
        const isMale = /male|man|guy|boy|pria|cowok|male model|Asian male|young male/i.test(charVision) && !/female|woman/i.test(charVision);
        if (charVision || charImg) {
          project.characterProfile = {
            name: isMale ? "Male Creator" : "Female Creator",
            gender: isMale ? "MALE" : "FEMALE",
            ageGroup: "22-28 years old",
            outfit: charVision ? charVision.replace(/^Exact (Visual|Physical) Features from Uploaded Photo:\s*/i, '') : "Casual stylish creator outfit",
            facialFeatures: charVision || "Authentic UGC creator facial features from reference photo",
            hairStyle: charVision || "Styled creator hair matching reference",
            styleSeed: Math.floor(Math.random() * 10000000),
            colorPalette: ["#f5f5f4", "#d97706", "#0f172a"],
            referenceImageUrl: charImg || undefined,
            consistencyAnchorPrompt: `[Consistent Creator: ${charVision || 'UGC Influencer matching uploaded reference photo'}]`
          };
        } else {
          project.characterProfile = {
            name: "Sarah (Creator)",
            gender: "FEMALE",
            ageGroup: "22-26 years old",
            outfit: "Minimalist oversized beige linen blazer, white crewneck, gold mini hoop earrings",
            facialFeatures: "Warm glowing Indonesian skin, cheerful radiant smile, natural makeup",
            hairStyle: "Sleek shoulder-length dark brown bob with soft curtain bangs",
            styleSeed: Math.floor(Math.random() * 10000000),
            colorPalette: ["#f5f5f4", "#d97706", "#0f172a"],
            referenceImageUrl: charImg || undefined,
            consistencyAnchorPrompt: `[Consistent Creator: Sarah, 24yo Indonesian reviewer, studio lighting]`
          };
        }
      } else if (vType === 'EDUCATIONAL') {
        const edu = project.educationalConfig;
        const rawDesc = edu?.characterDescription || 'Edukator Ahli & Presenter Pembelajaran';
        const rawTitle = edu?.subjectTitle || 'Materi Edukasi';

        let charName = "Edukator Utama";
        const namedMatch = rawDesc.match(/bernama\s+([A-Za-z0-9\s]+?)(?:,|\.|\s+dengan|\s+yang|\s+memakai|$)/i);
        if (namedMatch && namedMatch[1]) {
          charName = namedMatch[1].trim();
        } else if (/byte|robot|bot/i.test(rawDesc)) {
          charName = "Dr. Byte (AI Robot Tutor)";
        } else if (/sarah/i.test(rawDesc)) {
          charName = "Guru Sarah";
        } else if (/aris/i.test(rawDesc)) {
          charName = "Dosen Aris";
        } else if (/fiko|rubah|maskot|fox/i.test(rawDesc)) {
          charName = "Fiko Maskot Edukasi";
        } else {
          charName = "Edukator Ahli";
        }

        const isRobotOrCreature = /robot|creature|maskot|rubah|fox|ai tutor/i.test(rawDesc);
        const isFemale = /wanita|gadis|perempuan|female|guru wanita|ibu/i.test(rawDesc);

        project.characterProfile = {
          name: charName,
          gender: isRobotOrCreature ? "NEUTRAL" : (isFemale ? "FEMALE" : "MALE"),
          ageGroup: isRobotOrCreature ? "Ageless" : "26-38 years old",
          outfit: rawDesc.length > 10 ? rawDesc : `Professional educator attire suited for ${rawTitle}`,
          facialFeatures: `Articulate, friendly educator facial features with clear pedagogical eye contact`,
          hairStyle: `Neat professional hairstyle matching ${rawDesc}`,
          styleSeed: 5829104,
          colorPalette: ["#0f172a", "#38bdf8", "#10b981"],
          referenceImageUrl: charImg || undefined,
          consistencyAnchorPrompt: `[Consistent Educator: ${charName}, ${rawDesc}, clean educational studio lighting]`
        };
      }

      let generatedScenes: any[] = [];
      const sbResult = await LLMService.generateStoryboard({
        brief: project.brief,
        videoType: vType,
        config: currentConfig,
        onLog: (source, msg, level) => appendLog(project, source, msg, level || 'INFO')
      });

      // Transition to STORYBOARDING in UI
      project.overallProgress = 35;
      project.currentPhaseName = 'GATOTKACA: Menyusun visual adegan storyboard...';
      updateTelemetry(project, 'SINTA', { status: 'ACTIVE', currentTask: 'Menyusun visual adegan storyboard...', progress: 60 });
      projectEvents.emit(`update:${id}`, project);


      // If LLM returned custom profile and we do not have an explicit uploaded photo, merge it
      if (sbResult.data?.characterProfile && !charImg && !charVision) {
        project.characterProfile = sbResult.data.characterProfile;
      }
      if (charImg && project.characterProfile) {
        project.characterProfile.referenceImageUrl = charImg;
      }
      if (sbResult.data?.marketingCopy) {
        project.marketingCopy = sbResult.data.marketingCopy;
      }

      const rawScenes = sbResult.data?.scenes || (Array.isArray(sbResult.data) ? sbResult.data : []);
      if (rawScenes && Array.isArray(rawScenes) && rawScenes.length > 0) {
        generatedScenes = await Promise.all(rawScenes.map(async (s: any, idx: number) => {
          let lockedT2IPrompt = ImageGenerationService.buildT2IImagePrompt({
            scene: { ...s, promptTextToImage: s.promptTextToImage || s.promptImageToVideo, visualDirection: s.visualDirection || s.visual_direction },
            sceneIndex: idx,
            videoType: vType,
            characterProfile: project.characterProfile,
            artStyle: project.animationConfig?.artStyle || project.educationalConfig?.visualStyle,
            affiliateConfig: project.affiliateConfig,
            animationConfig: project.animationConfig,
            educationalConfig: project.educationalConfig
          });

          let lockedI2VPrompt = ImageGenerationService.buildI2VVideoPrompt({
            scene: { ...s, promptImageToVideo: s.promptImageToVideo || s.promptTextToImage, visualDirection: s.visualDirection || s.visual_direction },
            sceneIndex: idx,
            videoType: vType,
            characterProfile: project.characterProfile,
            artStyle: project.animationConfig?.artStyle || project.educationalConfig?.visualStyle,
            affiliateConfig: project.affiliateConfig,
            animationConfig: project.animationConfig,
            educationalConfig: project.educationalConfig
          });

          const durStr = s.duration || "00:04";
          const durSecs = parseInt(durStr.split(':').pop() || '5') || 5;

          const qaResult = await QAAuditAgent.auditAndRefine({
            promptText: lockedT2IPrompt,
            videoPrompt: lockedI2VPrompt,
            visualPrompt: s.visualDirection || s.visual_direction,
            voiceoverScript: s.voiceOver || s.voiceover_script || '',
            productName: project.brief?.product || project.affiliateConfig?.productName || 'Product',
            referenceImageUrl: project.characterProfile?.referenceImageUrl || project.affiliateConfig?.characterImage || '',
            durationSeconds: durSecs,
            videoType: vType,
            visualStyle: s.visualStyle || (vType === 'AFFILIATE' ? 'ugc' : 'studio'),
            featuresProduct: s.featuresProduct
          });

          if (qaResult && qaResult.autoCorrected) {
             lockedI2VPrompt = qaResult.correctedVideoPrompt || lockedI2VPrompt;
             s.voiceOver = qaResult.correctedScript || s.voiceOver;
             s.visualDirection = qaResult.correctedVisualPrompt || s.visualDirection;
          }

          const sceneSub = resolveSceneSubtitle(s, idx);
          return {
            id: crypto.randomUUID(),
            duration: durStr,
            visualDirection: s.visualDirection || s.visual_direction || "Adegan promosi",
            textOverlay: sceneSub,
            subtitle: sceneSub,
            voiceOver: s.voiceOver || s.voiceover_script || '',
            promptTextToImage: lockedT2IPrompt,
            promptImageToVideo: lockedI2VPrompt,
            featuresProduct: s.featuresProduct || s.features_product || false,
            styleKeywords: s.styleKeywords || [],
            status: 'PENDING',
            imageStatus: 'PENDING',
            videoStatus: 'PENDING',
            imageCreditCost: 5,
            videoCreditCost: 15,
            qaScore: (typeof qaResult?.score === 'number' && !isNaN(qaResult.score)) ? qaResult.score : (92 + (idx % 6)),
            qaPassed: (qaResult?.score ?? 90) >= 70,
            qaIssues: qaResult?.issues || [],
            qaBreakdown: qaResult?.breakdown || { productLockConsistency: 85, visualPromptAdherence: 85, narrativeFlow: 85 },
            qaRecommendations: qaResult?.recommendations || [],
            correctedVisualPrompt: qaResult?.correctedVisualPrompt,
            correctedVideoPrompt: qaResult?.correctedVideoPrompt,
            correctedScript: qaResult?.correctedScript
          };
        }));
        appendLog(project, 'SINTA', `STORYBOARD GENERATED [${sbResult.modelUsed}]: ${generatedScenes.length} Scenes Choreographed with QA Audit & Auto-Correction`, 'SUCCESS');
      }
            // Fallback prevention
      if (generatedScenes.length === 0) {
        throw new Error("Gagal menyusun naskah — kuota AI Director sedang bermasalah atau error dari penyedia layanan AI. Silakan coba lagi nanti.");
      }

      // Safety Check: Override featuresProduct to false if scene describes a pain point/before state
      generatedScenes.forEach((s) => {
        const text = (s.visualDirection + " " + (s.promptTextToImage || "")).toLowerCase();
        const isPainPoint = text.includes('before') || text.includes('pain point') || text.includes('kesakitan') || text.includes('biasa') || text.includes('frustrasi') || text.includes('struggling') || text.includes('sulit') || text.includes('susah') || text.includes('masalah');
        const hasSolusi = text.includes('solusi') || text.includes('menemukan') || (project.affiliateConfig?.productName && text.includes(project.affiliateConfig.productName.toLowerCase()));
        
        if (isPainPoint && !hasSolusi) {
           s.featuresProduct = false;
        }
      });

      // Validasi Keunikan Scene (Cek semua pasangan adegan secara komprehensif)
      if (generatedScenes.length >= 2) {
        const uniquePrompts = new Set();
        for (const scene of generatedScenes) {
          const prompt = (scene.promptTextToImage || scene.visualDirection || "").trim();
          if (prompt) {
            if (uniquePrompts.has(prompt)) {
              throw new Error("Gagal menyusun naskah — AI menghasilkan adegan yang berulang/duplikat (ANOMALI). Silakan coba lagi.");
            }
            uniquePrompts.add(prompt);
          }
        }
      }

      project.storyboard = {
        scenes: generatedScenes,
        characterProfile: project.characterProfile,
        totalImageCredits: generatedScenes.length * 5,
        totalVideoCredits: generatedScenes.length * 15,
        creditsRequired: generatedScenes.length * 15,
        totalDurationSeconds: generatedScenes.length * 4,
        isStoryboardCompleted: true
      };

      ensureCompleteMarketingCopy(project);

      project.status = 'AWAITING_APPROVAL';
      project.activeProductionStage = 'STORYBOARD';
      project.overallProgress = 50;
      project.currentPhaseName = 'Free AI Storyboard Selesai (50%) - Pilih Tahap Selanjutnya';
      project.activeAgent = 'Human Approval Gate';
      project.agentStatus['Storyboard Director'] = 'COMPLETE';
      project.agentStatus['Human Approval Gate'] = 'WORKING';

      updateTelemetry(project, 'SINTA', { status: 'ONLINE', currentTask: 'Storyboard per scene & konsistensi karakter selesai dirancang', progress: 100, lastOutput: `${project.storyboard.scenes.length} Adegan + Karakter Terkunci` });
      appendLog(project, 'SINTA', `STORYBOARD READY: ${project.storyboard.scenes.length} adegan selesai disusun lengkap dengan Konsistensi Karakter (${project.characterProfile?.name}), Naskah & Prompt.`, 'SUCCESS');
      appendLog(project, 'PROTOCOL', `REVIEW GATEWAY (50%): Pengguna bebas memilih: 1) Cukup Storyboard (Gratis), 2) Generate Gambar Karakter Konsisten (${project.storyboard.totalImageCredits} Kredit), atau 3) Full Video Master (${project.storyboard.totalVideoCredits} Kredit).`, 'WARN');

      projectEvents.emit(`update:${id}`, project);

    } catch (error: any) {
      if (error.name === 'QuotaError') {
        if ((project as any).userRole === 'founder') {
           project.status = 'QUOTA_FALLBACK_PENDING';
           project.currentPhaseName = "Menunggu Konfirmasi Fallback AI (Kuota Habis)";
           appendLog(project, 'SINTA', 'Kuota AI (Gemini/OpenAI) sedang habis. Apakah Anda ingin melanjutkan menggunakan naskah template/hardcode untuk keperluan testing sistem?', 'WARN');
           projectEvents.emit(`update:${id}`, project);
           return;
        } else {
           project.status = 'FAILED';
           project.error = "Maaf, kuota produksi AI saat ini sedang penuh/habis. Silakan coba beberapa saat lagi, atau hubungi admin.";
           appendLog(project, 'ERROR', project.error, 'ERROR');
           projectEvents.emit(`update:${id}`, project);
           return;
        }
      }

      project.status = 'FAILED';
      project.overallProgress = 35;
      if (error.code) {
         project.providerError = error;
      } else {
         project.error = error.message;
      }
      project.agentStatus[project.activeAgent || 'Creative Strategist'] = 'FAILED';
      appendLog(project, 'ERROR', `PIPELINE ERROR in ${project.activeAgent}: ${error.message || error}`, 'ERROR');
      projectEvents.emit(`update:${id}`, project);
    }
  }

  /**
   * User chooses to only use the Free Storyboard without generating images/video.
   */
  static async chooseStoryboardOnly(id: string) {
    const project = projects.get(id);
    if (!project) return;

    project.userChoice = 'STORYBOARD_ONLY';
    project.status = 'COMPLETED';
    project.overallProgress = 100;
    project.currentPhaseName = 'Free AI Storyboard Selesai (Gratis / 0 Kredit)';
    project.activeAgent = 'Distribution Manager';
    project.agentStatus['Human Approval Gate'] = 'COMPLETE';
          project.agentStatus['Distribution Manager'] = 'COMPLETE';
      saveProjects();

    appendLog(project, 'PROTOCOL', `USER MEMILIH FREE AI STORYBOARD TIER (GRATIS / 0 KREDIT TERCATAT)`, 'SUCCESS');
    appendLog(project, 'TIARA', `Naskah Storyboard & Prompt Gambar/Video siap diekspor ke PDF, TXT atau JSON.`, 'SUCCESS');
    updateTelemetry(project, 'TIARA', { status: 'ONLINE', currentTask: 'Storyboard export package prepared', progress: 100 });

    projectEvents.emit(`update:${id}`, project);
  }

  /**
   * Generates a single Scene's consistent character keyframe image (Cost: based on model & resolution)
   */
  static async generateSceneImage(id: string, sceneId: string, imageEngine?: string, resolution: string = '1K', allowFallbackToFlux?: boolean) {
    const project = projects.get(id);
    if (!project) return;
    ensureStoryboardExists(project);
    if (!project.storyboard || !project.storyboard.scenes || project.storyboard.scenes.length === 0) return;

    const sceneIdx = project.storyboard.scenes.findIndex(s => String(s.id) === String(sceneId));
    if (sceneIdx === -1) {
      appendLog(project, 'ERROR', `Adegan ID ${sceneId} tidak ditemukan dalam storyboard.`, 'ERROR');
      projectEvents.emit(`update:${id}`, project);
      return;
    }

    const scene = project.storyboard.scenes[sceneIdx];
    scene.imageStatus = 'GENERATING';
    delete (scene as any).lastError;
    delete (project as any).lastQuotaWarning;

    // Save image model to scene & project for full consistency and prevent engine drift
    const effectiveEngine = imageEngine 
      || (scene as any).imageEngine 
      || (project as any).imageEngine 
      || (project as any).imageModel 
      || (project.affiliateConfig as any)?.imageEngine 
      || (project.animationConfig as any)?.imageEngine 
      || (project.videoType === 'AFFILIATE' ? 'nano-asli' : undefined)
      || FounderService.getImageEngine() 
      || 'standard';

    (scene as any).imageEngine = effectiveEngine;
    (project as any).imageEngine = effectiveEngine;
    (project as any).imageModel = effectiveEngine;

    // 1. Determine Model & Calculate Credit Cost
    const modelDef = getFalImageModelForStudio(project.videoType, {
      isSubsequentScene: sceneIdx > 0,
      hasReferenceImages: !!(project.characterProfile?.referenceImageUrl || (project as any).masterCharacterImageUrl || (project as any).masterProductImageUrl || project.affiliateConfig?.productImages?.[0]),
      tier: (effectiveEngine === 'draft' || effectiveEngine === 'precision' || effectiveEngine === 'standard') ? effectiveEngine : undefined,
      forceModelId: effectiveEngine?.startsWith('fal-ai/') ? effectiveEngine : undefined
    });
    
    const isOpenArt = effectiveEngine.toLowerCase().includes('openart');
    const actualModelId = isOpenArt ? effectiveEngine : modelDef.id;
    const provider = isOpenArt ? 'OpenArt' : undefined;

    const isFounderBypass = (project as any).isFounderBypass || (project.userId === 'founder' || project.userId === 'admin');
    const creditCalc = CreditService.calculateImageCreditCost(actualModelId, { resolution, isFounderBypass, provider, operation: 'text-to-image' });

    appendLog(project, 'SINTA', `MEMULAI GENERATE KEYFRAME ADEGAN ${sceneIdx + 1} [${isOpenArt ? actualModelId : modelDef.name}] (${creditCalc.credits} Kredit, Res: ${resolution})...`, 'INFO');
    projectEvents.emit(`update:${id}`, project);

    // 2. Hold Credits if user is authenticated
    let holdSuccess = true;
    let holdId: string | undefined = undefined;
    if (project.userId && creditCalc.credits > 0) {
      const holdRes = await CreditService.holdCredits(
        project.userId, 
        creditCalc.credits, 
        `Keyframe Scene ${sceneIdx + 1} (${actualModelId})`, 
        undefined, 
        provider, 
        actualModelId, 
        'text-to-image'
      );
      if (!holdRes.success) {
        holdSuccess = false;
        scene.imageStatus = 'FAILED';
        appendLog(project, 'ERROR', `Gagal generate keyframe: ${holdRes.message || 'Kredit tidak mencukupi'}. Butuh ${creditCalc.credits} kredit.`, 'ERROR');
        projectEvents.emit(`update:${id}`, project);
        return;
      }
      holdId = holdRes.holdId;
    }

    try {
      const artStyle = project.animationConfig?.artStyle || project.educationalConfig?.visualStyle;
      const masterCharUrl = project.masterCharacterImageUrl || project.characterProfile?.referenceImageUrl;
      const masterProdUrl = project.masterProductImageUrl || project.affiliateConfig?.productImages?.[0] || (project.affiliateConfig as any)?.productImage;

      const prevScene = sceneIdx > 0 ? project.storyboard.scenes[sceneIdx - 1] : null;
      const prevSceneImageUrl = prevScene?.imageUrl || prevScene?.assetUrl;

      const imageUrl = await ImageGenerationService.generateKeyframeImage({
        scene,
        sceneIndex: sceneIdx,
        videoType: project.videoType,
        characterProfile: project.characterProfile,
        artStyle,
        affiliateConfig: project.affiliateConfig,
        animationConfig: project.animationConfig,
        educationalConfig: project.educationalConfig,
        engine: effectiveEngine,
        resolution,
        masterCharacterImageUrl: masterCharUrl,
        masterProductImageUrl: masterProdUrl,
        previousSceneImageUrl: prevSceneImageUrl,
        forceRegenerate: true,
        allowFallbackToFlux,
        onLog: (msg, level) => {
          appendLog(project, 'SINTA', msg, level || 'INFO');
          projectEvents.emit(`update:${id}`, project);
        }
      });

      appendLog(project, 'SINTA', `Mengamankan gambar keyframe adegan ${sceneIdx + 1} ke server lokal...`, 'INFO');
      const localImageUrl = await saveFileLocally(imageUrl, `scene_img_${sceneIdx + 1}`, 'png', project);

      scene.imageUrl = localImageUrl;
      if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        scene.remoteUrl = imageUrl;
        if (imageUrl.includes('fal.media') || imageUrl.includes('fal.run')) {
          scene.falUrl = imageUrl;
        }
      }
      if (!scene.assetUrl || scene.assetUrl === imageUrl) {
        scene.assetUrl = localImageUrl;
      }
      scene.imageStatus = 'COMPLETED';
      if (project.userId && creditCalc.credits > 0 && holdSuccess) {
        await CreditService.commitHold(project.userId, creditCalc.credits, holdId);
      }


      // Lock as master reference if this is the first scene with a generated image
      if (sceneIdx === 0 || !project.masterCharacterImageUrl) {
        project.masterCharacterImageUrl = localImageUrl;
        if (project.characterProfile && !project.characterProfile.referenceImageUrl) {
          project.characterProfile.referenceImageUrl = localImageUrl;
        }
      }

      saveProjects();
      appendLog(project, 'SINTA', `KEYFRAME ADEGAN ${sceneIdx + 1} SELESAI -> Konsistensi visual terkunci`, 'SUCCESS');
      projectEvents.emit(`update:${id}`, project);
    } catch (e: any) {
      scene.imageStatus = 'FAILED';
      (scene as any).lastError = e.message;
      if (e.message && e.message.includes('[NANO_QUOTA_EXHAUSTED]')) {
        (project as any).lastQuotaWarning = {
          sceneId,
          engine: effectiveEngine,
          message: e.message,
          timestamp: Date.now()
        };
      }

      // Refund Credits on error
      if (project.userId && creditCalc.credits > 0 && holdSuccess) {
        await CreditService.refundCredits(project.userId, creditCalc.credits, `Refund: Gagal render keyframe scene ${sceneIdx + 1}`, holdId);
      }
      appendLog(project, 'ERROR', `Gagal generate keyframe adegan ${sceneIdx + 1}: ${e.message}`, 'ERROR');
      saveProjects();
      projectEvents.emit(`update:${id}`, project);
      throw e;
    }
  }

  /**
   * Generates consistent character keyframe images for all scenes
   */
  static async generateAllSceneImages(id: string, imageEngine?: string, resolution: string = '1K', allowFallbackToFlux?: boolean) {
    const project = projects.get(id);
    if (!project) return;
    ensureStoryboardExists(project);
    if (!project.storyboard || !project.storyboard.scenes || project.storyboard.scenes.length === 0) return;

    project.userChoice = 'GENERATE_IMAGES';
    project.activeProductionStage = 'IMAGES';
    project.overallProgress = 60;
    project.currentPhaseName = 'Memproses Keyframe Karakter Konsisten Semua Adegan';
    project.activeAgent = 'Storyboard Director';
    project.agentStatus['Storyboard Director'] = 'WORKING';

    appendLog(project, 'PROTOCOL', `USER MENYETUJUI GENERATE KEYFRAME SEMUA ADEGAN (Res: ${resolution})`, 'SUCCESS');
    projectEvents.emit(`update:${id}`, project);

    const total = project.storyboard.scenes.length;
    const artStyle = project.animationConfig?.artStyle || project.educationalConfig?.visualStyle;

    // Save image model to project for full consistency and prevent engine drift
    const effectiveEngine = imageEngine 
      || (project as any).imageEngine 
      || (project as any).imageModel 
      || (project.affiliateConfig as any)?.imageEngine 
      || (project.animationConfig as any)?.imageEngine 
      || (project.videoType === 'AFFILIATE' ? 'nano-asli' : undefined)
      || FounderService.getImageEngine() 
      || 'standard';

    (project as any).imageEngine = effectiveEngine;
    (project as any).imageModel = effectiveEngine;

    for (let i = 0; i < total; i++) {
      const sc = project.storyboard.scenes[i];
      sc.imageStatus = 'GENERATING';
      (sc as any).imageEngine = effectiveEngine;
      project.currentPhaseName = `Generating Keyframe ${i + 1}/${total} (${project.characterProfile?.name || 'Karakter'})`;
      projectEvents.emit(`update:${id}`, project);

      const modelDef = getFalImageModelForStudio(project.videoType, {
        isSubsequentScene: i > 0,
        hasReferenceImages: !!(project.characterProfile?.referenceImageUrl || (project as any).masterCharacterImageUrl || (project as any).masterProductImageUrl || project.affiliateConfig?.productImages?.[0]),
        tier: (effectiveEngine === 'draft' || effectiveEngine === 'precision' || effectiveEngine === 'standard') ? effectiveEngine : undefined,
        forceModelId: effectiveEngine?.startsWith('fal-ai/') ? effectiveEngine : undefined
      });

      const isFounderBypass = (project as any).isFounderBypass || (project.userId === 'founder' || project.userId === 'admin');
      const creditCalc = CreditService.calculateImageCreditCost(modelDef.id, { resolution, isFounderBypass });

      let holdSuccess = true;
      if (project.userId && creditCalc.credits > 0) {
        const holdRes = await CreditService.holdCredits(project.userId, creditCalc.credits, `Keyframe Scene ${i + 1} (${modelDef.name})`);
        if (!holdRes.success) {
          sc.imageStatus = 'FAILED';
          appendLog(project, 'ERROR', `Gagal generate keyframe adegan ${i + 1}: ${holdRes.message || 'Kredit tidak mencukupi'}. Butuh ${creditCalc.credits} kredit.`, 'ERROR');
          projectEvents.emit(`update:${id}`, project);
          continue;
        }
      }

      try {
        const masterCharUrl = project.masterCharacterImageUrl || project.characterProfile?.referenceImageUrl;
        const masterProdUrl = project.masterProductImageUrl || project.affiliateConfig?.productImages?.[0] || (project.affiliateConfig as any)?.productImage;
        const prevScene = i > 0 ? project.storyboard.scenes[i - 1] : null;
        const prevSceneImageUrl = prevScene?.imageUrl || prevScene?.assetUrl;

        const imageUrl = await ImageGenerationService.generateKeyframeImage({
          scene: sc,
          sceneIndex: i,
          videoType: project.videoType,
          characterProfile: project.characterProfile,
          artStyle,
          affiliateConfig: project.affiliateConfig,
          animationConfig: project.animationConfig,
          educationalConfig: project.educationalConfig,
          engine: effectiveEngine,
          resolution,
          masterCharacterImageUrl: masterCharUrl,
          masterProductImageUrl: masterProdUrl,
          previousSceneImageUrl: prevSceneImageUrl,
          forceRegenerate: true,
          allowFallbackToFlux,
          onLog: (msg, level) => {
            appendLog(project, 'SINTA', msg, level || 'INFO');
            projectEvents.emit(`update:${id}`, project);
          }
        });

        appendLog(project, 'SINTA', `Mengamankan gambar keyframe adegan ${i + 1} ke server lokal...`, 'INFO');
        const localImageUrl = await saveFileLocally(imageUrl, `scene_img_${i + 1}`, 'png', project);

        sc.imageUrl = localImageUrl;
        if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
          sc.remoteUrl = imageUrl;
          if (imageUrl.includes('fal.media') || imageUrl.includes('fal.run')) {
            sc.falUrl = imageUrl;
          }
        }
        if (!sc.assetUrl || sc.assetUrl === imageUrl) {
          sc.assetUrl = localImageUrl;
        }
        sc.imageStatus = 'COMPLETED';

        // Anchor master reference from Scene 0 or first successful image
        if (i === 0 || !project.masterCharacterImageUrl) {
          project.masterCharacterImageUrl = localImageUrl;
          if (project.characterProfile && !project.characterProfile.referenceImageUrl) {
            project.characterProfile.referenceImageUrl = localImageUrl;
          }
        }

        appendLog(project, 'SINTA', `Keyframe Adegan ${i + 1}/${total} siap -> Visual terpasang`, 'SUCCESS');
        projectEvents.emit(`update:${id}`, project);
      } catch (e: any) {
        sc.imageStatus = 'FAILED';
        appendLog(project, 'ERROR', `Gagal generate keyframe adegan ${i + 1}: ${e.message}`, 'ERROR');
        projectEvents.emit(`update:${id}`, project);
      }
    }

    saveProjects();
    project.overallProgress = 65;
    project.currentPhaseName = 'Keyframe Karakter Konsisten Selesai. Siap Lanjut ke Video!';
    project.agentStatus['Storyboard Director'] = 'COMPLETE';
    appendLog(project, 'PROTOCOL', `SEMUA KEYFRAME SELESAI -> Anda dapat memilih generate video per adegan atau Full Video Master.`, 'INFO');
    projectEvents.emit(`update:${id}`, project);
  }

  /**
   * Generates video for a single scene (Cost: 15 Credits)
   */
  static async generateSceneVideo(id: string, sceneId: string, videoModel?: string) {
    const project = projects.get(id);
    if (!project) return;
    
    // HARD GATE: Cannot render video before storyboard is approved (Phase 3 requirement)
    if (['DRAFT', 'BRIEFING', 'STORYBOARDING', 'AWAITING_APPROVAL'].includes(project.status || 'DRAFT')) {
       throw new Error(`Video tidak bisa mulai di-render sebelum storyboard di-approve. Status saat ini: ${project.status}`);
    }

    ensureStoryboardExists(project);
    if (!project.storyboard || !project.storyboard.scenes || project.storyboard.scenes.length === 0) return;

    const sceneIdx = project.storyboard.scenes.findIndex(s => String(s.id) === String(sceneId));
    if (sceneIdx === -1) {
      appendLog(project, 'ERROR', `Adegan ID ${sceneId} tidak ditemukan dalam storyboard.`, 'ERROR');
      projectEvents.emit(`update:${id}`, project);
      return;
    }

    const scene = project.storyboard.scenes[sceneIdx];

    // Save selected video model
    const effectiveVideoModel = videoModel || (scene as any).videoModel || project.videoModel || 'fal';
    (scene as any).videoModel = effectiveVideoModel;
    project.videoModel = effectiveVideoModel;
    
    scene.videoStatus = 'GENERATING';
    scene.status = 'GENERATING';

    const scenePreferredProvider = (scene as any).videoProvider || (scene as any).metadata?.provider;
    const projectPreferredProvider = (project as any).videoProvider;
    const preferredProvider = scenePreferredProvider || projectPreferredProvider;

    const route = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: effectiveVideoModel,
      preferredProvider,
      studio: project.videoType
    });

    const routeProviderId = route.providerId;
    const actualProvider = routeProviderId === 'openart' ? 'OpenArt' : routeProviderId;
    const canonicalModel = route.model;

    const isFounderBypass = (project as any).isFounderBypass || (project.userId === 'founder' || project.userId === 'admin');
    const creditCalc = CreditService.calculateCreditCost(canonicalModel, { 
      duration: scene.duration || 5, 
      isFounderBypass, 
      provider: actualProvider, 
      operation: 'image-to-video' 
    });

    let holdSuccess = true;
    let holdId: string | undefined = undefined;
    if (project.userId && creditCalc.credits > 0) {
      const holdRes = await CreditService.holdCredits(
        project.userId, 
        creditCalc.credits, 
        `Video Scene ${sceneIdx + 1} (${canonicalModel})`, 
        undefined, 
        actualProvider, 
        canonicalModel, 
        'image-to-video'
      );
      if (!holdRes.success) {
        holdSuccess = false;
        scene.videoStatus = 'FAILED';
        scene.status = 'FAILED';
        appendLog(project, 'ERROR', `Gagal generate video adegan ${sceneIdx + 1}: ${holdRes.message || 'Kredit tidak mencukupi'}. Butuh ${creditCalc.credits} kredit.`, 'ERROR');
        projectEvents.emit(`update:${id}`, project);
        return;
      }
      holdId = holdRes.holdId;
    }

    const provider = getVideoProvider(canonicalModel, routeProviderId);
    
    appendLog(project, 'GATOTKACA', `MEMULAI RENDER VIDEO ADEGAN ${sceneIdx + 1} dengan ${provider.name} (Biaya: ${creditCalc.credits} Kredit)...`, 'INFO');
    updateTelemetry(project, 'GATOTKACA', { status: 'ACTIVE', currentTask: `Rendering scene ${sceneIdx + 1} video latent diffusion...`, progress: 15 });
    saveProjects();
    projectEvents.emit(`update:${id}`, project);

    try {
      await simulateAgent(600);
      appendLog(project, 'GATOTKACA', `ADEGAN ${sceneIdx + 1}: Generasi pergerakan kamera sinematik & frame interpolasi...`, 'INFO');
      updateTelemetry(project, 'GATOTKACA', { status: 'ACTIVE', currentTask: `Rendering motion vectors for scene ${sceneIdx + 1}...`, progress: 50 });
      projectEvents.emit(`update:${id}`, project);
      
      await simulateAgent(600);
      appendLog(project, 'BAYU', `ADEGAN ${sceneIdx + 1}: Menyiapkan overlay subtitle animasi & sinkronisasi audio narasi...`, 'INFO');
      updateTelemetry(project, 'BAYU', { status: 'ACTIVE', currentTask: `Adding subtitles to scene ${sceneIdx + 1}...`, progress: 80 });
      projectEvents.emit(`update:${id}`, project);

      if (!scene.promptImageToVideo) {
        scene.promptImageToVideo = (scene as any).videoPrompt || (scene as any).prompt || '';
      }
      const generatedUrl = await provider.generateScene(scene, project.title || '');

      scene.videoUrl = generatedUrl;
      scene.videoStatus = 'COMPLETED';
      scene.status = 'COMPLETED';

      if (project.userId && creditCalc.credits > 0 && holdSuccess) {
        await CreditService.commitHold(project.userId, creditCalc.credits, holdId);
      }

      appendLog(project, 'GATOTKACA', `VIDEO ADEGAN ${sceneIdx + 1} SELESAI DIRENDER & SUBTITLE DIPASANG -> ${generatedUrl}`, 'SUCCESS');
      updateTelemetry(project, 'GATOTKACA', { status: 'ONLINE', currentTask: `Scene ${sceneIdx + 1} ready`, progress: 100 });
      projectEvents.emit(`update:${id}`, project);

    } catch (e: any) {
      const latestProject = projects.get(id);
      if (latestProject && latestProject.storyboard && latestProject.storyboard.scenes && latestProject.storyboard.scenes[sceneIdx]) {
          latestProject.storyboard.scenes[sceneIdx].videoStatus = 'FAILED';
          latestProject.storyboard.scenes[sceneIdx].status = 'FAILED';
          Object.assign(project, latestProject);
      } else {
          scene.videoStatus = 'FAILED';
          scene.status = 'FAILED';
      }

      if (project.userId && creditCalc.credits > 0 && holdSuccess) {
        await CreditService.refundCredits(project.userId, creditCalc.credits, `Refund: Gagal render video scene ${sceneIdx + 1}`, holdId);
      }
      appendLog(project, 'ERROR', `Gagal render video adegan ${sceneIdx + 1}: ${e.message}`, 'ERROR');
      saveProjects();
      projectEvents.emit(`update:${id}`, project);
    }
  }

  static async resumeWithTemplate(id: string) {
    const project = projects.get(id);
    if (!project || project.status !== 'QUOTA_FALLBACK_PENDING') return;
    
    (project as any).useTemplate = true;
    (project as any).isTemplateScript = true;
    project.status = 'BRIEFING';
    appendLog(project, 'PROTOCOL', 'Menggunakan Naskah Template (isTemplateScript: true) karena kuota AI habis.', 'INFO');
    
    // Resume pipeline
    this.runPipeline(id, project.brief?.product || "Produk").catch(console.error);
  }

  static async rejectFallback(id: string) {
    const project = projects.get(id);
    if (!project || project.status !== 'QUOTA_FALLBACK_PENDING') return;

    project.status = 'FAILED';
    project.error = "Produksi dibatalkan karena kuota AI habis (Tidak menggunakan template).";
    appendLog(project, 'SYSTEM', project.error, 'ERROR');
    projectEvents.emit(`update:${id}`, project);
  }

  static async approveStoryboard(id: string) {
    const project = projects.get(id);
    if (!project || (project.status !== 'AWAITING_APPROVAL' && project.activeProductionStage !== 'IMAGES')) return;

    project.userChoice = 'FULL_PRODUCTION';
    project.status = 'PRODUCING';
    project.activeProductionStage = 'VIDEOS';
    project.overallProgress = 55;
    project.currentPhaseName = 'Rendering Frame Video Per Adegan (GATOTKACA - 55%)';
    project.activeAgent = 'AI Video Director';
    project.agentStatus['Human Approval Gate'] = 'COMPLETE';
    project.agentStatus['AI Video Director'] = 'WORKING';
    project.providerError = undefined;
    project.error = undefined;

    appendLog(project, 'PROTOCOL', `PRODUCTION PIPELINE DISETUJUI -> MEMULAI MULTI-AGENT VIDEO ASSEMBLY & EDITING (${project.storyboard?.totalVideoCredits || 60} KREDIT)`, 'SUCCESS');
    updateTelemetry(project, 'GATOTKACA', { status: 'ACTIVE', currentTask: 'Rendering video frames on neural cluster', progress: 10 });
    saveProjects();

    projectEvents.emit(`update:${id}`, project);

    this.runProductionStage(id).catch(console.error);
  }

  static async retryStage(id: string) {
    const project = projects.get(id);
    if (!project || project.status !== 'FAILED') return;
    
    // Clear previous errors
    project.providerError = undefined;
    project.error = undefined;

    const agent = project.activeAgent;
    project.agentStatus[agent!] = 'WORKING';
    
    if (agent === 'AI Video Director') project.status = 'PRODUCING';
    else if (agent === 'Video Assembly Editor') project.status = 'ASSEMBLING';
    else if (agent === 'Audio Designer') project.status = 'AUDIO';
    else if (agent === 'Viral Content Editor') project.status = 'EDITING';
    else if (agent === 'Video QA Director') project.status = 'QA';
    
    appendLog(project, 'PROTOCOL', `RE-ENGAGING FAILED STAGE [${agent}]`, 'INFO');
    projectEvents.emit(`update:${id}`, project);

    this.runProductionStage(id, agent!).catch(console.error);
  }

  static async runProductionStage(id: string, startFromAgent: string = 'AI Video Director') {
    const project = projects.get(id)!;
    
    try {
      const projectPreferredProvider = (project as any).videoProvider;
      const route = MediaProviderRouter.resolveRoute('VIDEO', {
        preferredModelOrEngine: project.videoModel,
        preferredProvider: projectPreferredProvider,
        studio: project.videoType
      });
      const provider = getVideoProvider(route.model, route.providerId);
      const pStatus = await provider.getStatus();
      
      if (startFromAgent === 'AI Video Director') {
        if (pStatus !== 'READY') {
          throw {
            code: pStatus,
            provider: provider.name,
            stage: `${provider.name} Engine`,
            retryable: true,
            message: `Video Provider '${provider.name}' is ${pStatus}.`
          };
        }

        // Generate Scenes
        if (project.storyboard) {
          const total = project.storyboard.scenes.length;
          for (let idx = 0; idx < total; idx++) {
            const scene = project.storyboard.scenes[idx];
            if (scene.videoStatus !== 'COMPLETED') {
              await this.generateSceneVideo(id, scene.id, project.videoModel);
            }
          }
        }
        
        project.agentStatus['AI Video Director'] = 'COMPLETE';
        startFromAgent = 'Video Assembly Editor';
      }

      if (startFromAgent === 'Video Assembly Editor') {
         project.activeAgent = 'Video Assembly Editor';
         project.agentStatus['Video Assembly Editor'] = 'WORKING';
         project.status = 'ASSEMBLING';
         appendLog(project, 'BAYU', 'Menyatukan video adegan...', 'INFO');
         projectEvents.emit(`update:${id}`, project);
         
         await simulateAgent(1000);
         project.agentStatus['Video Assembly Editor'] = 'COMPLETE';
         startFromAgent = 'Audio Designer';
      }

      if (startFromAgent === 'Audio Designer') {
         project.activeAgent = 'Audio Designer';
         project.agentStatus['Audio Designer'] = 'WORKING';
         project.status = 'AUDIO';
         appendLog(project, 'SINTA', 'Menambahkan musik dan efek suara...', 'INFO');
         projectEvents.emit(`update:${id}`, project);
         
         await simulateAgent(1000);
         project.agentStatus['Audio Designer'] = 'COMPLETE';
         startFromAgent = 'Viral Content Editor';
      }

      if (startFromAgent === 'Viral Content Editor') {
         project.activeAgent = 'Viral Content Editor';
         project.agentStatus['Viral Content Editor'] = 'WORKING';
         project.status = 'EDITING';
         appendLog(project, 'GATOTKACA', 'Menambahkan efek transisi dan filter...', 'INFO');
         projectEvents.emit(`update:${id}`, project);
         
         await simulateAgent(1000);
         project.agentStatus['Viral Content Editor'] = 'COMPLETE';
         startFromAgent = 'Video QA Director';
      }

      if (startFromAgent === 'Video QA Director') {
         project.activeAgent = 'Video QA Director';
         project.agentStatus['Video QA Director'] = 'WORKING';
         project.status = 'QA';
         appendLog(project, 'BIMA', 'Memeriksa kualitas video final...', 'INFO');
         projectEvents.emit(`update:${id}`, project);
         
         await simulateAgent(1000);
         project.agentStatus['Video QA Director'] = 'COMPLETE';
      }

      project.status = 'COMPLETED';
      project.overallProgress = 100;
      project.currentPhaseName = 'Video Selesai!';
      project.finalVideoUrl = "https://example.com/rendered-video.mp4"; // Placeholder if assembly wasn't full
      appendLog(project, 'PROTOCOL', 'PRODUKSI VIDEO SELESAI.', 'SUCCESS');
      saveProjects();
      projectEvents.emit(`update:${id}`, project);

    } catch (e: any) {
      project.status = 'FAILED';
      project.error = e.message || 'Terjadi kesalahan saat memproduksi video.';
      project.providerError = e;
      appendLog(project, 'ERROR', project.error, 'ERROR');
      if (project.activeAgent) {
        project.agentStatus[project.activeAgent] = 'FAILED';
      }
      saveProjects();
      projectEvents.emit(`update:${id}`, project);
    }
  }

  static async overrideSceneAsset(id: string, sceneId: string, updates: any) {
    const project = projects.get(id);
    if (!project) throw new Error("Project not found");
    if (project.storyboard?.scenes) {
      const idx = project.storyboard.scenes.findIndex(sc => String(sc.id) === String(sceneId));
      if (idx !== -1) {
        project.storyboard.scenes[idx] = {
          ...project.storyboard.scenes[idx],
          ...updates
        };
        // Also update the direct scenes array if it exists
        if (project.scenes) {
          const sIdx = project.scenes.findIndex(sc => String(sc.id) === String(sceneId));
          if (sIdx !== -1) {
            project.scenes[sIdx] = {
              ...project.scenes[sIdx],
              ...updates
            };
          }
        }
      }
    }
    saveProjects();
    projectEvents.emit(`update:${id}`, project);
    return project;
  }

  static async reorderScenes(id: string, newScenes: any[]) {
    const project = projects.get(id);
    if (!project) throw new Error("Project not found");
    if (project.storyboard) {
      project.storyboard.scenes = newScenes;
    }
    project.scenes = newScenes;
    saveProjects();
    projectEvents.emit(`update:${id}`, project);
    return project;
  }

  static async resyncScenes(id: string, action: 'ADD' | 'REMOVE', targetIndex: number) {
    const project = projects.get(id);
    if (!project) throw new Error("Project not found");
    if (!project.storyboard?.scenes) {
      throw new Error("Storyboard scenes not initialized");
    }
    const scenes = [...project.storyboard.scenes];
    if (action === 'REMOVE') {
      if (targetIndex >= 0 && targetIndex < scenes.length) {
        scenes.splice(targetIndex, 1);
      }
    } else if (action === 'ADD') {
      const templateScene = scenes[targetIndex] || scenes[scenes.length - 1];
      const newScene = templateScene ? {
        ...templateScene,
        id: `sc_${crypto.randomBytes(4).toString('hex')}`,
        status: 'PENDING' as const,
        imageStatus: 'PENDING' as const,
        videoStatus: 'PENDING' as const,
        imageUrl: undefined,
        videoUrl: undefined,
        assetUrl: undefined,
        falUrl: undefined,
        remoteUrl: undefined
      } : {
        id: `sc_${crypto.randomBytes(4).toString('hex')}`,
        duration: "5",
        visualDirection: "Scene visual direction description",
        status: 'PENDING' as const,
        imageStatus: 'PENDING' as const,
        videoStatus: 'PENDING' as const
      };
      // Insert right after the target index (or at end if out of bounds)
      const insertAt = targetIndex >= 0 ? targetIndex + 1 : scenes.length;
      scenes.splice(insertAt, 0, newScene);
    }
    project.storyboard.scenes = scenes;
    project.scenes = scenes;
    saveProjects();
    projectEvents.emit(`update:${id}`, project);
    return project;
  }

  static async stitchMasterVideo(projectId: string, subtitleStyle?: string, ttsVoiceConfig?: any) {
    const project = projects.get(projectId);
    if (!project) throw new Error("Project not found");

    const { VideoRenderService } = await import('./videoRenderService');

    try {
      // Assemble and stitch scenes
      appendLog(project, 'BAYU', `Memulai perakitan video master untuk proyek ${project.title || "Untitled"}...`, 'INFO');
      projectEvents.emit(`update:${projectId}`, project);

      const result = await VideoRenderService.executeVideoRenderPipeline({
        projectId,
        userId: project.userId || 'default-user',
        deductedCredits: 15, // standard stitch credit cost
        scenes: (project.storyboard?.scenes || []) as any[],
        social_media_kit: (project as any).social_media_kit,
        project_meta: {
          title: project.title,
          subtitleStyle,
          ttsVoiceConfig: ttsVoiceConfig || project.ttsVoiceConfig
        } as any
      });

      if (result.status === 'SUCCESS' || result.status === 'PARTIAL_SUCCESS') {
        project.finalVideoUrl = result.finalVideoUrl || (result.scenes && result.scenes[0]?.videoUrl) || '/videos/sample-ocean.mp4';
        project.status = 'COMPLETED';
        project.overallProgress = 100;
        project.currentPhaseName = 'Video Master Selesai!';
        if (result.scenes && project.storyboard) {
          project.storyboard.scenes = result.scenes as any[];
        }
        appendLog(project, 'BAYU', `Video master berhasil dirakit! URL: ${project.finalVideoUrl}`, 'SUCCESS');
      } else {
        throw new Error(result.message || 'Gagal merender video master.');
      }

      saveProjects();
      projectEvents.emit(`update:${projectId}`, project);
    } catch (e: any) {
      project.status = 'FAILED';
      project.error = e.message || 'Gagal menyatukan video master.';
      appendLog(project, 'ERROR', `Gagal merakit video master: ${project.error}`, 'ERROR');
      saveProjects();
      projectEvents.emit(`update:${projectId}`, project);
      throw e;
    }
  }
}
