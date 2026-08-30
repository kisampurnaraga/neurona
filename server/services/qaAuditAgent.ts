import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { FounderService } from "../../src/server/fcc/FounderService";
import { keyRotator } from "../keyRotator";

export interface QAAuditInput {
  script?: string;
  voiceoverScript?: string;
  promptText?: string;
  videoPrompt?: string;
  visualPrompt?: string;
  referenceImageUrl?: string;
  productName?: string;
  aspectRatio?: '9:16' | '16:9';
  durationSeconds?: number;
  videoType?: 'AFFILIATE' | 'ANIMATION' | 'EDUCATIONAL' | 'BRAND_COMMERCIAL' | 'CINEMATIC' | 'GENERAL';
  visualStyle?: 'ugc' | 'studio';
  featuresProduct?: boolean;
}

export interface QAAuditBreakdown {
  productLockConsistency: number; // 0 - 100
  visualPromptAdherence: number;   // 0 - 100
  narrativeFlow: number;           // 0 - 100
}

export interface QAAuditResult {
  passed: boolean;
  score: number;
  breakdown: QAAuditBreakdown;
  issues: string[];
  recommendations: string[];
  correctedVideoPrompt: string;
  correctedScript: string;
  correctedVisualPrompt: string;
  autoCorrected: boolean;
  auditNotes: string;
  modelUsed: string;
  timestamp: string;
}

export class QAAuditAgent {
  private static SCORE_THRESHOLD = 70;

  /**
   * Post-processing helper to ensure character lock and product lock clauses
   * from the original prompt are strictly preserved in corrected prompts.
   */
  public static preserveConsistencyLocks(
    originalPrompt: string,
    correctedPrompt: string,
    productName?: string
  ): string {
    if (!correctedPrompt) return originalPrompt || '';

    let result = correctedPrompt;

    // 1. Preserve explicit [LOCK: ...] bracket tags
    const lockMatches = originalPrompt.match(/\[(CHARACTER|PRODUCT|VISION|FACE)\s+LOCK:[^\]]+\]/gi);
    if (lockMatches && lockMatches.length > 0) {
      lockMatches.forEach(lockTag => {
        const keyFragment = lockTag.substring(0, 15).toLowerCase();
        if (!result.toLowerCase().includes(keyFragment)) {
          result = `${lockTag} ${result}`;
        }
      });
    }

    // 2. Preserve explicit physical feature descriptions if lost
    if (productName && productName !== 'Product' && productName !== 'Product / Creative Subject') {
      const lowerProduct = productName.toLowerCase();
      if (originalPrompt.toLowerCase().includes(lowerProduct) && !result.toLowerCase().includes(lowerProduct)) {
        result = `${result}, featuring ${productName}`;
      }
    }

