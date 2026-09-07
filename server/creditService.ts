import { getFalModel, getFalImageModel, FAL_MODELS, FAL_IMAGE_MODELS, FalTier } from './falModelConfig';
import { userDatabase } from './middleware/auth';
import { db } from '../src/db/index';
import { creditHolds, users } from '../src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export interface PricingConfig {
  marginMultiplier: number;
  exchangeRate: number;
  creditValueIdr: number;
  selectedTier: FalTier;
}

// Authoritative Pricing Registry
export interface ProviderPricing {
  provider: string;
  model: string;
  operation: string;
  costUsd: number;
  currency: string;
  effectiveDate: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
}

export function resolveCanonicalModelId(modelId: string): string {
  const clean = (modelId || '').trim().toLowerCase();
  const aliasMap: Record<string, string> = {
    'openart-sdxl': 'kling-3-omni',
    'openart-flux-schnell': 'nano-banana-2-lite',
    'openart-flux-pro': 'nano-banana-pro',
    'openart-photoreal-v2': 'byte-plus-seedream-5-lite',
    'openart-video-fast': 'byte-plus-seedance-2-fast',
    'openart-video-pro': 'byte-plus-seedance-2',
    'openart-wan2.1': 'wan2-7',
    'openart-wan21': 'wan2-7',
    'openart-veo2': 'veo3-1'
  };
  return aliasMap[clean] || clean;
}

