import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { CharacterProfile, Scene, VideoType } from "../src/shared/types";
import { FounderService } from "../src/server/fcc/FounderService";
import { keyRotator } from "./keyRotator";
import { 
  getFalImageModelForStudio, 
  buildFalImagePayload, 
  sanitizeReferenceImageUrls, 
  getFalImageModel,
  FAL_IMAGE_MODELS 
} from "./falModelConfig";

export class ImageGenerationService {
  public static readonly ACTIVE_MODEL = "ChatGPT Image 2 (GPT Image 2) / Google Imagen 3 / Flux AI Diffusion";

  /**
   * Uploads a local file or base64 image data URI to Fal Storage (https://rest.alpha.fal.ai/storage/upload/initiate)
   * so it can be reliably referenced by Fal Image/Video models as a public HTTPS URL.
   */
  public static async ensurePublicFalImageUrl(rawUrl: string, falApiKey?: string): Promise<string | null> {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    // Already a valid public HTTPS URL (not localhost or internal)
    if (trimmed.startsWith('https://') && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
      return trimmed;
    }

    const key = falApiKey || keyRotator.getNextFalKey();
    if (!key) {
      console.warn('[Fal Storage] No Fal API Key available to upload reference image.');
      return (trimmed.startsWith('http') || trimmed.startsWith('data:image')) ? trimmed : null;
    }

    try {
      let buffer: Buffer | null = null;
      let contentType = 'image/png';
      let fileName = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;

      if (trimmed.startsWith('data:image/')) {
        const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          contentType = match[1];
          buffer = Buffer.from(match[2], 'base64');
          const ext = contentType.split('/')[1] || 'png';
          fileName = `ref_${Date.now()}.${ext}`;
        }
      } else if (trimmed.startsWith('/') || !trimmed.startsWith('http')) {
        const resolvedPath = path.isAbsolute(trimmed) ? trimmed : path.join(process.cwd(), trimmed);
        if (fs.existsSync(resolvedPath)) {
          buffer = fs.readFileSync(resolvedPath);
          if (resolvedPath.endsWith('.jpg') || resolvedPath.endsWith('.jpeg')) contentType = 'image/jpeg';
          else if (resolvedPath.endsWith('.webp')) contentType = 'image/webp';
          fileName = path.basename(resolvedPath);
        }
      }

      if (!buffer) {
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        return null;
      }

      console.log(`[Fal Storage] Uploading reference image (${(buffer.length / 1024).toFixed(1)} KB, ${contentType}) to Fal Storage...`);

      // 1. Initiate upload
      const initRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${key.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_name: fileName,
          content_type: contentType
        })
      });

      if (!initRes.ok) {
        const err = await initRes.text().catch(() => '');
        console.warn(`[Fal Storage] Initiate upload failed (${initRes.status}): ${err}`);
        return trimmed.startsWith('data:image') ? trimmed : null;
      }

      const initJson: any = await initRes.json();
      const uploadUrl = initJson.upload_url;
      const fileUrl = initJson.file_url;

      if (!uploadUrl || !fileUrl) {
        console.warn('[Fal Storage] Incomplete initiate response:', initJson);
        return trimmed;
      }

      // 2. PUT binary data
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: buffer
      });

      if (!putRes.ok) {
        console.warn(`[Fal Storage] PUT file data failed (${putRes.status})`);
        return trimmed;
      }

      console.log(`[Fal Storage] Reference image uploaded successfully: ${fileUrl}`);
      return fileUrl;
    } catch (e: any) {
      console.warn('[Fal Storage] Error uploading image to Fal Storage:', e.message);
      return trimmed;
    }
  }

  /**
   * Intelligently translates and cleans Indonesian descriptions, removing conversational clutter,
   * bracket notes, and bullet points, converting them into concise, descriptive English for AI image generators.
   */
  public static translateAndSanitizeToEnglish(text: string): string {
    if (!text) return '';

    let cleaned = text
      // Remove conversational notes and parenthesized alternatives
      .replace(/\(atau[^)]*\)/gi, '')
      .replace(/\(or[^)]*\)/gi, '')
      .replace(/sebut saja\s+[A-Za-z0-9\s]+/gi, '')
      .replace(/khas protagonis anime[^\n,.]*/gi, 'anime protagonist style')
      .replace(/Visual & Ciri Khas:\s*/gi, '')
      .replace(/Ciri Fisik:\s*/gi, '')
      .replace(/Nama:\s*/gi, '')
      .replace(/Character:\s*/gi, '')
      .replace(/Setting:\s*/gi, '')
      .replace(/\[Consistent [^\]]+\]/gi, '')
      .replace(/\[.*?\]/g, ' ')
      .replace(/[-*•]\s+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Dictionary mappings: Indonesian -> English for visual / character / setting / action terms
    const idToEnMap: [RegExp, string][] = [
      // Soccer & Sports terms
      [/pemain sepak bola/gi, 'soccer player'],
      [/sepak bola/gi, 'soccer'],
      [/lapangan rumput hijau luas/gi, 'wide green soccer pitch'],
      [/lapangan rumput/gi, 'green grass pitch'],
      [/lapangan/gi, 'field'],
      [/stadion nasional/gi, 'massive national stadium'],
      [/stadion sepak bola/gi, 'packed soccer stadium'],
      [/stadion/gi, 'stadium'],
      [/tribun penonton/gi, 'stadium grandstands with cheering fans'],
      [/suporter/gi, 'cheering fans'],
      [/penonton/gi, 'spectators'],
      [/jersey tim utama/gi, 'team soccer jersey'],
      [/jersey/gi, 'soccer jersey'],
      [/seragam/gi, 'uniform'],
      [/nomor punggung (\d+)/gi, 'number $1 on back'],
      [/nomor (\d+)/gi, '#$1'],
      [/celana pendek/gi, 'shorts'],
      [/kaus kaki panjang/gi, 'high athletic socks'],
      [/sepatu bola/gi, 'cleats'],
      [/selebrasi gol heroik/gi, 'heroic goal celebration cheering with clenched fists'],
      [/selebrasi kemenangan/gi, 'victory celebration with raised arms'],
      [/selebrasi/gi, 'celebrating triumph'],
      [/mencetak gol/gi, 'scoring a goal'],
      [/tendangan melengkung/gi, 'powerful curving shot'],
      [/tendangan halilintar/gi, 'thunderous powerful kick'],
      [/tendangan bertenaga/gi, 'powerful strike kick'],
      [/tendangan/gi, 'kick shot'],
      [/menggiring bola/gi, 'dribbling soccer ball at high speed'],
      [/dribbling/gi, 'dribbling soccer ball'],
      [/umpan silang/gi, 'crossing the ball'],
      [/menepis bola/gi, 'blocking the shot'],
      [/kiper/gi, 'goalkeeper'],
      [/gawang/gi, 'goal net'],
      [/sudut gawang/gi, 'top corner of the goal'],

      // General Character attributes
      [/rambut hitam spiky runcing ke atas/gi, 'spiky upward black anime hair'],
      [/rambut hitam spiky/gi, 'spiky black hair'],
      [/rambut spiky/gi, 'spiky styled hair'],
      [/rambut hitam lurus/gi, 'straight black hair'],
      [/rambut hitam/gi, 'black hair'],
      [/rambut pirang/gi, 'blonde hair'],
      [/rambut cokelat/gi, 'brown hair'],
      [/rambut/gi, 'hair'],
      [/mata tajam penuh determinasi/gi, 'sharp determined eyes'],
      [/mata tajam/gi, 'sharp intense eyes'],
      [/mata cokelat gelap/gi, 'dark brown eyes'],
      [/mata biru/gi, 'blue eyes'],
      [/mata bercahaya/gi, 'glowing eyes'],
      [/mata/gi, 'eyes'],
      [/berkacamata bulat/gi, 'round glasses'],
      [/kacamata pintar/gi, 'smart glasses'],
      [/kacamata/gi, 'glasses'],
      [/jas lab putih rapi/gi, 'crisp white lab coat'],
      [/jas lab putih/gi, 'white lab coat'],
      [/jas lab/gi, 'lab coat'],
      [/jas/gi, 'suit blazer'],
      [/kemeja rapi/gi, 'neat collared shirt'],
      [/kemeja/gi, 'shirt'],
      [/kaos/gi, 't-shirt'],
      [/jaket/gi, 'jacket'],
      [/bodi putih mengkilap/gi, 'glossy white robotic chassis'],
      [/bodi putih/gi, 'white chassis'],
      [/aksen neon biru/gi, 'cyan glowing neon accents'],
      [/aksen neon/gi, 'neon accents'],
      [/layar ekspresi mata bersahabat/gi, 'friendly digital screen face'],
      [/layar ekspresi/gi, 'emotive digital screen display'],
      [/profesor robot ai ramah/gi, 'friendly AI professor robot'],
      [/profesor robot ai/gi, 'AI professor robot'],
      [/robot ai/gi, 'AI robot'],
      [/robot/gi, 'robot'],
      [/maskot rubah/gi, 'fox mascot character in detective vest'],
      [/maskot/gi, 'mascot character'],
      [/edukator sains wanita muda/gi, 'young female science educator'],
      [/edukator wanita/gi, 'female educator'],
      [/guru sains/gi, 'science teacher'],
      [/guru wanita/gi, 'female teacher'],
      [/guru pria/gi, 'male teacher'],
      [/guru/gi, 'teacher'],
      [/dosen muda berkharisma/gi, 'charismatic young professor'],
      [/dosen/gi, 'professor'],
      [/pria muda/gi, 'young man'],
      [/wanita muda/gi, 'young woman'],
      [/pria/gi, 'male'],
      [/wanita/gi, 'female'],
      [/gadis/gi, 'young girl'],
      [/anak-anak/gi, 'children'],

      // Colors
      [/biru putih/gi, 'blue and white'],
      [/merah putih/gi, 'red and white'],
      [/hitam putih/gi, 'black and white'],
      [/biru muda/gi, 'light cyan blue'],
      [/biru tua/gi, 'navy blue'],
      [/biru/gi, 'blue'],
      [/merah/gi, 'red'],
      [/hijau/gi, 'green'],
      [/kuning/gi, 'yellow'],
      [/putih/gi, 'white'],
      [/hitam/gi, 'black'],
      [/abu-abu/gi, 'gray'],
      [/emas/gi, 'gold'],
      [/perak/gi, 'silver'],
      [/keemasan/gi, 'golden'],

      // World / Environment
      [/laboratorium riset canggih serba putih/gi, 'state-of-the-art white research laboratory'],
      [/laboratorium sains modern/gi, 'modern science laboratory with futuristic equipment'],
      [/laboratorium sains/gi, 'science laboratory'],
      [/laboratorium/gi, 'high-tech laboratory'],
      [/layar holografis melayang/gi, 'floating glowing holographic data displays'],
      [/layar holografis/gi, 'holographic screens'],
      [/ruang angkasa & galaksi/gi, 'cosmic deep space with colorful glowing nebulae and distant stars'],
      [/ruang angkasa/gi, 'deep space'],
      [/nebula bercahaya/gi, 'glowing nebulae'],
      [/bintang/gi, 'stars'],
      [/studio infografis digital/gi, 'sleek digital infographic studio with dark elegant backdrop and neon glowing charts'],
      [/studio infografis/gi, 'infographic presentation studio'],
      [/studio presentasi/gi, 'modern presentation stage'],
      [/ruang kelas digital interaktif/gi, 'futuristic interactive digital classroom with smartboards'],
      [/ruang kelas/gi, 'modern classroom'],
      [/lanskap alam hijau cerah/gi, 'vibrant green nature landscape with sunny blue skies'],
      [/alam terbuka/gi, 'open outdoor nature landscape'],
      [/hutan/gi, 'lush forest'],
      [/pegunungan/gi, 'majestic mountains'],
      [/kota masa depan/gi, 'futuristic sci-fi city with neon skyscrapers'],
      [/kota/gi, 'city metropolis'],

      // Atmosphere, Lighting & Connectives
      [/di bawah senja jingga/gi, 'under a dramatic golden twilight sunset sky'],
      [/senja jingga/gi, 'golden hour twilight sunset'],
      [/senja/gi, 'sunset twilight'],
      [/malam hari/gi, 'at night under bright floodlights'],
      [/siang hari/gi, 'bright daytime'],
      [/pagi hari/gi, 'morning sunrise lighting'],
      [/pencahayaan lampu stadion/gi, 'intense glowing stadium floodlights'],
      [/lampu sorot/gi, 'bright floodlights'],
      [/pencahayaan dramatis/gi, 'dramatic cinematic lighting'],
      [/pencahayaan terang/gi, 'clean studio lighting'],
      [/pencahayaan/gi, 'lighting'],
      [/dengan/gi, 'with'],
      [/dan/gi, 'and'],
      [/di/gi, 'in'],
      [/pada/gi, 'at'],
      [/ke/gi, 'to'],
      [/dari/gi, 'from'],
      [/mengenakan/gi, 'wearing'],
      [/memakai/gi, 'wearing'],
      [/berwarna/gi, 'colored'],
      [/bernama/gi, 'named'],
      [/penuh/gi, 'filled with'],
      [/sangat/gi, 'extremely'],
      [/menghadap/gi, 'facing'],
      [/melihat ke/gi, 'looking towards'],
      [/ekspresi bangga/gi, 'proud confident expression'],
      [/ekspresi fokus/gi, 'intense focused expression'],
      [/ekspresi ceria/gi, 'cheerful friendly expression'],
      [/ekspresi/gi, 'facial expression'],
      [/kemenangan/gi, 'victory triumph'],
      [/aksi heroik/gi, 'heroic dynamic action'],
      [/aksi/gi, 'action pose'],
      [/kecepatan tinggi/gi, 'high speed velocity'],
      [/sudut rendah dramatis/gi, 'dramatic dynamic low angle shot'],
      [/sudut lebar/gi, 'wide angle cinematic shot'],
      [/close up/gi, 'close up shot']
    ];

    let result = cleaned;
    for (const [pattern, replacement] of idToEnMap) {
      result = result.replace(pattern, replacement);
    }

    // Clean up excessive punctuation and spaces
    result = result
      .replace(/,\s*,+/g, ',')
      .replace(/\.\s*\.+/g, '.')
      .replace(/\s+/g, ' ')
      .trim();

    return result;
  }

  public static readonly STANDARD_NEGATIVE_PROMPT = 
    '3d, 3d render, cgi, anime, cartoon, illustration, drawing, painting, digital art, 3d model, plastic model, toy, synthetic render, smooth plastic skin, doll, avatar, cropped product, missing footwear, distorted hands, blurry text, macro close-up, double heads, extra limbs, low resolution, noise, amateur photography, out of frame, bad anatomy, deformed';

  /**
   * Returns video-type specific negative prompt so Animation Studio does not get conflicted by real-photo anti-anime negative keywords.
   */
  public static getNegativePromptForVideoType(videoType: VideoType = 'AFFILIATE', artStyle?: string): string {
    if (videoType === 'ANIMATION') {
      return 'cropped head, duplicate faces, split screen, multiple heads, collage, tiled, bad anatomy, distorted face, extra limbs, low resolution, blurry, noise, ugly, photograph, realistic photo, watermark, signature';
    }
    return ImageGenerationService.STANDARD_NEGATIVE_PROMPT;
  }

  /**
   * Audits a raw T2I prompt for raw API readiness (0-100 score), identifies root causes of failure,
   * and restructures the prompt into an Action-Driven Anchor format with dedicated negative prompts.
   */
  public static auditAndOptimizePrompt(rawPrompt: string, videoType: VideoType = 'AFFILIATE'): {
    diagnosticScore: number;
    rootCauseAnalysis: string[];
    apiOptimizedPrompt: string;
    recommendedParameters: {
      aspectRatio: string;
      guidanceScale: string;
      negativePrompt: string;
      safetyFilter: string;
    };
  } {
    const rootCauses: string[] = [];
    let score = 100;
    const lower = (rawPrompt || '').toLowerCase();

    // Check 1: Token Attention Dilution & Context Overload (> 65 words)
    const wordCount = rawPrompt ? rawPrompt.trim().split(/\s+/).length : 0;
    if (wordCount > 65) {
      score -= 30;
      rootCauses.push(
        "Token Attention Dilution & Context Overload: Prompt exceeds optimal length, pushing core subject and product tokens past the high-weight attention window (tokens 1–75)."
      );
    }

    // Check 2: Framing & Composition Contradiction (e.g. macro close-up + full character description)
    if (
      (lower.includes('macro') || lower.includes('extreme close-up')) &&
      (lower.includes('hair') || lower.includes('face') || lower.includes('sweatshirt') || lower.includes('model') || lower.includes('outfit'))
    ) {
      score -= 25;
      rootCauses.push(
        "Framing & Composition Contradiction: Demanding macro product details alongside full character/torso features creates conflicting focal length constraints."
      );
    }

    // Check 3: Negative Constraint Inefficiency (natural language negations in positive prompt)
    if (
      lower.includes('no ') ||
      lower.includes('do not') ||
      lower.includes('dont') ||
      lower.includes('preserve exact') ||
      lower.includes('distortion') ||
      lower.includes('tanpa distorsi')
    ) {
      score -= 20;
      rootCauses.push(
        "Negative Constraint Inefficiency: Using natural language negations ('preserve exact', 'do not alter', 'no distortion') in the positive prompt introduces unwanted negative token semantic noise."
      );
    }

    const cleaned = ImageGenerationService.sanitizeNegativePhrasesFromPositivePrompt(rawPrompt);

    // Build Action-Driven Anchor hierarchy: [Core Subject/Action] + [Camera/Lighting] + [Subject Details] + [Product Details] + [Modifiers]
    const isPortrait = videoType === 'AFFILIATE';
    const cameraLighting = 'Photorealistic 35mm commercial photo of hands holding product, medium close-up showing hands and upper body, authentic skin texture with pores, 50mm lens f/2.8, clean dark studio backdrop, cool blue accent edge lighting';
    const modifiers = 'sharp focus, 8k resolution, professional advertising photography';

    let apiOptimizedPrompt = '';
    if (cleaned) {
      apiOptimizedPrompt = `Photorealistic 35mm photograph of hands holding product, ${cleaned}, ${cameraLighting}, ${modifiers}`;
    } else {
      apiOptimizedPrompt = `Photorealistic 35mm photograph of hands holding commercial product at chest level, presented by a 27-year-old female model in black high-neck sweatshirt, ${cameraLighting}, ${modifiers}`;
    }

    return {
      diagnosticScore: Math.max(score, 35),
      rootCauseAnalysis: rootCauses.length > 0 ? rootCauses : ["Prompt structure verified for high-fidelity raw API execution."],
      apiOptimizedPrompt,
      recommendedParameters: {
        aspectRatio: isPortrait ? "9:16 (Vertical) or 4:5" : "16:9 (Horizontal)",
        guidanceScale: "6.0 – 7.5",
        negativePrompt: ImageGenerationService.STANDARD_NEGATIVE_PROMPT,
        safetyFilter: "block_medium_and_above"
      }
    };
  }

  /**
   * Cleans raw prompt string from negative phrases ("do not alter", "no distortion", "preserve exact"),
   * non-visual marketing jargon ("for breathability and comfort"), and weird punctuation collisions (".,").
   */
  public static sanitizeNegativePhrasesFromPositivePrompt(prompt: string): string {
    if (!prompt) return '';
    return prompt
      .replace(/preserve exact product design,?\s*/gi, '')
      .replace(/do not alter logos?,?\s*/gi, '')
      .replace(/no distortion,?\s*/gi, '')
      .replace(/tanpa distorsi,?\s*/gi, '')
      .replace(/jangan ubah,?\s*/gi, '')
      .replace(/Product identity locked:\s*/gi, '')
      .replace(/Character identity locked:\s*/gi, '')
      .replace(/Setting locked:\s*/gi, '')
      .replace(/Visual Scene:\s*/gi, '')
      .replace(/Keyframe Scene Action:\s*/gi, '')
      .replace(/Featured Product:\s*/gi, '')
      .replace(/Character Interaction:\s*/gi, '')
      .replace(/\(Kreator Utama \(Model Referensi\)\)/gi, '')
      .replace(/\(Model Referensi\)/gi, '')
      .replace(/\(Kreator Utama\)/gi, '')
      .replace(/Kreator Utama \(Model Referensi\)/gi, '')
      .replace(/Kreator Utama/gi, '')
      .replace(/Model Referensi/gi, '')
      // Clean non-visual marketing/functional adjectives
      .replace(/for breathability and comfort/gi, '')
      .replace(/for comfort and breathability/gi, '')
      .replace(/for breathability/gi, '')
      .replace(/for comfort/gi, '')
      .replace(/for performance/gi, '')
      .replace(/for durability/gi, '')
      .replace(/Materials include:?\s*/gi, '')
      .replace(/Materials included:?\s*/gi, '')
      .replace(/Materials consist of:?\s*/gi, '')
      .replace(/Materials consists of:?\s*/gi, '')
      .replace(/designed for (performance|comfort|breathability|daily wear)/gi, '')
      .replace(/\(+/g, ' ')
      .replace(/\)+/g, ' ')
      // Fix punctuation collisions (e.g. "elements., held at")
      .replace(/\.\s*,/g, ', ')
      .replace(/,\s*\./g, ', ')
      .replace(/\.\s*\./g, '. ')
      .replace(/,\s*,/g, ', ')
      .replace(/\.\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/^,\s*/, '')
      .replace(/,\s*$/, '')
      .trim();
  }

  /**
   * Standardized Product & Character Lock Prompt Assembler (T2I)
   * SUBJECT & ACTION FIRST architecture (Action-Driven Anchor) to guarantee exact scene action and product portrayal.
   */
  public static buildT2IImagePrompt(params: {
    scene: Partial<Scene>;
    sceneIndex?: number;
    videoType: VideoType;
    characterProfile?: CharacterProfile;
    artStyle?: string;
    affiliateConfig?: any;
    animationConfig?: any;
    educationalConfig?: any;
  }): string {
    const { scene, sceneIndex = 0, videoType, characterProfile, artStyle, affiliateConfig, animationConfig, educationalConfig } = params;

    const rawT2I = (scene.promptTextToImage || '').trim();
    const rawVisual = (scene.visualDirection || '').trim();

    // 1. Style & Lighting Modifiers
    let styleSuffix = '';
    if (videoType === 'ANIMATION') {
      switch (artStyle) {
        case '3D_PIXAR':
          styleSuffix = '3D Pixar Disney CGI animation style, subsurface scattering, octane 3D render, expressive character, volumetric lighting';
          break;
        case '3D_UNREAL_HYPER':
          styleSuffix = 'Unreal Engine 5.4 cinematic render, hyper-realistic 3D CGI, Lumen global illumination, Nanite textures, raytracing';
          break;
        case 'ANIME_SHINKAI':
          styleSuffix = 'Anime Makoto Shinkai aesthetic, Studio Ghibli inspired, vibrant colors, cinematic anime lighting, crisp line art';
          break;
        case 'ANIME_CYBERPUNK':
          styleSuffix = 'Cyberpunk mecha anime style, high-tech neon lighting, glowing circuitry, energetic action anime lines';
          break;
        case '2D_CLASSIC_CARTOON':
          styleSuffix = 'Classic 2D hand-drawn cartoon animation, clean bold line-art, vibrant saturated flat colors, retro animation style';
          break;
        case 'CLAYMATION':
          styleSuffix = 'Aardman claymation stop-motion animation, tactile plasticine clay texture, studio lighting';
          break;
        case 'COMIC_BOOK':
          styleSuffix = 'Dynamic comic book illustration, western comic / shonen manga crosshatch ink lines, halftone dot patterns';
          break;
        case 'PIXEL_ART':
          styleSuffix = '16-bit retro pixel art aesthetic, detailed pixel sprites, nostalgic arcade color palette';
          break;
        default:
          styleSuffix = artStyle?.includes('ANIME') 
            ? 'Anime aesthetic style, vibrant anime colors, hand-drawn keyframe' 
            : '3D stylized CGI animation, expressive character, cinematic lighting';
      }
    } else if (videoType === 'EDUCATIONAL') {
      const eduStyle = educationalConfig?.visualStyle || artStyle;
      switch (eduStyle) {
        case 'MOTION_GRAPHICS_2D':
          styleSuffix = '2D motion graphics explainer, flat vector illustration, sleek isometric accents, modern clean layout';
          break;
        case 'WHITEBOARD_ANIMATION':
          styleSuffix = 'Whiteboard animation sketch, clean marker line illustration on crisp white backdrop, high contrast';
          break;
        case 'ISOMETRIC_3D':
          styleSuffix = 'Isometric 3D infographic model, soft ambient occlusion, clean educational diagram';
          break;
        case 'SCIENCE_BLUEPRINT':
          styleSuffix = 'Technical blueprint schematic, cyan glowing vector wireframes, annotated callout diagrams';
          break;
        case 'DOCUMENTARY_INFOGRAPHIC':
          styleSuffix = 'Cinematic documentary infographic, National Geographic aesthetic, high resolution data visualizer';
          break;
        default:
          styleSuffix = 'Clean educational explainer graphic, high-contrast infographic illustration';
      }
    } else if (videoType === 'AFFILIATE') {
      const lowerT2I = (rawT2I || '').toLowerCase();
      if (lowerT2I.includes('full-body') || lowerT2I.includes('full body') || lowerT2I.includes('on feet') || lowerT2I.includes('walking') || lowerT2I.includes('streetwear') || lowerT2I.includes('lifestyle')) {
        styleSuffix = 'raw real life photograph, 35mm DSLR photo, authentic human skin texture with pores, professional fashion advertisement, full body lifestyle portrait, natural outdoor lighting, shallow depth of field';
      } else if (lowerT2I.includes('macro') || lowerT2I.includes('close-up') || lowerT2I.includes('texture') || lowerT2I.includes('stitch')) {
        styleSuffix = 'raw real life photograph, 35mm DSLR photo, macro photography, commercial studio product shot, extreme close-up showing fine product textures, soft diffused backlight';
      } else {
        styleSuffix = 'raw real life photograph, 35mm DSLR photo, authentic human skin texture with pores, commercial studio product shot, medium shot showing upper body and hands holding product, 50mm lens f/2.8, clean dark studio backdrop, cool blue accent edge lighting';
      }
    } else {
      styleSuffix = 'Cinematic 8k movie still, anamorphic lens flare, master shot, photorealistic';
    }

    const seed = (characterProfile?.styleSeed || 8849201) + (sceneIndex * 317);
    const endModifiers = `${styleSuffix}, sharp focus, 8k resolution, professional advertising photography --seed ${seed}`;

    // Clean any negative phrases from raw LLM output to prevent diffusion negation collisions
    const cleanedRawT2I = ImageGenerationService.sanitizeNegativePhrasesFromPositivePrompt(rawT2I);

    // If prompt is already a pre-formatted character concept art portrait, return directly
    if (cleanedRawT2I && (cleanedRawT2I.toLowerCase().includes('character design concept art portrait') || cleanedRawT2I.toLowerCase().includes('concept art portrait') || cleanedRawT2I.toLowerCase().startsWith('character identity locked'))) {
      return cleanedRawT2I;
    }

    // If rawT2I is available and clean, build structured prompt with Action Anchor
    let sceneActionEn = '';
    if (cleanedRawT2I) {
      sceneActionEn = ImageGenerationService.translateAndSanitizeToEnglish(cleanedRawT2I);
    } else if (rawVisual) {
      sceneActionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawVisual);
    }

    const productName = affiliateConfig?.productName || '';
    const productVision = affiliateConfig?.productVisualAnalysis || '';
    const cleanProductVision = productVision 
      ? ImageGenerationService.translateAndSanitizeToEnglish(productVision.replace(/^Exact Physical Product Features from Uploaded Photo:\s*/i, '').trim())
      : '';

    let charSubjectEn = '';
    const charName = characterProfile?.name ? characterProfile.name.replace(/Karakter Utama/gi, 'Protagonist') : '';
    const charOutfit = characterProfile?.outfit ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.outfit) : '';
    const charHair = characterProfile?.hairStyle ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.hairStyle) : '';
    const charFace = characterProfile?.facialFeatures ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.facialFeatures) : '';

    if (charName || charOutfit || charHair) {
      const parts = [
        charName ? `A ${charName}` : 'A 27-year-old female model',
        charOutfit ? `wearing ${charOutfit}` : 'wearing a black high-neck sweatshirt',
        charHair,
        charFace
      ].filter(Boolean);
      charSubjectEn = parts.join(', ');
    }

    const rawWorld = animationConfig?.worldSetting || educationalConfig?.worldSetting || '';
    const worldEn = rawWorld ? ImageGenerationService.translateAndSanitizeToEnglish(rawWorld) : '';

    let promptParts: string[] = [];

    if (videoType === 'AFFILIATE') {
      const prodName = productName || 'Commercial Product';
      const prodDesc = cleanProductVision || 'red perforated toe box, black leather upper, white midsole';
      const cleanProdDesc = prodDesc.replace(/\(+/g, '').replace(/\)+/g, '').trim();

      // PRIORITAS 3: Product Consistency Lock explicit anchor
      promptParts.push("Product Consistency Lock: Keep product packaging, shape, color, and label text exactly identical to the reference product image. Do not alter or reinterpret the product design.");
      
      // Clean raw LLM text if it already has headers
      let sanitizedText = cleanedRawT2I
        .replace(/^Visual Scene:\s*/gi, '')
        .replace(/^Action:\s*/gi, '')
        .replace(/^Photorealistic 35mm commercial photo of hands holding [^,]+,\s*/gi, '')
        .replace(/^Photorealistic 35mm photograph of hands holding [^,]+,\s*/gi, '');

      if (sanitizedText) {
        // If prompt already contains full action/scene description, respect it directly!
        if (/^(Photorealistic|Extreme|Full-body|Commercial|Fashion|Dynamic|Lifestyle)/i.test(sanitizedText) || sanitizedText.length > 50) {
          promptParts.push(sanitizedText);
        } else {
          const photoAnchor = `Photorealistic 35mm DSLR photograph of ${sanitizedText}, featuring ${prodName} (${cleanProdDesc})`;
          promptParts.push(photoAnchor);
        }
      } else {
        // Default anchor if no scene text
        const photoAnchor = `Photorealistic 35mm DSLR photograph of real hands holding ${prodName}, ${cleanProdDesc}, held at chest level in clear view, presented by ${charSubjectEn || 'a 27-year-old female model wearing a black high-neck sweatshirt'}, commercial studio product shot, 50mm lens f/2.8, authentic human skin texture with pores, clean dark studio backdrop, cool blue accent edge lighting`;
        promptParts.push(photoAnchor);
        if (sceneActionEn) {
          promptParts.push(`showing ${sceneActionEn}`);
        }
      }
    } else {
      let coreSubjectAction = '';
      
      // Look for athletic/sports/action keywords in sceneActionEn or worldEn to apply Google Flow multipliers
      const actionLower = (sceneActionEn || '').toLowerCase();
      const worldLower = (worldEn || '').toLowerCase();
      
      let sportsMultiplier = '';
      if (
        actionLower.includes('volleyball') || actionLower.includes('voli') || actionLower.includes('smash') || actionLower.includes('serve') || actionLower.includes('block') || actionLower.includes('net') ||
        worldLower.includes('stadium') || worldLower.includes('stadion') || worldLower.includes('court')
      ) {
        if (actionLower.includes('volleyball') || actionLower.includes('voli') || actionLower.includes('smash') || actionLower.includes('block') || actionLower.includes('net')) {
          sportsMultiplier = 'dynamic full body action shot on a volleyball court with net in clear view, a yellow-blue volleyball under hand, teammates in matching jerseys looking on in awe, active opponent blockers jumping in the foreground, crowded indoor stadium arena with roaring spectators, blurred grandstands under dramatic bright floodlights, action freeze-frame';
        } else if (actionLower.includes('soccer') || actionLower.includes('bola') || actionLower.includes('tendang') || actionLower.includes('goal') || actionLower.includes('gawang') || actionLower.includes('kick') || actionLower.includes('dribble')) {
          sportsMultiplier = 'wide action shot on a vibrant green grass soccer pitch, black and white soccer ball in flight, teammates in soccer jerseys chasing, packed national stadium with roaring spectators, bright stadium lights, dynamic low angle shot';
        } else {
          sportsMultiplier = 'wide angle dynamic action keyframe shot, playing on a professional sports court, teammates and opposing players in uniform running in action, cheering stadium crowd in the background grandstands, brilliant sports stadium arena lighting';
        }
      } else if (
        actionLower.includes('run') || actionLower.includes('jump') || actionLower.includes('fight') || actionLower.includes('battle') || actionLower.includes('action') || actionLower.includes('fly') || actionLower.includes('chase')
      ) {
        sportsMultiplier = 'dynamic wide angle action shot showing surrounding environment, secondary background characters looking in amazement, motion speed lines and particles, epic cinematic atmosphere';
      }

      if (sceneActionEn) {
        // ACTION-FIRST Google Flow architecture: Grab attention with the core action and sports setting
        if (sportsMultiplier) {
          coreSubjectAction = `Dynamic keyframe shot showing ${sceneActionEn}, ${sportsMultiplier}`;
        } else {
          coreSubjectAction = `Dynamic keyframe showing ${sceneActionEn}`;
        }

        // Add character details as co-star actor modifiers so face/outfit map correctly without portrait zoom
        if (charSubjectEn) {
          coreSubjectAction += `, starring ${charSubjectEn} as the main actor in action`;
        }
      } else if (charSubjectEn) {
        // Fallback to character focus only if there is absolutely no scene action specified
        coreSubjectAction = `Dynamic cinematic character portrait of ${charSubjectEn}`;
      } else {
        coreSubjectAction = 'Cinematic keyframe composition';
      }
      
      promptParts.push(coreSubjectAction);

      if (worldEn) {
        promptParts.push(`with the background environment set in ${worldEn}`);
      }
    }

    promptParts.push(endModifiers);
    return promptParts.join(', ');
  }

  public static buildI2VVideoPrompt(params: {
    scene: Partial<Scene>;
    sceneIndex?: number;
    videoType: VideoType;
    characterProfile?: CharacterProfile;
    artStyle?: string;
    affiliateConfig?: any;
    animationConfig?: any;
    educationalConfig?: any;
  }): string {
    const { scene, sceneIndex = 0, videoType, characterProfile, artStyle, affiliateConfig, animationConfig, educationalConfig } = params;

    const rawI2V = ImageGenerationService.sanitizeNegativePhrasesFromPositivePrompt(scene.promptImageToVideo || '');
    const rawVisual = (scene.visualDirection || '').trim();
    const arTag = (videoType === 'AFFILIATE' || animationConfig?.aspectRatio === '9:16' || educationalConfig?.aspectRatio === '9:16') ? '--ar 9:16' : '--ar 16:9';

    if (rawI2V && (rawI2V.toLowerCase().startsWith('character identity locked:') || rawI2V.toLowerCase().startsWith('product identity locked:'))) {
        return `${ImageGenerationService.sanitizeNegativePhrasesFromPositivePrompt(rawI2V)} ${arTag}`;
    }

    const charName = characterProfile?.name || 'Creator';
    const charOutfit = characterProfile?.outfit ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.outfit) : '';
    const charFace = characterProfile?.facialFeatures ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.facialFeatures) : '';
    const charHair = characterProfile?.hairStyle ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.hairStyle) : '';
    const charAnchor = characterProfile?.consistencyAnchorPrompt 
      ? `[${characterProfile.consistencyAnchorPrompt.replace(/[\[\]]/g, '')}]`
      : (charFace || charHair || charOutfit)
        ? `[Consistent Character: ${charName}, ${charFace ? `${charFace}, ` : ''}${charHair ? `${charHair}, ` : ''}${charOutfit ? `wearing ${charOutfit}` : ''}]`
        : '';
    const worldSetting = animationConfig?.worldSetting || educationalConfig?.worldSetting || '';
    const worldEn = worldSetting ? ImageGenerationService.translateAndSanitizeToEnglish(worldSetting) : '';

    let motionEn = '';
    if (rawI2V) {
      motionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawI2V);
    } else if (rawVisual) {
      motionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawVisual);
    }

    if (videoType === 'AFFILIATE') {
      const prodName = affiliateConfig?.productName || 'Product';
      const prodDesc = affiliateConfig?.productVisualAnalysis ? ImageGenerationService.translateAndSanitizeToEnglish(affiliateConfig.productVisualAnalysis) : 'authentic details';
      if (!motionEn) {
        motionEn = `The character is actively interacting with, showing, and holding the ${prodName}, cinematic product showcase, fluid physics, realistic lighting, 4k 60fps`;
      }
      const charBlock = charAnchor || `${charName} ${charOutfit ? `(${charOutfit})` : ''}`;
      return `Product Consistency Lock: Keep product packaging, shape, color, and label text exactly identical to the reference product image. Do not alter or reinterpret the product design. ${charBlock} is physically holding, demonstrating and interacting with ${prodName} (${prodDesc}). Action: ${motionEn} ${arTag}`;
    }

    if (!motionEn) {
      motionEn = `Smooth dynamic cinematic camera motion tracking ${charName} in ${worldEn || 'environment'}, fluid physics, realistic lighting, 4k 60fps`;
    }

    const charBlock = charAnchor || `${charName} ${charOutfit ? `(${charOutfit})` : ''}`;
    return `Character locked: ${charBlock}. Environment: ${worldEn || 'consistent setting'}. Motion: ${motionEn} ${arTag}`;
  }

  /**
   * Generates a genuine AI keyframe image tailored to the scene's prompt, product context & character.
   * Supports Fal.ai (Nano Banana 2 / Nano Banana Pro Edit / Flux Schnell), Google Gemini Imagen 3, ChatGPT Image 2.
   */
  static async generateKeyframeImage(params: {
    scene: Scene;
    sceneIndex: number;
    videoType: VideoType;
    characterProfile?: CharacterProfile;
    artStyle?: string;
    affiliateConfig?: any;
    animationConfig?: any;
    educationalConfig?: any;
    engine?: string;
    resolution?: '0.5K' | '1K' | '2K' | '4K' | string;
    aspectRatio?: string;
    masterCharacterImageUrl?: string;
    masterProductImageUrl?: string;
    forceRegenerate?: boolean;
    allowFallbackToFlux?: boolean;
    onLog?: (msg: string, level?: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR') => void;
  }): Promise<string> {
    const { 
      scene, 
      sceneIndex, 
      videoType, 
      characterProfile, 
      artStyle, 
      affiliateConfig, 
      animationConfig, 
      educationalConfig, 
      engine, 
      resolution = '1K',
      aspectRatio,
      masterCharacterImageUrl,
      masterProductImageUrl,
      forceRegenerate,
      allowFallbackToFlux,
      onLog
    } = params;

    // If there's an attached product asset and NOT force regenerating, return assetUrl
    if (!forceRegenerate && scene.assetUrl && (scene.assetUrl.startsWith('data:image') || scene.assetUrl.startsWith('http')) && !scene.assetUrl.includes('unsplash.com') && !scene.assetUrl.includes('test-videos') && !scene.assetUrl.includes('pollinations.ai')) {
      return scene.assetUrl;
    }

    // Build standardized T2I prompt with strict Subject-First architecture in pure English
    const finalPrompt = ImageGenerationService.buildT2IImagePrompt({
      scene,
      sceneIndex,
      videoType,
      characterProfile,
      artStyle,
      affiliateConfig,
      animationConfig,
      educationalConfig
    });

    console.log(`[ImageGenerationService] Generated Optimized English Prompt for Scene ${sceneIndex + 1}:\n"${finalPrompt}"`);

    // Determine target aspect ratio based on studio & config
    const cleanAspect = aspectRatio || (videoType === 'AFFILIATE' || animationConfig?.aspectRatio === '9:16' || educationalConfig?.aspectRatio === '9:16' ? '9:16' : '16:9');

    // -----------------------------------------------------------------------
    // Prepare Reference Images for Edit Models (Nano Banana 2 Edit / Nano Banana Pro Edit)
    // -----------------------------------------------------------------------
    let referenceImageUrls: string[] = [];
    const activeFalKey = keyRotator.getNextFalKey() || process.env.FAL_KEY || process.env.FAL_API_KEY || undefined;

    if (videoType === 'AFFILIATE') {
      // AFFILIATE STUDIO: Product Image (index 0) + User Face Image (index 1)
      let rawProd = masterProductImageUrl 
        || (scene.metadata && scene.metadata.productImage) 
        || (scene.assetUrl && !scene.assetUrl.includes('pollinations') ? scene.assetUrl : undefined);

      // Explicit flag check from LLM
      if (!rawProd && scene.featuresProduct && (affiliateConfig?.productImages?.[0] || affiliateConfig?.productImage)) {
        rawProd = affiliateConfig.productImages?.[0] || affiliateConfig.productImage;
      }

      const rawFace = masterCharacterImageUrl 
        || characterProfile?.referenceImageUrl 
        || affiliateConfig?.characterImage;

      // Upload local/base64 images to Fal Storage if needed
      const prodUrl = rawProd ? await ImageGenerationService.ensurePublicFalImageUrl(rawProd, activeFalKey) : null;
      const faceUrl = rawFace ? await ImageGenerationService.ensurePublicFalImageUrl(rawFace, activeFalKey) : null;

      if (prodUrl) referenceImageUrls.push(prodUrl);
      if (faceUrl && faceUrl !== prodUrl) referenceImageUrls.push(faceUrl);

      // PRIORITAS 2: Hard Block if Affiliate has fewer than 2 reference images (Product + Face)
      if (referenceImageUrls.length < 2) {
        const missingParts: string[] = [];
        if (!prodUrl) missingParts.push('Foto Produk');
        if (!faceUrl) missingParts.push('Foto Model/Wajah Kreator');
        const errAffiliateMsg = `[Affiliate Studio Validation Failed] Studio Affiliate mewajibkan minimal 2 gambar referensi (${missingParts.join(' & ')} belum tersedia). Mohon upload foto produk dan foto model/karakter terlebih dahulu sebelum melakukan generate keyframe!`;
        console.error(errAffiliateMsg);
        if (onLog) onLog(errAffiliateMsg, 'ERROR');
        throw new Error(errAffiliateMsg);
      }
    } else {
      // ANIMATION & EDUCATIONAL STUDIO:
      // If subsequent scene (sceneIndex > 0) or master character reference exists
      const rawChar = masterCharacterImageUrl 
        || characterProfile?.referenceImageUrl 
        || (Array.isArray(characterProfile?.referenceImageUrls) && characterProfile.referenceImageUrls[0]);

      if (rawChar) {
        const charUrl = await ImageGenerationService.ensurePublicFalImageUrl(rawChar, activeFalKey);
        if (charUrl) {
          referenceImageUrls.push(charUrl);
        }
      }
    }

    // Sanitize URLs to ensure valid array format and max 14 limit
    referenceImageUrls = sanitizeReferenceImageUrls(referenceImageUrls);

    // Determine preferred engine
    const rawEngine = (engine || FounderService.getImageEngine() || 'fal').toLowerCase();
    let preferredEngine = 'fal';
    if (rawEngine.includes('gemini') || rawEngine.includes('imagen') || rawEngine.includes('banana')) {
      preferredEngine = 'gemini-imagen-3';
    } else if (rawEngine.includes('chatgpt') || rawEngine.includes('dall-e') || rawEngine.includes('openai') || rawEngine.includes('gpt')) {
      preferredEngine = 'chatgpt-image-2';
    } else {
      preferredEngine = 'fal';
    }

    let falQuotaErrorOccurred = false;
    let falQuotaErrorMessage = '';

    // -----------------------------------------------------------------------
    // Engine 1: Fal.ai Engine (Nano Banana 2 / Nano Banana Pro Edit / Flux Schnell)
    // -----------------------------------------------------------------------
    const runFalImage = async (): Promise<string | null> => {
      const falApiKey = keyRotator.getNextFalKey();
      if (!falApiKey) {
        console.log(`[Fal.ai Engine] API Key not configured or all keys exhausted in rotator.`);
        falQuotaErrorOccurred = true;
        falQuotaErrorMessage = 'Seluruh FAL_KEY dalam rotator habis atau tidak terkonfigurasi.';
        return null;
      }

      // Determine model from single source of truth based on studio mode, tier, & reference images
      const selectedTier = (rawEngine === 'draft' || rawEngine === 'precision' || rawEngine === 'standard') ? rawEngine : undefined;
      const isDraftMode = selectedTier === 'draft' || rawEngine === 'flux-diffusion' || rawEngine === 'fal-ai/flux/schnell';

      // For draft mode (FLUX.1 Schnell), strictly ignore reference images (pure text-to-image)
      const effectiveRefImages = isDraftMode ? [] : referenceImageUrls;

      const targetModelDef = getFalImageModelForStudio(videoType, {
        isSubsequentScene: sceneIndex > 0,
        hasReferenceImages: effectiveRefImages.length > 0,
        tier: selectedTier,
        forceModelId: rawEngine.startsWith('fal-ai/') ? rawEngine : undefined
      });

      console.log(`[Fal.ai Engine] Studio [${videoType}] -> Selected Model: ${targetModelDef.id} (Tier: ${selectedTier || 'default'}, Ref Images: ${effectiveRefImages.length})`);
      if (onLog) onLog(`Routing Scene ${sceneIndex + 1} ke fal.ai [${targetModelDef.id}] (Ref Images: ${effectiveRefImages.length})...`, 'INFO');

      // Model target: Draft tier strictly uses flux/schnell without fallback. Affiliate strictly uses nano-banana-pro/edit.
      const candidateModels = [targetModelDef.id];

      for (const modelPath of candidateModels) {
        try {
          // Construct payload according to official schema
          const payload = buildFalImagePayload(modelPath, {
            prompt: finalPrompt,
            imageUrls: (modelPath.includes('/edit') && effectiveRefImages.length > 0) ? effectiveRefImages : undefined,
            aspectRatio: cleanAspect,
            resolution: resolution as any,
            safetyTolerance: videoType === 'AFFILIATE' ? '6' : '5' // High tolerance for authentic human faces & products
          });

          const isHighResQueue = resolution === '4K' || resolution === '2K';
          const startTime = Date.now();

          if (isHighResQueue) {
            // ASYNC QUEUE MODE (Fal Queue runner for 4K / 2K generations)
            console.log(`[Fal.ai Queue] Submitting 4K/2K payload to https://queue.fal.run/${modelPath}...`);
            if (onLog) onLog(`Mengantrekan render keyframe resolusi tinggi (${resolution || '4K'}) ke queue.fal.run [${modelPath}]...`, 'INFO');

            const queueRes = await fetch(`https://queue.fal.run/${modelPath}`, {
              method: 'POST',
              headers: {
                'Authorization': `Key ${falApiKey.trim()}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            if (!queueRes.ok) {
              const errText = await queueRes.text().catch(() => '');
              let parsedDetail = errText;
              try {
                const errJson = JSON.parse(errText);
                parsedDetail = errJson.detail || errJson.message || errText;
              } catch (e) {}

              if (queueRes.status === 401) {
                falQuotaErrorOccurred = true;
                falQuotaErrorMessage = `HTTP 401 Unauthorized pada Fal.ai (${parsedDetail})`;
                keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP 401 Unauthorized: ${parsedDetail}`));
              } else if (queueRes.status === 402) {
                falQuotaErrorOccurred = true;
                falQuotaErrorMessage = `Saldo token API Fal.ai (${modelPath}) habis (HTTP 402 Payment Required).`;
                keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP 402 Payment Required: Saldo Fal.ai habis`));
              }

              throw new Error(`[FAL.AI QUEUE SUBMIT FAILED] HTTP ${queueRes.status}: ${parsedDetail}`);
            }

            const queueJson: any = await queueRes.json();
            const requestId = queueJson.request_id;
            const statusUrl = queueJson.status_url || `https://queue.fal.run/${modelPath}/requests/${requestId}/status`;
            const responseUrl = queueJson.response_url || `https://queue.fal.run/${modelPath}/requests/${requestId}`;

            console.log(`[Fal.ai Queue] Request queued ID: ${requestId}. Polling for completion...`);

            let completedJson: any = null;
            const maxPollTimeMs = 180000; // 3 minutes timeout
            const pollIntervalMs = 2500;

            while (Date.now() - startTime < maxPollTimeMs) {
              await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
              const pollRes = await fetch(statusUrl, {
                headers: { 'Authorization': `Key ${falApiKey.trim()}` }
              });

              if (pollRes.ok) {
                const pollJson: any = await pollRes.json();
                const queueStatus = (pollJson.status || '').toUpperCase();
                const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`[Fal.ai Queue] Job ${requestId.substring(0, 8)} status: ${queueStatus} (${elapsedSec}s)`);

                if (queueStatus === 'COMPLETED') {
                  const finalRes = await fetch(responseUrl, {
                    headers: { 'Authorization': `Key ${falApiKey.trim()}` }
                  });
                  if (finalRes.ok) {
                    completedJson = await finalRes.json();
                  } else {
                    completedJson = pollJson;
                  }
                  break;
                } else if (queueStatus === 'FAILED') {
                  const jobErr = pollJson.error || pollJson.logs || 'Queue task failed';
                  throw new Error(`[FAL.AI QUEUE JOB FAILED] Model ${modelPath}: ${JSON.stringify(jobErr)}`);
                }
              }
            }

            const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
            if (!completedJson) {
              // NO SILENT SYNC FALLBACK: Fail cleanly and trigger automatic credit refund to prevent HTTP 504 gateway timeout
              throw new Error(`[FAL.AI QUEUE TIMEOUT] Render antrean resolusi ${resolution} waktu habis setelah ${durationSec}s. Permintaan dihentikan demi stabilitas server. Kredit akan otomatis di-refund.`);
            }

            const imageUrl = completedJson?.images?.[0]?.url || completedJson?.images?.[0]?.image?.url || completedJson?.image?.url || completedJson?.output?.[0];
            if (imageUrl) {
              console.log(`[Fal.ai Queue] Successfully generated ${resolution} keyframe in ${durationSec}s via queue (${modelPath})!`);
              if (onLog) onLog(`Keyframe ${resolution} Adegan ${sceneIndex + 1} berhasil digenerate via Queue (${durationSec}s) [${modelPath}]`, 'SUCCESS');
              return imageUrl;
            }

            throw new Error(`[FAL.AI QUEUE ERROR] Job selesai tetapi tidak ditemukan URL gambar pada response payload.`);
          } else {
            // DIRECT SYNC MODE (0.5K / 1K)
            console.log(`[Fal.ai Engine] Submitting sync payload to https://fal.run/${modelPath}...`);
            const res = await fetch(`https://fal.run/${modelPath}`, {
              method: 'POST',
              headers: {
                'Authorization': `Key ${falApiKey.trim()}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            if (res.ok) {
              const json: any = await res.json();
              
              // Check Content Safety / NSFW flags
              if (json?.has_nsfw_concepts && Array.isArray(json.has_nsfw_concepts) && json.has_nsfw_concepts.some(Boolean)) {
                const safetyMsg = `[FAL.AI SAFETY FILTER] Gambar adegan ${sceneIndex + 1} ditolak oleh filter keamanan (NSFW / Safety Trigger). Sesuaikan kata kunci atau tingkatkan toleransi keamanan.`;
                console.warn(safetyMsg);
                if (onLog) onLog(safetyMsg, 'WARN');
              }

              const imageUrl = json?.images?.[0]?.url || json?.images?.[0]?.image?.url || json?.image?.url || json?.output?.[0];
              if (imageUrl) {
                const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`[Fal.ai Engine] Successfully generated keyframe via Fal.ai (${modelPath}) in ${durationSec}s!`);
                if (onLog) onLog(`Keyframe Adegan ${sceneIndex + 1} berhasil digenerate [${modelPath}] (${durationSec}s)`, 'SUCCESS');
                return imageUrl;
              }
            } else {
              const errText = await res.text().catch(() => '');
              let parsedErr = errText;
              try {
                const errJson = JSON.parse(errText);
                parsedErr = errJson.detail || errJson.message || errText;
              } catch (e) {}

              if (res.status === 401) {
                falQuotaErrorOccurred = true;
                falQuotaErrorMessage = `HTTP 401 Unauthorized pada Fal.ai (${parsedErr})`;
                console.error(`[Fal.ai Engine 401] Autentikasi Fal.ai gagal untuk model '${modelPath}': ${parsedErr}`);
                keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP 401 Unauthorized: ${parsedErr}`));
              } else if (res.status === 402) {
                falQuotaErrorOccurred = true;
                falQuotaErrorMessage = `Saldo token API Fal.ai (${modelPath}) habis (HTTP 402 Payment Required).`;
                console.error(`[Fal.ai Engine 402] Saldo/Kuota Fal.ai habis: ${parsedErr}`);
                keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP 402 Payment Required: Saldo habis`));
              } else if (res.status === 422) {
                console.error(`[Fal.ai Engine 422] Validasi payload gagal untuk model '${modelPath}': ${parsedErr}`);
                keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP 422 Unprocessable Entity: ${parsedErr}`));
              } else if (res.status === 429) {
                console.error(`[Fal.ai Engine 429] Rate limit tercapai untuk model '${modelPath}': ${parsedErr}`);
                keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP 429 Rate Limit Exceeded`));
              } else {
                console.error(`[Fal.ai Engine HTTP ${res.status}] Error: ${parsedErr}`);
                keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP ${res.status}: ${parsedErr}`));
              }

              console.warn(`[Fal.ai Engine Sync ${res.status}] ${parsedErr}. Proceeding to next failover engine.`);
              return null;
            }
          }
        } catch (falErr: any) {
          console.error(`[Fal.ai Engine] Error running model ${modelPath}:`, falErr?.message || falErr);
          keyRotator.reportKeyError('fal', falApiKey, falErr);
          return null;
        }
      }

      return null;
    };

    // -----------------------------------------------------------------------
    // Engine 2: Google Gemini Banana / Google AI Studio Imagen 3 Engine
    // -----------------------------------------------------------------------
    const runGeminiBanana = async (): Promise<string | null> => {
      const bananaConfig = FounderService.getGeminiBananaConfig();
      const customKey = bananaConfig.apiKey;

      const candidateModels = [
        bananaConfig.model || 'gemini-3.1-flash-image',
        'gemini-3.1-flash-lite-image',
        'gemini-3.1-flash-image'
      ];
      const uniqueBananaModels = Array.from(new Set(candidateModels));

      const maxAttempts = customKey ? 1 : 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const apiKey = customKey || keyRotator.getNextGeminiKey();
        if (!apiKey) {
          console.log(`[Google Gemini Banana Engine] API Key not configured or all keys exhausted. Skipping to next engine...`);
          return null;
        }

        for (const modelName of uniqueBananaModels) {
          console.log(`[Google Gemini Banana Engine] Attempting keyframe generation for Scene ${sceneIndex + 1} with ${modelName}...`);

          try {
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                }
              }
            });

            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  { text: finalPrompt }
                ]
              },
              config: {
                imageConfig: {
                  aspectRatio: cleanAspect as any,
                  imageSize: resolution === '4K' ? '2K' : (resolution === '2K' ? '2K' : '1K')
                }
              }
            });

            if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                  console.log(`[Google Gemini Banana Engine] Successfully synthesized keyframe via SDK (${modelName})!`);
                  return `data:image/png;base64,${part.inlineData.data}`;
                }
              }
            }
          } catch (sdkErr: any) {
            console.log(`[Google Gemini Banana Engine] Model ${modelName} error on API key (${sdkErr?.message}).`);
            keyRotator.reportKeyError('gemini', apiKey, sdkErr);
          }
        }
      }
      console.log(`[Google Gemini Banana Engine] Imagen API unavailable on current key(s), seamlessly proceeding to failover engine.`);
      return null;
    };

    // -----------------------------------------------------------------------
    // Engine 3: OpenAI ChatGPT Image 2 (DALL-E 3 / DALL-E 2)
    // -----------------------------------------------------------------------
    const runGptImage2 = async (): Promise<string | null> => {
      const gptConfig = FounderService.getGptImage2Config();
      const apiKey = gptConfig.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.log(`[ChatGPT Image 2 Engine] OpenAI API Key not configured. Skipping to next engine...`);
        return null;
      }

      try {
        let customBaseURL = gptConfig.endpoint ? gptConfig.endpoint.trim() : undefined;
        if (customBaseURL) {
          customBaseURL = customBaseURL.replace(/\/images\/generations\/?$/, '').replace(/\/+$/, '');
          if (customBaseURL.includes('api.openai.com/v1')) {
            customBaseURL = undefined;
          }
        }

        const openai = new OpenAI({ 
          apiKey,
          baseURL: customBaseURL
        });

        const targetModel = gptConfig.model || 'dall-e-3';
        console.log(`[ChatGPT Image 2 Engine] Requesting keyframe generation for Scene ${sceneIndex + 1} (${targetModel})...`);

        // If custom endpoint is set, try standard REST image generation first
        if (customBaseURL) {
          const directEndpoint = gptConfig.endpoint || `${customBaseURL}/images/generations`;
          try {
            const apiRes = await fetch(directEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: targetModel,
                prompt: finalPrompt.substring(0, 1000),
                n: 1,
                size: cleanAspect === '9:16' ? "1024x1792" : "1792x1024"
              })
            });
            if (apiRes.ok) {
              const resData: any = await apiRes.json();
              if (resData?.data && resData.data[0]?.url) {
                console.log(`[ChatGPT Image 2 Engine] Successfully generated image via custom endpoint!`);
                return resData.data[0].url;
              }
              if (resData?.data && resData.data[0]?.b64_json) {
                return `data:image/png;base64,${resData.data[0].b64_json}`;
              }
            }
          } catch (endpointErr) {
            console.log(`[ChatGPT Image 2 Engine] Custom endpoint unreachable, trying standard client...`);
          }
        }

        // Try standard OpenAI image models with cascade fallback (dall-e-3 -> dall-e-2)
        const modelsToTry = targetModel === 'chatgpt-image-2' 
          ? ['dall-e-3', 'dall-e-2'] 
          : [targetModel, 'dall-e-3', 'dall-e-2'];
        
        const uniqueModels = Array.from(new Set(modelsToTry));

        for (const m of uniqueModels) {
          try {
            const response = await openai.images.generate({
              model: m as any,
              prompt: finalPrompt.substring(0, 1000),
              n: 1,
              size: cleanAspect === '9:16' ? "1024x1792" : (m === 'dall-e-2' ? "512x512" : "1792x1024")
            });

            if (response?.data && response.data[0]?.url) {
              console.log(`[ChatGPT Image 2 Engine] Successfully generated image with ${m} for Scene ${sceneIndex + 1}!`);
              return response.data[0].url;
            }
          } catch (modelErr: any) {
            const msg = modelErr?.message || '';
            console.log(`[ChatGPT Image 2 Engine] Notice for model '${m}': ${msg.substring(0, 100)}`);
          }
        }
      } catch (openAiErr: any) {
        console.log(`[ChatGPT Image 2 Engine] Service unavailable, initiating seamless failover...`);
      }
      return null;
    };

    // -----------------------------------------------------------------------
    // Engine 4: High-Quality Ultra-Reliable Flux Pollinations AI Engine (Failover / Guarantee)
    // -----------------------------------------------------------------------
    const runPollinationsImage = async (): Promise<string | null> => {
      try {
        console.log(`[Pollinations AI Flux Engine] Synthesizing keyframe for Scene ${sceneIndex + 1}...`);
        const seed = Math.floor(Math.random() * 900000) + 100000;
        let width = 1280;
        let height = 720;
        if (cleanAspect === '9:16') {
          width = 720;
          height = 1280;
        } else if (cleanAspect === '1:1') {
          width = 1024;
          height = 1024;
        }
        const polUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
        const res = await fetch(polUrl);
        if (res.ok) {
          console.log(`[Pollinations AI Flux Engine] Successfully generated image for Scene ${sceneIndex + 1}!`);
          return polUrl;
        }
      } catch (polErr: any) {
        console.error(`[Pollinations AI Flux Engine] Error:`, polErr?.message || polErr);
      }
      return null;
    };

    const throwApiError = () => {
      console.log(`[Image Synthesis Engine] All configured API models failed or API key exhausted.`);
      throw new Error("Token API habis atau error dari penyedia layanan AI (Fal.ai / Gemini / OpenAI). Silakan periksa atau isi kembali FAL_KEY / GEMINI_API_KEY / OPENAI_API_KEY Anda di Rotator Pool untuk melanjutkan.");
    };

    // Primary & Fallback Engine Execution Flow
    if (preferredEngine === 'fal') {
      const falResult = await runFalImage();
      if (falResult) return falResult;

      // Check if Fal.ai quota/token was exhausted and user didn't explicitly request Flux or allow fallback
      const isExplicitDraft = rawEngine === 'draft' || rawEngine === 'flux-diffusion' || rawEngine === 'fal-ai/flux/schnell';
      if (falQuotaErrorOccurred && !allowFallbackToFlux && !isExplicitDraft) {
        throw new Error(`[NANO_QUOTA_EXHAUSTED] ${falQuotaErrorMessage || 'Saldo token API Nano Banana Pro (Fal.ai) pada server habis (HTTP 402).'}`);
      }

      const bananaResult = await runGeminiBanana();
      if (bananaResult) return bananaResult;
      const gptResult = await runGptImage2();
      if (gptResult) return gptResult;
      const polResult = await runPollinationsImage();
      if (polResult) return polResult;
      return throwApiError();
    } else if (preferredEngine === 'chatgpt-image-2') {
      const gptResult = await runGptImage2();
      if (gptResult) return gptResult;
      const falResult = await runFalImage();
      if (falResult) return falResult;
      const bananaResult = await runGeminiBanana();
      if (bananaResult) return bananaResult;
      const polResult = await runPollinationsImage();
      if (polResult) return polResult;
      return throwApiError();
    } else if (preferredEngine === 'gemini-imagen-3' || preferredEngine === 'gemini-banana') {
      const bananaResult = await runGeminiBanana();
      if (bananaResult) return bananaResult;
      const falResult = await runFalImage();
      if (falResult) return falResult;
      const gptResult = await runGptImage2();
      if (gptResult) return gptResult;
      const polResult = await runPollinationsImage();
      if (polResult) return polResult;
      return throwApiError();
    } else {
      const falResult = await runFalImage();
      if (falResult) return falResult;
      const bananaResult = await runGeminiBanana();
      if (bananaResult) return bananaResult;
      const gptResult = await runGptImage2();
      if (gptResult) return gptResult;
      const polResult = await runPollinationsImage();
      if (polResult) return polResult;
      return throwApiError();
    }
  }

  /**
   * Generates a Multi-Angle Character Reference Sheet (Turnaround Sheet)
   * specifically designed for character consistency and visual lock.
   */
  static async generateCharacterSheet(params: {
    characterDescription: string;
    artStyle?: string;
    genre?: string;
    imageEngine?: string;
  }): Promise<{ imageUrl: string; visualAnalysis: string; promptUsed: string }> {
    const { characterDescription, artStyle = 'ANIME_SHINKAI', genre = 'ACTION', imageEngine } = params;

    const sanitizedChar = ImageGenerationService.translateAndSanitizeToEnglish(characterDescription || 'expressive hero anime character');
    
    // Style descriptor tailored to animation artStyle
    let styleText = 'Makoto Shinkai anime aesthetic, vibrant sky colors, crisp cel-shaded anime character portrait, Studio Ghibli inspired, masterwork 8k anime artwork';
    if (artStyle === '3D_PIXAR') styleText = '3D Pixar Disney animation style, 3D character hero model, subsurface scattering, Octane render 8k, soft volumetric studio lighting';
    if (artStyle === '3D_UNREAL_HYPER') styleText = 'Unreal Engine 5.4 hyper-realistic 3D CGI character portrait, cinematic volumetric lighting, 8k render, masterpiece';
    if (artStyle === 'ANIME_CYBERPUNK' || artStyle === 'CYBERPUNK_NEON') styleText = 'Cyberpunk mecha anime character design portrait, glowing neon circuitry, high detail sci-fi anime art';
    if (artStyle === '2D_CLASSIC_CARTOON' || artStyle === 'DISNEY_CLASSIC') styleText = 'Classic 2D hand-drawn animation style, cel-shaded, expressive linework';
    if (artStyle === 'CLAYMATION') styleText = 'Claymation stop-motion tactile plasticine clay character model, detailed clay texture';
    if (artStyle === 'COMIC_BOOK') styleText = 'Western comic shonen manga crosshatch ink character design, dramatic lighting';
    if (artStyle === 'PIXEL_ART') styleText = '16-bit retro pixel art character portrait, crisp pixels';

    const randomSeed = Math.floor(Math.random() * 900000) + 100000;
    
    let promptUsed = '';
    if (artStyle === '3D_PIXAR' || artStyle === '3D_UNREAL_HYPER') {
      promptUsed = `Character turnaround sheet, 3D character design sheet, complete head-to-toe full-body turnaround model sheet. Showing three full-length standing figures: front view, side profile view, and 3/4 view of ${sanitizedChar}. Head-to-toe scale, fully zoomed-out wide shot displaying the entire character including complete legs, shoes, and clothing outfit in high-detail. On a solid flat plain light grey studio background, ${styleText}, highly consistent face and clothing design --seed ${randomSeed}`;
    } else {
      promptUsed = `Anime character design sheet, character turnaround model sheet, complete head-to-toe full-body turnaround. Showing three full-length standing poses: front view, side profile view, and 3/4 view of ${sanitizedChar}. Zoomed-out wide shot showing the entire body standing upright from head to feet, displaying the complete outfit, shirt, pants, and shoes in full view. On a solid flat clean light neutral grey background, professional 2D key animator concept art, ${styleText}, highly consistent facial features and clothing details, no head-only cropping --seed ${randomSeed}`;
    }

    console.log(`[ImageGenerationService] Generating Character Turnaround Sheet (${imageEngine || 'default'}):\n"${promptUsed}"`);

    const dummyScene: Scene = {
      id: `char_sheet_ref_${randomSeed}`,
      promptTextToImage: promptUsed,
      visualDirection: promptUsed,
      duration: '5s',
      status: 'COMPLETED'
    };

    const imageUrl = await ImageGenerationService.generateKeyframeImage({
      scene: dummyScene,
      sceneIndex: Math.floor(Math.random() * 50),
      videoType: 'ANIMATION',
      artStyle,
      engine: imageEngine,
      forceRegenerate: true
    });

    const visualAnalysis = `Karakter referensi utama terdesain dengan gaya visual ${artStyle}: ${characterDescription}. Visual lock aktif pada engine ${imageEngine || 'AI Studio'}.`;

    return {
      imageUrl,
      visualAnalysis,
      promptUsed
    };
  }
}
