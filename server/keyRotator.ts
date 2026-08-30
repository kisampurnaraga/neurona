import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const KEYS_CONFIG_FILE = path.join(process.cwd(), 'outputs', '.neurona_api_keys.json');
import { validateCredentialFormat, logCredentialAudit } from "./utils/credentialValidator";

export interface KeyHealth {
  key: string;
  maskedKey: string;
  provider: 'gemini' | 'veo' | 'openai' | 'fal';
  status: 'ACTIVE' | 'COOLDOWN' | 'DISABLED';
  cooldownUntil?: number;
  totalRequests: number;
  totalErrors: number;
  lastUsedAt?: string;
  lastErrorReason?: string;
}

class ApiKeyRotatorService {
  private geminiKeys: Map<string, KeyHealth> = new Map();
  private veoKeys: Map<string, KeyHealth> = new Map();
  private openAIKeys: Map<string, KeyHealth> = new Map();
  private falKeys: Map<string, KeyHealth> = new Map();
  private geminiIndex = 0;
  private veoIndex = 0;
  private openAIIndex = 0;
  private falIndex = 0;

  private userClearedPool = true;

  private saveState(): void {
    try {
      const state = {
        gemini: Array.from(this.geminiKeys.values()),
        veo: Array.from(this.veoKeys.values()),
        openai: Array.from(this.openAIKeys.values()),
        fal: Array.from(this.falKeys.values())
      };
      fs.writeFileSync(KEYS_CONFIG_FILE, JSON.stringify(state, null, 2), 'utf8');
      console.log(`[KeyRotator] Saved keys state to disk.`);
    } catch (err) {
      console.error('[KeyRotator] Failed to save keys state:', err);
    }
  }

  private loadState(): void {
    try {
      console.log(`[KeyRotator] Attempting to load from: ${KEYS_CONFIG_FILE}`);
      if (fs.existsSync(KEYS_CONFIG_FILE)) {
        const raw = fs.readFileSync(KEYS_CONFIG_FILE, 'utf8');
        const state = JSON.parse(raw);
        
        if (state.gemini) state.gemini.forEach((k: any) => this.geminiKeys.set(k.key, k));
        if (state.veo) state.veo.forEach((k: any) => this.veoKeys.set(k.key, k));
        if (state.openai) state.openai.forEach((k: any) => this.openAIKeys.set(k.key, k));
        if (state.fal) state.fal.forEach((k: any) => this.falKeys.set(k.key, k));
        
        console.log(`[KeyRotator] Loaded keys from disk: Gemini(${this.geminiKeys.size}), Veo(${this.veoKeys.size}), OpenAI(${this.openAIKeys.size}), Fal(${this.falKeys.size})`);
      }
    } catch (err) {
      console.error('[KeyRotator] Failed to load keys state:', err);
    }
  }


  constructor() {
    // Load previous state if available
    this.loadState();
  }

  public clearAllKeys(provider?: 'gemini' | 'veo' | 'openai' | 'fal' | 'all'): void {
    this.userClearedPool = true;
    if (!provider || provider === 'all') {
      this.geminiKeys.clear();
      this.veoKeys.clear();
      this.openAIKeys.clear();
      this.falKeys.clear();
    } else if (provider === 'gemini') {
      this.geminiKeys.clear();
    } else if (provider === 'veo') {
      this.veoKeys.clear();
    } else if (provider === 'openai') {
      this.openAIKeys.clear();
    } else if (provider === 'fal') {
      this.falKeys.clear();
    }
    console.log(`[KeyRotator] Pool cleared for provider: ${provider || 'all'}`);
    this.saveState();
  }

