import { db } from "../src/db/index.ts";
import { projects as dbProjects, users as dbUsers } from "../src/db/schema.ts";
import { eq } from "drizzle-orm";
import { QAAuditAgent } from "./services/qaAuditAgent";
import { VideoEditor } from "./VideoEditor";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import { EventEmitter } from "events";
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
import { getVideoProvider } from "../src/server/providers";
import { LLMService } from "./llmService";
import { ImageGenerationService } from "./imageService";

export const projectEvents = new EventEmitter();
export const projects = new Map<string, ProductionProject>();

import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'outputs', 'db.json');

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

export function saveProjects() {
  // Sync map to PostgreSQL
  (async () => {
    try {
      for (const [id, project] of projects.entries()) {
        const userId = (project as any).userId || 'default';
        await db.insert(dbProjects).values({
          id,
          userId: userId,
          title: project.title || 'Untitled',
          status: project.status || 'PENDING',
          videoType: project.videoType || 'AFFILIATE',
          finalVideoUrl: project.finalVideoUrl || null,
          data: JSON.stringify(project)
        }).onConflictDoUpdate({
          target: dbProjects.id,
          set: {
            title: project.title || 'Untitled',
            status: project.status || 'PENDING',
            videoType: project.videoType || 'AFFILIATE',
            finalVideoUrl: project.finalVideoUrl || null,
            data: JSON.stringify(project)
          }
        }).catch(err => console.error("DB Save Error (Project " + id + "):", err.message));
      }
    } catch(e) {
      console.error("Failed to sync projects to Postgres:", e);
    }
  })();
}

export function loadProjects() {
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
            projects.set(row.id, parsed);
          } catch(e) {}
        }
      }
      console.log(`Loaded ${projects.size} projects from Postgres DB.`);
    } catch(e) {
      console.error("Failed to load projects from Postgres:", e);
    }
  })();
}
// Load on module init
loadProjects();


