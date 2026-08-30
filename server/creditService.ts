import { getFalModel, getFalImageModel, FAL_MODELS, FAL_IMAGE_MODELS, FalTier } from './falModelConfig';
import { userDatabase } from './middleware/auth';
import fs from 'fs';
import path from 'path';

export interface PricingConfig {
  marginMultiplier: number;
  exchangeRate: number;
  creditValueIdr: number;
  selectedTier: FalTier;
}

const CONFIG_FILE = path.join(process.cwd(), '.neurona_pricing_config.json');

// Default initial values
let pricingConfig: PricingConfig = {
  marginMultiplier: 1.8,
  exchangeRate: 16000,
  creditValueIdr: 200,
  selectedTier: 'balanced'
};

// Load saved pricing config if available
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    pricingConfig = {
      ...pricingConfig,
      ...parsed
    };
  }
} catch (e) {
  console.warn('[CREDIT SERVICE] Failed to load pricing config file, using defaults.');
}

function savePricingConfig(): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(pricingConfig, null, 2), 'utf8');
  } catch (e: any) {
    console.error('[CREDIT SERVICE] Error saving pricing config:', e.message);
  }
}

export class CreditService {
  /**
   * Get current pricing configuration
   */
  static getPricingConfig(): PricingConfig {
    return { ...pricingConfig };
  }

  /**
   * Update pricing configuration from Founder Dashboard
   */
  static updatePricingConfig(updates: Partial<PricingConfig>): PricingConfig {
    if (typeof updates.marginMultiplier === 'number' && updates.marginMultiplier > 0) {
      pricingConfig.marginMultiplier = Number(updates.marginMultiplier.toFixed(2));
    }
    if (typeof updates.exchangeRate === 'number' && updates.exchangeRate > 0) {
      pricingConfig.exchangeRate = Math.round(updates.exchangeRate);
    }
    if (typeof updates.creditValueIdr === 'number' && updates.creditValueIdr > 0) {
      pricingConfig.creditValueIdr = Math.round(updates.creditValueIdr);
    }
    if (updates.selectedTier && ['budget', 'balanced', 'premium'].includes(updates.selectedTier)) {
      pricingConfig.selectedTier = updates.selectedTier;
    }

    savePricingConfig();
    console.log('[CREDIT SERVICE] Updated pricing parameters:', pricingConfig);
    return { ...pricingConfig };
  }

  /**
   * Calculate credit cost for a specific model and generation parameters
   * Formula:
   * 1. Total USD cost = Model base cost (or duration * cost/sec) * resolutionMultiplier
   * 2. IDR Cost = Total USD cost * MARGIN_MULTIPLIER * EXCHANGE_RATE
   * 3. Raw Credits = IDR Cost / CREDIT_VALUE_IDR
   * 4. Final Credits = Math.ceil(Raw Credits) rounded up to nearest multiple of 5 (min 5)
   */
  static calculateCreditCost(
    modelId: string,
    params?: { duration?: number | string; resolution?: string; isFounderBypass?: boolean }
  ): {
    credits: number;
    costUsd: number;
    idrCost: number;
    marginMultiplier: number;
    exchangeRate: number;
    creditValueIdr: number;
    model: string;
  } {
    if (params?.isFounderBypass) {
      return {
        credits: 0,
        costUsd: 0,
        idrCost: 0,
        marginMultiplier: pricingConfig.marginMultiplier,
        exchangeRate: pricingConfig.exchangeRate,
        creditValueIdr: pricingConfig.creditValueIdr,
        model: modelId
      };
    }

    // Google Veo Asli video models
    if (modelId.startsWith('veo-asli') || modelId === 'veo-lite' || modelId === 'veo-pro' || modelId.includes('veo-2') || modelId.includes('veo-3')) {
      let costUsd = 0.15;
      let credits = 15;
      if (modelId.includes('lite') || modelId.includes('fast') || modelId === 'veo-asli-lite') {
        costUsd = 0.08;
        credits = 10;
      } else if (modelId.includes('pro') || modelId.includes('ultra') || modelId === 'veo-asli-pro') {
        costUsd = 0.30;
        credits = 25;
      } else {
        costUsd = 0.15;
        credits = 15;
      }
      return {
        credits,
        costUsd,
        idrCost: credits * pricingConfig.creditValueIdr,
        marginMultiplier: pricingConfig.marginMultiplier,
        exchangeRate: pricingConfig.exchangeRate,
        creditValueIdr: pricingConfig.creditValueIdr,
        model: modelId
      };
    }

    const model = getFalModel(modelId);
    let baseCostUsd = model.costUsd || 0.15;

    // Token-based / duration-based models (e.g. Seedance)
    const durationNum = params?.duration ? Number(params.duration) : Number(model.defaultDuration || 5);
    const validDuration = isNaN(durationNum) || durationNum <= 0 ? 5 : durationNum;

    if (model.isTokenBased && model.costPerSecondUsd) {
      baseCostUsd = validDuration * model.costPerSecondUsd;
    } else if (validDuration > 5 && model.defaultDuration === '5') {
      // Scale fixed duration models if 10s requested
      baseCostUsd = baseCostUsd * (validDuration / 5) * 0.95;
    }

    // Resolution factor
    let resolutionMultiplier = 1.0;
    if (params?.resolution === '1080p') {
      resolutionMultiplier = 1.4;
    } else if (params?.resolution === '480p') {
      resolutionMultiplier = 0.75;
    }

    const totalCostUsd = baseCostUsd * resolutionMultiplier;
    const idrCost = totalCostUsd * pricingConfig.marginMultiplier * pricingConfig.exchangeRate;
    const rawCredits = idrCost / pricingConfig.creditValueIdr;
    
    // Round to upper ceiling, then round to nearest multiple of 5
    const ceiledCredits = Math.ceil(rawCredits);
    const roundedCredits = Math.max(5, Math.ceil(ceiledCredits / 5) * 5);

    return {
      credits: roundedCredits,
      costUsd: Number(totalCostUsd.toFixed(4)),
      idrCost: Math.round(idrCost),
      marginMultiplier: pricingConfig.marginMultiplier,
      exchangeRate: pricingConfig.exchangeRate,
      creditValueIdr: pricingConfig.creditValueIdr,
      model: model.id
    };
  }