  public reloadKeysFromEnv(): void {
    // If pool was explicitly cleared or set for manual entry, do not auto-inject default env keys
    if (this.userClearedPool) {
      return;
    }
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

      const vRes = validateCredentialFormat('gemini', key, 'GEMINI_ENV');
      if (!vRes.valid) {
        logCredentialAudit('gemini', 'GEMINI_ENV', key, 'LOAD_KEYS', 'BLOCKED', vRes.reason);
        return;
      }
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

    // 2. Load Veo Keys
    const envVeoList = process.env.VEO_API_KEYS
      ? process.env.VEO_API_KEYS.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const singleVeo = process.env.VEO_API_KEY || process.env.VEO_MANUAL_API_KEY;
    if (singleVeo && !envVeoList.includes(singleVeo.trim())) {
      envVeoList.unshift(singleVeo.trim());
    }

    envVeoList.forEach(key => {
      const vRes = validateCredentialFormat('veo', key, 'VEO_ENV');
      if (!vRes.valid) {
        logCredentialAudit('veo', 'VEO_ENV', key, 'LOAD_KEYS', 'BLOCKED', vRes.reason);
        return;
      }
      if (!this.veoKeys.has(key)) {
        this.veoKeys.set(key, {
          key,
          maskedKey: this.maskKey(key),
          provider: 'veo',
          status: 'ACTIVE',
          totalRequests: 0,
          totalErrors: 0
        });
      }
    });

    // 3. Load OpenAI Keys
    const envOpenAIList = process.env.OPENAI_API_KEYS
      ? process.env.OPENAI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const singleOpenAI = process.env.OPENAI_API_KEY;
    if (singleOpenAI && !envOpenAIList.includes(singleOpenAI.trim())) {
      envOpenAIList.unshift(singleOpenAI.trim());
    }

    envOpenAIList.forEach(key => {
      const vRes = validateCredentialFormat('openai', key, 'OPENAI_ENV');
      if (!vRes.valid) {
        logCredentialAudit('openai', 'OPENAI_ENV', key, 'LOAD_KEYS', 'BLOCKED', vRes.reason);
        return;
      }
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

    // 4. Load Fal.ai Keys
    const envFalList = process.env.FAL_KEYS
      ? process.env.FAL_KEYS.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const singleFal = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (singleFal && !envFalList.includes(singleFal.trim())) {
      envFalList.unshift(singleFal.trim());
    }

    envFalList.forEach(key => {
      const vRes = validateCredentialFormat('fal', key, 'FAL_ENV');
      if (!vRes.valid) {
        logCredentialAudit('fal', 'FAL_ENV', key, 'LOAD_KEYS', 'BLOCKED', vRes.reason);
        return;
      }
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

    console.log(`[KeyRotator] Initialized with ${this.geminiKeys.size} Gemini key(s), ${this.veoKeys.size} Veo key(s), ${this.openAIKeys.size} OpenAI key(s), and ${this.falKeys.size} Fal.ai key(s).`);
  }

  private maskKey(key: string): string {
    if (!key || key.length < 8) return '****';
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  }

  private getMap(provider: 'gemini' | 'veo' | 'openai' | 'fal'): Map<string, KeyHealth> {
    if (provider === 'gemini') return this.geminiKeys;
    if (provider === 'veo') return this.veoKeys;
    if (provider === 'openai') return this.openAIKeys;
    return this.falKeys;
  }

  /**
   * Add a key dynamically at runtime
   */
  public addKey(provider: 'gemini' | 'veo' | 'openai' | 'fal', key: string): KeyHealth {
    const cleanKey = key.trim();
    let targetProvider = provider;

    const vRes = validateCredentialFormat(targetProvider, cleanKey, 'DYNAMIC_ADD');
    if (!vRes.valid) {
      logCredentialAudit(targetProvider, 'DYNAMIC_ADD', cleanKey, 'ADD_KEY', 'BLOCKED', vRes.reason);
      throw new Error(`[Kredensial Tidak Sesuai Provider] ${vRes.reason}`);
    }

    const map = this.getMap(targetProvider);
    
    const existing = map.get(cleanKey);
    if (existing) {
      existing.status = 'ACTIVE';
      existing.cooldownUntil = undefined;
      return existing;
    }

    const health: KeyHealth = {
      key: cleanKey,
      maskedKey: this.maskKey(cleanKey),
      provider: targetProvider,
      status: 'ACTIVE',
      totalRequests: 0,
      totalErrors: 0
    };

    map.set(cleanKey, health);
    console.log(`[KeyRotator] Registered new ${targetProvider} key (${health.maskedKey})`);
    this.saveState();
    return health;
  }

  /**
   * Get an active Veo Key using Round-Robin rotation with Gemini fallback
   */
  public getNextVeoKey(): string | null {
    this.reloadKeysFromEnv();
    const keysArray = Array.from(this.veoKeys.values());
    if (keysArray.length > 0) {
      const activeKeys = keysArray.filter(k => k.status === 'ACTIVE');
      if (activeKeys.length > 0) {
        const selected = activeKeys[this.veoIndex % activeKeys.length];
        this.veoIndex = (this.veoIndex + 1) % activeKeys.length;
        selected.totalRequests++;
        selected.lastUsedAt = new Date().toISOString();
        return selected.key;
      }
    }
    // Fallback to Gemini key pool
    return this.getNextGeminiKey();
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
  public reportKeyError(provider: 'gemini' | 'veo' | 'openai' | 'fal', key: string, error: any): void {
    const map = this.getMap(provider);
    const health = map.get(key);
    if (!health) return;

    health.totalErrors++;
    
    // Better error parsing
    let errMsg = '';
    if (error && typeof error === 'object') {
        errMsg = error.message || (error.error && error.error.message) || JSON.stringify(error);
    } else {
        errMsg = String(error);
    }
    health.lastErrorReason = errMsg;

    const isDepleted = errMsg.toLowerCase().includes('prepayment credits are depleted');
    
    const isRateLimit = !isDepleted && (errMsg.includes('429') || 
                        errMsg.toLowerCase().includes('resource_exhausted') || 
                        errMsg.toLowerCase().includes('rate limit') ||
                        errMsg.toLowerCase().includes('quota') ||
                        errMsg.includes('503') ||
                        errMsg.toLowerCase().includes('unavailable') ||
                        errMsg.toLowerCase().includes('high demand'));

    const isBillingExhausted = !isRateLimit && (errMsg.toLowerCase().includes('spending cap') || errMsg.toLowerCase().includes('exceeded its monthly') || errMsg.toLowerCase().includes('exhausted balance'));
    const isInvalid = isDepleted || isBillingExhausted || errMsg.includes('401') || 
                      (errMsg.includes('403') && !isRateLimit) || 
                      errMsg.toLowerCase().includes('api_key_invalid') || 
                      errMsg.toLowerCase().includes('invalid api key') ||
                      errMsg.toLowerCase().includes('unauthenticated');

    if (isInvalid) {
      health.status = 'DISABLED';
      console.error(`[KeyRotator] ${provider.toUpperCase()} Key (${health.maskedKey}) marked as DISABLED due to auth failure: ${errMsg}`);
    } else if (isRateLimit) {
      if (health.status !== 'DISABLED') {
        let cooldownMs = 60 * 1000; // default 60s cooldown
        const match = errMsg.match(/retry in ([0-9.]+)s/);
        if (match && match[1]) {
            const parsedDelay = parseFloat(match[1]) * 1000;
            if (!isNaN(parsedDelay) && parsedDelay > 0) {
                cooldownMs = parsedDelay + 1000; // Add 1s buffer
            }
        }
        health.status = 'COOLDOWN';
        health.cooldownUntil = Date.now() + cooldownMs;
        console.warn(`[KeyRotator] ${provider.toUpperCase()} Key (${health.maskedKey}) hit Rate Limit/Quota. Put on COOLDOWN for ${(cooldownMs/1000).toFixed(1)}s.`);
      }
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

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const apiKey = this.getNextGeminiKey();
      if (!apiKey) {
        if (lastError) {
          throw lastError; // If we already tried and failed, throw the actual API error
        }
        throw new Error("Token API habis atau tidak ada API Key Gemini yang aktif. Silakan isi GEMINI_API_KEY di .env");
      }

      // If the key we got is currently in cooldown (fallback), we should wait until it's ready if possible
      const map = this.getMap('gemini');
      const health = map.get(apiKey);
      if (health && health.status === 'COOLDOWN' && health.cooldownUntil) {
          const waitMs = health.cooldownUntil - Date.now();
          if (waitMs > 0 && waitMs < 25000) { // Only wait if it's less than 25s to avoid huge hangups
              console.log(`[KeyRotator] Fallback key is on cooldown. Waiting ${waitMs}ms before reusing...`);
              await new Promise(r => setTimeout(r, waitMs));
          }
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

      try {
        const result = await operation(ai, apiKey);
        return result;
      } catch (err: any) {
        lastError = err;
        
        let errMsg = '';
        if (err && typeof err === 'object') {
            errMsg = err.message || (err.error && err.error.message) || JSON.stringify(err);
        } else {
            errMsg = String(err);
        }

        console.warn(`[KeyRotator] Gemini attempt ${attempt}/${maxAttempts} failed on key (${this.maskKey(apiKey)}): ${errMsg}`);
        this.reportKeyError('gemini', apiKey, err);

        const isTransient = errMsg.includes('429') || 
                            errMsg.toLowerCase().includes('resource_exhausted') ||
                            errMsg.includes('500') ||
                            errMsg.includes('503') ||
                            errMsg.toLowerCase().includes('fetch failed');

        if (!isTransient) {
          throw err;
        }
        
        // If it's the last attempt, don't loop
        if (attempt >= maxAttempts) {
            throw err;
        }
      }
    }

    throw lastError || new Error("Gagal mengeksekusi request setelah rotasi API Key.");
  }

  public removeKey(provider: 'gemini' | 'veo' | 'openai' | 'fal', maskedOrFullKey: string): boolean {
    const map = this.getMap(provider);
    for (const [fullKey, health] of map.entries()) {
      if (fullKey === maskedOrFullKey || health.maskedKey === maskedOrFullKey) {
        map.delete(fullKey);
        console.log(`[KeyRotator] Removed ${provider} key (${health.maskedKey})`);
        this.saveState();
        return true;
      }
    }
    return false;
  }

  public reactivateKey(provider: 'gemini' | 'veo' | 'openai' | 'fal', maskedOrFullKey: string): boolean {
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
  public getHealthReport(): { gemini: KeyHealth[]; veo: KeyHealth[]; openai: KeyHealth[]; fal: KeyHealth[] } {
    this.reloadKeysFromEnv();
    return {
      gemini: Array.from(this.geminiKeys.values()).map(k => ({ ...k, key: k.maskedKey })),
      veo: Array.from(this.veoKeys.values()).map(k => ({ ...k, key: k.maskedKey })),
      openai: Array.from(this.openAIKeys.values()).map(k => ({ ...k, key: k.maskedKey })),
      fal: Array.from(this.falKeys.values()).map(k => ({ ...k, key: k.maskedKey }))
    };
  }
}

export const keyRotator = new ApiKeyRotatorService();
