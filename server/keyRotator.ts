import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export interface KeyHealth {
  key: string;
  maskedKey: string;
  provider: 'gemini' | 'openai' | 'fal';
  status: 'ACTIVE' | 'COOLDOWN' | 'DISABLED';
  cooldownUntil?: number;
  totalRequests: number;
  totalErrors: number;
  lastUsedAt?: string;
  lastErrorReason?: string;
}

class ApiKeyRotatorService {
  private geminiKeys: Map<string, KeyHealth> = new Map();
  private openAIKeys: Map<string, KeyHealth> = new Map();
  private falKeys: Map<string, KeyHealth> = new Map();
  private geminiIndex = 0;
  private openAIIndex = 0;
  private falIndex = 0;

  constructor() {
    this.reloadKeysFromEnv();
  }

  public reloadKeysFromEnv(): void {
    // 1. Load Gemini Keys
    const envGeminiList = process.env.GEMINI_API_KEYS 
      ? process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean)
      : [];
    
    // Also include single key environment variables
    const singleGemini = process.env.GEMINI_MANUAL_API_KEY || process.env.GEMINI_API_KEY;
    if (singleGemini && !envGeminiList.includes(singleGemini.trim())) {
      envGeminiList.unshift(singleGemini.trim());
    }

    envGeminiList.forEach(key => {
      if (!this.geminiKeys.has(key)) {
        this.geminiKeys.set(key, {
          key,
          maskedKey: this.maskKey(key),
          provider: 'gemini',
          status: 'ACTIVE',
          totalRequests: 0,
          totalErrors: 0
        });
      }
    });

    // 2. Load OpenAI Keys
    const envOpenAIList = process.env.OPENAI_API_KEYS
      ? process.env.OPENAI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const singleOpenAI = process.env.OPENAI_API_KEY;
    if (singleOpenAI && !envOpenAIList.includes(singleOpenAI.trim())) {
      envOpenAIList.unshift(singleOpenAI.trim());
    }

    envOpenAIList.forEach(key => {
      if (!this.openAIKeys.has(key)) {
        this.openAIKeys.set(key, {
          key,
          maskedKey: this.maskKey(key),
          provider: 'openai',
          status: 'ACTIVE',
          totalRequests: 0,
          totalErrors: 0
        });
      }
    });

    // 3. Load Fal.ai Keys
    const envFalList = process.env.FAL_KEYS
      ? process.env.FAL_KEYS.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const singleFal = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (singleFal && !envFalList.includes(singleFal.trim())) {
      envFalList.unshift(singleFal.trim());
    }

    envFalList.forEach(key => {
      if (!this.falKeys.has(key)) {
        this.falKeys.set(key, {
          key,
          maskedKey: this.maskKey(key),
          provider: 'fal',
          status: 'ACTIVE',
          totalRequests: 0,
          totalErrors: 0
        });
      }
    });

