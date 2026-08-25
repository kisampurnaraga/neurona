import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import fetch from "node-fetch";
import { CharacterProfile, Scene, VideoType } from "../src/shared/types";
import { FounderService } from "../src/server/fcc/FounderService";

export class ImageGenerationService {
  public static readonly ACTIVE_MODEL = "ChatGPT Image 2 (GPT Image 2) / Google Imagen 3 / Flux AI Diffusion";

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

  /**
   * Standardized Product & Character Lock Prompt Assembler (T2I)
   * SUBJECT & ACTION FIRST architecture to guarantee exact scene action and character portrayal.
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

    // 1. Clean & translate scene action
    let sceneActionEn = '';
    if (rawT2I && !rawT2I.toLowerCase().startsWith('character identity locked:') && !rawT2I.toLowerCase().startsWith('product identity locked:')) {
      sceneActionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawT2I);
    } else if (rawVisual) {
      sceneActionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawVisual);
    }

    // 2. Extract explicit product details (for Affiliate mode)
    const productName = affiliateConfig?.productName || '';
    const productVision = affiliateConfig?.productVisualAnalysis || '';
    const cleanProductVision = productVision 
      ? ImageGenerationService.translateAndSanitizeToEnglish(productVision.replace(/^Exact Physical Product Features from Uploaded Photo:\s*/i, '').trim())
      : '';

    // 3. Extract and translate character attributes
    let charSubjectEn = '';
    const charName = characterProfile?.name ? characterProfile.name.replace(/Karakter Utama/gi, 'Protagonist') : '';
    const charOutfit = characterProfile?.outfit ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.outfit) : '';
    const charHair = characterProfile?.hairStyle ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.hairStyle) : '';
    const charFace = characterProfile?.facialFeatures ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.facialFeatures) : '';

    if (charName || charOutfit || charHair) {
      const parts = [
        charName,
        charOutfit ? `wearing ${charOutfit}` : '',
        charHair,
        charFace
      ].filter(Boolean);
      charSubjectEn = parts.join(', ');
    }

    // 4. Extract and translate world setting
    const rawWorld = animationConfig?.worldSetting || educationalConfig?.worldSetting || '';
    const worldEn = rawWorld ? ImageGenerationService.translateAndSanitizeToEnglish(rawWorld) : '';

    // 5. Style & Lighting Modifiers (Full 8 Art Styles Support)
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
      styleSuffix = 'High quality commercial product photography, UGC influencer lifestyle aesthetic, crisp focus, studio lighting';
    } else {
      styleSuffix = 'Cinematic 8k movie still, anamorphic lens flare, master shot, photorealistic';
    }

    // 6. ASSEMBLE SCENE-ACTION & PRODUCT-FIRST PROMPT
    let promptParts: string[] = [];

    if (videoType === 'AFFILIATE') {
      const prodName = productName || 'Commercial Product';
      const prodDesc = cleanProductVision || 'crisp packaging, premium materials, and authentic details';
      
      // Scene Action & Product MUST come first to avoid generating generic model headshots
      if (sceneActionEn) {
        promptParts.push(`Keyframe Scene Action: ${sceneActionEn}`);
      }
      
      promptParts.push(`Featured Product: ${prodName} (${prodDesc}) prominently showcased in sharp focus`);

      if (charSubjectEn) {
        promptParts.push(`Character Interaction: ${charSubjectEn} actively presenting and interacting with the product`);
      }
    } else {
      // ANIMATION & EDUCATIONAL: SUBJECT & SCENE ACTION FRONT AND CENTER
      let coreSubjectAction = '';
      if (sceneActionEn && charSubjectEn) {
        coreSubjectAction = `Dynamic keyframe showing ${sceneActionEn}, featuring ${charSubjectEn}`;
      } else if (sceneActionEn) {
        coreSubjectAction = `Dynamic keyframe showing ${sceneActionEn}`;
      } else if (charSubjectEn) {
        coreSubjectAction = `Dynamic keyframe of ${charSubjectEn}`;
      } else {
        coreSubjectAction = 'Cinematic keyframe composition';
      }
      promptParts.push(coreSubjectAction);

      if (worldEn) {
        promptParts.push(`in ${worldEn}`);
      }
    }

    promptParts.push(styleSuffix);
    promptParts.push('cinematic composition, crisp focus, 8k resolution');

    const seed = (characterProfile?.styleSeed || 8849201) + (sceneIndex * 317);
    return `${promptParts.join(', ')} --seed ${seed}`;
  }

  /**
   * Standardized Product & Character Lock Video Motion Prompt Assembler (I2V)
   * Ensures motion prompts for Runway/Sora/Veo explicitly lock character consistency in English.
   */
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

    const rawI2V = (scene.promptImageToVideo || '').trim();
    const rawVisual = (scene.visualDirection || '').trim();

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
    if (rawI2V && !rawI2V.toLowerCase().startsWith('character identity locked:') && !rawI2V.toLowerCase().startsWith('product identity locked:')) {
      motionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawI2V);
    } else if (rawVisual) {
      motionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawVisual);
    }

    const arTag = (videoType === 'AFFILIATE' || animationConfig?.aspectRatio === '9:16' || educationalConfig?.aspectRatio === '9:16') ? '--ar 9:16' : '--ar 16:9';

    if (videoType === 'AFFILIATE') {
      const prodName = affiliateConfig?.productName || 'Product';
      const prodDesc = affiliateConfig?.productVisualAnalysis ? ImageGenerationService.translateAndSanitizeToEnglish(affiliateConfig.productVisualAnalysis) : 'authentic details';
      if (!motionEn) {
        motionEn = `The character is actively interacting with, showing, and holding the ${prodName}, cinematic product showcase, fluid physics, realistic lighting, 4k 60fps`;
      }
      const charBlock = charAnchor || `${charName} ${charOutfit ? `(${charOutfit})` : ''}`;
      return `Product Lock & Character Consistency: ${charBlock} is physically holding, demonstrating and interacting with ${prodName} (${prodDesc}). Action: ${motionEn} ${arTag}`;
    }

    if (!motionEn) {
      motionEn = `Smooth dynamic cinematic camera motion tracking ${charName} in ${worldEn || 'environment'}, fluid physics, realistic lighting, 4k 60fps`;
    }

    const charBlock = charAnchor || `${charName} ${charOutfit ? `(${charOutfit})` : ''}`;
    return `Character locked: ${charBlock}. Environment: ${worldEn || 'consistent setting'}. Motion: ${motionEn} ${arTag}`;
  }

  /**
   * Generates a genuine AI keyframe image tailored to the scene's prompt, product context & character.
   * Supports ChatGPT Image 2 (DALL-E 3) / Google Imagen 3 / Flux AI Real Diffusion Engine.
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
    forceRegenerate?: boolean;
  }): Promise<string> {
    const { scene, sceneIndex, videoType, characterProfile, artStyle, affiliateConfig, animationConfig, educationalConfig, engine, forceRegenerate } = params;

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

    const rawEngine = (engine || FounderService.getImageEngine() || 'chatgpt-image-2').toLowerCase();
    let preferredEngine = 'flux-diffusion';
    if (rawEngine.includes('gemini') || rawEngine.includes('imagen') || rawEngine.includes('banana')) {
      preferredEngine = 'gemini-imagen-3';
    } else if (rawEngine.includes('chatgpt') || rawEngine.includes('dall-e') || rawEngine.includes('openai') || rawEngine.includes('gpt')) {
      preferredEngine = 'chatgpt-image-2';
    } else {
      preferredEngine = 'flux-diffusion';
    }

    // -----------------------------------------------------------------------
    // Engine 1: OpenAI ChatGPT Image 2 (DALL-E 3 / DALL-E 2)
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
                size: "1024x1024"
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
              size: m === 'dall-e-2' ? "512x512" : "1024x1024"
            });

            if (response?.data && response.data[0]?.url) {
              console.log(`[ChatGPT Image 2 Engine] Successfully generated image with ${m} for Scene ${sceneIndex + 1}!`);
              return response.data[0].url;
            }
          } catch (modelErr: any) {
            const msg = modelErr?.message || '';
            if (msg.includes('does not exist') || modelErr?.status === 400 || modelErr?.status === 404) {
              console.log(`[ChatGPT Image 2 Engine] Model '${m}' not available on current key/endpoint. Trying fallback...`);
            } else {
              console.log(`[ChatGPT Image 2 Engine] Notice for model '${m}': ${msg.substring(0, 100)}`);
            }
          }
        }
      } catch (openAiErr: any) {
        console.log(`[ChatGPT Image 2 Engine] Service unavailable, initiating seamless failover...`);
      }
      return null;
    };

    // -----------------------------------------------------------------------
    // Engine 2: Google Gemini Banana / Google AI Studio Imagen 3 Engine
    // -----------------------------------------------------------------------
    const runGeminiBanana = async (): Promise<string | null> => {
      const bananaConfig = FounderService.getGeminiBananaConfig();
      const apiKey = bananaConfig.apiKey || (process.env.GEMINI_MANUAL_API_KEY || process.env.GEMINI_API_KEY);
      if (!apiKey) {
        console.log(`[Google Gemini Banana Engine] API Key not configured. Skipping to next engine...`);
        return null;
      }

      const candidateModels = [
        bananaConfig.model || 'imagen-3.0-generate-002',
        'imagen-3.0-generate-002',
        'imagen-3.0-generate-001'
      ];
      const uniqueBananaModels = Array.from(new Set(candidateModels));

      for (const modelName of uniqueBananaModels) {
        console.log(`[Google Gemini Banana Engine] Attempting keyframe generation for Scene ${sceneIndex + 1} with ${modelName}...`);

        // Attempt 1: Using @google/genai SDK
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const response = await ai.models.generateImages({
            model: modelName,
            prompt: finalPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: videoType === 'AFFILIATE' ? "9:16" : "16:9"
            }
          });

          if (response.generatedImages && response.generatedImages[0]?.image?.imageBytes) {
            const base64 = response.generatedImages[0].image.imageBytes;
            console.log(`[Google Gemini Banana Engine] Successfully synthesized keyframe via SDK (${modelName})!`);
            return `data:image/jpeg;base64,${base64}`;
          }
        } catch (sdkErr: any) {
          const errMsg = sdkErr?.message || String(sdkErr);
          if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('not supported')) {
            console.log(`[Google Gemini Banana Engine] Model ${modelName} not provisioned on current API tier.`);
          } else {
            console.log(`[Google Gemini Banana Engine] SDK notice for ${modelName}: Failed to authenticate or reach API.`);
          }
        }

        // Attempt 2: Direct REST Endpoint Call
        try {
          const restEndpoint = bananaConfig.endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateImages`;
          const fullUrl = restEndpoint.includes('key=') ? restEndpoint : `${restEndpoint}?key=${apiKey}`;

          const res = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: finalPrompt,
              config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: videoType === 'AFFILIATE' ? "9:16" : "16:9"
              }
            })
          });

          if (res.ok) {
            const json: any = await res.json();
            const bytes = json?.generatedImages?.[0]?.image?.imageBytes;
            if (bytes) {
              console.log(`[Google Gemini Banana Engine] Successfully generated keyframe via REST endpoint (${modelName})!`);
              return `data:image/jpeg;base64,${bytes}`;
            }
          } else {
            console.log(`[Google Gemini Banana Engine] REST endpoint returned status ${res.status} for ${modelName}.`);
          }
        } catch (restErr: any) {
          console.log(`[Google Gemini Banana Engine] REST notice: Failed to authenticate or reach API.`);
        }
      }

      return null;
    };

    // -----------------------------------------------------------------------
    // Engine 3: Flux AI Ultra-High-Definition Diffusion (Fail-safe)
    // -----------------------------------------------------------------------
    const runFluxDiffusion = async (): Promise<string> => {
      try {
        console.log(`[Flux AI Engine] Synthesizing 8K visual keyframe for Scene ${sceneIndex + 1}...`);
        const sanitizedPrompt = encodeURIComponent(finalPrompt.substring(0, 1500));
        const seed = (characterProfile?.styleSeed || 582910) + (sceneIndex * 379);
        const isPortrait = videoType === 'AFFILIATE';
        const width = isPortrait ? 768 : 1024;
        const height = isPortrait ? 1024 : 576;
        
        const candidateUrls = [
          `https://image.pollinations.ai/prompt/${sanitizedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`,
          `https://image.pollinations.ai/prompt/${sanitizedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`
        ];
        
        for (const realImageUrl of candidateUrls) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);
            
            const res = await fetch(realImageUrl, { signal: controller.signal as any });
            clearTimeout(timeoutId);

            if (res.ok) {
              const buffer = await res.buffer();
              if (buffer && buffer.length > 5000) {
                const base64 = buffer.toString('base64');
                const contentType = res.headers.get('content-type') || 'image/jpeg';
                console.log(`[Flux AI Engine] Successfully rendered 8K keyframe buffer for Scene ${sceneIndex + 1}!`);
                return `data:${contentType};base64,${base64}`;
              }
            }
          } catch (e: any) {
            console.log(`[Flux AI Engine] Pollinations fetch notice: ${e.message}`);
          }
        }
        
        // Return direct URL as last-resort visual asset
        return candidateUrls[0];
      } catch (err: any) {
        console.log(`[Flux AI Engine] Error generating keyframe: ${err.message}`);
        throw err;
      }
    };

    // Primary & Fallback Engine Execution Flow
    if (preferredEngine === 'chatgpt-image-2') {
      const gptResult = await runGptImage2();
      if (gptResult) return gptResult;
      const bananaResult = await runGeminiBanana();
      if (bananaResult) return bananaResult;
      return await runFluxDiffusion();
    } else if (preferredEngine === 'gemini-imagen-3' || preferredEngine === 'gemini-banana') {
      const bananaResult = await runGeminiBanana();
      if (bananaResult) return bananaResult;
      const gptResult = await runGptImage2();
      if (gptResult) return gptResult;
      return await runFluxDiffusion();
    } else {
      // Default / Flux Direct
      return await runFluxDiffusion();
    }
  }
}