  /**
   * Calculate credit cost for Text-to-Image / Image Edit model & resolution
   * Multiplier: 0.5K -> 0.75x, 1K -> 1.0x, 2K -> 1.5x, 4K -> 2.0x
   */
  static calculateImageCreditCost(
    modelId: string,
    params?: { resolution?: '0.5K' | '1K' | '2K' | '4K' | string; isFounderBypass?: boolean }
  ): {
    credits: number;
    costUsd: number;
    idrCost: number;
    marginMultiplier: number;
    exchangeRate: number;
    creditValueIdr: number;
    model: string;
  } {
    if (params?.isFounderBypass) {
      return {
        credits: 0,
        costUsd: 0,
        idrCost: 0,
        marginMultiplier: pricingConfig.marginMultiplier,
        exchangeRate: pricingConfig.exchangeRate,
        creditValueIdr: pricingConfig.creditValueIdr,
        model: modelId
      };
    }

    // Google Imagen / Nano Asli image models
    if (modelId.startsWith('nano-asli') || modelId.includes('gemini-banana') || modelId.includes('google_image') || modelId.includes('gemini-imagen')) {
      let costUsd = 0.03;
      let credits = 10;
      if (modelId.includes('lite') || modelId.includes('draft') || modelId === 'nano-asli-lite') {
        costUsd = 0.015;
        credits = 5;
      } else if (modelId.includes('ultra') || modelId.includes('premium') || modelId === 'nano-asli-ultra' || modelId === 'nano-asli-premium') {
        costUsd = 0.08;
        credits = 25;
      } else if (modelId.includes('pro') || modelId === 'nano-asli-pro') {
        costUsd = 0.05;
        credits = 15;
      } else {
        costUsd = 0.03;
        credits = 10;
      }
      return {
        credits,
        costUsd,
        idrCost: credits * pricingConfig.creditValueIdr,
        marginMultiplier: pricingConfig.marginMultiplier,
        exchangeRate: pricingConfig.exchangeRate,
        creditValueIdr: pricingConfig.creditValueIdr,
        model: modelId
      };
    }

    const model = getFalImageModel(modelId);
    let totalCostUsd = 0;
    const res = (params?.resolution || '1K').toUpperCase();

    if (model.id === 'fal-ai/flux/schnell' || model.id.includes('flux')) {
      // Flux Schnell: $0.003 per megapixel (calculated from actual image resolution megapixels)
      let megaPixels = 1.0; // Default 1K ~ 1.0 MP
      if (res === '0.5K' || res === '480P') {
        megaPixels = 0.5; // ~0.5 MP
      } else if (res === '2K' || res === '1440P') {
        megaPixels = 2.07; // 1920x1080 ~ 2.07 MP
      } else if (res === '4K' || res === '2160P') {
        megaPixels = 8.29; // 3840x2160 ~ 8.29 MP
      }
      totalCostUsd = (model.costUsd || 0.003) * megaPixels;
    } else {
      // Nano Banana 2 ($0.08) / Nano Banana 2 Edit ($0.08) / Nano Banana Pro Edit ($0.15)
      const baseCostUsd = model.costUsd || 0.08;
      let resolutionMultiplier = 1.0;
      if (res === '0.5K' || res === '480P') {
        resolutionMultiplier = 0.75;
      } else if (res === '2K' || res === '1440P') {
        resolutionMultiplier = 1.5;
      } else if (res === '4K' || res === '2160P') {
        resolutionMultiplier = 2.0;
      }
      totalCostUsd = baseCostUsd * resolutionMultiplier;
    }

    const idrCost = totalCostUsd * pricingConfig.marginMultiplier * pricingConfig.exchangeRate;
    const rawCredits = idrCost / pricingConfig.creditValueIdr;

    // Dibulatkan ke kelipatan 5 ke atas, minimum 5 kredit
    const roundedCredits = Math.max(5, Math.ceil(rawCredits / 5) * 5);

    return {
      credits: roundedCredits,
      costUsd: Number(totalCostUsd.toFixed(4)),
      idrCost: Math.round(idrCost),
      marginMultiplier: pricingConfig.marginMultiplier,
      exchangeRate: pricingConfig.exchangeRate,
      creditValueIdr: pricingConfig.creditValueIdr,
      model: model.id
    };
  }