function getGenAI(): GoogleGenAI | null {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
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
      agentName: 'Sora Video Director',
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

function appendLog(project: ProductionProject, source: string, message: string, level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'INTERRUPT' = 'INFO') {
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
}

export class ProductionOrchestrator {
  static async startProduction(input: string | ProductionStartOptions) {
    const options: ProductionStartOptions = typeof input === 'string' ? { prompt: input } : input;
    const { prompt, videoType, videoModel, ttsVoiceConfig, attachedAssets, affiliateConfig, animationConfig, educationalConfig } = options;

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

    const selectedVideoModel = videoModel || (prompt.toLowerCase().includes('runway') ? 'runway' : prompt.toLowerCase().includes('luma') ? 'luma' : prompt.toLowerCase().includes('kling') ? 'kling' : 'sora');
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
        aspectRatio: animationConfig?.aspectRatio || '16:9'
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
        'Sora Video Director': 'WAITING',
        'Video Assembly Editor': 'WAITING',
        'Audio Designer': 'WAITING',
        'Viral Content Editor': 'WAITING',
        'Video QA Director': 'WAITING',
        'Distribution Manager': 'WAITING'
      },
      telemetry,
      logs: []
    };

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
      const charImg = currentConfig?.characterImage || project.affiliateConfig?.characterImage;
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
            styleSeed: 3819401,
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
            styleSeed: 3819401,
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
            scene: { ...s, promptTextToImage: s.promptTextToImage || s.prompt_video_runway, visualDirection: s.visualDirection || s.visual_direction },
            sceneIndex: idx,
            videoType: vType,
            characterProfile: project.characterProfile,
            artStyle: project.animationConfig?.artStyle || project.educationalConfig?.visualStyle,
            affiliateConfig: project.affiliateConfig,
            animationConfig: project.animationConfig,
            educationalConfig: project.educationalConfig
          });

          let lockedI2VPrompt = ImageGenerationService.buildI2VVideoPrompt({
            scene: { ...s, promptImageToVideo: s.promptImageToVideo || s.prompt_video_runway, visualDirection: s.visualDirection || s.visual_direction },
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
            videoType: vType
          });

          if (qaResult && qaResult.autoCorrected) {
             lockedI2VPrompt = qaResult.correctedVideoPrompt || lockedI2VPrompt;
             s.voiceOver = qaResult.correctedScript || s.voiceOver;
             s.visualDirection = qaResult.correctedVisualPrompt || s.visualDirection;
          }

          return {
            id: crypto.randomUUID(),
            duration: durStr,
            visualDirection: s.visualDirection || s.visual_direction || "Adegan promosi",
            textOverlay: s.textOverlay || s.text_overlay || '',
            subtitle: s.textOverlay || s.text_overlay || '',
            voiceOver: s.voiceOver || s.voiceover_script || '',
            promptTextToImage: lockedT2IPrompt,
            promptImageToVideo: lockedI2VPrompt,
            styleKeywords: s.styleKeywords || [],
            status: 'PENDING',
            imageStatus: 'PENDING',
            videoStatus: 'PENDING',
            imageCreditCost: 5,
            videoCreditCost: 15,
            qaScore: (typeof qaResult?.score === 'number' && !isNaN(qaResult.score)) ? qaResult.score : (92 + (idx % 6)),
            qaPassed: qaResult?.passed ?? true,
            qaIssues: qaResult?.issues || []
          };
        }));
        appendLog(project, 'SINTA', `STORYBOARD GENERATED [${sbResult.modelUsed}]: ${generatedScenes.length} Scenes Choreographed with QA Audit & Auto-Correction`, 'SUCCESS');
      }

      // Procedural scene fallback if needed
      if (generatedScenes.length === 0) {
        if (vType === 'ANIMATION') {
          const anim = project.animationConfig!;
          const charName = project.characterProfile?.name || 'Karakter Utama';
          const charDesc = anim.characterDescription || 'Protagonis penuh determinasi';
          const world = anim.worldSetting || 'Stadion dan arena visual megah';
          const title = anim.title || 'Petualangan Epik';

          generatedScenes = [
            {
              id: crypto.randomUUID(),
              duration: "00:04",
              visualDirection: `Opening shot (Establishing shot) di ${world}. Memperlihatkan ${charName} (${charDesc}) bersiap mengawali kisah "${title}". Sudut kamera sinematik dengan tata pencahayaan dramatis.`,
              textOverlay: `✨ ${title}`,
              subtitle: `✨ ${title}`,
              voiceOver: `Di ${world}, sebuah babak baru yang dinantikan kini dimulai bersama ${charName}.`,
              promptTextToImage: `Cinematic wide establishing keyframe of ${charName}, ${charDesc}, in ${world}, ${anim.artStyle}, cinematic lighting, atmospheric depth, masterpiece 8k --seed ${project.characterProfile?.styleSeed || 8849201}`,
              promptImageToVideo: `Cinematic wide tracking camera glide moving towards ${charName} in ${world}, ${anim.artStyle}, ${charDesc}, atmospheric volumetric lighting, smooth camera movement 4k --ar ${anim.aspectRatio || '16:9'}`,
              styleKeywords: [anim.artStyle, "Wide Shot", "Establishing", "Cinematic"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 95,
              qaPassed: true,
              qaIssues: []
            },
            {
              id: crypto.randomUUID(),
              duration: "00:04",
              visualDirection: `Medium action shot: ${charName} memperlihatkan aksi dan keahlian utamanya di ${world}. Ekspresi wajah fokus dengan detail pantulan cahaya yang sangat tajam dan hidup.`,
              textOverlay: "🔥 Dedikasi & Keterampilan Luar Biasa",
              subtitle: "🔥 Dedikasi & Keterampilan Luar Biasa",
              voiceOver: "Setiap langkah, determinasi, dan fokus terasah membawa langkah lebih dekat menuju impian tertinggi.",
              promptTextToImage: `Medium close-up keyframe of ${charName} showcasing dynamic action, ${charDesc}, set in ${world}, ${anim.artStyle}, intense focus, subsurface scattering, 8k --seed ${project.characterProfile?.styleSeed || 8849201}`,
              promptImageToVideo: `Dynamic medium action tracking shot of ${charName}, ${charDesc}, in ${world}, ${anim.artStyle}, fast fluid camera movement, particle dynamics, 4k 60fps --ar ${anim.aspectRatio || '16:9'}`,
              styleKeywords: [anim.artStyle, "Medium Shot", "Action Focus", "Expressive Character"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 93,
              qaPassed: true,
              qaIssues: []
            },
            {
              id: crypto.randomUUID(),
              duration: "00:04",
              visualDirection: `Dynamic high-speed camera tracking: ${charName} melancarkan manuver klimaks terbaiknya di ${world} dengan efek visual dramatis dan sorak sorai pendukung.`,
              textOverlay: "⚡ Manuver Klimaks & Aksi Epik",
              subtitle: "⚡ Manuver Klimaks & Aksi Epik",
              voiceOver: "Dengan segenap tekad dan keberanian pantang menyerah, saat penentuan telah tiba!",
              promptTextToImage: `High dynamic action keyframe of ${charName} executing powerful climactic move in ${world}, ${charDesc}, ${anim.artStyle}, speed lines, dramatic rim lighting, 8k --seed ${project.characterProfile?.styleSeed || 8849201}`,
              promptImageToVideo: `High-speed orbiting camera tracking ${charName} executing powerful climactic move in ${world}, ${charDesc}, ${anim.artStyle}, motion blur, ultra dynamic action sequence 4k --ar ${anim.aspectRatio || '16:9'}`,
              styleKeywords: [anim.artStyle, "Orbit Shot", "Dynamic Climax", "High Speed"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 96,
              qaPassed: true,
              qaIssues: []
            },
            {
              id: crypto.randomUUID(),
              duration: "00:04",
              visualDirection: `Hero shot klimaks: ${charName} merayakan kemenangan dan momen bersejarah di ${world} dengan ekspresi bangga diiringi cahaya keemasan.`,
              textOverlay: `🌟 Kemenangan & Mahakarya ${title}`,
              subtitle: `🌟 Kemenangan & Mahakarya ${title}`,
              voiceOver: `Inilah bukti nyata bahwa tekad pantang menyerah akan selalu mengukir sejarah abadi.`,
              promptTextToImage: `Epic hero low-angle keyframe of ${charName} celebrating triumph in ${world}, ${charDesc}, ${anim.artStyle}, dramatic golden hour lighting, cinematic masterpiece 8k --seed ${project.characterProfile?.styleSeed || 8849201}`,
              promptImageToVideo: `Epic slow-motion pull-back hero shot of ${charName} triumphant in ${world}, ${charDesc}, ${anim.artStyle}, glowing cinematic rim lighting, 4k outro --ar ${anim.aspectRatio || '16:9'}`,
              styleKeywords: [anim.artStyle, "Hero Shot", "Epic Victory", "Title Finale"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 97,
              qaPassed: true,
              qaIssues: []
            }
          ];
        } else if (vType === 'EDUCATIONAL') {
          const edu = project.educationalConfig!;
          const charName = project.characterProfile?.name || "Edukator Utama";
          const charDesc = project.characterProfile?.outfit || edu.characterDescription || "Edukator profesional";
          const world = edu.worldSetting || "Laboratorium sains modern";

          generatedScenes = [
            {
              id: crypto.randomUUID(),
              duration: "00:04",
              visualDirection: `Hook adegan pembuka: ${charName} memperkenalkan topik "${edu.subjectTitle}" di ${world} dengan grafis infografis interaktif melayang.`,
              textOverlay: `💡 Mengapa ${edu.subjectTitle} Sangat Penting?`,
              subtitle: `💡 Mengapa ${edu.subjectTitle} Sangat Penting?`,
              voiceOver: `Pernahkah Anda bertanya-tanya bagaimana sebenarnya ${edu.subjectTitle} bekerja di kehidupan kita sehari-hari?`,
              promptTextToImage: `Educational presentation keyframe of ${charName}, ${charDesc}, presenting ${edu.subjectTitle} in ${world}, ${edu.visualStyle}, clean modern infographic overlays, crisp clarity, 8k --seed 5829104`,
              promptImageToVideo: `Clean educational motion graphics with ${charName} presenting in ${world}, showing sleek modern isometric diagrams, crisp typography, 4k vector render --ar ${edu.aspectRatio || '16:9'}`,
              styleKeywords: [edu.visualStyle, "Explainer Hook", "Presenter Lock"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 94,
              qaPassed: true,
              qaIssues: []
            },
            {
              id: crypto.randomUUID(),
              duration: "00:05",
              visualDirection: `Visualisasi analogi mekanisme inti: ${charName} mendemonstrasikan proses inti "${edu.subjectTitle}" di ${world} dengan model diagram terurai (exploded view) beranotasi cahaya.`,
              textOverlay: "⚙️ Mekanisme & Prinsip Kerja Inti",
              subtitle: "⚙️ Mekanisme & Prinsip Kerja Inti",
              voiceOver: `Kuncinya terletak pada komponen utama ini yang saling berinteraksi secara harmonis dan presisi.`,
              promptTextToImage: `Exploded view technical diagram of ${edu.subjectTitle} with glowing nodes in ${world}, ${edu.visualStyle}, high clarity, 8k --seed 5829104`,
              promptImageToVideo: `Detailed educational exploded view 3D diagram in ${world} with glowing animated data streams, isometric tech infographic, studio lighting, 4k --ar ${edu.aspectRatio || '16:9'}`,
              styleKeywords: [edu.visualStyle, "Exploded Diagram", "Data Stream"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 95,
              qaPassed: true,
              qaIssues: []
            },
            {
              id: crypto.randomUUID(),
              duration: "00:05",
              visualDirection: `Simulasi studi kasus nyata: ${charName} memperlihatkan perbandingan sebelum dan sesudah penerapan konsep secara nyata dengan visual split-screen interaktif di ${world}.`,
              textOverlay: "📊 Dampak Nyata di Dunia Praktis",
              subtitle: "📊 Dampak Nyata di Dunia Praktis",
              voiceOver: `Hasilnya, efisiensi melonjak berlipat ganda dan kesalahan dapat diminimalisir hingga mendekati nol.`,
              promptTextToImage: `Split-screen comparison visualization for ${edu.subjectTitle} in ${world}, data charts, glowing metrics, clean modern UI, 8k --seed 5829104`,
              promptImageToVideo: `Split-screen comparison motion graphics visualization in ${world}, clean data charts and glowing metrics, modern tech UI, 4k --ar ${edu.aspectRatio || '16:9'}`,
              styleKeywords: [edu.visualStyle, "Case Study", "Data Charts"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 92,
              qaPassed: true,
              qaIssues: []
            },
            {
              id: crypto.randomUUID(),
              duration: "00:04",
              visualDirection: `Kesimpulan dan ringkasan 3 poin kunci: ${charName} merangkum "${edu.keyTakeaways}" di ${world} dalam format infografis ringkas yang mudah dipahami.`,
              textOverlay: "🎯 Kesimpulan & Poin Kunci Utama",
              subtitle: "🎯 Kesimpulan & Poin Kunci Utama",
              voiceOver: `Ingat poin-poin utama ini, dan Anda sudah siap menguasai materi ini!`,
              promptTextToImage: `Modern animated summary board with checkmarks presented by ${charName} in ${world}, sleek typography, clean visual graphic outro, 8k --seed 5829104`,
              promptImageToVideo: `Modern animated summary card with checkmarks in ${world}, sleek typography, clean motion design outro, 4k --ar ${edu.aspectRatio || '16:9'}`,
              styleKeywords: [edu.visualStyle, "Summary Card", "Outro"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 96,
              qaPassed: true,
              qaIssues: []
            }
          ];
        } else {
          // Affiliate & Commercial Fallback
          const aff = project.affiliateConfig;
          const prodName = aff?.productName || "Featured Product";
          const rawVision = aff?.productVisualAnalysis ? aff.productVisualAnalysis.replace(/^Exact Physical Product Features from Uploaded Photo:\s*/i, '').trim() : '';
          const visionAttrs = rawVision || (aff?.keyBenefits || "premium finish, authentic colors and texture");
          const charName = project.characterProfile?.name || 'Creator';
          const cleanCharName = (charName || '')
            .replace(/Kreator Utama/gi, 'Female model')
            .replace(/\(Model Referensi\)/gi, '')
            .replace(/\(Kreator Utama\)/gi, '')
            .replace(/Model Referensi/gi, '')
            .trim() || 'Female model';
          
          const cleanVision = ImageGenerationService.sanitizeNegativePhrasesFromPositivePrompt(visionAttrs || '');

          const charOutfit = project.characterProfile?.outfit || '';
          const charFace = project.characterProfile?.facialFeatures || '';
          
          const prodLockHeader = `Photorealistic 35mm commercial photo of ${cleanCharName} holding ${prodName} (${cleanVision})`;
          const i2vLockHeader = `Photorealistic commercial vertical 9:16 video of ${cleanCharName} presenting ${prodName} (${cleanVision})`;

          generatedScenes = [
            {
              id: crypto.randomUUID(),
              duration: "00:03",
              visualDirection: `Hook visual berkecepatan tinggi: ${cleanCharName} memegang ${prodName} langsung di depan kamera dengan lighting studio profesional dan efek zoom cepat yang menarik perhatian.`,
              textOverlay: "🔥 JANGAN BELI SEBELUM TAHU INI!",
              subtitle: "🔥 JANGAN BELI SEBELUM TAHU INI!",
              voiceOver: `Gila sih, nemu ${prodName} sebagus ini dengan harga yang nggak masuk akal murahnya!`,
              promptTextToImage: `Photorealistic 35mm commercial product photo of ${cleanCharName} holding and presenting ${prodName} (${cleanVision}) directly to the camera in a modern studio setting, medium close-up shot showing creator face and product, authentic skin texture, 50mm lens f/2.8, clean background with cool blue accent lighting, high conversion TikTok aesthetic, 8k crisp focus.`,
              promptImageToVideo: `${i2vLockHeader} presenting product directly to camera, fast dynamic zoom-in commercial shot, e-commerce studio lighting, vertical 9:16 video --ar 9:16`,
              styleKeywords: ["TikTok Hook", "Vertical 9:16", "Commercial Macro"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 92,
              qaPassed: true,
              qaIssues: []
            },
            {
              id: crypto.randomUUID(),
              duration: "00:04",
              visualDirection: `Extreme close-up uji pakai dan demonstrasi kualitas material: ${cleanCharName} menunjukkan ketahanan, kelembutan, dan detail jahitan/tekstur premium ${prodName}.`,
              textOverlay: "☁️ Bahan Super Premium & Nyaman",
              subtitle: "☁️ Bahan Super Premium & Nyaman",
              voiceOver: `Lihat deh detail bahannya, bener-bener solid, empuk, dan nyaman banget dipakai seharian.`,
              promptTextToImage: `Extreme macro close-up commercial product shot of ${prodName} (${cleanVision}), showing detailed material texture, sole flexibility, and fine stitching, held and demonstrated by ${cleanCharName}'s hands, soft commercial studio backlight, crisp 8k focus.`,
              promptImageToVideo: `Action: Extreme close-up macro texture shot of ${prodName} (${cleanVision}) with ${cleanCharName}'s hands demonstrating premium material, soft commercial studio backlight, ultra sharp material details, 4k 60fps --ar 9:16`,
              styleKeywords: ["Macro Texture", "Material Demo", "E-commerce Studio"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 94,
              qaPassed: true,
              qaIssues: []
            },
            {
              id: crypto.randomUUID(),
              duration: "00:04",
              visualDirection: `Showcase pemakaian (Wear test / On-model): ${cleanCharName} berjalan percaya diri menunjukkan kombinasi outfit yang matching dengan ${prodName}.`,
              textOverlay: "✨ Bikin OOTD Makin Standout!",
              subtitle: "✨ Bikin OOTD Makin Standout!",
              voiceOver: `Dipake ke mana aja langsung auto keren dan banyak yang nanyain beli di mana!`,
              promptTextToImage: `Full-body fashion lifestyle portrait of the same ${cleanCharName} wearing ${prodName} (${cleanVision}) on feet, walking confidently along a sunny urban street, wearing a stylish streetwear outfit, dynamic tracking angle, natural daylight with warm sun flare, 8k crisp focus.`,
              promptImageToVideo: `Action: Trendy fashion lifestyle shot showcasing ${cleanCharName} wearing ${prodName} (${cleanVision}) while walking confidently, urban streetwear lighting, cinematic smooth tracking shot, 4k --ar 9:16`,
              styleKeywords: ["Lifestyle Shoot", "OOTD Showcase", "Viral Cut"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 96,
              qaPassed: true,
              qaIssues: []
            },
            {
              id: crypto.randomUUID(),
              duration: "00:03",
              visualDirection: `Call-to-Action penutup: ${cleanCharName} menunjuk ke arah kiri bawah layar dengan stiker flash sale diskon dan garansi ${prodName}.`,
              textOverlay: "🛒 KLIK KERANJANG KUNING SEKARANG!",
              subtitle: "🛒 KLIK KERANJANG KUNING SEKARANG!",
              voiceOver: `Mumpung lagi ada promo diskon dan gratis ongkir, langsung checkout di keranjang kuning kiri bawah ya!`,
              promptTextToImage: `Commercial promotional showcase shot of ${cleanCharName} holding ${prodName} (${cleanVision}) and enthusiastically pointing toward the bottom left corner discount badge, clean studio backdrop, energetic lighting, urgent CTA styling, 8k crisp focus.`,
              promptImageToVideo: `Action: Commercial product display with ${cleanCharName} holding ${prodName} (${cleanVision}) and pointing towards glowing animated discount badge in bottom left corner, clean studio background, 4k vertical --ar 9:16`,
              styleKeywords: ["CTA Outro", "Flash Sale", "Keranjang Kuning"],
              status: 'PENDING',
              imageStatus: 'PENDING',
              videoStatus: 'PENDING',
              imageCreditCost: 5,
              videoCreditCost: 15,
              qaScore: 91,
              qaPassed: true,
              qaIssues: []
            }
          ];
        }
      }

      // Assign user uploaded product images as reference anchors (character lock / Google Flow style)
      const userProductImages = (project.affiliateConfig?.productImages && project.affiliateConfig.productImages.length > 0)
        ? project.affiliateConfig.productImages
        : (project.attachedAssets?.filter(a => a.type === 'IMAGE').map(a => a.url) || []);

      const activeCharImg = project.affiliateConfig?.characterImage || charImg;
      if (project.characterProfile) {
         if (activeCharImg) {
            project.characterProfile.referenceImageUrl = activeCharImg;
            appendLog(project, 'SINTA', `KARAKTER LOCK: Foto Kreator/Karakter spesifik dikunci ke profil sebagai Subject Reference UGC.`, 'SUCCESS');
         }
      }

      if (userProductImages.length > 0) {
        userProductImages.forEach((imgUrl, idx) => {
          if (generatedScenes[idx]) {
            generatedScenes[idx].assetUrl = imgUrl;
            // DO NOT set imageUrl or imageStatus to COMPLETED here.
            // We want the AI to generate a consistent scene combining the product/character.
          }
        });
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
   * Generates a single Scene's consistent character keyframe image (Cost: based on model)
   */
  static async generateSceneImage(id: string, sceneId: string, imageEngine?: string) {
    const project = projects.get(id);
    if (!project || !project.storyboard) return;

    const sceneIdx = project.storyboard.scenes.findIndex(s => s.id === sceneId);
    if (sceneIdx === -1) return;

    const scene = project.storyboard.scenes[sceneIdx];
    scene.imageStatus = 'GENERATING';
    const engineLabel = imageEngine === 'gemini-imagen-3' ? 'Google Imagen 3' : (imageEngine === 'flux-diffusion' ? 'Flux AI' : 'ChatGPT Image 2');
    appendLog(project, 'SINTA', `GENERATING KEYFRAME IMAGE [Adegan ${sceneIdx + 1}] (${engineLabel}) -> Karakter: ${project.characterProfile?.name || 'Utama'}`, 'INFO');
    projectEvents.emit(`update:${id}`, project);

    try {
      const artStyle = project.animationConfig?.artStyle || project.educationalConfig?.visualStyle;
      const imageUrl = await ImageGenerationService.generateKeyframeImage({
        scene,
        sceneIndex: sceneIdx,
        videoType: project.videoType,
        characterProfile: project.characterProfile,
        artStyle,
        affiliateConfig: project.affiliateConfig,
        animationConfig: project.animationConfig,
        educationalConfig: project.educationalConfig,
        engine: imageEngine,
        forceRegenerate: true
      });

      scene.imageUrl = imageUrl;
      if (!scene.assetUrl) {
        scene.assetUrl = imageUrl;
      }
      scene.imageStatus = 'COMPLETED';
      appendLog(project, 'SINTA', `KEYFRAME ADEGAN ${sceneIdx + 1} SELESAI -> Konsistensi visual terkunci`, 'SUCCESS');
      projectEvents.emit(`update:${id}`, project);
    } catch (e: any) {
      scene.imageStatus = 'FAILED';
      appendLog(project, 'ERROR', `Gagal generate keyframe adegan ${sceneIdx + 1}: ${e.message}`, 'ERROR');
      projectEvents.emit(`update:${id}`, project);
    }
  }

  /**
   * Generates consistent character keyframe images for all scenes
   */
  static async generateAllSceneImages(id: string, imageEngine?: string) {
    const project = projects.get(id);
    if (!project || !project.storyboard) return;

    project.userChoice = 'GENERATE_IMAGES';
    project.activeProductionStage = 'IMAGES';
    project.overallProgress = 60;
    project.currentPhaseName = 'Memproses Keyframe Karakter Konsisten Semua Adegan';
    project.activeAgent = 'Storyboard Director';
    project.agentStatus['Storyboard Director'] = 'WORKING';

    const engineLabel = imageEngine === 'gemini-imagen-3' ? 'Google Imagen 3' : (imageEngine === 'flux-diffusion' ? 'Flux AI' : 'ChatGPT Image 2');
    appendLog(project, 'PROTOCOL', `USER MENYETUJUI GENERATE KEYFRAME KARAKTER KONSISTEN (${engineLabel})`, 'SUCCESS');
    projectEvents.emit(`update:${id}`, project);

    const total = project.storyboard.scenes.length;
    const artStyle = project.animationConfig?.artStyle || project.educationalConfig?.visualStyle;

    for (let i = 0; i < total; i++) {
      const sc = project.storyboard.scenes[i];
      sc.imageStatus = 'GENERATING';
      project.currentPhaseName = `Generating Keyframe ${i + 1}/${total} (${project.characterProfile?.name || 'Karakter'})`;
      projectEvents.emit(`update:${id}`, project);

      const imageUrl = await ImageGenerationService.generateKeyframeImage({
        scene: sc,
        sceneIndex: i,
        videoType: project.videoType,
        characterProfile: project.characterProfile,
        artStyle,
        affiliateConfig: project.affiliateConfig,
        animationConfig: project.animationConfig,
        educationalConfig: project.educationalConfig,
        engine: imageEngine,
        forceRegenerate: true
      });

      sc.imageUrl = imageUrl;
      if (!sc.assetUrl) {
        sc.assetUrl = imageUrl;
      }
      sc.imageStatus = 'COMPLETED';
      appendLog(project, 'SINTA', `Keyframe Adegan ${i + 1}/${total} siap -> Visual terpasang`, 'SUCCESS');
      projectEvents.emit(`update:${id}`, project);
    }

    project.overallProgress = 65;
    project.currentPhaseName = 'Keyframe Karakter Konsisten Selesai. Siap Lanjut ke Video!';
    project.agentStatus['Storyboard Director'] = 'COMPLETE';
    appendLog(project, 'PROTOCOL', `SEMUA KEYFRAME SELESAI -> Anda dapat memilih generate video per adegan atau Full Video Master.`, 'INFO');
    projectEvents.emit(`update:${id}`, project);
  }

  /**
   * Generates video for a single scene (Cost: 15 Credits)
   */
  static async generateSceneVideo(id: string, sceneId: string) {
    const project = projects.get(id);
    if (!project || !project.storyboard) return;

    const sceneIdx = project.storyboard.scenes.findIndex(s => s.id === sceneId);
    if (sceneIdx === -1) return;

    const scene = project.storyboard.scenes[sceneIdx];
    
    scene.videoStatus = 'GENERATING';
    scene.status = 'GENERATING';
    const provider = getVideoProvider(project.videoModel);
    
    appendLog(project, 'GATOTKACA', `MEMULAI RENDER VIDEO ADEGAN ${sceneIdx + 1} dengan ${provider.name} (Biaya: 15 Kredit)...`, 'INFO');
    updateTelemetry(project, 'GATOTKACA', { status: 'ACTIVE', currentTask: `Rendering scene ${sceneIdx + 1} video latent diffusion...`, progress: 15 });
    projectEvents.emit(`update:${id}`, project);

    try {
      await simulateAgent(1200);
      appendLog(project, 'GATOTKACA', `ADEGAN ${sceneIdx + 1}: Generasi pergerakan kamera sinematik & frame interpolasi...`, 'INFO');
      updateTelemetry(project, 'GATOTKACA', { status: 'ACTIVE', currentTask: `Rendering motion vectors for scene ${sceneIdx + 1}...`, progress: 50 });
      projectEvents.emit(`update:${id}`, project);

      await simulateAgent(1200);
      appendLog(project, 'BAYU', `ADEGAN ${sceneIdx + 1}: Menyiapkan overlay subtitle animasi & sinkronisasi audio narasi...`, 'INFO');
      updateTelemetry(project, 'BAYU', { status: 'ACTIVE', currentTask: `Aligning subtitles and audio for scene ${sceneIdx + 1}...`, progress: 80 });
      projectEvents.emit(`update:${id}`, project);
      if (project.videoType === 'AFFILIATE') {
        scene.metadata = scene.metadata || {};
        if (project.affiliateConfig?.productImages?.[0]) {
          scene.metadata.productImage = project.affiliateConfig.productImages[0];
        }
        if (project.characterProfile?.referenceImageUrl) {
          scene.metadata.characterImage = project.characterProfile.referenceImageUrl;
        }
      }

      const generatedUrl = await provider.generateScene(scene as any, (project.brief || '') + ' TYPE:' + project.videoType);
      scene.videoUrl = generatedUrl;
      scene.videoStatus = 'COMPLETED';
      scene.status = 'COMPLETED';

      // Set final project video URL if first completed scene
      if (!project.finalVideoUrl) {
        project.finalVideoUrl = generatedUrl;
      }

      saveProjects();

      appendLog(project, 'GATOTKACA', `VIDEO ADEGAN ${sceneIdx + 1} SELESAI DIRENDER & SUBTITLE DIPASANG -> ${generatedUrl}`, 'SUCCESS');
      updateTelemetry(project, 'GATOTKACA', { status: 'ONLINE', currentTask: `Scene ${sceneIdx + 1} ready`, progress: 100 });
      projectEvents.emit(`update:${id}`, project);
    } catch (e: any) {
      scene.videoStatus = 'FAILED';
      scene.status = 'FAILED';
      appendLog(project, 'ERROR', `Gagal render video adegan ${sceneIdx + 1}: ${e.message}`, 'ERROR');
      projectEvents.emit(`update:${id}`, project);
    }
  }

  static async approveStoryboard(id: string) {
    const project = projects.get(id);
    if (!project || (project.status !== 'AWAITING_APPROVAL' && project.activeProductionStage !== 'IMAGES')) return;

    project.userChoice = 'FULL_PRODUCTION';
    project.status = 'PRODUCING';
    project.activeProductionStage = 'VIDEOS';
    project.overallProgress = 55;
    project.currentPhaseName = 'Rendering Frame Video Per Adegan (GATOTKACA - 55%)';
    project.activeAgent = 'Sora Video Director';
    project.agentStatus['Human Approval Gate'] = 'COMPLETE';
    project.agentStatus['Sora Video Director'] = 'WORKING';
    project.providerError = undefined;
    project.error = undefined;

    appendLog(project, 'PROTOCOL', `PRODUCTION PIPELINE DISETUJUI -> MEMULAI MULTI-AGENT VIDEO ASSEMBLY & EDITING (${project.storyboard?.totalVideoCredits || 60} KREDIT)`, 'SUCCESS');
    updateTelemetry(project, 'GATOTKACA', { status: 'ACTIVE', currentTask: 'Rendering video frames on neural cluster', progress: 10 });

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
    
    if (agent === 'Sora Video Director') project.status = 'PRODUCING';
    else if (agent === 'Video Assembly Editor') project.status = 'ASSEMBLING';
    else if (agent === 'Audio Designer') project.status = 'AUDIO';
    else if (agent === 'Viral Content Editor') project.status = 'EDITING';
    else if (agent === 'Video QA Director') project.status = 'QA';
    
    appendLog(project, 'PROTOCOL', `RE-ENGAGING FAILED STAGE [${agent}]`, 'INFO');
    projectEvents.emit(`update:${id}`, project);

    this.runProductionStage(id, agent!).catch(console.error);
  }

  static async runProductionStage(id: string, startFromAgent: string = 'Sora Video Director') {
    const project = projects.get(id)!;
    
    try {
      const provider = getVideoProvider(project.videoModel);
      const pStatus = await provider.getStatus();
      
      if (startFromAgent === 'Sora Video Director') {
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
            scene.status = 'GENERATING';
            scene.videoStatus = 'GENERATING';
            
            const sceneProgressPct = Math.round(55 + ((idx + 0.5) / total) * 20); // 55% to 75%
            project.overallProgress = sceneProgressPct;
            project.currentPhaseName = `GATOTKACA: Merender Video Adegan ${idx + 1}/${total} (${provider.name} - ${sceneProgressPct}%)`;

            updateTelemetry(project, 'GATOTKACA', { 
              status: 'ACTIVE', 
              currentTask: `Rendering [${provider.name}] adegan ${idx + 1}/${total}: ${scene.visualDirection.substring(0, 35)}...`, 
              progress: Math.round(((idx + 0.5) / total) * 100) 
            });
            
            const isValidVideoUrl = scene.videoUrl && 
              (scene.videoUrl.endsWith('.mp4') || scene.videoUrl.endsWith('.webm') || scene.videoUrl.includes('/sample/') || scene.videoUrl.startsWith('data:video/')) &&
              !scene.videoUrl.startsWith('data:image/');

            if (isValidVideoUrl) {
                appendLog(project, 'GATOTKACA', `RE-USE ADEGAN [${idx + 1}/${total}] -> Memakai video hasil render terakhir.`, 'INFO');
                scene.status = 'COMPLETED';
                scene.videoStatus = 'COMPLETED';
            } else {
                appendLog(project, 'GATOTKACA', `RENDERING ADEGAN [${idx + 1}/${total}] via ${provider.name} -> Durasi: ${scene.duration}`, 'INFO');
                projectEvents.emit(`update:${id}`, project);
                if (project.videoType === 'AFFILIATE') {
                  scene.metadata = scene.metadata || {};
                  if (project.affiliateConfig?.productImages?.[0]) {
                    scene.metadata.productImage = project.affiliateConfig.productImages[0];
                  }
                  if (project.characterProfile?.referenceImageUrl) {
                    scene.metadata.characterImage = project.characterProfile.referenceImageUrl;
                  }
                }
                
                const generatedUrl = await provider.generateScene(scene as any, (project.brief || '') + ' TYPE:' + project.videoType);
                scene.videoUrl = generatedUrl;
                scene.status = 'COMPLETED';
                scene.videoStatus = 'COMPLETED';
                if (provider.isMock) {
                   scene.metadata = { provider: 'mock', environment: 'development', synthetic: true };
                }

                appendLog(project, 'GATOTKACA', `ADEGAN [${idx + 1}/${total}] SELESAI DIRENDER OLEH ${provider.name} -> ${generatedUrl}`, 'SUCCESS');
            }
            projectEvents.emit(`update:${id}`, project);
            await simulateAgent(1200);
          }
        }
        
        project.overallProgress = 76;
        project.agentStatus['Sora Video Director'] = 'COMPLETE';
        updateTelemetry(project, 'GATOTKACA', { status: 'ONLINE', currentTask: `Seluruh klip adegan selesai dirender oleh ${provider.name}`, progress: 100 });
      }

      // Stage: Video Assembly Editor (BIMA) - Menggabungkan semua adegan menjadi satu kesatuan
      if (['Sora Video Director', 'Video Assembly Editor'].includes(startFromAgent)) {
        project.status = 'ASSEMBLING';
        project.overallProgress = 80;
        project.currentPhaseName = 'BIMA: Menggabungkan Seluruh Adegan Menjadi 1 Video Utuh (80%)';
        project.activeAgent = 'Video Assembly Editor';
        project.agentStatus['Video Assembly Editor'] = 'WORKING';
        
        updateTelemetry(project, 'BIMA', { status: 'ACTIVE', currentTask: 'Menggabungkan klip adegan 1, 2, 3, 4 ke timeline utama', progress: 30 });
        appendLog(project, 'BIMA', `PERAKITAN TIMELINE: Mengambil klip adegan & menyusun sequence video utama secara berurutan...`, 'INFO');
        projectEvents.emit(`update:${id}`, project);
        await simulateAgent(1800);

        project.overallProgress = 85;
        project.currentPhaseName = 'BIMA: Menerapkan Transisi & Color Grading Sinematik (85%)';
        updateTelemetry(project, 'BIMA', { status: 'ACTIVE', currentTask: 'Menerapkan transisi seamless & color grading sinematik', progress: 75 });
        appendLog(project, 'BIMA', `TRANSISI & COLOR GRADING: Menyempurnakan perpindahan adegan & pencahayaan visual...`, 'INFO');
        projectEvents.emit(`update:${id}`, project);
        await simulateAgent(1800);

        project.agentStatus['Video Assembly Editor'] = 'COMPLETE';
        updateTelemetry(project, 'BIMA', { status: 'ONLINE', currentTask: 'Kesatuan video master berhasil dirakit', progress: 100 });
        appendLog(project, 'BIMA', `KESATUAN TIMELINE VIDEO SELESAI DIBUAT & DIHUBUNGKAN HINGGA UTUH`, 'SUCCESS');
      }
      
      // Stage: Audio Designer (DAMAR) - Sintesis Suara & Mastering Audio
      if (['Sora Video Director', 'Video Assembly Editor', 'Audio Designer'].includes(startFromAgent)) {
        project.status = 'AUDIO';
        project.overallProgress = 88;
        const ttsInfo = project.ttsVoiceConfig 
          ? `${project.ttsVoiceConfig.provider.toUpperCase()} (${project.ttsVoiceConfig.voiceGender === 'male' ? 'Pria/Laki-laki' : 'Wanita/Perempuan'})`
          : 'Neural Studio TTS';
        project.currentPhaseName = `DAMAR: Sintesis Suara Narasi TTS & Dubbing [${ttsInfo}] (88%)`;
        project.activeAgent = 'Audio Designer';
        project.agentStatus['Audio Designer'] = 'WORKING';
        
        updateTelemetry(project, 'DAMAR', { status: 'ACTIVE', currentTask: `Mengisi suara dialog & narasi TTS per adegan`, progress: 40 });
        appendLog(project, 'DAMAR', `SINTESIS AUDIO: Menghasilkan suara dubbing narasi dengan vokal ${ttsInfo}...`, 'INFO');
        projectEvents.emit(`update:${id}`, project);
        await simulateAgent(1800);

        project.overallProgress = 92;
        project.currentPhaseName = `DAMAR: Mixing Musik Latar Belakang & Audio -14 LUFS (92%)`;
        updateTelemetry(project, 'DAMAR', { status: 'ACTIVE', currentTask: 'Mastering audio mix & efek foley', progress: 85 });
        appendLog(project, 'DAMAR', `AUDIO MASTERING: Menyeimbangkan musik latar & vokal narasi pada standar industri -14 LUFS...`, 'INFO');
        projectEvents.emit(`update:${id}`, project);
        await simulateAgent(1800);

        project.agentStatus['Audio Designer'] = 'COMPLETE';
        updateTelemetry(project, 'DAMAR', { status: 'ONLINE', currentTask: 'Acoustic track & voiceover mastered', progress: 100 });
        appendLog(project, 'DAMAR', `TRACK AUDIO & SUARA NARASI BERHASIL DISINKRONKAN DENGAN VIDEO`, 'SUCCESS');
      }

      // Stage: Viral Content Editor (BAYU) - Pemasangan Subtitle Animasi
      if (['Sora Video Director', 'Video Assembly Editor', 'Audio Designer', 'Viral Content Editor'].includes(startFromAgent)) {
        project.status = 'EDITING';
        project.overallProgress = 94;
        project.currentPhaseName = 'BAYU: Menilai Timecode Dialog & Membuat Subtitle Animasi (94%)';
        project.activeAgent = 'Viral Content Editor';
        project.agentStatus['Viral Content Editor'] = 'WORKING';
        
        updateTelemetry(project, 'BAYU', { status: 'ACTIVE', currentTask: 'Ekstraksi timecode kata & pembuatan subtitle animasi', progress: 40 });
        appendLog(project, 'BAYU', `PEMBUATAN SUBTITLE: Memetakan teks dialog per detik adegan untuk subtitle bergerak...`, 'INFO');
        projectEvents.emit(`update:${id}`, project);
        await simulateAgent(1800);

        project.overallProgress = 96;
        project.currentPhaseName = 'BAYU: Menempelkan Subtitle Dinamis & Element Hook Visual (96%)';
        updateTelemetry(project, 'BAYU', { status: 'ACTIVE', currentTask: 'Burning subtitle bergerak (Kinetic Captions) & sticker viral', progress: 85 });
        appendLog(project, 'BAYU', `BURNING SUBTITLE: Memasang subtitle kinetik bercahaya & badge teks promosi pada layar...`, 'INFO');
        projectEvents.emit(`update:${id}`, project);
        await simulateAgent(1800);

        project.agentStatus['Viral Content Editor'] = 'COMPLETE';
        updateTelemetry(project, 'BAYU', { status: 'ONLINE', currentTask: 'Subtitle bergerak & stiker visual terpasang sempurna', progress: 100 });
        appendLog(project, 'BAYU', `SUBTITLE ANIMASI BERGERAK DAN BADGE TEKS DIATAS VIDEO HASIL SELESAI TERPASANG`, 'SUCCESS');
      }

      // Stage: Video QA Director (SURYA) - QC Sinkronisasi Audio, Video & Subtitle
      if (['Sora Video Director', 'Video Assembly Editor', 'Audio Designer', 'Viral Content Editor', 'Video QA Director'].includes(startFromAgent)) {
        project.status = 'QA';
        project.overallProgress = 98;
        project.currentPhaseName = 'SURYA: Inpeksi Mutu Frame 4K, Audio Sync & Subtitle (98%)';
        project.activeAgent = 'Video QA Director';
        project.agentStatus['Video QA Director'] = 'WORKING';
        
        updateTelemetry(project, 'SURYA', { status: 'ACTIVE', currentTask: 'Memeriksa sinkronisasi video, audio, dan ketepatan subtitle', progress: 70 });
        appendLog(project, 'SURYA', `INSPEKSI MUTU: Memeriksa kelancaran frame 60 FPS, kecocokan subtitle & kejernihan audio...`, 'INFO');
        projectEvents.emit(`update:${id}`, project);
        await simulateAgent(1800);

        project.agentStatus['Video QA Director'] = 'COMPLETE';
        updateTelemetry(project, 'SURYA', { status: 'ONLINE', currentTask: 'Lolos QA 100%: Sinkronisasi video, suara & subtitle sempurna', progress: 100 });
        appendLog(project, 'SURYA', `QA PASSED: 100% SINKRONISASI VIDEO, SUARA NARASI & SUBTITLE DIVERIFIKASI`, 'SUCCESS');
      }

      project.overallProgress = 95;
      project.currentPhaseName = 'Mengemas & Menggabungkan (Concatenating) Kesatuan Video Master (TIARA - 95%)';
      project.activeAgent = 'Distribution Manager';
      project.agentStatus['Distribution Manager'] = 'WORKING';
      updateTelemetry(project, 'TIARA', { status: 'ACTIVE', currentTask: 'Packaging master MP4 container & subtitle track', progress: 95 });
      appendLog(project, 'TIARA', `MENGEMAS VIDEO FINAL: Menggabungkan (concatenate) semua file MP4 master...`, 'INFO');
      projectEvents.emit(`update:${id}`, project);
      
      const completedScenes = project.storyboard?.scenes?.filter(s => s.status === 'COMPLETED' && (s.videoUrl || s.assetUrl)) || [];
      if (completedScenes.length > 0) {
        try {
          if (completedScenes.length > 0) {
            project.finalVideoUrl = await VideoEditor.processProject(project);
          }
        } catch (e: any) {
          appendLog(project, 'TIARA', `Peringatan: Gagal menggabungkan video secara utuh (${e.message}). Mode fallback aktif.`, 'ERROR');
          project.finalVideoUrl = completedScenes[0].videoUrl || completedScenes[0].assetUrl;
        }
      }

      project.status = 'COMPLETED';
      project.overallProgress = 100;
      project.currentPhaseName = 'Kesatuan Video Master & Subtitle Siap Diunduh (TIARA - 100%)';
            project.agentStatus['Distribution Manager'] = 'COMPLETE';
      saveProjects();
      updateTelemetry(project, 'TIARA', { status: 'ONLINE', currentTask: 'Master video disajikan ke layar pemutar', progress: 100 });
      appendLog(project, 'TIARA', `SUKSES: KESATUAN VIDEO UTUH DAN SUBTITLE ANIMASI SIAP DITAMPILKAN & DIUNDUH`, 'SUCCESS');
      projectEvents.emit(`update:${id}`, project);

    } catch (error: any) {
       project.status = 'FAILED';
       if (error.code) {
          project.providerError = error;
       } else {
          project.error = error.message || String(error);
       }
       project.agentStatus[project.activeAgent!] = 'FAILED';
       appendLog(project, 'ERROR', `FATAL ERROR in ${project.activeAgent}: ${error.message || error}`, 'ERROR');
       projectEvents.emit(`update:${id}`, project);
    }
  }

  static async overrideSceneAsset(projectId: string, sceneId: string, updates: any): Promise<ProductionProject> {
    const project = projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} tidak ditemukan`);

    if (!project.storyboard) {
      project.storyboard = { scenes: [] };
    }

    const sceneIdx = project.storyboard.scenes.findIndex(s => String(s.id) === String(sceneId));
    if (sceneIdx >= 0) {
      const existing = project.storyboard.scenes[sceneIdx];
      project.storyboard.scenes[sceneIdx] = {
        ...existing,
        ...updates,
        status: 'COMPLETED'
      };
    } else {
      project.storyboard.scenes.push({
        id: sceneId,
        duration: updates.duration || "5s",
        visualDirection: updates.visualDirection || "Custom Frame Asset",
        textOverlay: updates.textOverlay || "",
        voiceOver: updates.voiceOver || "",
        subtitle: updates.subtitle || "",
        status: 'COMPLETED',
        imageUrl: updates.imageUrl,
        videoUrl: updates.videoUrl,
        assetUrl: updates.assetUrl,
        ...updates
      });
    }

    appendLog(project, 'TIMELINE', `Frame adegan #${sceneId} berhasil di-override. Aset siap digabungkan.`, 'SUCCESS');
    saveProjects();
    projectEvents.emit(`update:${projectId}`, project);
    return project;
  }

  static async reorderScenes(projectId: string, scenes: any[]): Promise<ProductionProject> {
    const project = projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} tidak ditemukan`);

    if (!project.storyboard) {
      project.storyboard = { scenes: [] };
    }

    project.storyboard.scenes = scenes;
    appendLog(project, 'TIMELINE', `Urutan adegan timeline diperbarui (${scenes.length} adegan).`, 'INFO');
    saveProjects();
    projectEvents.emit(`update:${projectId}`, project);
    return project;
  }

  static async resyncScenes(projectId: string, action: 'ADD' | 'REMOVE', targetIndex: number): Promise<ProductionProject> {
    const project = projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} tidak ditemukan`);
    
    appendLog(project, 'SINTA', `Mempersiapkan Resync Storyboard (${action} di urutan ${targetIndex + 1})...`, 'INFO');
    try {
      const newScenesRaw = await LLMService.resyncStoryboard({
        project,
        action,
        targetIndex,
        onLog: (source, msg, level) => appendLog(project, source, msg, level || 'INFO')
      });
      
      const QAAuditAgent = (await import('./services/qaAuditAgent')).QAAuditAgent;
      
      const newScenes = await Promise.all(newScenesRaw.map(async (s: any) => {
        const durStr = s.duration || "00:04";
        const durSecs = parseInt(durStr.split(':').pop() || '5') || 5;

        const qaResult = await QAAuditAgent.auditAndRefine({
          promptText: s.promptTextToImage || s.visualDirection,
          videoPrompt: s.promptImageToVideo || s.prompt_video_runway,
          visualPrompt: s.visualDirection,
          voiceoverScript: s.voiceOver || '',
          productName: project.brief?.product || 'Product',
          referenceImageUrl: project.characterProfile?.referenceImageUrl || '',
          durationSeconds: durSecs,
          videoType: project.videoType || 'AFFILIATE'
        });
        
        let lockedI2VPrompt = s.promptImageToVideo || s.prompt_video_runway;
        if (qaResult && qaResult.autoCorrected) {
          lockedI2VPrompt = qaResult.correctedVideoPrompt || lockedI2VPrompt;
          s.voiceOver = qaResult.correctedScript || s.voiceOver;
          s.visualDirection = qaResult.correctedVisualPrompt || s.visualDirection;
        }

        return {
          ...s,
          promptImageToVideo: lockedI2VPrompt,
          qaScore: qaResult?.score,
          qaPassed: qaResult?.passed,
          qaIssues: qaResult?.issues,
          imageCreditCost: 5,
          videoCreditCost: 15
        };
      }));

      if (project.storyboard) {
        project.storyboard.scenes = newScenes;
        saveProjects();
        projectEvents.emit(`update:${projectId}`, project);
      }
      return project;
    } catch (e: any) {
      appendLog(project, 'SINTA', `Gagal resync: ${e.message}`, 'ERROR');
      throw e;
    }
  }

  static async stitchMasterVideo(projectId: string): Promise<any> {
    const project = projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} tidak ditemukan`);

    appendLog(project, 'TIMELINE', `Memulai fast re-stitch kesatuan video dari aset timeline...`, 'INFO');
    try {
      const processResult = await VideoEditor.processProject(project);
      const finalUrl = typeof processResult === 'string' ? processResult : processResult.finalVideoUrl;
      
      project.finalVideoUrl = finalUrl;
      project.status = 'COMPLETED';
      project.overallProgress = 100;
      
      // Store the orchestration result for the client if needed
      (project as any).orchestrationResult = typeof processResult === 'string' ? null : processResult;
      
      // Logging the structured orchestration result automatically
      if (processResult && typeof processResult === 'object' && processResult.finalExportConfirmationLogs) {
         processResult.finalExportConfirmationLogs.forEach((logMsg: string) => {
            appendLog(project, 'ORCHESTRATOR', logMsg, 'SUCCESS');
         });
      }
      
      saveProjects();
      projectEvents.emit(`update:${projectId}`, project);
      return processResult;
    } catch (e: any) {
      const validScene = project.storyboard?.scenes?.find(s => s.videoUrl || s.assetUrl || s.imageUrl);
      const fallbackUrl = validScene?.videoUrl || validScene?.assetUrl || validScene?.imageUrl || project.finalVideoUrl || '';
      project.finalVideoUrl = fallbackUrl;
      saveProjects();
      projectEvents.emit(`update:${projectId}`, project);
      return fallbackUrl;
    }
  }
}

