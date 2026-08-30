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
  private static SCORE_THRESHOLD = 80;

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

Jika Rata-rata Skor < 85, perbaiki secara otomatis:
- "correctedVideoPrompt": Prompt video sinematik AI yang disempurnakan (dalam bahasa Inggris sinematik untuk hasil render AI terbaik).
- "correctedScript": Naskah narasi voiceover yang disesuaikan pas dengan durasi waktu.
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
      correctedVideoPrompt: data.correctedVideoPrompt || input.videoPrompt || input.promptText || "",
      correctedScript: data.correctedScript || input.voiceoverScript || input.script || "",
      correctedVisualPrompt: data.correctedVisualPrompt || input.visualPrompt || input.promptText || "",
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
      correctedVideoPrompt: data.correctedVideoPrompt || input.videoPrompt || input.promptText || '',
      correctedScript: data.correctedScript || input.voiceoverScript || input.script || '',
      correctedVisualPrompt: data.correctedVisualPrompt || input.visualPrompt || '',
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
    const issues: string[] = [];
    const recommendations: string[] = [];
    let pScore = 90;
    let vScore = 85;
    let nScore = 88;

    // Check 1: Video Prompt Cinematic keywords
    const hasCinematicCamera = /dolly|pan|zoom|tracking|orbital|close-up|camera|motion|shot/i.test(rawPrompt);
    const hasLighting = /lighting|glow|studio|cinematic|photorealistic|bokeh|shadow/i.test(rawPrompt);
    const hasTextPollution = /subtitle|text on screen|font|typography|writing|tulisan/i.test(rawPrompt);

    if (!hasCinematicCamera) {
      vScore -= 15;
      issues.push("Prompt video belum menyertakan instruksi pergerakan kamera (dolly/pan/zoom).");
      recommendations.push("Tambahkan arahan pergerakan kamera sinematik dinamis.");
    }
    if (!hasLighting) {
      vScore -= 10;
      issues.push("Pencahayaan atmosferik studio belum dispesifikasikan.");
    }
    if (hasTextPollution) {
      vScore -= 20;
      issues.push("Ditemukan kata 'text/subtitle' di prompt video yang dapat memicu artefak cacat pada video.");
      recommendations.push("Hapus kata-kata tipografi dari prompt video.");
    }

    // Check 2: Script length vs duration
    const wordCount = rawScript.split(/\s+/).filter(Boolean).length;
    const maxRecommendedWords = Math.ceil(duration * 2.8);
    if (wordCount > maxRecommendedWords) {
      nScore -= 20;
      issues.push(`Naskah voiceover (${wordCount} kata) terlalu panjang untuk durasi video ${duration} detik.`);
      recommendations.push(`Persingkat naskah menjadi maksimal ${maxRecommendedWords} kata agar tempo narasi natural.`);
    }

    // Check 3: Product Lock
    if (input.referenceImageUrl && !rawPrompt.toLowerCase().includes('product') && !rawPrompt.toLowerCase().includes('item')) {
      pScore -= 15;
      issues.push("Keterkaitan produk utama dengan gambar referensi perlu diperjelas pada prompt visual.");
    }

    const totalScore = Math.round((pScore + vScore + nScore) / 3);
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
    if (wordCount > maxRecommendedWords && rawScript.length > 0) {
      const words = rawScript.split(/\s+/);
      correctedScript = words.slice(0, maxRecommendedWords).join(' ') + '...';
    }

    return {
      passed: totalScore >= this.SCORE_THRESHOLD,
      score: totalScore,
      breakdown: {
        productLockConsistency: pScore,
        visualPromptAdherence: vScore,
        narrativeFlow: nScore
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
