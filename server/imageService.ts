import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { CharacterProfile, Scene, VideoType } from "../src/shared/types";
import { FounderService } from "../src/server/fcc/FounderService";
import { keyRotator } from "./keyRotator";
import { validateCredentialFormat, logCredentialAudit } from "./utils/credentialValidator";
import { 
  getFalImageModelForStudio, 
  buildFalImagePayload, 
  sanitizeReferenceImageUrls, 
  getFalImageModel,
  FAL_IMAGE_MODELS 
} from "./falModelConfig";

export class ImageGenerationService {
  public static readonly ACTIVE_MODEL = "Fal.ai (Nano Banana 2 / Nano Banana 2 Edit / Nano Banana Pro Edit / Flux Schnell)";

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

    const maxRetries = 3;
    let currentKey = falApiKey || keyRotator.getNextFalKey();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (!currentKey) {
        console.warn(`[Fal Storage] Attempt ${attempt}/${maxRetries}: No Fal API Key available.`);
        break;
      }

      try {
        console.log(`[Fal Storage] Attempt ${attempt}/${maxRetries}: Uploading reference image (${(buffer.length / 1024).toFixed(1)} KB, ${contentType}) to Fal Storage...`);

        // 1. Initiate upload
        const initRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${currentKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            file_name: fileName,
            content_type: contentType
          })
        });

        if (!initRes.ok) {
          const errText = await initRes.text().catch(() => '');
          console.warn(`[Fal Storage] Initiate failed (HTTP ${initRes.status}): ${errText}`);

          if (initRes.status === 402 || initRes.status === 403 || initRes.status === 401 || errText.toLowerCase().includes('exhausted') || errText.toLowerCase().includes('locked')) {
            keyRotator.reportKeyError('fal', currentKey, new Error(`HTTP ${initRes.status}: ${errText}`));
            const nextKey = keyRotator.getNextFalKey();
            if (nextKey && nextKey !== currentKey) {
              console.log(`[Fal Storage] Rotating to next active Fal Key for retry...`);
              currentKey = nextKey;
              continue;
            }
          }

          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, attempt * 1000));
            continue;
          }
          break;
        }

        const initJson: any = await initRes.json();
        const uploadUrl = initJson.upload_url;
        const fileUrl = initJson.file_url;

        if (!uploadUrl || !fileUrl) {
          console.warn('[Fal Storage] Incomplete initiate response:', initJson);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, attempt * 1000));
            continue;
          }
          break;
        }

        // 2. PUT binary data
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: buffer
        });

        if (!putRes.ok) {
          console.warn(`[Fal Storage] PUT file data failed (HTTP ${putRes.status})`);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, attempt * 1000));
            continue;
          }
          break;
        }

        console.log(`[Fal Storage] Reference image uploaded successfully: ${fileUrl}`);
        return fileUrl;
      } catch (err: any) {
        console.warn(`[Fal Storage] Error during upload attempt ${attempt}/${maxRetries}:`, err?.message || err);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }

    console.warn(`[Fal Storage Warning] Fal Storage upload failed after ${maxRetries} attempts. Using base64 data URI fallback safely...`);
    return `data:${contentType};base64,${buffer.toString('base64')}`;
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
      // Meta-narrative / Camera & Perspective translation
      [/arahan kamera:\s*/gi, ''],
      [/\bsudut pandang kamera\b/gi, 'camera angle'],
      [/\bsudut kamera\b/gi, 'camera angle'],
      [/\bkamera depan\b/gi, 'front camera selfie angle'],
      [/\bkamera belakang\b/gi, 'rear camera angle'],
      [/\bkamera merekam\b/gi, 'medium shot of'],
      [/\bkamera mengambil\b/gi, 'shot of'],
      [/\bkamera menyorot\b/gi, 'focusing on'],
      [/\bkamera mendekat\b/gi, 'close up of'],
      [/\bkamera menjauh\b/gi, 'pull-out wide shot of'],
      [/\bkamera bergerak maju\b/gi, 'dolly-in shot of'],
      [/\bkamera bergerak\b/gi, 'tracking shot of'],
      [/\bkamera berputar\b/gi, 'orbital shot of'],
      [/\bkamera zoom in\b/gi, 'zooming in on'],
      [/\bkamera zoom\b/gi, 'zooming in on'],
      [/\bkamera low angle\b/gi, 'dynamic low-angle shot'],
      [/\bkamera high angle\b/gi, 'high-angle overhead shot'],
      [/\bkamera eye level\b/gi, 'eye-level shot'],
      [/\bkamera close up\b/gi, 'close-up shot'],
      [/\bkamera medium shot\b/gi, 'medium shot'],
      [/\bkamera wide shot\b/gi, 'wide shot'],
      [/\bkamera macro\b/gi, 'macro close-up shot'],
      [/\bkamera handheld\b/gi, 'handheld smartphone camera shot'],
      [/\bkamera smartphone\b/gi, 'authentic smartphone UGC camera perspective'],
      [/\bkamera hp\b/gi, 'authentic smartphone camera perspective'],
      [/\bkamera\b/gi, 'shot'],

      // Lighting and Ambience
      [/\bpencahayaan alami\b/gi, 'natural warm indoor lighting'],
      [/\bpencahayaan studio\b/gi, 'clean studio lighting'],
      [/\bpencahayaan terang\b/gi, 'bright soft lighting'],
      [/\bpencahayaan dramatis\b/gi, 'dramatic key lighting'],
      [/\btata cahaya\b/gi, 'lighting'],
      [/\bpencahayaan\b/gi, 'lighting'],
      [/\blatar belakang\b/gi, 'backdrop'],
      [/\blatar\b/gi, 'background'],

      // Common typos & translation failures (Point 3)
      [/\bkesakitan\b/gi, 'wincing in pain'],
      [/\bsakit\b/gi, 'pain'],
      [/\bfrustrasi\b/gi, 'frustrated'],
      [/\blelah\b/gi, 'exhausted'],
      [/\bbingung\b/gi, 'confused'],
      [/\bkecewa\b/gi, 'disappointed'],
      [/\bmengeluh\b/gi, 'complaining'],
      [/\bsedih\b/gi, 'sad'],
      [/\bmurung\b/gi, 'gloomy'],
      [/\bmarah\b/gi, 'angry'],
      [/\btersenyum\b/gi, 'smiling'],
      [/\btertawa\b/gi, 'laughing'],
      [/\bbahagia\b/gi, 'happy'],
      [/\bsenang\b/gi, 'glad'],
      [/\bsepatu biasa\b/gi, 'ordinary shoes'],
      [/\bsepatu\b/gi, 'shoes'],
      [/\brusak\b/gi, 'broken'],
      [/\bjelek\b/gi, 'ugly'],
      [/\bkotor\b/gi, 'dirty'],
      [/\bbersih\b/gi, 'clean'],
      [/\bbaru\b/gi, 'new'],
      [/\blama\b/gi, 'old'],
      [/\bmemegang\b/gi, 'holding'],
      [/\bmenunjukkan\b/gi, 'showing'],
      [/\bmengoleskan\b/gi, 'applying'],
      [/\bmemakai\b/gi, 'wearing'],
      [/\bberjalan\b/gi, 'walking'],
      [/\bberdiri\b/gi, 'standing'],
      [/\bduduk\b/gi, 'sitting'],
      [/\bberlari\b/gi, 'running'],
      [/\bmelompat\b/gi, 'jumping'],

      // Soccer & Sports terms
      [/\bpemain sepak bola\b/gi, 'soccer player'],
      [/\bsepak bola\b/gi, 'soccer'],
      [/\blapangan rumput hijau luas\b/gi, 'wide green soccer pitch'],
      [/\blapangan rumput\b/gi, 'green grass pitch'],
      [/\blapangan\b/gi, 'field'],
      [/\bstadion nasional\b/gi, 'massive national stadium'],
      [/\bstadion sepak bola\b/gi, 'packed soccer stadium'],
      [/\bstadion\b/gi, 'stadium'],
      [/\btribun penonton\b/gi, 'stadium grandstands with cheering fans'],
      [/\bsuporter\b/gi, 'cheering fans'],
      [/\bpenonton\b/gi, 'spectators'],
      [/\bjersey tim utama\b/gi, 'team soccer jersey'],
      [/\bjersey\b/gi, 'soccer jersey'],
      [/\bseragam\b/gi, 'uniform'],
      [/\bnomor punggung (\d+)\b/gi, 'number $1 on back'],
      [/\bnomor (\d+)\b/gi, '#$1'],
      [/\bcelana pendek\b/gi, 'shorts'],
      [/\bkaus kaki panjang\b/gi, 'high athletic socks'],
      [/\bsepatu bola\b/gi, 'cleats'],
      [/\bselebrasi gol heroik\b/gi, 'heroic goal celebration cheering with clenched fists'],
      [/\bselebrasi kemenangan\b/gi, 'victory celebration with raised arms'],
      [/\bselebrasi\b/gi, 'celebrating triumph'],
      [/\bmencetak gol\b/gi, 'scoring a goal'],
      [/\btendangan melengkung\b/gi, 'powerful curving shot'],
      [/\btendangan halilintar\b/gi, 'thunderous powerful kick'],
      [/\btendangan bertenaga\b/gi, 'powerful strike kick'],
      [/\btendangan\b/gi, 'kick shot'],
      [/\bmenggiring bola\b/gi, 'dribbling soccer ball at high speed'],
      [/\bdribbling\b/gi, 'dribbling soccer ball'],
      [/\bumpan silang\b/gi, 'crossing the ball'],
      [/\bmenepis bola\b/gi, 'blocking the shot'],
      [/\bkiper\b/gi, 'goalkeeper'],
      [/\bgawang\b/gi, 'goal net'],
      [/\bsudut gawang\b/gi, 'top corner of the goal'],

      // General Character attributes
      [/\brambut hitam spiky runcing ke atas\b/gi, 'spiky upward black anime hair'],
      [/\brambut hitam spiky\b/gi, 'spiky black hair'],
      [/\brambut spiky\b/gi, 'spiky styled hair'],
      [/\brambut hitam lurus\b/gi, 'straight black hair'],
      [/\brambut hitam\b/gi, 'black hair'],
      [/\brambut pirang\b/gi, 'blonde hair'],
      [/\brambut cokelat\b/gi, 'brown hair'],
      [/\brambut\b/gi, 'hair'],
      [/\bmata tajam penuh determinasi\b/gi, 'sharp determined eyes'],
      [/\bmata tajam\b/gi, 'sharp intense eyes'],
      [/\bmata cokelat gelap\b/gi, 'dark brown eyes'],
      [/\bmata biru\b/gi, 'blue eyes'],
      [/\bmata bercahaya\b/gi, 'glowing eyes'],
      [/\bmata\b/gi, 'eyes'],
      [/\bberkacamata bulat\b/gi, 'round glasses'],
      [/\bkacamata pintar\b/gi, 'smart glasses'],
      [/\bkacamata\b/gi, 'glasses'],
      [/\bjas lab putih rapi\b/gi, 'crisp white lab coat'],
      [/\bjas lab putih\b/gi, 'white lab coat'],
      [/\bjas lab\b/gi, 'lab coat'],
      [/\bjas\b/gi, 'suit blazer'],
      [/\bkemeja rapi\b/gi, 'neat collared shirt'],
      [/\bkemeja\b/gi, 'shirt'],
      [/\bkaos\b/gi, 't-shirt'],
      [/\bjaket\b/gi, 'jacket'],
      [/\bbodi putih mengkilap\b/gi, 'glossy white robotic chassis'],
      [/\bbodi putih\b/gi, 'white chassis'],
      [/\baksen neon biru\b/gi, 'cyan glowing neon accents'],
      [/\baksen neon\b/gi, 'neon accents'],
      [/\blayar ekspresi mata bersahabat\b/gi, 'friendly digital screen face'],
      [/\blayar ekspresi\b/gi, 'emotive digital screen display'],
      [/\bprofesor robot ai ramah\b/gi, 'friendly AI professor robot'],
      [/\bprofesor robot ai\b/gi, 'AI professor robot'],
      [/\brobot ai\b/gi, 'AI robot'],
      [/\brobot\b/gi, 'robot'],
      [/\bmaskot rubah\b/gi, 'fox mascot character in detective vest'],
      [/\bmaskot\b/gi, 'mascot character'],
      [/\bedukator sains wanita muda\b/gi, 'young female science educator'],
      [/\bedukator wanita\b/gi, 'female educator'],
      [/\bguru sains\b/gi, 'science teacher'],
      [/\bguru wanita\b/gi, 'female teacher'],
      [/\bguru pria\b/gi, 'male teacher'],
      [/\bguru\b/gi, 'teacher'],
      [/\bdosen muda berkharisma\b/gi, 'charismatic young professor'],
      [/\bdosen\b/gi, 'professor'],
      [/\bpria muda\b/gi, 'young man'],
      [/\bwanita muda\b/gi, 'young woman'],
      [/\bpria\b/gi, 'male'],
      [/\bwanita\b/gi, 'female'],
      [/\bgadis\b/gi, 'young girl'],
      [/\banak-anak\b/gi, 'children'],

      // Colors
      [/\bbiru putih\b/gi, 'blue and white'],
      [/\bmerah putih\b/gi, 'red and white'],
      [/\bhitam putih\b/gi, 'black and white'],
      [/\bbiru muda\b/gi, 'light cyan blue'],
      [/\bbiru tua\b/gi, 'navy blue'],
      [/\bbiru\b/gi, 'blue'],
      [/\bmerah\b/gi, 'red'],
      [/\bhijau\b/gi, 'green'],
      [/\bkuning\b/gi, 'yellow'],
      [/\bputih\b/gi, 'white'],
      [/\bhitam\b/gi, 'black'],
      [/\babu-abu\b/gi, 'gray'],
      [/\bemas\b/gi, 'gold'],
      [/\bperak\b/gi, 'silver'],
      [/\bkeemasan\b/gi, 'golden'],

      // World / Environment
      [/\blaboratorium riset canggih serba putih\b/gi, 'state-of-the-art white research laboratory'],
      [/\blaboratorium sains modern\b/gi, 'modern science laboratory with futuristic equipment'],
      [/\blaboratorium sains\b/gi, 'science laboratory'],
      [/\blaboratorium\b/gi, 'high-tech laboratory'],
      [/\blayar holografis melayang\b/gi, 'floating glowing holographic data displays'],
      [/\blayar holografis\b/gi, 'holographic screens'],
      [/\bruang angkasa & galaksi\b/gi, 'cosmic deep space with colorful glowing nebulae and distant stars'],
      [/\bruang angkasa\b/gi, 'deep space'],
      [/\bnebula bercahaya\b/gi, 'glowing nebulae'],
      [/\bbintang\b/gi, 'stars'],
      [/\bstudio infografis digital\b/gi, 'sleek digital infographic studio with dark elegant backdrop and neon glowing charts'],
      [/\bstudio infografis\b/gi, 'infographic presentation studio'],
      [/\bstudio presentasi\b/gi, 'modern presentation stage'],
      [/\bruang kelas digital interaktif\b/gi, 'futuristic interactive digital classroom with smartboards'],
      [/\bruang kelas\b/gi, 'modern classroom'],
      [/\blanskap alam hijau cerah\b/gi, 'vibrant green nature landscape with sunny blue skies'],
      [/\balam terbuka\b/gi, 'open outdoor nature landscape'],
      [/\bhutan\b/gi, 'lush forest'],
      [/\bpegunungan\b/gi, 'majestic mountains'],
      [/\bkota masa depan\b/gi, 'futuristic sci-fi city with neon skyscrapers'],
      [/\bkota\b/gi, 'city metropolis'],

      // Atmosphere, Lighting & Connectives
      [/\bdi bawah senja jingga\b/gi, 'under a dramatic golden twilight sunset sky'],
      [/\bsenja jingga\b/gi, 'golden hour twilight sunset'],
      [/\bsenja\b/gi, 'sunset twilight'],
      [/\bmalam hari\b/gi, 'at night under bright floodlights'],
      [/\bsiang hari\b/gi, 'bright daytime'],
      [/\bpagi hari\b/gi, 'morning sunrise lighting'],
      [/\bpencahayaan lampu stadion\b/gi, 'intense glowing stadium floodlights'],
      [/\blampu sorot\b/gi, 'bright floodlights'],
      [/\bpencahayaan dramatis\b/gi, 'dramatic cinematic lighting'],
      [/\bpencahayaan terang\b/gi, 'clean studio lighting'],
      [/\bpencahayaan\b/gi, 'lighting'],
      [/\bdengan\b/gi, 'with'],
      [/\bdan\b/gi, 'and'],
      [/\bdi\b/gi, 'in'],
      [/\bpada\b/gi, 'at'],
      [/\bke\b/gi, 'to'],
      [/\bdari\b/gi, 'from'],
      [/\bmengenakan\b/gi, 'wearing'],
      [/\bmemakai\b/gi, 'wearing'],
      [/\bberwarna\b/gi, 'colored'],
      [/\bbernama\b/gi, 'named'],
      [/\bpenuh\b/gi, 'filled with'],
      [/\bsangat\b/gi, 'extremely'],
      [/\bmenghadap\b/gi, 'facing'],
      [/\bmelihat ke\b/gi, 'looking towards'],
      [/\bekspresi bangga\b/gi, 'proud confident expression'],
      [/\bekspresi fokus\b/gi, 'intense focused expression'],
      [/\bekspresi ceria\b/gi, 'cheerful friendly expression'],
      [/\bekspresi\b/gi, 'facial expression'],
      [/\bkemenangan\b/gi, 'victory triumph'],
      [/\baksi heroik\b/gi, 'heroic dynamic action'],
      [/\baksi\b/gi, 'action pose'],
      [/\bkecepatan tinggi\b/gi, 'high speed velocity'],
      [/\bsudut rendah dramatis\b/gi, 'dramatic dynamic low angle shot'],
      [/\bsudut lebar\b/gi, 'wide angle cinematic shot'],
      [/\bclose up\b/gi, 'close up shot']
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
      const visualStyle = scene.visualStyle || 'ugc';
      if (visualStyle === 'studio') {
        styleSuffix = 'commercial advertising photograph, professional product presentation, sharp focus, clean studio backdrop, balanced key lighting, 8k resolution';
      } else {
        styleSuffix = 'authentic smartphone UGC video camera perspective, natural warm indoor lighting, authentic human skin texture with pores, raw and candid';
      }
    } else {
      styleSuffix = 'Cinematic 8k movie still, anamorphic lens flare, master shot, photorealistic';
    }

    const endModifiers = `${styleSuffix}`;

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
        charName ? `A ${charName}` : 'A creator / presenter',
        charOutfit ? `wearing ${charOutfit}` : '',
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
      const prodDesc = cleanProductVision || 'authentic product design, clean packaging and labels';
      const cleanProdDesc = prodDesc.replace(/\(+/g, '').replace(/\)+/g, '').trim();
      const featuresProduct = scene.featuresProduct !== false && (scene as any)?.productLock !== false;
      const isBgLocked = scene.backgroundLock !== 'free';
      const locationStr = scene.location ? ImageGenerationService.translateAndSanitizeToEnglish(scene.location) : '';

      // Clean raw LLM text if it already has headers
      let sanitizedText = cleanedRawT2I
        .replace(/^Visual Scene:\s*/gi, '')
        .replace(/^Action:\s*/gi, '')
        .replace(/^Photorealistic 35mm commercial photo of hands holding [^,]+,\s*/gi, '')
        .replace(/^Photorealistic 35mm photograph of hands holding [^,]+,\s*/gi, '');

      // Multi-angle product reference indicator
      const hasMultiAngle = Array.isArray(affiliateConfig?.productImages) && affiliateConfig.productImages.length > 1;

      if (featuresProduct) {
        // PRIORITAS 3: Product Consistency Lock explicit anchor ONLY when scene features product
        promptParts.push("Product Consistency Lock: Keep product packaging, shape, color, and label text exactly identical to the reference product image. Do not alter or reinterpret the product design.");
        if (hasMultiAngle) {
          promptParts.push("Multi-Angle Consistency: Reconstruct exact 3D geometry, logos, and surface textures from all multi-view reference images provided.");
        }

        if (sanitizedText) {
          const alreadyHasProd = sanitizedText.toLowerCase().includes(prodName.toLowerCase());
          const prodSuffix = (!alreadyHasProd && prodName) ? `, featuring ${prodName} (${cleanProdDesc})` : '';
          
          if (/^(Photorealistic|Extreme|Full-body|Commercial|Fashion|Dynamic|Lifestyle|Authentic|Sharp|Macro)/i.test(sanitizedText) || sanitizedText.length > 50) {
            promptParts.push(`${sanitizedText}${prodSuffix}`);
          } else {
            const photoAnchor = `Authentic photograph of ${sanitizedText}${prodSuffix}`;
            promptParts.push(photoAnchor);
          }
        } else {
          const photoAnchor = `Authentic creator photograph of real hands presenting ${prodName}, ${cleanProdDesc}, held in clear view by ${charSubjectEn || 'the creator'}, natural warm indoor lighting, authentic human skin texture with pores`;
          promptParts.push(photoAnchor);
          if (sceneActionEn) {
            promptParts.push(`Action: ${sceneActionEn}`);
          }
        }
      } else {
        // PRIORITAS 4: Scene does NOT feature product (e.g. pain point, facial emotion, lifestyle context)
        promptParts.push("Scene Mode: Emotional Hook & Context (No product featured in this shot).");
        if (sanitizedText) {
          promptParts.push(`${sanitizedText}`);
        } else {
          promptParts.push(`Cinematic lifestyle shot: ${sceneActionEn || 'candid authentic emotion'}`);
        }
      }

      // PRIORITAS 5: Background Lock Anchor
      if (isBgLocked) {
        promptParts.push(`Background Lock: Environment strictly locked to ${locationStr || worldEn || 'the same consistent modern room interior'}, identical lighting and color temperature`);
      } else {
        promptParts.push(`Background: ${locationStr || worldEn || 'Dynamic background setting suited to the scene action'}`);
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
        if (charSubjectEn && !coreSubjectAction.toLowerCase().includes(charName.toLowerCase()) && !coreSubjectAction.toLowerCase().includes('starring')) {
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
      const featuresProduct = scene.featuresProduct !== false && (scene as any)?.productLock !== false;
      const charBlock = charAnchor || `${charName} ${charOutfit ? `(${charOutfit})` : ''}`;

      if (featuresProduct) {
        if (!motionEn) {
          motionEn = `The character is actively interacting with, showing, and holding the ${prodName}, cinematic product showcase, fluid physics, realistic lighting, 4k 60fps`;
        }
        return `Product Consistency Lock: Keep product packaging, shape, color, and label text exactly identical to the reference product image. Do not alter or reinterpret the product design. ${charBlock} is physically holding, demonstrating and interacting with ${prodName} (${prodDesc}). Action: ${motionEn} ${arTag}`;
      } else {
        if (!motionEn) {
          motionEn = `The creator shows candid, authentic facial expressions and gestures in an emotional storytelling moment, fluid physics, natural lighting, 4k 60fps`;
        }
        return `Character Locked: ${charBlock}. NO PRODUCT VISIBLE. The character's hands are empty. Do not add, render, or hallucinate any product, object, or item in the scene. Scene Action: ${motionEn} ${arTag}`;
      }
    }

    if (!motionEn) {
      motionEn = `Smooth dynamic cinematic camera motion tracking ${charName} in ${worldEn || 'environment'}, fluid physics, realistic lighting, 4k 60fps`;
    }

    const charBlock = charAnchor || `${charName} ${charOutfit ? `(${charOutfit})` : ''}`;
    return `Character locked: ${charBlock}. Environment: ${worldEn || 'consistent setting'}. Motion: ${motionEn} ${arTag}`;
  }

  /**
   * Generates a genuine AI keyframe image tailored to the scene's prompt, product context & character.
   * Supports Fal.ai (Nano Banana 2 / Nano Banana 2 Edit / Nano Banana Pro Edit / Flux Schnell).
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
    previousSceneImageUrl?: string;
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
      previousSceneImageUrl,
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

    // Determine target engine route
    const rawEngine = (engine || FounderService.getImageEngine() || 'fal').toLowerCase();
    const isGoogleEngine = rawEngine.includes('gemini') || rawEngine.includes('imagen') || rawEngine.startsWith('nano-asli') || rawEngine === 'nano-asli';
    const isOpenAiEngine = rawEngine.includes('chatgpt') || rawEngine.includes('dall-e') || rawEngine.includes('openai') || rawEngine.includes('gpt');
    const isFalEngine = !isGoogleEngine && !isOpenAiEngine;

    // Helper: Convert local path / URL / base64 into an inlineData part for Gemini multimodal image models
    const loadAsBase64Part = async (imgStr: string): Promise<{ inlineData: { data: string; mimeType: string } } | null> => {
      if (!imgStr) return null;
      const trimmed = imgStr.trim();
      if (trimmed.startsWith('data:image/')) {
        const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          return { inlineData: { mimeType: match[1], data: match[2] } };
        }
      } else if (trimmed.startsWith('/') || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))) {
        const resolvedPath = path.isAbsolute(trimmed) ? trimmed : path.join(process.cwd(), trimmed);
        if (fs.existsSync(resolvedPath)) {
          const buffer = fs.readFileSync(resolvedPath);
          let mimeType = 'image/png';
          if (resolvedPath.endsWith('.jpg') || resolvedPath.endsWith('.jpeg')) mimeType = 'image/jpeg';
          else if (resolvedPath.endsWith('.webp')) mimeType = 'image/webp';
          return { inlineData: { mimeType, data: buffer.toString('base64') } };
        }
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
          const res = await fetch(trimmed);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            const mimeType = res.headers.get('content-type') || 'image/png';
            return { inlineData: { mimeType, data: buffer.toString('base64') } };
          }
        } catch (e) {}
      }
      return null;
    };

    // -----------------------------------------------------------------------
    // Prepare Reference Images based on Selected Engine Route
    // -----------------------------------------------------------------------
    let referenceImageUrls: string[] = [];
    let localGeminiParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
    const activeFalKey = isFalEngine ? (keyRotator.getNextFalKey() || process.env.FAL_KEY || process.env.FAL_API_KEY || undefined) : undefined;

    if (videoType === 'AFFILIATE') {
      const shouldIncludeProduct = scene.featuresProduct !== false && (scene as any)?.productLock !== false;
      const shouldIncludeFace = (scene as any)?.faceLock !== false;

      // 1. Gather all product images
      const rawProductList: string[] = [];
      if (shouldIncludeProduct) {
        if (masterProductImageUrl) rawProductList.push(masterProductImageUrl);
        if (Array.isArray(affiliateConfig?.productImages)) {
          for (const img of affiliateConfig.productImages) {
            if (img && !rawProductList.includes(img)) rawProductList.push(img);
          }
        } else if (affiliateConfig?.productImage && !rawProductList.includes(affiliateConfig.productImage)) {
          rawProductList.push(affiliateConfig.productImage);
        }
        if (scene.metadata?.productImage && !rawProductList.includes(scene.metadata.productImage)) {
          rawProductList.push(scene.metadata.productImage);
        }
        if (scene.assetUrl && !scene.assetUrl.includes('pollinations') && !rawProductList.includes(scene.assetUrl)) {
          rawProductList.push(scene.assetUrl);
        }
      }

      // 2. Gather face reference image
      const rawFace = shouldIncludeFace
        ? (masterCharacterImageUrl || characterProfile?.referenceImageUrl || affiliateConfig?.characterImage)
        : null;

      // 3. Gather background reference
      const isBgLocked = scene.backgroundLock !== 'free';
      const rawBg = isBgLocked ? (previousSceneImageUrl || (scene as any)?.previousSceneImageUrl || (scene as any)?.backgroundImageUrl) : null;

      // Check validation
      if (shouldIncludeProduct && rawProductList.length === 0) {
        const errMsg = `[Affiliate Studio Validation] Adegan ${sceneIndex + 1} membutuhkan Foto Produk, namun aset foto produk belum ditemukan. Mohon upload foto produk terlebih dahulu!`;
        if (onLog) onLog(errMsg, 'ERROR');
        throw new Error(errMsg);
      }

      if (shouldIncludeFace && !rawFace) {
        const errMsg = `[Affiliate Studio Validation] Adegan ${sceneIndex + 1} mengaktifkan Kunci Wajah, namun foto wajah kreator belum ditemukan. Mohon upload foto wajah kreator terlebih dahulu!`;
        if (onLog) onLog(errMsg, 'ERROR');
        throw new Error(errMsg);
      }

      // Route image conversion
      if (isGoogleEngine) {
        // Direct local base64 parts for Google Gemini (Zero Fal Storage calls)
        for (const pImg of rawProductList) {
          const part = await loadAsBase64Part(pImg);
          if (part && localGeminiParts.length < 3) localGeminiParts.push(part);
        }
        if (rawFace) {
          const part = await loadAsBase64Part(rawFace);
          if (part && localGeminiParts.length < 4) localGeminiParts.push(part);
        }
        if (rawBg) {
          const part = await loadAsBase64Part(rawBg);
          if (part && localGeminiParts.length < 5) localGeminiParts.push(part);
        }
      } else if (isFalEngine) {
        // Upload / convert to Fal Storage
        for (const pImg of rawProductList) {
          const pUrl = await ImageGenerationService.ensurePublicFalImageUrl(pImg, activeFalKey);
          if (pUrl && !referenceImageUrls.includes(pUrl) && referenceImageUrls.length < 14) {
            referenceImageUrls.push(pUrl);
          }
        }
        if (rawFace) {
          const faceUrl = await ImageGenerationService.ensurePublicFalImageUrl(rawFace, activeFalKey);
          if (faceUrl && !referenceImageUrls.includes(faceUrl) && referenceImageUrls.length < 14) {
            referenceImageUrls.push(faceUrl);
          }
        }
        if (rawBg) {
          const bgUrl = await ImageGenerationService.ensurePublicFalImageUrl(rawBg, activeFalKey);
          if (bgUrl && !referenceImageUrls.includes(bgUrl) && referenceImageUrls.length < 14) {
            referenceImageUrls.push(bgUrl);
          }
        }
      }
    } else {
      // ANIMATION & EDUCATIONAL STUDIO:
      const sceneChar = (scene as any).characterImageUrl 
        || (scene as any).characterReferenceUrl 
        || (scene as any).characterProfile?.referenceImageUrl
        || scene.metadata?.characterImageUrl
        || scene.metadata?.characterReferenceUrl;

      const registeredChars = (animationConfig as any)?.characters || (animationConfig as any)?.characterProfiles;
      const sceneCharNames: string[] = (scene as any).characters || ((scene as any).characterName ? [(scene as any).characterName] : []);

      const rawCharList: string[] = [];
      if (Array.isArray(registeredChars) && registeredChars.length > 0 && sceneCharNames.length > 0) {
        for (const charObj of registeredChars) {
          const isFeatured = sceneCharNames.some(n => 
            n && charObj.name && (n.toLowerCase().includes(charObj.name.toLowerCase()) || charObj.name.toLowerCase().includes(n.toLowerCase()))
          );
          if (isFeatured) {
            const ref = charObj.referenceImageUrl || charObj.imageUrl || charObj.characterImageUrl;
            if (ref && !rawCharList.includes(ref)) rawCharList.push(ref);
          }
        }
      } else if (sceneChar) {
        rawCharList.push(sceneChar);
      } else {
        const rawChar = masterCharacterImageUrl 
          || characterProfile?.referenceImageUrl 
          || (Array.isArray(characterProfile?.referenceImageUrls) && characterProfile.referenceImageUrls[0]);
        if (rawChar) rawCharList.push(rawChar);
      }

      if (isGoogleEngine) {
        for (const cImg of rawCharList) {
          const part = await loadAsBase64Part(cImg);
          if (part && localGeminiParts.length < 4) localGeminiParts.push(part);
        }
      } else if (isFalEngine) {
        for (const cImg of rawCharList) {
          const charUrl = await ImageGenerationService.ensurePublicFalImageUrl(cImg, activeFalKey);
          if (charUrl && !referenceImageUrls.includes(charUrl) && referenceImageUrls.length < 14) {
            referenceImageUrls.push(charUrl);
          }
        }
      }
    }

    referenceImageUrls = sanitizeReferenceImageUrls(referenceImageUrls);

    let falQuotaErrorOccurred = false;
    let falQuotaErrorMessage = '';
    let lastFalError = '';
    let lastGeminiError = '';
    let lastGptError = '';

    // -----------------------------------------------------------------------
    // Engine 1: Fal.ai Engine (Executed ONLY when user selects Fal.ai / Standard / Precision / Draft)
    // -----------------------------------------------------------------------
    const runFalImage = async (): Promise<string | null> => {
      const falApiKey = keyRotator.getNextFalKey();
      if (!falApiKey) {
        falQuotaErrorOccurred = true;
        falQuotaErrorMessage = 'Kunci API Fal.ai belum dikonfigurasi di server.';
        return null;
      }

      const selectedTier = (rawEngine === 'draft' || rawEngine === 'precision' || rawEngine === 'standard') ? rawEngine : undefined;
      const isDraftMode = selectedTier === 'draft' || rawEngine === 'flux-diffusion' || rawEngine === 'fal-ai/flux/schnell';
      const effectiveRefImages = isDraftMode ? [] : referenceImageUrls;

      const targetModelDef = getFalImageModelForStudio(videoType, {
        isSubsequentScene: sceneIndex > 0,
        hasReferenceImages: effectiveRefImages.length > 0,
        tier: selectedTier,
        forceModelId: rawEngine.startsWith('fal-ai/') ? rawEngine : undefined
      });

      console.log(`[Fal.ai Engine] Studio [${videoType}] -> Selected Model: ${targetModelDef.id} (Tier: ${selectedTier || 'default'}, Ref Images: ${effectiveRefImages.length})`);
      if (onLog) onLog(`Routing Scene ${sceneIndex + 1} ke fal.ai [${targetModelDef.id}] (Ref Images: ${effectiveRefImages.length})...`, 'INFO');

      const modelPath = targetModelDef.id;
      try {
        const payload = buildFalImagePayload(modelPath, {
          prompt: finalPrompt,
          imageUrls: (modelPath.includes('/edit') && effectiveRefImages.length > 0) ? effectiveRefImages : undefined,
          aspectRatio: cleanAspect,
          resolution: resolution as any,
          safetyTolerance: videoType === 'AFFILIATE' ? '6' : '5'
        });

        const isHighResQueue = resolution === '4K' || resolution === '2K';
        const startTime = Date.now();

        if (isHighResQueue) {
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

            if (queueRes.status === 401 || queueRes.status === 403) {
              falQuotaErrorOccurred = true;
              falQuotaErrorMessage = `Saldo token API Fal.ai habis atau akses ditolak (${parsedDetail})`;
              keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP ${queueRes.status}: ${parsedDetail}`));
            } else if (queueRes.status === 402) {
              falQuotaErrorOccurred = true;
              falQuotaErrorMessage = `Saldo token API Fal.ai habis (HTTP 402 Payment Required).`;
              keyRotator.reportKeyError('fal', falApiKey, new Error(`HTTP 402 Payment Required`));
            }
            lastFalError = `HTTP ${queueRes.status}: ${parsedDetail}`;
            return null;
          }

          const queueJson: any = await queueRes.json();
          const requestId = queueJson.request_id;
          const statusUrl = queueJson.status_url || `https://queue.fal.run/${modelPath}/requests/${requestId}/status`;
          const responseUrl = queueJson.response_url || `https://queue.fal.run/${modelPath}/requests/${requestId}`;

          let completedJson: any = null;
          const maxPollTimeMs = 180000;
          const pollIntervalMs = 2500;

          while (Date.now() - startTime < maxPollTimeMs) {
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
            const pollRes = await fetch(statusUrl, {
              headers: { 'Authorization': `Key ${falApiKey.trim()}` }
            });

            if (pollRes.ok) {
              const pollJson: any = await pollRes.json();
              const queueStatus = (pollJson.status || '').toUpperCase();
              if (queueStatus === 'COMPLETED') {
                const finalRes = await fetch(responseUrl, {
                  headers: { 'Authorization': `Key ${falApiKey.trim()}` }
                });
                completedJson = finalRes.ok ? await finalRes.json() : pollJson;
                break;
              } else if (queueStatus === 'FAILED') {
                lastFalError = JSON.stringify(pollJson.error || pollJson.logs || 'Queue task failed');
                return null;
              }
            }
          }

          const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
          if (!completedJson) {
            lastFalError = `Queue polling timeout after ${durationSec}s`;
            return null;
          }

          const imageUrl = completedJson?.images?.[0]?.url || completedJson?.images?.[0]?.image?.url || completedJson?.image?.url || completedJson?.output?.[0];
          if (imageUrl) {
            if (onLog) onLog(`Keyframe ${resolution} Adegan ${sceneIndex + 1} berhasil digenerate [${modelPath}] (${durationSec}s)`, 'SUCCESS');
            return imageUrl;
          }
        } else {
          // DIRECT SYNC MODE
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
            const imageUrl = json?.images?.[0]?.url || json?.images?.[0]?.image?.url || json?.image?.url || json?.output?.[0];
            if (imageUrl) {
              const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
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

            if (res.status === 401 || res.status === 403) {
              falQuotaErrorOccurred = true;
              falQuotaErrorMessage = `Saldo token API Fal.ai habis atau akses ditolak (${parsedErr})`;
            } else if (res.status === 402) {
              falQuotaErrorOccurred = true;
              falQuotaErrorMessage = `Saldo token API Fal.ai habis (HTTP 402 Payment Required).`;
            }
            lastFalError = `HTTP ${res.status}: ${parsedErr}`;
          }
        }
      } catch (falErr: any) {
        lastFalError = falErr?.message || String(falErr);
        keyRotator.reportKeyError('fal', falApiKey, falErr);
      }
      return null;
    };

    // -----------------------------------------------------------------------
    // Engine 2: Google Gemini Banana / Nano Asli Engine (Executed ONLY when user selects Nano Asli)
    // -----------------------------------------------------------------------
    const runGeminiBanana = async (): Promise<string | null> => {
      const bananaConfig = FounderService.getGeminiBananaConfig();
      const customKey = bananaConfig.apiKey;

      let candidateModels = ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001', 'gemini-2.5-flash'];

      if (rawEngine === 'nano-asli-lite') {
        candidateModels = ['imagen-3.0-fast-generate-001', 'imagen-3.0-generate-002', 'gemini-2.5-flash'];
      } else if (rawEngine === 'nano-asli-pro' || rawEngine.includes('pro')) {
        candidateModels = ['imagen-3.0-generate-002', 'gemini-2.5-flash', 'gemini-2.5-pro'];
      } else if (rawEngine === 'nano-asli-premium' || rawEngine === 'nano-asli-ultra' || rawEngine.includes('imagen')) {
        candidateModels = ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001'];
      }

      const uniqueBananaModels = Array.from(new Set(candidateModels));

      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let apiKey = (attempt === 0 && customKey) ? customKey : keyRotator.getNextGeminiKey();
        
        // Loop up to 5 times to find a valid key, skipping bad formats
        let formatRetries = 0;
        while (apiKey && formatRetries < 5 && (apiKey.startsWith('AQ.') || apiKey.startsWith('fal_') || (apiKey.includes(':') && !apiKey.startsWith('AIza')))) {
          console.warn(`[runGeminiBanana] Ignored Fal format key in Gemini request: ${apiKey.substring(0, 8)}...`);
          keyRotator.removeKey('gemini', apiKey);
          apiKey = keyRotator.getNextGeminiKey();
          formatRetries++;
        }

        if (!apiKey || apiKey.startsWith('AQ.') || apiKey.startsWith('fal_')) {
          lastGeminiError = 'API Key Google Gemini resmi belum dikonfigurasi atau tidak valid di server. Mohon isi API Key Gemini yang benar (AIza...).';
          return null;
        }

        const keySourceName = (attempt === 0 && customKey) ? 'FounderService.customGeminiBananaConfig' : 'KeyRotator.GeminiPool';
        const vRes = validateCredentialFormat('gemini', apiKey, keySourceName);
        if (!vRes.valid) {
          logCredentialAudit('gemini', keySourceName, apiKey, 'GENERATE_KEYFRAME', 'BLOCKED', vRes.reason);
          lastGeminiError = vRes.reason || 'Invalid credential format';
          continue;
        }

        logCredentialAudit('gemini', keySourceName, apiKey, 'GENERATE_KEYFRAME', 'SUCCESS');
        let keyAuthFailed = false;

        for (const modelName of uniqueBananaModels) {
          if (keyAuthFailed) break;

          console.log(`[Google Gemini Nano Asli Engine] Attempting keyframe generation for Scene ${sceneIndex + 1} with ${modelName}...`);
          if (onLog) onLog(`Generating keyframe Adegan ${sceneIndex + 1} dengan Google Nano Asli [${modelName}]...`, 'INFO');

          try {
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                }
              }
            });

            if (modelName.startsWith('imagen-')) {
              const imgRes = await ai.models.generateImages({
                model: modelName as any,
                prompt: finalPrompt,
                config: {
                  numberOfImages: 1,
                  aspectRatio: (cleanAspect === '9:16' ? '9:16' : (cleanAspect === '16:9' ? '16:9' : '1:1')) as any
                }
              });

              if (imgRes.generatedImages?.[0]?.image?.imageBytes) {
                if (onLog) onLog(`Keyframe Adegan ${sceneIndex + 1} berhasil digenerate via Google ${modelName}!`, 'SUCCESS');
                return `data:image/png;base64,${imgRes.generatedImages[0].image.imageBytes}`;
              }
            } else {
              // Multimodal content parts (Reference Images + Prompt)
              const parts: any[] = [...localGeminiParts, { text: finalPrompt }];
              const imageConfig: any = {
                aspectRatio: (cleanAspect === '9:16' ? '9:16' : (cleanAspect === '16:9' ? '16:9' : '1:1')) as any
              };
              if (resolution === '4K' || resolution === '2K') {
                imageConfig.imageSize = '2K';
              }

              const response = await ai.models.generateContent({
                model: modelName,
                contents: { parts },
                config: { imageConfig }
              });

              if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                  if (part.inlineData && part.inlineData.data) {
                    if (onLog) onLog(`Keyframe Adegan ${sceneIndex + 1} berhasil digenerate via Google Nano Asli [${modelName}]!`, 'SUCCESS');
                    return `data:image/png;base64,${part.inlineData.data}`;
                  }
                }
              }
            }
          } catch (sdkErr: any) {
            const msg = sdkErr?.message || String(sdkErr);
            console.log(`[Google Gemini Nano Asli] Model ${modelName} error on key: ${msg}`);
            lastGeminiError = msg;
            keyRotator.reportKeyError('gemini', apiKey, sdkErr);

            const isAuthErr = msg.toLowerCase().includes('api_key_invalid') ||
                              msg.toLowerCase().includes('invalid api key') ||
                              msg.includes('401') || msg.includes('403') ||
                              msg.toLowerCase().includes('unauthenticated');
            if (isAuthErr) {
              keyAuthFailed = true;
            }
          }
        }
      }
      return null;
    };

    // -----------------------------------------------------------------------
    // Engine 3: OpenAI ChatGPT Image 2 (Executed ONLY when user selects OpenAI)
    // -----------------------------------------------------------------------
    const runGptImage2 = async (): Promise<string | null> => {
      const gptConfig = FounderService.getGptImage2Config();
      const apiKey = gptConfig.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        lastGptError = 'OpenAI API Key belum dikonfigurasi di server.';
        return null;
      }

      try {
        let customBaseURL = gptConfig.endpoint ? gptConfig.endpoint.trim() : undefined;
        if (customBaseURL) {
          customBaseURL = customBaseURL.replace(/\/images\/generations\/?$/, '').replace(/\/+$/, '');
          if (customBaseURL.includes('api.openai.com/v1')) customBaseURL = undefined;
        }

        const openai = new OpenAI({ apiKey, baseURL: customBaseURL });
        const targetModel = gptConfig.model || 'dall-e-3';

        if (onLog) onLog(`Generating keyframe Adegan ${sceneIndex + 1} dengan OpenAI [${targetModel}]...`, 'INFO');

        const response = await openai.images.generate({
          model: targetModel as any,
          prompt: finalPrompt.substring(0, 1000),
          n: 1,
          size: cleanAspect === '9:16' ? "1024x1792" : "1792x1024"
        });

        if (response?.data && response.data[0]?.url) {
          if (onLog) onLog(`Keyframe Adegan ${sceneIndex + 1} berhasil digenerate via OpenAI [${targetModel}]!`, 'SUCCESS');
          return response.data[0].url;
        }
      } catch (openAiErr: any) {
        lastGptError = openAiErr?.message || String(openAiErr);
      }
      return null;
    };

    // -----------------------------------------------------------------------
    // STRICT ENGINE DISPATCH: Respect User Selection without Cross-Provider Fallback
    // -----------------------------------------------------------------------
    if (isGoogleEngine) {
      const bananaResult = await runGeminiBanana();
      if (bananaResult) return bananaResult;
      const errMsg = `[NANO_ASLI_ERROR] Gagal generate gambar dengan model Google Nano Asli / Gemini. Token API server pusat Google mengalami kendala atau habis kuota. Detail: ${lastGeminiError || 'API token error'}`;
      if (onLog) onLog(`[ERROR] ${errMsg}`, 'ERROR');
      throw new Error(errMsg);
    } else if (isOpenAiEngine) {
      const gptResult = await runGptImage2();
      if (gptResult) return gptResult;
      const errMsg = `[OPENAI_ERROR] Gagal generate gambar dengan model OpenAI / ChatGPT Image 2. Token API server pusat OpenAI bermasalah. Detail: ${lastGptError || 'API key error'}`;
      if (onLog) onLog(`[ERROR] ${errMsg}`, 'ERROR');
      throw new Error(errMsg);
    } else {
      // Fal.ai Engine Route
      const falResult = await runFalImage();
      if (falResult) return falResult;
      const errMsg = `[NANO_QUOTA_EXHAUSTED] Gagal generate gambar dengan model Fal.ai (${rawEngine}). Token / saldo API server pusat Fal.ai habis. Detail: ${falQuotaErrorMessage || lastFalError || 'Saldo habis (402/403)'}`;
      if (onLog) onLog(`[ERROR] ${errMsg}`, 'ERROR');
      throw new Error(errMsg);
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