const AUTHORITATIVE_PRICING_REGISTRY: ProviderPricing[] = [
  // Verified OpenArt Live MCP Image Models & Aliases
  { provider: 'OpenArt', model: 'kling-3-omni', operation: 'text-to-image', costUsd: 0.010, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'openart-sdxl', operation: 'text-to-image', costUsd: 0.010, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'nano-banana-2-lite', operation: 'text-to-image', costUsd: 0.015, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'openart-flux-schnell', operation: 'text-to-image', costUsd: 0.015, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'nano-banana-2', operation: 'text-to-image', costUsd: 0.020, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'nano-banana-pro', operation: 'text-to-image', costUsd: 0.030, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'openart-flux-pro', operation: 'text-to-image', costUsd: 0.030, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'byte-plus-seedream-5-lite', operation: 'text-to-image', costUsd: 0.015, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'openart-photoreal-v2', operation: 'text-to-image', costUsd: 0.015, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'byte-plus-seedream-5-pro', operation: 'text-to-image', costUsd: 0.030, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'gpt-image-2', operation: 'text-to-image', costUsd: 0.020, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'wan2-7-image', operation: 'text-to-image', costUsd: 0.015, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },

  // Verified OpenArt Live MCP Video Models (I2V / T2V) & Aliases
  { provider: 'OpenArt', model: 'byte-plus-seedance-2-fast', operation: 'image-to-video', costUsd: 0.060, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'openart-video-fast', operation: 'image-to-video', costUsd: 0.060, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'byte-plus-seedance-2', operation: 'image-to-video', costUsd: 0.120, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'openart-video-pro', operation: 'image-to-video', costUsd: 0.120, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'byte-plus-seedance-2-5', operation: 'image-to-video', costUsd: 0.180, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'veo3-1', operation: 'image-to-video', costUsd: 0.250, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'veo3-1', operation: 'text-to-video', costUsd: 0.250, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'openart-veo2', operation: 'image-to-video', costUsd: 0.250, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'openart-veo2', operation: 'text-to-video', costUsd: 0.250, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'wan2-7', operation: 'image-to-video', costUsd: 0.120, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'openart-wan2.1', operation: 'image-to-video', costUsd: 0.120, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'gemini-omni-flash', operation: 'image-to-video', costUsd: 0.100, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' },
  { provider: 'OpenArt', model: 'gemini-omni-flash', operation: 'text-to-video', costUsd: 0.100, currency: 'USD', effectiveDate: '2026-09-07', verificationStatus: 'VERIFIED' }
];

export function getProviderPricing(provider: string, model: string, operation: string): ProviderPricing | undefined {
  return AUTHORITATIVE_PRICING_REGISTRY.find(p => p.provider.toLowerCase() === provider.toLowerCase() && p.model.toLowerCase() === model.toLowerCase() && p.operation.toLowerCase() === operation.toLowerCase());
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
    params?: { duration?: number | string; resolution?: string; isFounderBypass?: boolean; provider?: string; operation?: string }
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

    // Resolve canonical model and provider
    const canonicalModelId = resolveCanonicalModelId(modelId);
    let resolvedProvider = params?.provider;

    if (!resolvedProvider) {
      const knownOpenArtModels = [
        'veo3-1', 'wan2-7', 'byte-plus-seedance-2', 'byte-plus-seedance-2-fast', 'byte-plus-seedance-2-5',
        'kling-3-omni', 'nano-banana-2-lite', 'nano-banana-2', 'nano-banana-pro',
        'byte-plus-seedream-5-lite', 'byte-plus-seedream-5-pro', 'gpt-image-2', 'wan2-7-image', 'gemini-omni-flash'
      ];
      if (
        knownOpenArtModels.includes(canonicalModelId) || 
        modelId.toLowerCase().startsWith('openart-') || 
        modelId.toLowerCase().includes('openart')
      ) {
        resolvedProvider = 'OpenArt';
      }
    }

    // Check authoritative registry first for explicit providers
    if (resolvedProvider && params?.operation) {
      const explicitPricing = getProviderPricing(resolvedProvider, canonicalModelId, params.operation) ||
                              getProviderPricing(resolvedProvider, modelId, params.operation);
      if (explicitPricing) {
        const totalCostUsd = explicitPricing.costUsd;
        const idrCost = totalCostUsd * pricingConfig.marginMultiplier * pricingConfig.exchangeRate;
        const rawCredits = idrCost / pricingConfig.creditValueIdr;
        const ceiledCredits = Math.ceil(rawCredits);
        const roundedCredits = Math.max(5, Math.ceil(ceiledCredits / 5) * 5);
        
        console.log(`[CREDIT SERVICE] 💰 Using authoritative pricing for ${resolvedProvider} -> ${canonicalModelId} (${params.operation}): $${totalCostUsd} -> ${roundedCredits} credits`);
        return {
          credits: roundedCredits,
          costUsd: Number(totalCostUsd.toFixed(4)),
          idrCost: Math.round(idrCost),
          marginMultiplier: pricingConfig.marginMultiplier,
          exchangeRate: pricingConfig.exchangeRate,
          creditValueIdr: pricingConfig.creditValueIdr,
          model: canonicalModelId
        };
      }
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
    params?: { resolution?: '0.5K' | '1K' | '2K' | '4K' | string; isFounderBypass?: boolean; provider?: string; operation?: string }
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

    // Resolve canonical model and provider
    const canonicalModelId = resolveCanonicalModelId(modelId);
    let resolvedProvider = params?.provider;

    if (!resolvedProvider) {
      const knownOpenArtModels = [
        'veo3-1', 'wan2-7', 'byte-plus-seedance-2', 'byte-plus-seedance-2-fast', 'byte-plus-seedance-2-5',
        'kling-3-omni', 'nano-banana-2-lite', 'nano-banana-2', 'nano-banana-pro',
        'byte-plus-seedream-5-lite', 'byte-plus-seedream-5-pro', 'gpt-image-2', 'wan2-7-image', 'gemini-omni-flash'
      ];
      if (
        knownOpenArtModels.includes(canonicalModelId) || 
        modelId.toLowerCase().startsWith('openart-') || 
        modelId.toLowerCase().includes('openart')
      ) {
        resolvedProvider = 'OpenArt';
      }
    }

    // Check authoritative registry first for explicit providers
    if (resolvedProvider && params?.operation) {
      const explicitPricing = getProviderPricing(resolvedProvider, canonicalModelId, params.operation) ||
                              getProviderPricing(resolvedProvider, modelId, params.operation);
      if (explicitPricing) {
        const totalCostUsd = explicitPricing.costUsd;
        const idrCost = totalCostUsd * pricingConfig.marginMultiplier * pricingConfig.exchangeRate;
        const rawCredits = idrCost / pricingConfig.creditValueIdr;
        const ceiledCredits = Math.ceil(rawCredits);
        const roundedCredits = Math.max(5, Math.ceil(ceiledCredits / 5) * 5);
        
        console.log(`[CREDIT SERVICE] 💰 Using authoritative pricing for ${resolvedProvider} -> ${canonicalModelId} (${params.operation}): $${totalCostUsd} -> ${roundedCredits} credits`);
        return {
          credits: roundedCredits,
          costUsd: Number(totalCostUsd.toFixed(4)),
          idrCost: Math.round(idrCost),
          marginMultiplier: pricingConfig.marginMultiplier,
          exchangeRate: pricingConfig.exchangeRate,
          creditValueIdr: pricingConfig.creditValueIdr,
          model: canonicalModelId
        };
      }
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
   * Hold/Deduct credits before rendering starts. Idempotent & prevents double charging.
   */
  static async holdCredits(
    userId: string,
    amount: number,
    projectId?: string,
    idempotencyKey?: string,
    provider?: string,
    model?: string,
    operation?: string
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

    const effectiveKey = idempotencyKey || (projectId ? `idemp_${projectId}_${amount}` : `idemp_auto_${Date.now()}_${Math.random()}`);
    
    // Check founder bypass
    const user = await userDatabase.getUser(userId);
    if (!user) {
      return { success: false, message: `User '${userId}' tidak ditemukan di database.` };
    }
    
    if (user.role === 'founder' || userId === 'founder_root_001') {
      const holdId = `founder_bypass_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      // Track founder bypass in db for audit but no credit deduct
      await db.insert(creditHolds).values({
        id: holdId,
        userId: userId,
        amount: 0,
        idempotencyKey: effectiveKey,
        provider,
        model,
        operation,
        status: 'COMMITTED',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }).onConflictDoNothing();
      return {
        success: true,
        holdId,
        currentCredits: 999999,
        requiredCredits: 0
      };
    }

    try {
      return db.transaction((tx) => {
        // 1. Check for existing idempotency key to prevent double deduct
        const existingHold = tx.select().from(creditHolds).where(and(eq(creditHolds.userId, userId), eq(creditHolds.idempotencyKey, effectiveKey))).limit(1).all();
        
        if (existingHold.length > 0) {
          const hold = existingHold[0];
          console.log(`[CREDIT SERVICE] 🔁 Idempotent hit for key '${effectiveKey}'. Status: ${hold.status}`);
          return {
            success: hold.status !== 'REFUNDED' && hold.status !== 'FAILED',
            holdId: hold.id,
            currentCredits: user.credits,
            requiredCredits: hold.amount
          };
        }

        // 2. Refresh user to ensure we have the absolute latest credit balance in tx
        const txUserList = tx.select().from(users).where(eq(users.uid, userId)).limit(1).all();
        const txUser = txUserList[0];
        
        if (!txUser) {
          throw new Error('User not found in transaction');
        }

        const currentCredits = txUser.credits || 0;
        if (currentCredits < amount) {
          return {
            success: false,
            message: `Kredit render tidak mencukupi. Diperlukan ${amount} kredit, sisa kredit Anda saat ini: ${currentCredits}. Silakan lakukan top-up kredit untuk melanjutkan.`,
            currentCredits,
            requiredCredits: amount
          };
        }

        // 3. Deduct credits
        const newCredits = currentCredits - amount;
        tx.update(users).set({ credits: newCredits }).where(eq(users.uid, userId)).run();

        // 4. Create hold record
        const holdId = `hold_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        tx.insert(creditHolds).values({
          id: holdId,
          userId: userId,
          amount: amount,
          idempotencyKey: effectiveKey,
          generationId: projectId,
          provider: provider,
          model: model,
          operation: operation,
          status: 'RESERVED',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }).run();

        console.log(`[CREDIT SERVICE] Held ${amount} credits from user '${txUser.email}' (ID: ${userId}). Hold ID: ${holdId}`);
        return {
          success: true,
          holdId,
          currentCredits: newCredits,
          requiredCredits: amount
        };
      });
    } catch (e: any) {
      const isUniqueConstraint = e.message?.toLowerCase().includes('unique') || e.code === 'SQLITE_CONSTRAINT';
      if (isUniqueConstraint) {
        // Safe concurrent fallback: Fetch existing hold outside the transaction
        try {
          const existing = db.select().from(creditHolds).where(and(eq(creditHolds.userId, userId), eq(creditHolds.idempotencyKey, effectiveKey))).limit(1).all();
          if (existing.length > 0) {
            const hold = existing[0];
            console.log(`[CREDIT SERVICE] 🔁 Concurrent safe fallback: Idempotent hit for key '${effectiveKey}'. Status: ${hold.status}`);
            return {
              success: hold.status !== 'REFUNDED' && hold.status !== 'FAILED',
              holdId: hold.id,
              currentCredits: user.credits,
              requiredCredits: hold.amount
            };
          }
        } catch (readErr: any) {
          console.error('[CREDIT SERVICE] Error reading existing hold on concurrent conflict:', readErr.message);
        }
      }
      console.error(`[CREDIT SERVICE] Failed to hold credits: ${e.message}`);
      return { success: false, message: `Terjadi kesalahan sistem saat memproses kredit: ${e.message}` };
    }
  }

  /**
   * Refund held credits back to user on terminal render errors (401/402/422/timeout/failure)
   */
  static async refundCredits(
    userId: string,
    amount: number,
    reason?: string,
    holdId?: string
  ): Promise<void> {
    if (!userId || amount <= 0) return;
    
    // Check if founder bypass
    if (userId === 'founder_root_001') return;

    const user = await userDatabase.getUser(userId);
    if (!user) return;
    if (user.role === 'founder') return; // Bypass for real founders too
    
    try {
      db.transaction((tx) => {
        let actualRefundAmount = amount;

        if (holdId) {
          const holds = tx.select().from(creditHolds).where(eq(creditHolds.id, holdId)).limit(1).all();
          if (holds.length === 0) {
            throw new Error(`Hold ID '${holdId}' tidak ditemukan.`);
          }

          const hold = holds[0];
          // Strict validations
          if (hold.userId !== userId) {
            throw new Error(`Hold ID '${holdId}' bukan milik user '${userId}'.`);
          }
          if (hold.amount !== amount) {
            throw new Error(`Hold amount (${hold.amount}) tidak sesuai dengan request refund (${amount}).`);
          }
          if (hold.status === 'REFUNDED') {
            console.log(`[CREDIT SERVICE] ⚠️ Hold '${holdId}' has ALREADY been refunded. Skipping duplicate refund.`);
            return;
          }
          if (hold.status === 'COMMITTED') {
            throw new Error(`Hold ID '${holdId}' telah di-commit secara permanen. Tidak bisa me-refund.`);
          }

          // Use the actual held amount for refund to guarantee 100% precision
          actualRefundAmount = hold.amount;

          // Update hold status to REFUNDED
          tx.update(creditHolds).set({ status: 'REFUNDED', updatedAt: Date.now() }).where(eq(creditHolds.id, holdId)).run();
        }

        // Refund credits to user
        const txUserList = tx.select().from(users).where(eq(users.uid, userId)).limit(1).all();
        if (txUserList.length === 0) {
          throw new Error(`User ID '${userId}' tidak ditemukan dalam transaksi refund.`);
        }

        const currentCredits = txUserList[0].credits || 0;
        tx.update(users).set({ credits: currentCredits + actualRefundAmount }).where(eq(users.uid, userId)).run();
        console.log(`[CREDIT SERVICE] 🔄 Successfully refunded ${actualRefundAmount} credits to user '${user.email}'. Reason: ${reason || 'Render Failure'}`);
      });
    } catch (e: any) {
      console.error(`[CREDIT SERVICE] Failed to refund credits to '${userId}':`, e.message);
      // Re-throw so any caller can inspect or handle DB transaction rollback
      throw e;
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
    if (!holdId) {
      console.log(`[CREDIT SERVICE] ✅ Committed deduction of ${amount} credits for user '${userId}'. (Hold: N/A)`);
      return;
    }
    try {
      db.transaction((tx) => {
        const holds = tx.select().from(creditHolds).where(eq(creditHolds.id, holdId)).limit(1).all();
        if (holds.length === 0) {
          throw new Error(`Hold ID '${holdId}' tidak ditemukan.`);
        }

        const hold = holds[0];
        // Strict ownership, amount, and state validations
        if (hold.userId !== userId) {
          throw new Error(`Hold ID '${holdId}' bukan milik user '${userId}'.`);
        }
        if (hold.amount !== amount) {
          throw new Error(`Hold amount (${hold.amount}) tidak sesuai dengan request commit (${amount}).`);
        }
        if (hold.status === 'REFUNDED') {
          throw new Error(`Hold ID '${holdId}' telah di-refund sebelumnya. Tidak bisa me-commit.`);
        }
        if (hold.status === 'COMMITTED') {
          console.log(`[CREDIT SERVICE] ⚠️ Attempted to commit hold '${holdId}' but it's already COMMITTED.`);
          return;
        }
        if (hold.status !== 'RESERVED') {
          throw new Error(`Hold ID '${holdId}' berstatus ${hold.status}. Hanya status RESERVED yang dapat di-commit.`);
        }

        // Update hold status to COMMITTED
        tx.update(creditHolds).set({ status: 'COMMITTED', updatedAt: Date.now() }).where(eq(creditHolds.id, holdId)).run();
        console.log(`[CREDIT SERVICE] ✅ Committed deduction of ${amount} credits for user '${userId}'. (Hold: ${holdId})`);
      });
    } catch (e: any) {
      console.error(`[CREDIT SERVICE] Failed to commit hold '${holdId}':`, e.message);
      throw e;
    }
  }
}
