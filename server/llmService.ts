import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { FounderService } from "../src/server/fcc/FounderService";
import { CinematicStyleLibrary } from "./StyleLibrary";
import { keyRotator } from "./keyRotator";

export function stripBase64FromText(text: string | undefined | null): string {
  if (!text) return '';
  let cleaned = text.replace(/data:([a-zA-Z0-9+\/.-]+);base64,[A-Za-z0-9+/=]+/g, '[BASE64_IMAGE_DATA_TRUNCATED]');
  cleaned = cleaned.replace(/data:([a-zA-Z0-9+\/.-]+);[^\s'"]+/g, '[BASE64_IMAGE_DATA_TRUNCATED]');
  cleaned = cleaned.replace(/(?:[A-Za-z0-9+/]{4}){25,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g, '[RAW_BASE64_DATA_TRUNCATED]');
  return cleaned;
}

export interface LLMGenerationResult<T = any> {
  data: T;
  rawText: string;
  modelUsed: string;
  provider: 'gemini' | 'openai' | 'procedural';
  fallbackTriggered?: boolean;
}

let openAIClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const key = keyRotator.getNextOpenAIKey() || process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function getGenAI(): GoogleGenAI | null {
  const key = keyRotator.getNextGeminiKey();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

export function getPreferredLLMProvider(): 'gemini' | 'openai' | 'anthropic' | 'auto' {
  const active = FounderService.getLlmEngine()?.toLowerCase().trim() || process.env.LLM_ENGINE?.toLowerCase().trim();
  if (active?.includes('anthropic') || active?.includes('claude')) return 'anthropic';
  if (active?.includes('openai') || active?.includes('gpt')) return 'openai';
  if (active?.includes('gemini')) return 'gemini';
  
  const pref = (process.env.LLM_PROVIDER || 'auto').toLowerCase().trim();
  if (pref === 'openai') return 'openai';
  if (pref === 'gemini') return 'gemini';
  return 'auto';
}

export function getActiveGeminiModel(): string {
  const engine = FounderService.getLlmEngine()?.toLowerCase() || '';
  if (engine.includes('pro')) return 'gemini-3.1-pro-preview';
  if (engine.includes('flash')) return 'gemini-3.6-flash';
  return 'gemini-3.6-flash';
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

// Utility helper to prevent API hangs with strict timeout
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 14000, taskName: string = 'AI Request'): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${taskName} timed out after ${timeoutMs / 1000}s`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export class LLMService {
  static async analyzeIntent(prompt: string): Promise<LLMGenerationResult<any>> {
    const systemInstruction = `Kamu adalah Openclauw, Core Router Logic untuk platform video AI Neuronna.
Sistem ini menggunakan Arsitektur Dua Fase (Two-Step Pipeline): 
Fase 1: Pembuatan/Revisi Storyboard (Gratis).
Fase 2: Rendering Video Aktual ke Engine API (Berbayar memotong kredit).

Tugasmu adalah menganalisis niat (intent) dari chat pengguna dan mengklasifikasikannya ke dalam salah satu dari tiga 'action' di bawah ini, lalu meng-outputkan JSON murni.

ATURAN KLASIFIKASI ACTION:
1. "generate_storyboard": Jika pengguna meminta ide baru, membuat naskah, konsep, atau script dari awal. (Fase 1)
2. "edit_storyboard": Jika pengguna meminta perubahan pada storyboard yang sudah ada di layar (misal: "ganti teks adegan 1", "bikin durasinya jadi 3 detik"). (Fase 1)
3. "execute_render": Jika pengguna secara eksplisit mengonfirmasi bahwa mereka puas dengan storyboard dan meminta untuk merendernya menjadi video final (misal: "Oke, render sekarang", "Bagus, eksekusi videonya", "Jadikan video"). (Fase 2)

ATURAN VIDEO_TYPE & STYLE:
- "affiliate": Jika niatnya berjualan/promosi produk komersial.
- "content": Jika niatnya edukasi, hiburan, atau animasi. Wajib sertakan "style_id" (misal: cinematic_film, pixar_3d, dll).

FORMAT OUTPUT (HANYA JSON):
{
  "action": "generate_storyboard" | "edit_storyboard" | "execute_render",
  "video_type": "affiliate" | "content",
  "style_id": "id_style_terpilih" | null,
  "parameters": {},
  "router_message": "Pesan singkat untuk UI"
}`;
    
    const genAI = getGenAI();
    if (genAI) {
      try {
        const response = await withTimeout(
          genAI.models.generateContent({
            model: getActiveGeminiModel(),
            contents: prompt,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              temperature: 0.2
            }
          }),
          10000,
          'Openclauw Intent Analysis'
        );
        const rawText = response.text || "{}";
        return {
          data: JSON.parse(rawText),
          rawText,
          modelUsed: getActiveGeminiModel(),
          provider: "gemini"
        };
      } catch (err) {
        console.warn("Openclauw Gemini Error:", err);
      }
    }
    return { data: { action: "generate_storyboard", video_type: "content", style_id: "cinematic_film" }, rawText: "", modelUsed: "fallback", provider: "procedural" };
  }

  /**
   * Generates Creative Brief using Gemini, falling back to OpenAI ChatGPT 4.0 (or vice-versa).
   */
  static async generateBrief(params: {
    prompt: string;
    videoType: string;
    config?: any;
    onLog?: (source: string, msg: string, level?: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR') => void;
  }): Promise<LLMGenerationResult<{ title: string; brief: string }>> {
    const { prompt, videoType, config, onLog } = params;
    let pref = getPreferredLLMProvider();
    if (pref === 'anthropic') {
       console.log('[LLMService] Claude 3.5 Sonnet requested. Routing to Gemini for now as Anthropic SDK is not fully wired.');
       pref = 'gemini';
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = keyRotator.getNextGeminiKey();
    const openAIModel = getOpenAIModel();

    let systemInstruction = "";
    if (videoType === 'ANIMATION') {
      const anim = config || {};
      systemInstruction = `You are NEURONA Animation Director & World Architect.
Video Type: ANIMATION.
Art Style: ${anim.artStyle || '3D_PIXAR'}.
Language: ${anim.language || 'id'}.
Genre: ${anim.targetGenre || 'ADVENTURE'}.
Character: ${anim.characterDescription || 'Expressive animated hero'}.
World Setting: ${anim.worldSetting || 'Rich dynamic stylized environment'}.
Tone: ${anim.voiceTone || 'CHEERFUL'}.
Create an imaginative, captivating animation story brief with strong emotional arc, visual grandeur, and distinct character movements.`;
    } else if (videoType === 'EDUCATIONAL') {
      const edu = config || {};
      systemInstruction = `You are NEURONA Master Pedagogy & Explainer Director.
Video Type: EDUCATIONAL / EXPLAINER.
Subject: ${edu.subjectTitle || prompt}.
Visual Style: ${edu.visualStyle || 'MOTION_GRAPHICS_2D'}.
Language: ${edu.language || 'id'}.
Key Takeaways: ${edu.keyTakeaways || 'Clear understanding of core concepts'}.
Structure a crystal-clear educational lesson with visual analogies and clear explanations.`;
    } else if (videoType === 'AFFILIATE') {
      const aff = config || {};
      systemInstruction = `You are NEURONA Creative Strategist specializing in high-converting viral Affiliate Videos (TikTok Shop, Shopee Video, Instagram Reels).
Product: ${aff.productName || prompt}.
Key Benefits: ${aff.keyBenefits || 'High quality & affordable'}.
Promo: ${aff.pricePromo || 'Diskon Terbatas & Gratis Ongkir'}.
CTA: ${aff.callToAction || 'Klik keranjang kuning di kiri bawah'}.
Hook Style: ${aff.hookStyle || 'PAIN_POINT'}.
Craft a high-converting affiliate video brief focusing on scroll-stopping hook, product demo, and buying urgency.`;
    } else {
      systemInstruction = `You are NEURONA Creative Strategist. Create a brief for a cinematic video production: "${prompt}".`;
    }

    const userPrompt = `User prompt: "${prompt}". Return JSON object with 'title' (string, creative video title) and 'brief' (1 concise paragraph in Indonesian summarizing video narrative direction, visual tone, and storytelling arc).`;

    // Decision: If preference is OpenAI or Gemini key is missing and OpenAI key is present -> run OpenAI first
    if ((pref === 'openai' || !geminiKey) && openaiKey) {
      try {
        const client = getOpenAIClient();
        if (client) {
          onLog?.('BATARA', `TASKING AI MODEL -> OpenAI ChatGPT 4.0 (${openAIModel})`, 'INFO');
          const response = await withTimeout(
            client.chat.completions.create({
              model: openAIModel,
              messages: [
                { role: "system", content: systemInstruction + "\nYou must respond with valid JSON containing 'title' and 'brief'." },
                { role: "user", content: userPrompt }
              ],
              response_format: { type: "json_object" },
              temperature: 0.7
            }),
            12000,
            'OpenAI Brief Generator'
          );

          const rawText = response.choices[0]?.message?.content || "{}";
          const data = JSON.parse(rawText);
          return {
            data: {
              title: data.title || prompt.substring(0, 30),
              brief: data.brief || ""
            },
            rawText,
            modelUsed: `OpenAI ${openAIModel}`,
            provider: 'openai'
          };
        }
      } catch (openAiErr: any) {
        onLog?.('BATARA', `OpenAI API call failed: ${openAiErr.message}. Checking fallbacks...`, 'WARN');
      }
    }

    // Try Gemini First (Default)
    const genAI = getGenAI();
    if (genAI) {
      try {
        onLog?.('BATARA', `TASKING AI MODEL -> Google Gemini 3.7 Flash`, 'INFO');
        const response = await withTimeout(
          genAI.models.generateContent({
            model: getActiveGeminiModel(),
            contents: `${systemInstruction}\n${userPrompt}`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  brief: { type: Type.STRING }
                },
                required: ["title", "brief"]
              }
            }
          }),
          12000,
          'Gemini Brief Generator'
        );

        const rawText = response.text || "{}";
        const data = JSON.parse(rawText);
        return {
          data: {
            title: data.title || prompt.substring(0, 30),
            brief: data.brief || ""
          },
          rawText,
          modelUsed: "Google Gemini 3.7 Flash",
          provider: 'gemini'
        };
      } catch (geminiErr: any) {
        const errMsg = (geminiErr?.message || String(geminiErr)).toLowerCase();
        const isQuota = errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('resource_exhausted') || errMsg.includes('limit');
        
        onLog?.('BATARA', isQuota 
          ? `⚠️ Kuota Gemini habis / batas rate limit tercapai. Mengaktifkan fallback ke OpenAI ChatGPT 4.0 (${openAIModel})...` 
          : `Gemini Error: ${geminiErr.message}. Beralih ke fallback OpenAI...`, 
          'WARN'
        );

        // Fallback to OpenAI ChatGPT 4.0 if key exists
        if (openaiKey) {
          try {
            const client = getOpenAIClient();
            if (client) {
              const response = await client.chat.completions.create({
                model: openAIModel,
                messages: [
                  { role: "system", content: systemInstruction + "\nYou must respond with valid JSON containing 'title' and 'brief'." },
                  { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7
              });

              const rawText = response.choices[0]?.message?.content || "{}";
              const data = JSON.parse(rawText);
              return {
                data: {
                  title: data.title || prompt.substring(0, 30),
                  brief: data.brief || ""
                },
                rawText,
                modelUsed: `OpenAI ChatGPT 4.0 (${openAIModel}) [Fallback]`,
                provider: 'openai',
                fallbackTriggered: true
              };
            }
          } catch (openAiFallbackErr: any) {
            onLog?.('BATARA', `OpenAI fallback error: ${openAiFallbackErr.message}`, 'WARN');
          }
        }
      }
    }

    // Procedural Fallback if both LLMs are unavailable
    return {
      data: {
        title: prompt.substring(0, 30) || "Produksi Video Sinematik",
        brief: ""
      },
      rawText: "",
      modelUsed: "Procedural Engine (Offline Mode)",
      provider: 'procedural'
    };
  }

  /**
   * Analyzes an uploaded product photo using GPT-4o Vision (or Gemini 2.5 Flash Vision)
   * to extract exact visual attributes (category, colors, pattern, logos, checkmarks/swooshes, material, cuts).
   */
  static async analyzeProductImage(imageUrl: string, onLog?: (source: string, msg: string, level?: any) => void): Promise<string> {
    if (!imageUrl) return '';

    onLog?.('BATARA', `ANALISIS FOTO PRODUK -> Memeriksa logo, warna, corak & detail fisik foto produk unggahan...`, 'INFO');

    let base64Data = '';
    let mimeType = 'image/jpeg';

    try {
      if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        base64Data = parts[1];
      } else if (imageUrl.startsWith('http')) {
        const res = await fetch(imageUrl);
        const buffer = await res.arrayBuffer();
        base64Data = Buffer.from(buffer).toString('base64');
        mimeType = res.headers.get('content-type') || 'image/jpeg';
      }
    } catch (fetchErr: any) {
      onLog?.('BATARA', `Peringatan fetch image buffer untuk produk: ${fetchErr?.message || fetchErr}`, 'WARN');
    }

    const productPrompt = "Analyze this uploaded product photo for AI image and video generation prompts. Provide a concise, highly specific 2-3 sentence visual description starting directly with the exact product type, exact primary color(s) and gradients (e.g. bright crimson red / maroon mesh upper), prominent side logos / swoosh / checkmarks (e.g. bold white checkmark/swoosh logo on side panel), midsole and sole colors (e.g. thick white foam sole with black rubber tread), and materials. Output ONLY the visual description with no introductory phrases like 'Here is' or 'The image shows'.";

    // 1. Try OpenAI GPT-4o Vision first if key available (highest precision for logos, checkmarks & emblems)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const client = getOpenAIClient();
        if (client) {
          const openAIModel = getOpenAIModel() || 'gpt-4o';
          onLog?.('BATARA', `ANALISIS VISUAL GPT-4O -> Memproses logo & detail produk menggunakan ${openAIModel}...`, 'INFO');

          const imgContentUrl = imageUrl.startsWith('data:') 
            ? imageUrl 
            : (imageUrl.startsWith('http') ? imageUrl : `data:${mimeType};base64,${base64Data}`);

          const response = await withTimeout(
            client.chat.completions.create({
              model: openAIModel,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: productPrompt },
                    { type: "image_url", image_url: { url: imgContentUrl } }
                  ]
                }
              ]
            }),
            20000,
            'OpenAI Product Vision Analysis'
          );

          const result = response.choices[0]?.message?.content?.trim();
          if (result) {
            onLog?.('BATARA', `ANALISIS VISUAL FOTO PRODUK SELESAI (OpenAI ${openAIModel}): "${result.substring(0, 100)}..."`, 'SUCCESS');
            return result;
          }
        }
      } catch (openaiErr: any) {
        onLog?.('BATARA', `OpenAI Product Vision notice (${openaiErr?.message || openaiErr}). Mengalihkan ke Gemini Vision...`, 'WARN');
      }
    }

    // 2. Fallback to Gemini 3.7 Flash Vision
    try {
      const genAI = getGenAI();
      if (genAI && base64Data) {
        const response = await withTimeout(
          genAI.models.generateContent({
            model: getActiveGeminiModel(),
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              },
              productPrompt
            ]
          }),
          15000,
          'Gemini Product Vision Analysis'
        );
        const result = response.text?.trim();
        if (result) {
          onLog?.('BATARA', `ANALISIS VISUAL FOTO PRODUK SELESAI (Gemini 3.7 Flash): "${result.substring(0, 100)}..."`, 'SUCCESS');
          return result;
        }
      }
    } catch (geminiErr: any) {
      onLog?.('BATARA', `Gemini Vision error: ${geminiErr?.message || geminiErr}`, 'WARN');
    }

    return '';
  }

  /**
   * Analyzes an uploaded character photo using GPT-4o Vision (or Gemini 2.5 Flash Vision)
   */
  static async analyzeCharacterImage(imageUrl: string, onLog?: (source: string, msg: string, level?: any) => void): Promise<string> {
    if (!imageUrl) return '';

    onLog?.('BATARA', `ANALISIS FOTO KARAKTER -> Memeriksa ciri visual wajah, rambut & fitur fisik karakter...`, 'INFO');

    let base64Data = '';
    let mimeType = 'image/jpeg';

    try {
      if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        base64Data = parts[1];
      } else if (imageUrl.startsWith('http')) {
        const res = await fetch(imageUrl);
        const buffer = await res.arrayBuffer();
        base64Data = Buffer.from(buffer).toString('base64');
        mimeType = res.headers.get('content-type') || 'image/jpeg';
      }
    } catch (fetchErr: any) {
      onLog?.('BATARA', `Peringatan fetch image buffer untuk karakter: ${fetchErr?.message || fetchErr}`, 'WARN');
    }

    const charPrompt = "Analyze this uploaded character/creator photo for AI image and video generation prompts. Provide a concise, highly specific 2-3 sentence visual description starting directly with gender, approximate age, skin tone/ethnicity, distinct facial features & expression, hairstyle (color, length, texture), and exact clothing outfit colors & accessories. Output ONLY the visual description with no introductory conversational phrases.";

    // 1. Try OpenAI GPT-4o Vision first if key available
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const client = getOpenAIClient();
        if (client) {
          const openAIModel = getOpenAIModel() || 'gpt-4o';
          onLog?.('BATARA', `ANALISIS VISUAL KARAKTER GPT-4O -> Memproses wajah & gaya busana menggunakan ${openAIModel}...`, 'INFO');

          const imgContentUrl = imageUrl.startsWith('data:') 
            ? imageUrl 
            : (imageUrl.startsWith('http') ? imageUrl : `data:${mimeType};base64,${base64Data}`);

          const response = await withTimeout(
            client.chat.completions.create({
              model: openAIModel,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: charPrompt },
                    { type: "image_url", image_url: { url: imgContentUrl } }
                  ]
                }
              ]
            }),
            20000,
            'OpenAI Character Vision Analysis'
          );

          const result = response.choices[0]?.message?.content?.trim();
          if (result) {
            onLog?.('BATARA', `ANALISIS VISUAL FOTO KARAKTER SELESAI (OpenAI ${openAIModel}): "${result.substring(0, 100)}..."`, 'SUCCESS');
            return result;
          }
        }
      } catch (openaiErr: any) {
        onLog?.('BATARA', `OpenAI Character Vision notice (${openaiErr?.message || openaiErr}). Mengalihkan ke Gemini Vision...`, 'WARN');
      }
    }

    // 2. Fallback to Gemini 3.7 Flash Vision
    try {
      const genAI = getGenAI();
      if (genAI && base64Data) {
        const response = await withTimeout(
          genAI.models.generateContent({
            model: getActiveGeminiModel(),
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              },
              charPrompt
            ]
          }),
          15000,
          'Gemini Character Vision Analysis'
        );
        const result = response.text?.trim();
        if (result) {
          onLog?.('BATARA', `ANALISIS VISUAL FOTO KARAKTER SELESAI (Gemini 3.7 Flash): "${result.substring(0, 100)}..."`, 'SUCCESS');
          return result;
        }
      }
    } catch (geminiErr: any) {
      onLog?.('BATARA', `Gemini Character Vision error: ${geminiErr?.message || geminiErr}`, 'WARN');
    }

    return '';
  }

  /**
   * Generates Storyboard Scenes using Gemini or OpenAI ChatGPT 4.0
   */
  static async resyncStoryboard(params: {
    project: any;
    action: 'ADD' | 'REMOVE';
    targetIndex: number;
    onLog?: (source: string, msg: string, level?: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR') => void;
  }): Promise<any> {
    const { project, action, targetIndex, onLog } = params;
    const genAI = getGenAI();
    if (!genAI) throw new Error("Gemini API Key missing");

    const existingScenes = project.storyboard?.scenes || [];
    const characterProfile = project.characterProfile;
    
    // Auto-Inject DNA Memory Lock
    const characterLock = characterProfile?.consistencyAnchorPrompt || '';
    const videoType = project.videoType;
    let config = project.affiliateConfig || project.animationConfig || project.educationalConfig;

    const resyncPrompt = `Kamu adalah 'Sinta', AI Scriptwriter & Visual Director Neuronna.
User telah meminta untuk ${action === 'ADD' ? 'MENAMBAHKAN' : 'MENGHAPUS'} adegan pada storyboard yang sudah ada (di index ${targetIndex + 1}).
Tugasmu: Rancang ulang naskah adegan agar menyambung dengan adegan sebelum dan sesudahnya dengan mulus (seamless transition).

ATURAN WAJIB (QA AUDIT & DNA LOCK):
1. CHARACTER & PRODUCT LOCK WAJIB DIPERTAHANKAN: "${characterLock}"
2. Jika ADD: Sisipkan 1 adegan baru di posisi ${targetIndex + 1}. Sesuaikan narasi agar menjembatani adegan ${targetIndex} dan ${targetIndex + 2}.
3. Jika REMOVE: Hapus adegan di posisi ${targetIndex + 1}. Sesuaikan narasi adegan ${targetIndex} dan ${targetIndex + 2} agar ceritanya tidak terputus.
4. Output HARUS array of objects 'storyboard_scenes' yang berisi SELURUH adegan baru hasil resync.
5. Pertahankan 'promptTextToImage' dan 'promptImageToVideo' dengan DNA Lock di setiap adegan.

Storyboard Saat Ini:
${JSON.stringify(existingScenes, null, 2)}

Kembalikan format JSON:
{
  "storyboard_scenes": [
    { "duration": "...", "visualDirection": "...", "textOverlay": "...", "voiceOver": "...", "promptTextToImage": "...", "promptImageToVideo": "..." }
  ]
}`;

    onLog?.('SINTA', `[Smart Resync] Menganalisis ulang alur cerita (${action} di urutan ${targetIndex + 1})...`, 'INFO');
    
    try {
      const response = await genAI.models.generateContent({
        model: getActiveGeminiModel(),
        contents: resyncPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              storyboard_scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    duration: { type: Type.STRING },
                    visualDirection: { type: Type.STRING },
                    textOverlay: { type: Type.STRING },
                    voiceOver: { type: Type.STRING },
                    promptTextToImage: { type: Type.STRING },
                    promptImageToVideo: { type: Type.STRING },
                    styleKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          }
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      let newScenes = parsed.storyboard_scenes || [];
      if (newScenes.length > 0) {
        newScenes = newScenes.map((s: any, idx: number) => ({
          ...s,
          scene_number: idx + 1,
          id: existingScenes[idx]?.id || Math.random().toString(36).substring(2, 9),
          status: 'PENDING',
          promptImageToVideo: s.promptImageToVideo || s.promptTextToImage
        }));
        onLog?.('QA AUDIT', `✅ Memori Karakter/Produk terkunci. ${newScenes.length} adegan berhasil di-resync.`, 'SUCCESS');
        return newScenes;
      }
      throw new Error("Gagal parsing storyboard resync");
    } catch (e: any) {
      onLog?.('SINTA', `Gagal resync naskah: ${e.message}`, 'ERROR');
      throw e;
    }
  }

  static async generateStoryboard(params: {
    brief: string;
    videoType: string;
    config?: any;
    onLog?: (source: string, msg: string, level?: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR') => void;
  }): Promise<LLMGenerationResult<{ scenes: any[]; storyboard_scenes?: any[]; project_meta?: any; social_media_kit?: any; characterProfile?: any; marketingCopy?: any }>> {
    const { brief, videoType, config, onLog } = params;
    let pref = getPreferredLLMProvider();
    if (pref === 'anthropic') {
       console.log('[LLMService] Claude 3.5 Sonnet requested. Routing to Gemini for now as Anthropic SDK is not fully wired.');
       pref = 'gemini';
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = keyRotator.getNextGeminiKey();
    const openAIModel = getOpenAIModel();

    let styleMagicWords = '';
    if (videoType !== 'AFFILIATE' && config?.style_id && CinematicStyleLibrary[config.style_id]) {
      styleMagicWords = CinematicStyleLibrary[config.style_id].magic_words;
    }

    let contextBlock = '';
    if (videoType === 'ANIMATION') {
      const anim = config || {};
      const charVisual = anim.characterVisualAnalysis || '';
      contextBlock = `
[ROLE: MASTER ANIMATION STUDIO DIRECTOR & CINEMATIC STORYBOARD ARCHITECT]
- Video Type: ANIMATION (High-End 3D/2D Animation like MAPPA, Pixar, Ghibli, Unreal Engine 5).
- Judul / Ide Animasi: "${anim.title || brief}"
- Karakter Utama & Ciri Fisik: "${anim.characterDescription || 'Karakter utama ekspresif dan heroik'}"
${charVisual ? `- Ciri Fisik Ekstrak dari Foto Karakter (Vision Lock): "${charVisual}"` : ''}
- Latar Tempat / World-Building: "${anim.worldSetting || 'Dunia sinematik kaya warna dan pencahayaan dinamis'}"
- Gaya Visual & Render Engine: "${anim.artStyle || '3D_PIXAR'}"
- Genre Cerita: "${anim.targetGenre || 'ADVENTURE'}"
- Bahasa Naskah & Voiceover: "${anim.language || 'id'}"
- Tone Suara Karakter/Narator: "${anim.voiceTone || 'CHEERFUL'}"
- Target Resolution / Aspect Ratio: "${anim.aspectRatio || '16:9'}"

[ANIMATION STUDIO CINEMATIC RULES - MANDATORY]:
1. RESOLUTION & COMPOSITION FOCUS:
   - For 16:9: Emphasize wide cinematic landscapes, horizontal camera panning, wide-angle establishing shots, and epic scale.
   - For 9:16: Emphasize vertical depth, low-to-high tilting, and dramatic close-ups.
   - Absolutely NO smartphone/UGC/selfie keywords. Maintain epic cinematic narrative scale.
2. CINEMATIC LIGHTING & VISUAL AESTHETIC:
   - Every 'promptTextToImage' and 'promptImageToVideo' MUST strictly include advanced lighting keywords: "volumetric lighting", "hard rim lighting", "dramatic single-source key light", "bokeh background", and "cinematic depth of field".
3. STRICT CHARACTER LOCK:
   - Extract exact physical traits (hair color/style, clothing/outfit/jersey, facial features, accessories) and write them consistently into EVERY SINGLE prompt across all scenes.
4. DYNAMIC SCENE BREAKDOWN (4 SCENES):
   - Scene 1 (Establishing/Hero Shot): Epic wide shot or dramatic low-angle hero framing.
   - Scene 2 (Action/Conflict): Dynamic movement, Dutch angle, or over-the-shoulder perspective.
   - Scene 3 (Emotional Core): Extreme close-up on face highlighting eye reflections and emotional intensity.
   - Scene 4 (Climax/Resolution): Sweeping camera motion, orbital arc, or dramatic peak action.
5. DYNAMIC CAMERA MOTION:
   - Include specific dynamic camera movement in every scene (e.g. "slow cinematic low-angle pan", "dynamic orbital arc", "fast push-in tracking shot").
`;
    } else if (videoType === 'EDUCATIONAL') {
      const edu = config || {};
      contextBlock = `
[KONFIGURASI VIDEO EDUKASI & PEMBELAJARAN (PEDAGOGY ENGINE)]
- Topik / Judul Materi: "${edu.subjectTitle || brief}"
- Kategori Materi: "${edu.category || 'Sains & Teknologi (STEM)'}"
- Karakter Pengajar / Maskot Konsisten: "${edu.characterDescription || 'Presenter edukator ramah dan artikulatif'}"
- Latar Belakang & Ruang Visual: "${edu.worldSetting || 'Laboratorium sains modern dengan layar holografis melayang'}"
- Target Audiens: "${edu.targetAudience || 'GENERAL_ELI5'}"
- Gaya Visual Eksplanasi & Diagram: "${edu.visualStyle || 'MOTION_GRAPHICS_2D'}"
- Poin Inti & Learning Objectives: "${edu.keyTakeaways || 'Pemahaman konsep yang mendalam melalui analogi visual'}"
- Gaya Narator: "${edu.narratorTone || 'FRIENDLY_EXPLAINER'}"
- Bahasa Narasi: "${edu.language || 'id'}"
- Aspect Ratio: "${edu.aspectRatio || '16:9'}"
- Jumlah Bab / Adegan: ${edu.chapterCount || 4}
`;
    } else {
      const aff = config || {};
      const productName = stripBase64FromText(aff.productName) || '';
      const productVisualAnalysis = stripBase64FromText(aff.productVisualAnalysis) || '';
      const characterVisualAnalysis = stripBase64FromText(aff.characterVisualAnalysis) || '';
      const keyBenefits = stripBase64FromText(aff.keyBenefits) || '';
      const pricePromo = stripBase64FromText(aff.pricePromo) || '';
      contextBlock = `
[ROLE: VIRAL AFFILIATE UGC DIRECTOR (TikTok Shop, Shopee Video, Instagram Reels)]
- Video Type: AFFILIATE UGC (9:16 Vertical Portrait).
- Nama Produk: ${productName || 'Produk Unggulan'}
- Detail Visual & Warna Fisik Produk (Vision Analysis): ${productVisualAnalysis || 'Bahan berkualitas tinggi, warna dan siluet sesuai aset referensi'}
- Detail Fisik & Wajah Kreator (Vision Analysis): ${characterVisualAnalysis || 'Kreator kasual ramah'}
- Manfaat & Fitur Utama: ${keyBenefits || 'Desain premium, fungsional dan estetis'}
- Promo/Penawaran: ${pricePromo || 'Promo Diskon Terbatas & Gratis Ongkir'}
- Hook Formula: ${aff.hookStyle || 'PAIN_POINT / PROBLEM_SOLVER'}
- Platform: ${aff.platform || 'TikTok Shop'}

[AFFILIATE STUDIO UGC RULES - MANDATORY]:
1. AESTHETIC: Raw smartphone handheld aesthetic, "Shot on iPhone 15 front camera, natural warm indoor lighting, authentic UGC creator perspective".
2. SCROLL-STOPPING HOOK: Scene 1 MUST deliver a powerful psychological hook (Problem Solver, Pain Point, FOMO).
3. PHYSICAL PRODUCT LOCK: Scene 1 and Scene 2 MUST show the creator physically holding, unboxing, or actively applying/using the product.
4. CALL-TO-ACTION: Scene 4 MUST end with strong urgency to click yellow basket / bio link.
`;
    }

    const targetSceneCount = config?.sceneCount || 4;

    const storyboardPrompt = `Kamu adalah 'Sinta' (Elite AI Visual Director & Storyboard Architect) & 'Openclauw' (AI Scriptwriter) untuk platform video AI Neuronna (Google Flow Protocol).
Tugasmu adalah membuat struktur JSON Storyboard tepat ${targetSceneCount} adegan terstruktur, tersinkronisasi, dan 100% RELEVAN DENGAN TEMA, JUDUL, DAN KARAKTER YANG DITENTUKAN.

Video Brief: "${brief}"
Video Type: ${videoType}
Magic Words: ${styleMagicWords}
${contextBlock}

ATURAN WAJIB & LOGIKA KONSISTENSI VISUAL (MANDATORY RULES):

1. RELEVANSI TOTAL DENGAN TEMA & JUDUL:
- Jika tema adalah ANIMASI Sepak Bola / Captain Tsubasa / Olahraga: Adegan WAJIB berada di stadion sepak bola, lapangan rumput hijau, sorak suporter, aksi dribbling bola, tendangan melengkung, seragam jersey bernomor, BUKAN tentang petualangan tebing magis fantasi generik.
- Alur ${targetSceneCount} adegan harus membentuk narasi utuh: 
  * Adegan 1: Pengenalan karakter & situasi awal di setting dunia (${videoType === 'ANIMATION' ? config?.worldSetting || 'Setting utama' : 'Hook visual'})
  * Adegan Tengah: Aksi/konflik/pengembangan fokus sesuai judul
  * Adegan Akhir: Penutup epik, kemenangan / kesimpulan & CTA judul
- WAJIB buat tepat ${targetSceneCount} adegan di dalam array \`storyboard_scenes\`.

2. KARAKTER KONSISTEN (CHARACTER PROFILE):
- Buat objek \`characterProfile\` yang secara akurat mengekstrak nama, busana/jersey (outfit), gaya rambut (hairStyle), dan fitur wajah (facialFeatures) sesuai deskripsi karakter "${videoType === 'ANIMATION' ? config?.characterDescription || 'Karakter utama' : 'Kreator model'}".
- Masukkan \`consistencyAnchorPrompt\` yang mengunci karakter tersebut di semua adegan.

3. DUAL VISUAL LOCK & ACTION-DRIVEN ANCHORS DI PROMPT PER ADEGAN:
- Di dalam field \`promptTextToImage\` dan \`promptImageToVideo\` (I2V), gunakan struktur yang konsisten. JIKA visualStyle="ugc", gunakan gaya kamera HP (misal: "Selfie perspective, shot on iPhone 15..."). JIKA visualStyle="studio", gunakan DSLR (misal: "35mm DSLR, clean dark studio backdrop...").
- JANGAN gunakan kata-kata negatif seperti "preserve exact", "do not alter", "no distortion" di dalam positive prompt string.

4. VOICE OVER & TEKS SUBTITLE:
- Sesuaikan bahasa narasi dengan bahasa pilihan (${videoType === 'ANIMATION' ? config?.language || 'id' : 'id'}).
- BATAS KATA SANGAT KETAT: TTS membaca lambat (max 2 kata per detik). Untuk adegan 3 detik, MAKSIMAL 6 KATA. Untuk adegan 4 detik, MAKSIMAL 8 KATA. Jika melanggar, audio akan error terpotong! Gunakan kalimat SANGAT PENDEK dan to-the-point.

5. AFFILIATE PRODUCT & CHARACTER LOCK (WAJIB JIKA VIDEO TYPE = AFFILIATE):
- Jika Video Type adalah AFFILIATE, sutradara WAJIB merancang adegan (khususnya Adegan 1 dan 2) di mana karakter SECARA AKTIF dan FISIK menggunakan/memegang/mengaplikasikan produk (misal: "Karakter mengoleskan skincare ke pipi", "Karakter memegang botol serum dan menunjukkannya ke kamera").
- Jangan hanya menampilkan produk di meja atau karakter diam; HARUS ada interaksi fisik yang nyata dan jelas antara karakter dan produk.

6. HIERARKI CONTRACK OUTPUT JSON:
Kembalikan JSON dengan struktur baku:
{
  "project_meta": {
    "format": "${videoType === 'AFFILIATE' ? '9:16 Portrait (TikTok/Reels/Shopee)' : '16:9 Landscape'}",
    "duration": "16s",
    "video_style": "${styleMagicWords || (videoType === 'ANIMATION' ? config?.artStyle : 'Photorealistic Commercial')}"
  },
  "characterProfile": {
    "name": "${videoType === 'ANIMATION' ? (config?.characterDescription?.match(/bernama\s+([A-Za-z0-9_]+)/i)?.[1] || config?.title?.split(/[-–—:]/)[0]?.trim() || 'Hero') : 'Creator'}",
    "gender": "MALE",
    "ageGroup": "Youth / Young Adult",
    "outfit": "Signature outfit matching theme",
    "facialFeatures": "Expressive eyes, distinct facial details",
    "hairStyle": "Distinct styled hair",
    "styleSeed": 8849201,
    "consistencyAnchorPrompt": "[Consistent Character: ...]"
  },
  "social_media_kit": {
    "tiktok_caption": "TikTok Hook: Kalimat super FOMO & engaging untuk TikTok...",
    "instagram_caption": "IG Reels Hook: Caption estetik & storytelling untuk Instagram...",
    "youtube_caption": "YT Shorts Hook: Title Clickbait & description ringkas...",
    "hashtags_tiktok": ["#fyp", "#tiktokviral", "#trend"],
    "hashtags_instagram": ["#reels", "#aesthetic", "#explorepage"],
    "hashtags_youtube": ["#shorts", "#youtubeshorts", "#viral"],
    "caption": "Kalimat caption fallback umum...",
    "hashtags": ["#niche1", "#niche2", "#niche3", "#fyp", "#viral"]
  },
  "storyboard_scenes": [
    {
      "scene_number": 1,
      "duration": "4s",
      "visual_direction": "Deskripsi sinematik Bahasa Indonesia untuk pratinjau user...",
      "promptImageToVideo": "[Insert Camera Movement: pan/zoom/tracking]. Character identity locked: ... Setting locked: ... Visual Scene: ...",
      "promptTextToImage": "[Insert Detailed Image Prompt Matching Visual Style]",
      "voiceover_script": "Naskah narasi suara adegan...",
      "text_overlay": "TEKS HOOK DI LAYAR",
      "featuresProduct": true,
      "backgroundLock": "locked",
      "visualStyle": "${videoType === 'AFFILIATE' ? 'ugc' : 'studio'}",
      "location": "Modern minimalist indoor setting"
    }
  ]
}

ATURAN LOGIKA SCENE-BY-SCENE (CRITICAL):
- "visualStyle" (STRING): WAJIB "ugc" jika Affiliate, WAJIB "studio" jika bukan Affiliate.
- "featuresProduct" (BOOLEAN): Bernilai true HANYA jika adegan ini secara visual memegang, mengoleskan, memakai, atau menyorot produk fisik. Bernilai false jika adegan ini murni menceritakan masalah, keluhan emosional (pain point), menggunakan "sepatu biasa/produk lain", atau hook sebelum produk SOLUSI diperkenalkan.
- "backgroundLock" (STRING: "locked" | "free"): Bernilai "locked" jika adegan bertempat di ruangan/setting fisik yang sama dengan adegan sebelumnya demi kontinuitas. Bernilai "free" jika adegan berganti lokasi/suasana baru.
- "location" (STRING): Deskripsi singkat setting fisik (misal: "Kamar tidur minimalis", "Kamar mandi modern", "Studio foto komersial").

CRITICAL RULES FOR QA COMPLIANCE (MUST FOLLOW STRICTLY):
0. LANGUAGE (CRITICAL): ALL Voiceovers and copy MUST BE IN INDONESIAN (BAHASA INDONESIA).
1. PACING (CRITICAL LIMIT): Voiceover MAX 2 words/second. 3s scene = MAX 6 words. 4s scene = MAX 8 words. WRITE SHORT, PUNCHY, COMPLETE SENTENCES. Do NOT write long sentences that will get cut off! Ex: 'Bass gahar TWS BassKing!' (4 words). NOT: 'Nikmati bass gahar dengan TWS BassKing yang tahan hingga 24 jam' (11 words - too long for 4s).
2. VISUAL STYLE: You must explicitly set \`visualStyle\` field to "ugc" or "studio" based on videoType!
   - AFFILIATE default -> "ugc" (Authentic UGC creator perspective, shot on iPhone 15 front camera)
   - CONTENT/ANIMATION -> "studio" (Cinematic 35mm commercial shot, 50mm lens f/2.8)
   Never mix DSLR/35mm prompts inside UGC style.
3. PRODUCT REFERENCE: Every visual prompt MUST mention the actual product name explicitly (not generic words).
4. CAMERA MOVEMENT: \`promptImageToVideo\` MUST contain one of: "pan", "dolly", "zoom", "tracking", "orbital", "tilt", "pedestal", "crane", "handheld camera movement".
5. NEVER include: "text on screen", "subtitle", "typography", "writing", "font".

FORMAT OUTPUT MUTLAK: JSON`;

    // Try OpenAI directly if preferred or if Gemini is absent
    if ((pref === 'openai' || !geminiKey) && openaiKey) {
      try {
        const client = getOpenAIClient();
        if (client) {
          onLog?.('SINTA', `TASKING STORYBOARD AI -> OpenAI ChatGPT 4.0 (${openAIModel})`, 'INFO');
          const response = await withTimeout(
            client.chat.completions.create({
              model: openAIModel,
              messages: [
                { 
                  role: "system", 
                  content: `You are SINTA, NEURONA Master Storyboard & Product/Character Consistency Director. You output JSON with 'characterProfile', 'marketingCopy' (caption, hashtags, voiceProfile) and a 'scenes' array containing: { duration, visualDirection, textOverlay, voiceOver, promptTextToImage, promptImageToVideo, styleKeywords: string[], featuresProduct: boolean, backgroundLock: "locked" | "free", location: string, visualStyle: "ugc" | "studio" }.

CRITICAL RULES FOR QA COMPLIANCE:
1. PACING (CRITICAL LIMIT): Voiceover MAX 2 words/second. 3s scene = MAX 6 words. 4s scene = MAX 8 words. WRITE SHORT, PUNCHY, COMPLETE SENTENCES. Do NOT write long sentences that will get cut off! Ex: 'Bass gahar TWS BassKing!' (4 words). NOT: 'Nikmati bass gahar dengan TWS BassKing yang tahan hingga 24 jam' (11 words - too long for 4s).
2. VISUAL STYLE (must set \`visualStyle\` field explicitly as "ugc" or "studio" based on videoType):
   - AFFILIATE default → "ugc": "Authentic UGC creator perspective, shot on iPhone 15 front camera, natural indoor lighting"
   - CONTENT/ANIMATION → "studio": "Cinematic 35mm commercial shot, 50mm lens f/2.8, atmospheric lighting"
3. PRODUCT REFERENCE: Every visual prompt MUST mention the actual product name explicitly (not generic words).
4. CAMERA MOVEMENT: promptImageToVideo MUST contain one of: "pan", "dolly", "zoom", "tracking", "orbital".
5. NEVER include: "text on screen", "subtitle", "typography", "writing", "font".` 
                },
                { role: "user", content: storyboardPrompt }
              ],
              response_format: { type: "json_object" },
              temperature: 0.7
            }),
            14000,
            'OpenAI Storyboard Generator'
          );

          const rawText = response.choices[0]?.message?.content || "{}";
          const parsed = JSON.parse(rawText);
          const rawScenes = parsed.storyboard_scenes || parsed.scenes || parsed.storyboard || [];
          if (Array.isArray(rawScenes) && rawScenes.length > 0) {
            const scenes = rawScenes.map((s: any, idx: number) => ({
              scene_number: s.scene_number || idx + 1,
              duration: s.duration || '3s',
              visualDirection: s.visual_direction || s.visualDirection || '',
              visual_direction: s.visual_direction || s.visualDirection || '',
              textOverlay: s.text_overlay || s.textOverlay || '',
              text_overlay: s.text_overlay || s.textOverlay || '',
              voiceOver: s.voiceover_script || s.voiceOver || '',
              voiceover_script: s.voiceover_script || s.voiceOver || '',
              promptTextToImage: s.promptTextToImage || s.promptImageToVideo || '',
              promptImageToVideo: s.promptImageToVideo || s.promptTextToImage || '',
              visualStyle: s.visualStyle,
              featuresProduct: s.featuresProduct !== undefined ? Boolean(s.featuresProduct) : (s.features_product !== undefined ? Boolean(s.features_product) : true),
              backgroundLock: (s.backgroundLock === 'free' || s.background_lock === 'free') ? 'free' : 'locked',
              location: s.location || '',
              styleKeywords: s.styleKeywords || []
            }));
            const marketingCopy = {
              caption: parsed.social_media_kit?.caption || parsed.marketingCopy?.caption || '',
              hashtags: parsed.social_media_kit?.hashtags || parsed.marketingCopy?.hashtags || [],
              tiktok_caption: parsed.social_media_kit?.tiktok_caption || parsed.marketingCopy?.tiktok_caption,
              instagram_caption: parsed.social_media_kit?.instagram_caption || parsed.marketingCopy?.instagram_caption,
              youtube_caption: parsed.social_media_kit?.youtube_caption || parsed.marketingCopy?.youtube_caption,
              hashtags_tiktok: parsed.social_media_kit?.hashtags_tiktok || parsed.marketingCopy?.hashtags_tiktok || [],
              hashtags_instagram: parsed.social_media_kit?.hashtags_instagram || parsed.marketingCopy?.hashtags_instagram || [],
              hashtags_youtube: parsed.social_media_kit?.hashtags_youtube || parsed.marketingCopy?.hashtags_youtube || []
            };
            const social_media_kit = parsed.social_media_kit || marketingCopy;
            const project_meta = parsed.project_meta || {
              format: videoType === 'AFFILIATE' ? '9:16 Portrait (TikTok/Reels)' : '16:9 Landscape',
              duration: '15s',
              video_style: styleMagicWords || 'Photorealistic Commercial'
            };

            return {
              data: {
                project_meta,
                social_media_kit,
                storyboard_scenes: scenes,
                scenes,
                characterProfile: parsed.characterProfile,
                marketingCopy
              },
              rawText,
              modelUsed: `OpenAI ${openAIModel}`,
              provider: 'openai'
            };
          }
        }
      } catch (openAiErr: any) {
        onLog?.('SINTA', `OpenAI Storyboard generation error: ${openAiErr.message}`, 'WARN');
      }
    }

    // Try Gemini First
    const genAI = getGenAI();
    if (genAI) {
      try {
        const activeGemini = getActiveGeminiModel();
        onLog?.('SINTA', `TASKING STORYBOARD AI -> Google Gemini (${activeGemini})`, 'INFO');
        const response = await withTimeout(
          genAI.models.generateContent({
            model: activeGemini,
            contents: storyboardPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  project_meta: {
                    type: Type.OBJECT,
                    properties: {
                      format: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      video_style: { type: Type.STRING }
                    }
                  },
                  social_media_kit: {
                    type: Type.OBJECT,
                    properties: {
                      caption: { type: Type.STRING },
                      hashtags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    }
                  },
                  marketingCopy: {
                    type: Type.OBJECT,
                    properties: {
                      tiktok_caption: { type: Type.STRING },
                      instagram_caption: { type: Type.STRING },
                      youtube_caption: { type: Type.STRING },
                      hashtags_tiktok: { type: Type.ARRAY, items: { type: Type.STRING } },
                      hashtags_instagram: { type: Type.ARRAY, items: { type: Type.STRING } },
                      hashtags_youtube: { type: Type.ARRAY, items: { type: Type.STRING } },
                      caption: { type: Type.STRING },
                      hashtags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      voiceProfile: { type: Type.STRING }
                    }
                  },
                  characterProfile: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      gender: { type: Type.STRING },
                      ageGroup: { type: Type.STRING },
                      outfit: { type: Type.STRING },
                      facialFeatures: { type: Type.STRING },
                      hairStyle: { type: Type.STRING },
                      styleSeed: { type: Type.NUMBER },
                      consistencyAnchorPrompt: { type: Type.STRING }
                    }
                  },
                  storyboard_scenes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        scene_number: { type: Type.NUMBER },
                        duration: { type: Type.STRING },
                        visual_direction: { type: Type.STRING },
                        visualDirection: { type: Type.STRING },
                        text_overlay: { type: Type.STRING },
                        textOverlay: { type: Type.STRING },
                        voiceover_script: { type: Type.STRING },
                        voiceOver: { type: Type.STRING },
                        promptTextToImage: { type: Type.STRING },
                        promptImageToVideo: { type: Type.STRING },
                        featuresProduct: { type: Type.BOOLEAN },
                        backgroundLock: { type: Type.STRING },
                        location: { type: Type.STRING },
                        visualStyle: { type: Type.STRING }
                      }
                    }
                  },
                  scenes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        scene_number: { type: Type.NUMBER },
                        duration: { type: Type.STRING },
                        visual_direction: { type: Type.STRING },
                        visualDirection: { type: Type.STRING },
                        text_overlay: { type: Type.STRING },
                        textOverlay: { type: Type.STRING },
                        voiceover_script: { type: Type.STRING },
                        voiceOver: { type: Type.STRING },
                        promptTextToImage: { type: Type.STRING },
                        promptImageToVideo: { type: Type.STRING },
                        featuresProduct: { type: Type.BOOLEAN },
                        backgroundLock: { type: Type.STRING },
                        location: { type: Type.STRING },
                        styleKeywords: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        }
                      }
                    }
                  }
                }
              }
            }
          }),
          25000,
          'Gemini Storyboard Generator'
        );

        const rawText = response.text || "{}";
        const parsed = JSON.parse(rawText);
        const rawScenes = parsed.storyboard_scenes || parsed.scenes || parsed.storyboard || [];
        if (Array.isArray(rawScenes) && rawScenes.length > 0) {
          const scenes = rawScenes.map((s: any, idx: number) => ({
            scene_number: s.scene_number || idx + 1,
            duration: s.duration || '3s',
            visualDirection: s.visual_direction || s.visualDirection || '',
            visual_direction: s.visual_direction || s.visualDirection || '',
            textOverlay: s.text_overlay || s.textOverlay || '',
            text_overlay: s.text_overlay || s.textOverlay || '',
            voiceOver: s.voiceover_script || s.voiceOver || '',
            voiceover_script: s.voiceover_script || s.voiceOver || '',
            promptTextToImage: s.promptTextToImage || s.promptImageToVideo || '',
            promptImageToVideo: s.promptImageToVideo || s.promptTextToImage || '',
              visualStyle: s.visualStyle,
              
            featuresProduct: s.featuresProduct !== undefined ? Boolean(s.featuresProduct) : (s.features_product !== undefined ? Boolean(s.features_product) : true),
            backgroundLock: (s.backgroundLock === 'free' || s.background_lock === 'free') ? 'free' : 'locked',
            location: s.location || '',
            styleKeywords: s.styleKeywords || []
          }));
          const marketingCopy = {
            caption: parsed.social_media_kit?.caption || parsed.marketingCopy?.caption || '',
            hashtags: parsed.social_media_kit?.hashtags || parsed.marketingCopy?.hashtags || [],
            tiktok_caption: parsed.social_media_kit?.tiktok_caption || parsed.marketingCopy?.tiktok_caption,
            instagram_caption: parsed.social_media_kit?.instagram_caption || parsed.marketingCopy?.instagram_caption,
            youtube_caption: parsed.social_media_kit?.youtube_caption || parsed.marketingCopy?.youtube_caption,
            hashtags_tiktok: parsed.social_media_kit?.hashtags_tiktok || parsed.marketingCopy?.hashtags_tiktok || [],
            hashtags_instagram: parsed.social_media_kit?.hashtags_instagram || parsed.marketingCopy?.hashtags_instagram || [],
            hashtags_youtube: parsed.social_media_kit?.hashtags_youtube || parsed.marketingCopy?.hashtags_youtube || []
          };
          const social_media_kit = parsed.social_media_kit || marketingCopy;
          const project_meta = parsed.project_meta || {
            format: videoType === 'AFFILIATE' ? '9:16 Portrait (TikTok/Reels)' : '16:9 Landscape',
            duration: '15s',
            video_style: styleMagicWords || 'Photorealistic Commercial'
          };

          return {
            data: {
              project_meta,
              social_media_kit,
              storyboard_scenes: scenes,
              scenes,
              characterProfile: parsed.characterProfile,
              marketingCopy
            },
            rawText,
            modelUsed: `Google Gemini (${activeGemini})`,
            provider: 'gemini'
          };
        }
      } catch (geminiErr: any) {
        const errMsg = (geminiErr?.message || String(geminiErr)).toLowerCase();
        const isQuota = errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('resource_exhausted') || errMsg.includes('limit') || errMsg.includes('timeout') || errMsg.includes('timed out');
        
        onLog?.('SINTA', isQuota
          ? `⚠️ Kuota Gemini habis atau timeout. Mengalihkan perancangan storyboard ke OpenAI ChatGPT 4.0 (${openAIModel})...`
          : `Gemini Storyboard Error/Timeout: ${geminiErr.message}. Mengalihkan ke OpenAI...`,
          'WARN'
        );

        // Fallback to OpenAI ChatGPT 4.0
        if (openaiKey) {
          try {
            const client = getOpenAIClient();
            if (client) {
              const response = await withTimeout(
                client.chat.completions.create({
                  model: openAIModel,
                  messages: [
                    { 
                      role: "system", 
                      content: `You are SINTA, NEURONA Master Storyboard & Product Consistency Director. You output JSON with 'characterProfile', 'marketingCopy' ({ caption, hashtags, tiktok_caption, instagram_caption, youtube_caption, hashtags_tiktok, hashtags_instagram, hashtags_youtube, voiceProfile }) and a 'scenes' array containing: { duration, visualDirection, textOverlay, voiceOver, promptTextToImage, promptImageToVideo, styleKeywords: string[], featuresProduct: boolean, backgroundLock: "locked" | "free", location: string, visualStyle: "ugc" | "studio" }.

CRITICAL RULES FOR QA COMPLIANCE:
1. PACING (CRITICAL LIMIT): Voiceover MAX 2 words/second. 3s scene = MAX 6 words. 4s scene = MAX 8 words. WRITE SHORT, PUNCHY, COMPLETE SENTENCES. Do NOT write long sentences that will get cut off! Ex: 'Bass gahar TWS BassKing!' (4 words). NOT: 'Nikmati bass gahar dengan TWS BassKing yang tahan hingga 24 jam' (11 words - too long for 4s).
2. VISUAL STYLE (must set \`visualStyle\` field explicitly as "ugc" or "studio" based on videoType):
   - AFFILIATE default → "ugc": "Authentic UGC creator perspective, shot on iPhone 15 front camera, natural indoor lighting"
   - CONTENT/ANIMATION → "studio": "Cinematic 35mm commercial shot, 50mm lens f/2.8, atmospheric lighting"
3. PRODUCT REFERENCE: Every visual prompt MUST mention the actual product name explicitly (not generic words).
4. CAMERA MOVEMENT: promptImageToVideo MUST contain one of: "pan", "dolly", "zoom", "tracking", "orbital".
5. NEVER include: "text on screen", "subtitle", "typography", "writing", "font".` 
                    },
                    { role: "user", content: storyboardPrompt }
                  ],
                  response_format: { type: "json_object" },
                  temperature: 0.7
                }),
                14000,
                'OpenAI Storyboard Fallback'
              );

              const rawText = response.choices[0]?.message?.content || "{}";
              const parsed = JSON.parse(rawText);
              const rawScenes = parsed.scenes || parsed.storyboard_scenes || parsed.storyboard || [];
              if (Array.isArray(rawScenes) && rawScenes.length > 0) {
                const scenes = rawScenes.map((s: any, idx: number) => ({
                  scene_number: s.scene_number || idx + 1,
                  duration: s.duration || '3s',
                  visualDirection: s.visualDirection || s.visual_direction || '',
                  visual_direction: s.visualDirection || s.visual_direction || '',
                  textOverlay: s.textOverlay || s.text_overlay || '',
                  text_overlay: s.textOverlay || s.text_overlay || '',
                  voiceOver: s.voiceOver || s.voiceover_script || '',
                  voiceover_script: s.voiceOver || s.voiceover_script || '',
                  promptTextToImage: s.promptTextToImage || s.promptImageToVideo || '',
                  promptImageToVideo: s.promptImageToVideo || s.promptTextToImage || '',
              visualStyle: s.visualStyle,
              
                  featuresProduct: s.featuresProduct !== undefined ? Boolean(s.featuresProduct) : (s.features_product !== undefined ? Boolean(s.features_product) : true),
                  backgroundLock: (s.backgroundLock === 'free' || s.background_lock === 'free') ? 'free' : 'locked',
                  location: s.location || '',
                  styleKeywords: s.styleKeywords || []
                }));
                const marketingCopy = {
                  caption: parsed.social_media_kit?.caption || parsed.marketingCopy?.caption || '',
                  hashtags: parsed.social_media_kit?.hashtags || parsed.marketingCopy?.hashtags || [],
                  tiktok_caption: parsed.social_media_kit?.tiktok_caption || parsed.marketingCopy?.tiktok_caption,
                  instagram_caption: parsed.social_media_kit?.instagram_caption || parsed.marketingCopy?.instagram_caption,
                  youtube_caption: parsed.social_media_kit?.youtube_caption || parsed.marketingCopy?.youtube_caption,
                  hashtags_tiktok: parsed.social_media_kit?.hashtags_tiktok || parsed.marketingCopy?.hashtags_tiktok || [],
                  hashtags_instagram: parsed.social_media_kit?.hashtags_instagram || parsed.marketingCopy?.hashtags_instagram || [],
                  hashtags_youtube: parsed.social_media_kit?.hashtags_youtube || parsed.marketingCopy?.hashtags_youtube || []
                };

                return {
                  data: {
                    scenes,
                    characterProfile: parsed.characterProfile,
                    marketingCopy,
                    social_media_kit: marketingCopy
                  },
                  rawText,
                  modelUsed: `OpenAI ChatGPT 4.0 (${openAIModel}) [Fallback]`,
                  provider: 'openai',
                  fallbackTriggered: true
                };
              }
            }
          } catch (openAiFallbackErr: any) {
            onLog?.('SINTA', `OpenAI fallback error: ${openAiFallbackErr.message}`, 'WARN');
          }
        }
      }
    }

    // Procedural Fallback
    return {
      data: {
        scenes: [],
        characterProfile: undefined
      },
      rawText: "",
      modelUsed: "Procedural Engine",
      provider: 'procedural'
    };
  }

  static async callGatotkaca(storyboardData: any, creditStatus: string, videoType: string): Promise<any> {
    const gatotkacaSystemPrompt = `Kamu adalah Gatotkaca, API Pipeline Engineer dan GATEKEEPER untuk Neuronna yang terhubung ke mesin rendering Fal Video Engine (Kling, Seedance, Wan, MiniMax).
Tugasmu beroperasi HANYA pada Fase 2 (Eksekusi Render). Kamu akan menerima payload JSON \`storyboard_scenes\` (dari Sinta) dan parameter \`credit_status\` dari backend.

ATURAN GATEKEEPER (SUPER STRICT):
1. Cek parameter [CREDIT_STATUS].
2. JIKA [CREDIT_STATUS] BUKAN "approved" (misalnya "insufficient_funds", "pending", atau null):
   - Kamu DILARANG KERAS merakit payload API.
   - Outputkan JSON error: { "status": "REJECTED", "reason": "Saldo kredit tidak mencukupi atau transaksi belum di-approve backend." }
3. JIKA [CREDIT_STATUS] ADALAH "approved":
   - Kamu diizinkan untuk merakit Payload API.

ATURAN PAYLOAD API JIKA APPROVED:
- Ekstrak string dari \`promptImageToVideo\` milik Sinta di setiap adegan.
- JIKA [VIDEO_TYPE] == "AFFILIATE": Gunakan endpoint I2V presisi dengan durasi 5s.
- JIKA [VIDEO_TYPE] == "ANIMATION": Gunakan endpoint I2V sinematik dengan durasi 5s.

FORMAT OUTPUT JIKA APPROVED (HANYA JSON):
{
  "status": "APPROVED",
  "engine": "fal_video",
  "api_payloads": [
    {
      "scene_number": 1,
      "endpoint": "fal-ai/kling-video/v2.1/standard/image-to-video",
      "body": {
        "prompt": "(isi dari promptImageToVideo Sinta)",
        "duration": "5"
      }
    }
  ]
}

PARAMETER INJEKSI DARI SISTEM:
[CREDIT_STATUS]: ${creditStatus}
[VIDEO_TYPE]: ${videoType}

DATA STORYBOARD (DARI SINTA):
${JSON.stringify(storyboardData)}`;

    const genAI = getGenAI();
    if (genAI) {
      try {
        const response = await withTimeout(
          genAI.models.generateContent({
            model: getActiveGeminiModel(),
            contents: "Generate API payload based on rules.",
            config: {
              systemInstruction: gatotkacaSystemPrompt,
              responseMimeType: "application/json",
              temperature: 0.1
            }
          }),
          15000,
          'Gatotkaca Execution'
        );
        const rawText = response.text || "{}";
        return JSON.parse(rawText);
      } catch (err) {
        console.warn("Gatotkaca error:", err);
      }
    }
    return { status: "REJECTED", reason: "Fallback error or missing LLM." };
  }
}