    console.log(`[KeyRotator] Initialized with ${this.geminiKeys.size} Gemini key(s), ${this.openAIKeys.size} OpenAI key(s), and ${this.falKeys.size} Fal.ai key(s).`);
  }

  private maskKey(key: string): string {
    if (!key || key.length < 8) return '****';
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  }

  private getMap(provider: 'gemini' | 'openai' | 'fal'): Map<string, KeyHealth> {
    if (provider === 'gemini') return this.geminiKeys;
    if (provider === 'openai') return this.openAIKeys;
    return this.falKeys;
  }

  /**
   * Add a key dynamically at runtime
   */
  public addKey(provider: 'gemini' | 'openai' | 'fal', key: string): KeyHealth {
    const cleanKey = key.trim();
    const map = this.getMap(provider);
    
    const existing = map.get(cleanKey);
    if (existing) {
      existing.status = 'ACTIVE';
      existing.cooldownUntil = undefined;
      return existing;
    }

    const health: KeyHealth = {
      key: cleanKey,
      maskedKey: this.maskKey(cleanKey),
      provider,
      status: 'ACTIVE',
      totalRequests: 0,
      totalErrors: 0
    };

    map.set(cleanKey, health);
    console.log(`[KeyRotator] Registered new ${provider} key (${health.maskedKey})`);
    return health;
  }

  /**
   * Get an active Gemini Key using Round-Robin rotation with Cooldown recovery
   */
  public getNextGeminiKey(): string | null {
    this.reloadKeysFromEnv();
    const now = Date.now();
    const keysArray = Array.from(this.geminiKeys.values());
    
    if (keysArray.length === 0) return null;

    // Recover keys from cooldown if expired
    keysArray.forEach(k => {
      if (k.status === 'COOLDOWN' && k.cooldownUntil && now >= k.cooldownUntil) {
        k.status = 'ACTIVE';
        k.cooldownUntil = undefined;
        console.log(`[KeyRotator] Gemini Key (${k.maskedKey}) cooldown expired. Restored to ACTIVE.`);
      }
    });

    const activeKeys = keysArray.filter(k => k.status === 'ACTIVE');
    if (activeKeys.length === 0) {
      console.warn(`[KeyRotator] All ${keysArray.length} Gemini API keys are currently in COOLDOWN or DISABLED.`);
      // Check if there is any key with shortest cooldown
      const cooldownKeys = keysArray.filter(k => k.status === 'COOLDOWN').sort((a, b) => (a.cooldownUntil || 0) - (b.cooldownUntil || 0));
      if (cooldownKeys.length > 0) {
        // Return shortest cooldown key as fallback if necessary
        const fallback = cooldownKeys[0];
        console.warn(`[KeyRotator] Using earliest cooldown key fallback: ${fallback.maskedKey}`);
        fallback.totalRequests++;
        fallback.lastUsedAt = new Date().toISOString();
        return fallback.key;
      }
      return null;
    }

    this.geminiIndex = (this.geminiIndex + 1) % activeKeys.length;
    const selected = activeKeys[this.geminiIndex];
    selected.totalRequests++;
    selected.lastUsedAt = new Date().toISOString();
    return selected.key;
  }

  /**
   * Get an active OpenAI key using Round-Robin
   */
  public getNextOpenAIKey(): string | null {
    this.reloadKeysFromEnv();
    const now = Date.now();
    const keysArray = Array.from(this.openAIKeys.values());

    if (keysArray.length === 0) return null;

    keysArray.forEach(k => {
      if (k.status === 'COOLDOWN' && k.cooldownUntil && now >= k.cooldownUntil) {
        k.status = 'ACTIVE';
        k.cooldownUntil = undefined;
      }
    });

    const activeKeys = keysArray.filter(k => k.status === 'ACTIVE');
    if (activeKeys.length === 0) return null;

    this.openAIIndex = (this.openAIIndex + 1) % activeKeys.length;
    const selected = activeKeys[this.openAIIndex];
    selected.totalRequests++;
    selected.lastUsedAt = new Date().toISOString();
    return selected.key;
  }

  /**
   * Get an active Fal.ai key using Round-Robin
   */
  public getNextFalKey(): string | null {
    this.reloadKeysFromEnv();
    const now = Date.now();
    const keysArray = Array.from(this.falKeys.values());

    if (keysArray.length === 0) return null;

    keysArray.forEach(k => {
      if (k.status === 'COOLDOWN' && k.cooldownUntil && now >= k.cooldownUntil) {
        k.status = 'ACTIVE';
        k.cooldownUntil = undefined;
      }
    });

    const activeKeys = keysArray.filter(k => k.status === 'ACTIVE');
    if (activeKeys.length === 0) return null;

    this.falIndex = (this.falIndex + 1) % activeKeys.length;
    const selected = activeKeys[this.falIndex];
    selected.totalRequests++;
    selected.lastUsedAt = new Date().toISOString();
    return selected.key;
  }

  /**
   * Report an error on a key (e.g. 429 Rate limit, 401 Unauthorized)
   */
  public reportKeyError(provider: 'gemini' | 'openai' | 'fal', key: string, error: any): void {
    const map = this.getMap(provider);
    const health = map.get(key);
    if (!health) return;

    health.totalErrors++;
    const errMsg = error?.message || String(error);
    health.lastErrorReason = errMsg;

    const isRateLimit = errMsg.includes('429') || 
                        errMsg.toLowerCase().includes('resource_exhausted') || 
                        errMsg.toLowerCase().includes('rate limit') ||
                        errMsg.toLowerCase().includes('quota');

    const isInvalid = errMsg.includes('401') || 
                      errMsg.includes('403') || 
                      errMsg.toLowerCase().includes('api_key_invalid') || 
                      errMsg.toLowerCase().includes('invalid api key');

    if (isInvalid) {
      health.status = 'DISABLED';
      console.error(`[KeyRotator] ${provider.toUpperCase()} Key (${health.maskedKey}) marked as DISABLED due to auth failure: ${errMsg}`);
    } else if (isRateLimit) {
      const cooldownMs = 60 * 1000; // 60s cooldown
      health.status = 'COOLDOWN';
      health.cooldownUntil = Date.now() + cooldownMs;
      console.warn(`[KeyRotator] ${provider.toUpperCase()} Key (${health.maskedKey}) hit Rate Limit/Quota. Put on COOLDOWN for 60s.`);
    }
  }

  /**
   * Wrapper for executing Gemini tasks with automatic key rotation and retries
   */
  public async executeGeminiWithRotation<T>(
    operation: (ai: GoogleGenAI, apiKey: string) => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError: any = null;
    const triedKeys = new Set<string>();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const apiKey = this.getNextGeminiKey();
      if (!apiKey) {
        throw new Error("Token API habis atau tidak ada API Key Gemini yang aktif. Silakan isi GEMINI_API_KEY di .env");
      }

      triedKeys.add(apiKey);
      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

      try {
        const result = await operation(ai, apiKey);
        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`[KeyRotator] Gemini attempt ${attempt}/${maxAttempts} failed on key (${this.maskKey(apiKey)}): ${err.message}`);
        this.reportKeyError('gemini', apiKey, err);

        // If it's not a rate limit / auth error and not retryable, throw immediately
        const isTransient = err.message?.includes('429') || 
                            err.message?.toLowerCase().includes('resource_exhausted') ||
                            err.message?.includes('500') ||
                            err.message?.includes('503') ||
                            err.message?.toLowerCase().includes('fetch failed');

        if (!isTransient && attempt >= maxAttempts) {
          throw err;
        }
      }
    }

    throw lastError || new Error("Gagal mengeksekusi request setelah rotasi API Key.");
  }

  public removeKey(provider: 'gemini' | 'openai' | 'fal', maskedOrFullKey: string): boolean {
    const map = this.getMap(provider);
    for (const [fullKey, health] of map.entries()) {
      if (fullKey === maskedOrFullKey || health.maskedKey === maskedOrFullKey) {
        map.delete(fullKey);
        console.log(`[KeyRotator] Removed ${provider} key (${health.maskedKey})`);
        return true;
      }
    }
    return false;
  }

  public reactivateKey(provider: 'gemini' | 'openai' | 'fal', maskedOrFullKey: string): boolean {
    const map = this.getMap(provider);
    for (const [fullKey, health] of map.entries()) {
      if (fullKey === maskedOrFullKey || health.maskedKey === maskedOrFullKey) {
        health.status = 'ACTIVE';
        health.cooldownUntil = undefined;
        health.lastErrorReason = undefined;
        console.log(`[KeyRotator] Reactivated ${provider} key (${health.maskedKey})`);
        return true;
      }
    }
    return false;
  }

  /**
   * Get health metrics for all keys (safe for UI reporting)
   */
  public getHealthReport(): { gemini: KeyHealth[]; openai: KeyHealth[]; fal: KeyHealth[] } {
    this.reloadKeysFromEnv();
    return {
      gemini: Array.from(this.geminiKeys.values()).map(k => ({ ...k, key: k.maskedKey })),
      openai: Array.from(this.openAIKeys.values()).map(k => ({ ...k, key: k.maskedKey })),
      fal: Array.from(this.falKeys.values()).map(k => ({ ...k, key: k.maskedKey }))
    };
  }
}

export const keyRotator = new ApiKeyRotatorService();