  /**
   * Hold/Deduct credits before rendering starts. Rejects if balance is insufficient.
   */
  static async holdCredits(
    userId: string,
    amount: number,
    projectId?: string
  ): Promise<{
    success: boolean;
    holdId?: string;
    message?: string;
    currentCredits?: number;
    requiredCredits?: number;
  }> {
    if (!userId) {
      return { success: false, message: 'Identitas user tidak valid.' };
    }

    const user = await userDatabase.getUser(userId);
    if (!user) {
      return { success: false, message: `User '${userId}' tidak ditemukan di database.` };
    }

    // Founder bypass
    if (user.role === 'founder' || userId === 'founder_root_001') {
      return {
        success: true,
        holdId: `founder_bypass_${Date.now()}`,
        currentCredits: 999999,
        requiredCredits: 0
      };
    }

    const currentCredits = user.credits || 0;
    if (currentCredits < amount) {
      return {
        success: false,
        message: `Kredit render tidak mencukupi. Diperlukan ${amount} kredit, sisa kredit Anda saat ini: ${currentCredits}. Silakan lakukan top-up kredit untuk melanjutkan.`,
        currentCredits,
        requiredCredits: amount
      };
    }

    // Deduct credits to hold
    await userDatabase.adjustCredits(user.uid, -amount, true);
    const holdId = `hold_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    console.log(`[CREDIT SERVICE] Held ${amount} credits from user '${user.email}' for project '${projectId || 'direct'}'. Hold ID: ${holdId}`);
    return {
      success: true,
      holdId,
      currentCredits: currentCredits - amount,
      requiredCredits: amount
    };
  }

  /**
   * Refund held credits back to user on terminal render errors (401/402/422/timeout/failure)
   */
  static async refundCredits(
    userId: string,
    amount: number,
    reason?: string
  ): Promise<void> {
    if (!userId || amount <= 0) return;
    
    // Check if founder bypass
    if (userId === 'founder_root_001') return;

    try {
      const user = await userDatabase.getUser(userId);
      if (user && user.role !== 'founder') {
        await userDatabase.adjustCredits(user.uid, amount, true);
        console.log(`[CREDIT SERVICE] 🔄 Successfully refunded ${amount} credits to user '${user.email}'. Reason: ${reason || 'Render Failure'}`);
      }
    } catch (e: any) {
      console.error(`[CREDIT SERVICE] Failed to refund credits to '${userId}':`, e.message);
    }
  }

  /**
   * Finalize and commit credit deduction on successful generation
   */
  static async commitHold(
    userId: string,
    amount: number,
    holdId?: string
  ): Promise<void> {
    console.log(`[CREDIT SERVICE] ✅ Committed deduction of ${amount} credits for user '${userId}'. (Hold: ${holdId || 'N/A'})`);
  }
}