    return result.trim();
  }

  /**
   * Helper to strip any base64 data URIs or raw base64 binary blocks from text fields.
   * Ensures base64 images NEVER leak into text prompt strings sent to LLM text models.
   */
  public static stripBase64FromText(text: string | undefined | null): string {
    if (!text) return '';
    // 1. Strip data URIs (e.g., data:image/png;base64,..., data:application/octet-stream;base64,...)
    let cleaned = text.replace(/data:([a-zA-Z0-9+\/.-]+);base64,[A-Za-z0-9+/=]+/g, '[BASE64_IMAGE_DATA_TRUNCATED]');
    // 2. Strip generic data URIs
    cleaned = cleaned.replace(/data:([a-zA-Z0-9+\/.-]+);[^\s'"]+/g, '[BASE64_IMAGE_DATA_TRUNCATED]');
    // 3. Strip long continuous raw base64 strings (>100 chars without spaces)
    cleaned = cleaned.replace(/(?:[A-Za-z0-9+/]{4}){25,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g, '[RAW_BASE64_DATA_TRUNCATED]');
    return cleaned;
  }

  /**
   * Run automated QA audit on script, keyframe visual prompt, and AI video prompt.
   * Ensures compliance with Neuronna Director Architecture before reaching rendering pipeline.
   */
  static async auditAndRefine(input: QAAuditInput): Promise<QAAuditResult> {
    const rawPrompt = (input.videoPrompt || input.promptText || input.visualPrompt || '').trim();
    const rawScript = (input.voiceoverScript || input.script || '').trim();
    const rawVisual = (input.visualPrompt || rawPrompt).trim();
    const duration = input.durationSeconds || 5;
    const aspect = input.aspectRatio || '9:16';
    const activeLlm = FounderService.getLlmEngine() || 'gemini';

    console.log(`[QAAuditAgent] Auditing director assets with Master LLM Engine: "${activeLlm}"`);

    // 1. Attempt LLM-driven deep audit using active Master Engine
    try {
      if (activeLlm.includes('openai') || activeLlm.includes('gpt-4o')) {
        const openAiKey = process.env.OPENAI_API_KEY;
        if (openAiKey) {
          const result = await this.runOpenAIAudit(input, openAiKey);
          if (result) return result;
        }
      }

      // Default: Google Gemini (Gemini 2.5 Flash / Pro)
      const result = await keyRotator.executeGeminiWithRotation(async (ai, apiKey) => {
        return await this.runGeminiAudit(input, ai, activeLlm);
      });
      if (result) return result;
    } catch (err: any) {
      console.warn(`[QAAuditAgent] LLM-based audit encountered error: ${err?.message}. Executing heuristic procedural fallback.`);
    }

    // 2. Fallback: Rule-based Heuristic Director QA Engine
    return this.runHeuristicAudit(input, rawPrompt, rawScript, rawVisual, duration, aspect);
  }

  /**
   * Audit via Google GenAI SDK (@google/genai)
   */
  private static async runGeminiAudit(
    input: QAAuditInput,
    ai: GoogleGenAI,
    engineName: string
  ): Promise<QAAuditResult | null> {
    const targetModel = engineName.includes('pro') ? 'gemini-3.1-pro-preview' : 'gemini-3.6-flash';

    const systemInstruction = `Kamu adalah NEURONNA QA AUDIT AGENT & MASTER DIRECTOR REVIEWER.
Tugasmu adalah mengaudit secara objektif dan ketat output sutradara AI sebelum dieksekusi ke pipeline video AI dan Google Cloud TTS.

KAIDAH AUDIT:
1. Product & Character Lock Consistency (Skor 0-100):
   - Apakah entitas produk/karakter dideskripsikan secara konsisten dan spesifik tanpa ambigu di seluruh adegan?
   - Ciri fisik (rambut, wajah, busana, aksesori, atau logo/warna produk) terkunci dengan presisi.
2. Visual Prompt Adherence & Lighting (Skor 0-100):
   - Jika ANIMATION: Wajib memuat instruksi kamera dinamis (slow dolly, orbital pan, Dutch angle, macro eye close-up) dan kata kunci pencahayaan sinematik ("volumetric lighting", "hard rim lighting", "dramatic single-source key light", "bokeh background", "cinematic depth of field"). Dilarang memuat kata UGC/smartphone.
   - Jika AFFILIATE: Wajib memuat estetika smartphone kasual ("Shot on iPhone 15 front camera, natural warm indoor lighting, authentic UGC creator perspective") dan interaksi fisik aktif di Scene 1-2.
   - DILARANG mencantumkan teks "subtitle", "text on screen", atau instruksi tipografi di dalam video prompt (karena menyebabkan glitch rendering video).
3. Narrative Flow & TTS Duration (Skor 0-100):
   - Rasio kata naskah harus realistis sesuai durasi ${input.durationSeconds || 5} detik (sekitar 2.5 kata per detik untuk bahasa Indonesia).
   - Memiliki hook menarik atau punchline/CTA yang jelas.

ATURAN WAJIB KOREKSI PROMPT:
- "correctedVideoPrompt": Prompt video AI yang disempurnakan. WAJIB MEMPERTAHANKAN DAN TIDAK BOLEH MENGHAPUS deskripsi produk dan karakter lock dari prompt asli.
- "correctedScript": Naskah narasi voiceover. WAJIB MEMPERTAHANKAN BAHASA NASKAH ASLI (Bahasa Indonesia). DILARANG KERAS MENGUBAH NASKAH INDONESIA MENJADI BAHASA INGGRIS!
- "correctedVisualPrompt": Deskripsi visual keyframe gambar dengan pencahayaan dan Character/Product Lock lengkap.

Format Output WAJIB JSON murni tanpa markdown pembungkus.`;

    const auditPrompt = JSON.stringify({
      productName: QAAuditAgent.stripBase64FromText(input.productName) || "Product / Creative Subject",
      referenceImageUrl: QAAuditAgent.stripBase64FromText(input.referenceImageUrl) || null,
      videoPrompt: QAAuditAgent.stripBase64FromText(input.videoPrompt || input.promptText),
      voiceoverScript: QAAuditAgent.stripBase64FromText(input.voiceoverScript || input.script),
      visualPrompt: QAAuditAgent.stripBase64FromText(input.visualPrompt),
      targetDurationSeconds: input.durationSeconds || 5,
      aspectRatio: input.aspectRatio || '9:16',
      videoType: input.videoType || 'AFFILIATE'
    });

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: auditPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);
    const pScore = Number(data.productLockConsistency ?? data.breakdown?.productLockConsistency ?? 85);
    const vScore = Number(data.visualPromptAdherence ?? data.breakdown?.visualPromptAdherence ?? 85);
    const nScore = Number(data.narrativeFlow ?? data.breakdown?.narrativeFlow ?? 85);
    const avgScore = Math.round((pScore + vScore + nScore) / 3);
    const autoCorrected = avgScore < this.SCORE_THRESHOLD;

    const rawVideoPrompt = input.videoPrompt || input.promptText || '';
    const rawVisualPrompt = input.visualPrompt || rawVideoPrompt;
    const productName = input.productName;

    const finalVideoPrompt = QAAuditAgent.preserveConsistencyLocks(rawVideoPrompt, data.correctedVideoPrompt || rawVideoPrompt, productName);
    const finalVisualPrompt = QAAuditAgent.preserveConsistencyLocks(rawVisualPrompt, data.correctedVisualPrompt || rawVisualPrompt, productName);
    const finalScript = data.correctedScript || input.voiceoverScript || input.script || '';

    return {
      passed: avgScore >= this.SCORE_THRESHOLD,
      score: avgScore,
      breakdown: {
        productLockConsistency: pScore,
        visualPromptAdherence: vScore,
        narrativeFlow: nScore
      },
      issues: Array.isArray(data.issues) ? data.issues : (data.detectedIssues || []),
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      correctedVideoPrompt: finalVideoPrompt,
      correctedScript: finalScript,
      correctedVisualPrompt: finalVisualPrompt,
      autoCorrected,
      auditNotes: data.auditNotes || `QA Audit diselesaikan dengan skor ${avgScore}/100 oleh ${targetModel}.`,
      modelUsed: targetModel,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Audit via OpenAI API
   */
  private static async runOpenAIAudit(
    input: QAAuditInput,
    apiKey: string
  ): Promise<QAAuditResult | null> {
    const openai = new OpenAI({ apiKey });
    const model = 'gpt-4o';

    const response = await openai.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are NEURONNA QA AUDIT AGENT. Audit script, visual prompt, and AI video prompt for:
1. Product Lock Consistency (0-100)
2. Visual Prompt Adherence (0-100)
3. Narrative Flow & TTS Duration (0-100)
4. Affiliate Product & Character Interaction (0-100) - If videoType is AFFILIATE, prompt MUST explicitly describe physical interaction between character and product.

Return JSON with: passed (boolean), score (number), breakdown { productLockConsistency, visualPromptAdherence, narrativeFlow }, issues (array), recommendations (array), correctedVideoPrompt (string in English cinematic prompt for AI Video Engines. MUST include character physically holding/using product if AFFILIATE), correctedScript (string), correctedVisualPrompt (string. MUST include character physically holding/using product if AFFILIATE), auditNotes (string).`
        },
        {
          role: 'user',
          content: JSON.stringify({
            productName: QAAuditAgent.stripBase64FromText(input.productName),
            referenceImageUrl: QAAuditAgent.stripBase64FromText(input.referenceImageUrl),
            videoPrompt: QAAuditAgent.stripBase64FromText(input.videoPrompt || input.promptText),
            voiceoverScript: QAAuditAgent.stripBase64FromText(input.voiceoverScript || input.script),
            visualPrompt: QAAuditAgent.stripBase64FromText(input.visualPrompt),
            targetDurationSeconds: input.durationSeconds || 5,
            aspectRatio: input.aspectRatio || '9:16',
            videoType: input.videoType || 'AFFILIATE'
          })
        }
      ],
      temperature: 0.2
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const data = JSON.parse(content);
    const pScore = Number(data.breakdown?.productLockConsistency ?? 85);
    const vScore = Number(data.breakdown?.visualPromptAdherence ?? 85);
    const nScore = Number(data.breakdown?.narrativeFlow ?? 85);
    const avgScore = Number(data.score ?? Math.round((pScore + vScore + nScore) / 3));

    const rawVideoPrompt = input.videoPrompt || input.promptText || '';
    const rawVisualPrompt = input.visualPrompt || rawVideoPrompt;
    const productName = input.productName;

    const finalVideoPrompt = QAAuditAgent.preserveConsistencyLocks(rawVideoPrompt, data.correctedVideoPrompt || rawVideoPrompt, productName);
    const finalVisualPrompt = QAAuditAgent.preserveConsistencyLocks(rawVisualPrompt, data.correctedVisualPrompt || rawVisualPrompt, productName);

    return {
      passed: avgScore >= this.SCORE_THRESHOLD,
      score: avgScore,
      breakdown: {
        productLockConsistency: pScore,
        visualPromptAdherence: vScore,
        narrativeFlow: nScore
      },
      issues: Array.isArray(data.issues) ? data.issues : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      correctedVideoPrompt: finalVideoPrompt,
      correctedScript: data.correctedScript || input.voiceoverScript || input.script || '',
      correctedVisualPrompt: finalVisualPrompt,
      autoCorrected: avgScore < this.SCORE_THRESHOLD,
      auditNotes: data.auditNotes || `QA Audit dieksekusi via OpenAI ${model}.`,
      modelUsed: `OpenAI ${model}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Procedural Fallback QA Audit (Deterministic rules & enhancement)
   */
  private static runHeuristicAudit(
    input: QAAuditInput,
    rawPrompt: string,
    rawScript: string,
    rawVisual: string,
    duration: number,
    aspect: '9:16' | '16:9'
  ): QAAuditResult {
    const QA_CONFIG = {
      MAX_WORDS_PER_SECOND_ID: 2.2,
      PACING_PENALTY: 20,
      CAMERA_REGEX: /dolly|pan|zoom|tracking|orbital|close-up|camera|motion|shot/i,
      CAMERA_PENALTY: 15,
      LIGHTING_REGEX: /lighting|glow|studio|cinematic|photorealistic|bokeh|shadow/i,
      LIGHTING_PENALTY: 10,
      TEXT_POLLUTION_REGEX: /subtitle|text on screen|font|typography|writing|tulisan/i,
      TEXT_POLLUTION_PENALTY: 20,
      PRODUCT_MENTION_PENALTY: 15,
    };

    const issues: string[] = [];
    const recommendations: string[] = [];
    let pScore = 100;
    let vScore = 100;
    let nScore = 100;

    const combinedVisualPrompt = (rawVisual + " " + rawPrompt).toLowerCase();

    // 1. Cek referensi produk dinamis
    const productName = input.productName || "Product";
    const keywords = [productName.toLowerCase()];
    const mentioned = keywords.some(kw => combinedVisualPrompt.includes(kw)) || combinedVisualPrompt.includes('product') || combinedVisualPrompt.includes('item');
    if (!mentioned && input.featuresProduct !== false) {
      pScore -= QA_CONFIG.PRODUCT_MENTION_PENALTY;
      issues.push(`Prompt tidak menyebut nama produk asli ("${productName}") atau sinonimnya.`);
    }

    // 2. Cek konsistensi visualStyle
    const visualStyle = input.visualStyle || (input.videoType === 'AFFILIATE' ? 'ugc' : 'studio');
    const looksLikeUGC = /iphone|ugc|handheld|casual|smartphone/i.test(combinedVisualPrompt);
    const looksLikeStudio = /35mm|50mm|f\/\d\.\d|studio|dslr|commercial shot/i.test(combinedVisualPrompt);

    if (visualStyle === 'ugc' && looksLikeStudio && !looksLikeUGC) {
      vScore -= 15;
      issues.push("Field visualStyle='ugc' tapi prompt memakai bahasa studio (35mm/DSLR). Inkonsistensi internal.");
    }
    if (visualStyle === 'studio' && looksLikeUGC && !looksLikeStudio) {
      vScore -= 15;
      issues.push("Field visualStyle='studio' tapi prompt memakai bahasa UGC/iPhone. Inkonsistensi internal.");
    }

    // 3. Pacing VO (dikalibrasi untuk Bahasa Indonesia)
    const wordCount = rawScript.split(/\s+/).filter(Boolean).length;
    const maxWords = Math.floor(duration * QA_CONFIG.MAX_WORDS_PER_SECOND_ID);
    if (wordCount > maxWords) {
      nScore -= QA_CONFIG.PACING_PENALTY;
      issues.push(`VO ${wordCount} kata melebihi batas ${maxWords} kata untuk durasi ${duration}s (${QA_CONFIG.MAX_WORDS_PER_SECOND_ID} kata/detik).`);
      recommendations.push(`Persingkat naskah menjadi maksimal ${maxWords} kata.`);
    }

    // 4. Camera Movement
    const hasCinematicCamera = QA_CONFIG.CAMERA_REGEX.test(rawPrompt);
    if (!hasCinematicCamera) {
      vScore -= QA_CONFIG.CAMERA_PENALTY;
      issues.push("Tidak ada instruksi gerakan kamera sinematik.");
      recommendations.push("Tambahkan arahan pergerakan kamera sinematik dinamis (pan/dolly/zoom).");
    }

    // 5. Lighting
    const hasLighting = QA_CONFIG.LIGHTING_REGEX.test(combinedVisualPrompt);
    if (!hasLighting) {
      vScore -= QA_CONFIG.LIGHTING_PENALTY;
      issues.push("Tidak ada instruksi pencahayaan sinematik.");
    }

    // 6. Text Pollution
    const hasTextPollution = QA_CONFIG.TEXT_POLLUTION_REGEX.test(combinedVisualPrompt);
    if (hasTextPollution) {
      vScore -= QA_CONFIG.TEXT_POLLUTION_PENALTY;
      issues.push("Prompt mengandung instruksi teks-di-layar yang dilarang (subtitle/typography/dll).");
      recommendations.push("Hapus kata-kata tipografi dari prompt video.");
    }

    const totalScore = Math.max(0, Math.round((pScore + vScore + nScore) / 3));
    const autoCorrected = totalScore < this.SCORE_THRESHOLD;

    // Auto-correction generation
    let correctedVideoPrompt = rawPrompt;
    if (hasTextPollution) {
      correctedVideoPrompt = correctedVideoPrompt.replace(/with (subtitles|text on screen|typography|tulisan)/gi, '');
    }
    if (!hasCinematicCamera || !hasLighting) {
      correctedVideoPrompt = `Cinematic ${aspect === '9:16' ? 'vertical' : 'widescreen'} shot of ${correctedVideoPrompt}, smooth slow camera dolly-in, soft studio rim lighting, 4k ultra-detailed photorealistic texture, shallow depth of field, high frame rate motion.`;
    }

    let correctedScript = rawScript;
    if (wordCount > maxWords && rawScript.length > 0) {
      const words = rawScript.split(/\s+/);
      correctedScript = words.slice(0, maxWords).join(' ') + '...';
    }

    return {
      passed: totalScore >= this.SCORE_THRESHOLD,
      score: totalScore,
      breakdown: {
        productLockConsistency: Math.max(0, pScore),
        visualPromptAdherence: Math.max(0, vScore),
        narrativeFlow: Math.max(0, nScore)
      },
      issues,
      recommendations,
      correctedVideoPrompt: correctedVideoPrompt.trim(),
      correctedScript: correctedScript.trim(),
      correctedVisualPrompt: rawVisual || correctedVideoPrompt,
      autoCorrected,
      auditNotes: `Procedural Director QA Audit selesai dengan skor ${totalScore}/100. ${autoCorrected ? 'Prompt telah di-auto-correct ke standar sinematik.' : 'Kualitas prompt memenuhi standar.'}`,
      modelUsed: 'Neuronna-Heuristic-QA-v2',
      timestamp: new Date().toISOString()
    };
  }
}
