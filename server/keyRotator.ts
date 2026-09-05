import { GoogleGenAI } from "@google/genai";
import { db } from "../src/db/index";
import { apiKeys } from "../src/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { validateCredentialFormat, logCredentialAudit } from "./utils/credentialValidator";
import { encryptSecret, decryptSecret } from "./utils/crypto";
import crypto from "crypto";

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
  private disabledEnvKeys: Set<string> = new Set<string>();

  constructor() {
    console.log('[KeyRotator] Database-backed KeyRotator initialized (Persistent SQLite + AES-256 encryption).');
  }

  public maskKey(key: string): string {
    if (!key || key.length < 8) return '****';
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Check if an active key exists for the given provider
   */
  public hasActiveKey(provider: 'gemini' | 'veo' | 'openai' | 'fal'): boolean {
    try {
      const rows = db.select().from(apiKeys).where(eq(apiKeys.provider, provider)).all();
      const hasActive = rows.some(r => r.status === 'ACTIVE' || r.status === 'COOLDOWN');
      if (hasActive) return true;

      // Platform default environment variables if not disabled by error
      if (provider === 'gemini' && process.env.GEMINI_API_KEY && !this.disabledEnvKeys.has(process.env.GEMINI_API_KEY)) {
        return true;
      }
      if (provider === 'veo') {
        if (process.env.VEO_API_KEY && !this.disabledEnvKeys.has(process.env.VEO_API_KEY)) return true;
        if (process.env.GEMINI_API_KEY && !this.disabledEnvKeys.has(process.env.GEMINI_API_KEY)) return true;
      }
      if (provider === 'openai' && process.env.OPENAI_API_KEY && !this.disabledEnvKeys.has(process.env.OPENAI_API_KEY)) {
        return true;
      }
      if (provider === 'fal' && process.env.FAL_KEY && !this.disabledEnvKeys.has(process.env.FAL_KEY)) {
        return true;
      }

      return false;
    } catch (e) {
      console.error(`[KeyRotator] hasActiveKey error for ${provider}:`, e);
      return false;
    }
  }

  /**
   * Register a new API key directly into the encrypted SQLite database
   */
  public addKey(provider: 'gemini' | 'veo' | 'openai' | 'fal', key: string): KeyHealth {
    const cleanKey = key.trim();
    const targetProvider = provider;
    this.disabledEnvKeys.delete(cleanKey);

    const vRes = validateCredentialFormat(targetProvider, cleanKey, 'DATABASE_ADD');
    if (!vRes.valid) {
      logCredentialAudit(targetProvider, 'DATABASE_ADD', cleanKey, 'ADD_KEY', 'BLOCKED', vRes.reason);
      throw new Error(`[Kredensial Tidak Sesuai Provider] ${vRes.reason}`);
    }

    const masked = this.maskKey(cleanKey);
    const encrypted = encryptSecret(cleanKey);
    const now = new Date().toISOString();

    // Check if key already exists in DB for this provider
    const existingRows = db.select().from(apiKeys).where(eq(apiKeys.provider, targetProvider)).all();
    const match = existingRows.find(r => {
      const decrypted = decryptSecret(r.keyEncrypted);
      return decrypted === cleanKey || r.maskedKey === masked;
    });

    if (match) {
      db.update(apiKeys)
        .set({
          status: 'ACTIVE',
          cooldownUntil: null,
          lastErrorReason: null,
          keyEncrypted: encrypted,
          updatedAt: now
        })
        .where(eq(apiKeys.id, match.id))
        .run();

      console.log(`[KeyRotator] Reactivated existing ${targetProvider} key in DB (${masked})`);
      return {
        key: masked,
        maskedKey: masked,
        provider: targetProvider,
        status: 'ACTIVE',
        totalRequests: match.totalRequests || 0,
        totalErrors: match.totalErrors || 0,
        lastUsedAt: match.lastUsedAt || undefined
      };
    }

    const newId = crypto.randomUUID();
    db.insert(apiKeys).values({
      id: newId,
      provider: targetProvider,
      keyEncrypted: encrypted,
      maskedKey: masked,
      status: 'ACTIVE',
      cooldownUntil: null,
      totalRequests: 0,
      totalErrors: 0,
      createdAt: now,
      updatedAt: now
    }).run();

    console.log(`[KeyRotator] Stored new encrypted ${targetProvider} key in SQLite DB (${masked})`);

    return {
      key: masked,
      maskedKey: masked,
      provider: targetProvider,
      status: 'ACTIVE',
      totalRequests: 0,
      totalErrors: 0
    };
  }

  /**
   * Internal helper to fetch next rotated key for any provider from SQLite
   */
  private getNextKeyForProvider(provider: 'gemini' | 'veo' | 'openai' | 'fal'): string | null {
    try {
      const now = Date.now();
      const rows = db.select().from(apiKeys).where(eq(apiKeys.provider, provider)).all();

      if (rows.length === 0) return null;

      // Recover cooldowns if expired
      for (const row of rows) {
        if (row.status === 'COOLDOWN' && row.cooldownUntil && now >= row.cooldownUntil) {
          db.update(apiKeys)
            .set({ status: 'ACTIVE', cooldownUntil: null, updatedAt: new Date().toISOString() })
            .where(eq(apiKeys.id, row.id))
            .run();
          row.status = 'ACTIVE';
          row.cooldownUntil = null;
          console.log(`[KeyRotator] ${provider.toUpperCase()} Key (${row.maskedKey}) cooldown expired. Restored to ACTIVE in DB.`);
        }
      }

      // Filter active keys
      let activeRows = rows.filter(r => r.status === 'ACTIVE');

      // If all are cooldown or disabled, check shortest cooldown for Gemini/Veo only
      if (activeRows.length === 0) {
        if (provider === 'gemini' || provider === 'veo') {
          const cooldownRows = rows.filter(r => r.status === 'COOLDOWN').sort((a, b) => (a.cooldownUntil || 0) - (b.cooldownUntil || 0));
          if (cooldownRows.length > 0) {
            activeRows = [cooldownRows[0]];
          }
        }
      }

      if (activeRows.length === 0) return null;

      // Natural balanced round-robin: select least recently used key
      activeRows.sort((a, b) => {
        const timeA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const timeB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.totalRequests || 0) - (b.totalRequests || 0);
      });

      const selected = activeRows[0];
      const nextTotalRequests = (selected.totalRequests || 0) + 1;
      const isoNow = new Date().toISOString();

      // Update usage in SQLite immediately
      db.update(apiKeys)
        .set({
          totalRequests: nextTotalRequests,
          lastUsedAt: isoNow,
          updatedAt: isoNow
        })
        .where(eq(apiKeys.id, selected.id))
        .run();

      const decrypted = decryptSecret(selected.keyEncrypted);
      return decrypted || null;
    } catch (e) {
      console.error(`[KeyRotator] getNextKeyForProvider error for ${provider}:`, e);
      return null;
    }
  }

  /**
   * Get an active Fal.ai key directly from SQLite DB (No hardcoded fallbacks!)
   */
  public getNextFalKey(): string | null {
    return this.getNextKeyForProvider('fal');
  }

  /**
   * Get an active Gemini Key from SQLite DB (falls back to process.env.GEMINI_API_KEY if DB pool is empty and env key not disabled)
   */
  public getNextGeminiKey(): string | null {
    const keyFromDb = this.getNextKeyForProvider('gemini');
    if (keyFromDb) return keyFromDb;
    if (process.env.GEMINI_API_KEY && !this.disabledEnvKeys.has(process.env.GEMINI_API_KEY)) {
      return process.env.GEMINI_API_KEY;
    }
    return null;
  }

  /**
   * Get an active OpenAI Key from SQLite DB
   */
  public getNextOpenAIKey(): string | null {
    const keyFromDb = this.getNextKeyForProvider('openai');
    if (keyFromDb) return keyFromDb;
    if (process.env.OPENAI_API_KEY && !this.disabledEnvKeys.has(process.env.OPENAI_API_KEY)) {
      return process.env.OPENAI_API_KEY;
    }
    return null;
  }

  /**
   * Get an active Veo Key from SQLite DB (falls back to Gemini if empty)
   */
  public getNextVeoKey(): string | null {
    const keyFromDb = this.getNextKeyForProvider('veo');
    if (keyFromDb) return keyFromDb;
    if (process.env.VEO_API_KEY && !this.disabledEnvKeys.has(process.env.VEO_API_KEY)) {
      return process.env.VEO_API_KEY;
    }
    return this.getNextGeminiKey();
  }

  /**
   * Report an error on a key (401, 402, 429, etc.) and update SQLite DB status
   */
  public reportKeyError(provider: 'gemini' | 'veo' | 'openai' | 'fal', key: string, error: any): void {
    try {
      let errMsg = '';
      if (error && typeof error === 'object') {
        errMsg = error.message || (error.error && error.error.message) || JSON.stringify(error);
      } else {
        errMsg = String(error);
      }

      if (key) {
        if (key === process.env.GEMINI_API_KEY || key === process.env.VEO_API_KEY || key === process.env.OPENAI_API_KEY || key === process.env.FAL_KEY) {
          this.disabledEnvKeys.add(key);
          console.warn(`[KeyRotator] Disabled invalid/failing environment key for ${provider} (${this.maskKey(key)})`);
        }
      }

      const rows = db.select().from(apiKeys).where(eq(apiKeys.provider, provider)).all();
      const targetRow = rows.find(r => {
        const decrypted = decryptSecret(r.keyEncrypted);
        return decrypted === key || r.maskedKey === key || r.maskedKey === this.maskKey(key);
      });

      if (!targetRow) return;

      const isDepleted = errMsg.toLowerCase().includes('prepayment credits are depleted') ||
                         errMsg.toLowerCase().includes('exhausted') ||
                         errMsg.toLowerCase().includes('insufficient_quota') ||
                         errMsg.toLowerCase().includes('quota exhausted');

      const isRateLimit = !isDepleted && (errMsg.includes('429') ||
                          errMsg.toLowerCase().includes('resource_exhausted') ||
                          errMsg.toLowerCase().includes('rate limit') ||
                          errMsg.toLowerCase().includes('high demand') ||
                          errMsg.includes('503') ||
                          errMsg.toLowerCase().includes('unavailable'));

      const isInvalid = isDepleted || errMsg.includes('401') || errMsg.includes('402') ||
                        (errMsg.includes('403') && !isRateLimit) ||
                        errMsg.toLowerCase().includes('api_key_invalid') ||
                        errMsg.toLowerCase().includes('invalid api key') ||
                        errMsg.toLowerCase().includes('unauthenticated');

      const now = new Date().toISOString();
      const nextErrors = (targetRow.totalErrors || 0) + 1;

      if (isInvalid) {
        db.update(apiKeys)
          .set({
            status: 'DISABLED',
            totalErrors: nextErrors,
            lastErrorReason: errMsg,
            updatedAt: now
          })
          .where(eq(apiKeys.id, targetRow.id))
          .run();
        console.error(`[KeyRotator] ${provider.toUpperCase()} Key (${targetRow.maskedKey}) marked as DISABLED in DB: ${errMsg}`);
      } else if (isRateLimit) {
        let cooldownMs = 60 * 1000;
        const match = errMsg.match(/retry in ([0-9.]+)s/);
        if (match && match[1]) {
          const parsedDelay = parseFloat(match[1]) * 1000;
          if (!isNaN(parsedDelay) && parsedDelay > 0) cooldownMs = parsedDelay + 1000;
        }
        db.update(apiKeys)
          .set({
            status: 'COOLDOWN',
            cooldownUntil: Date.now() + cooldownMs,
            totalErrors: nextErrors,
            lastErrorReason: errMsg,
            updatedAt: now
          })
          .where(eq(apiKeys.id, targetRow.id))
          .run();
        console.warn(`[KeyRotator] ${provider.toUpperCase()} Key (${targetRow.maskedKey}) put on COOLDOWN in DB for ${(cooldownMs/1000).toFixed(1)}s.`);
      } else {
        db.update(apiKeys)
          .set({
            totalErrors: nextErrors,
            lastErrorReason: errMsg,
            updatedAt: now
          })
          .where(eq(apiKeys.id, targetRow.id))
          .run();
      }
    } catch (e) {
      console.error(`[KeyRotator] reportKeyError failed for ${provider}:`, e);
    }
  }

  /**
   * Remove a key from SQLite DB
   */
  public removeKey(provider: 'gemini' | 'veo' | 'openai' | 'fal', maskedOrFullKey: string): boolean {
    try {
      const rows = db.select().from(apiKeys).where(eq(apiKeys.provider, provider)).all();
      const match = rows.find(r => {
        const decrypted = decryptSecret(r.keyEncrypted);
        return decrypted === maskedOrFullKey || r.maskedKey === maskedOrFullKey;
      });

      if (match) {
        db.delete(apiKeys).where(eq(apiKeys.id, match.id)).run();
        console.log(`[KeyRotator] Deleted ${provider} key from DB (${match.maskedKey})`);
        return true;
      }
      return false;
    } catch (e) {
      console.error(`[KeyRotator] removeKey failed for ${provider}:`, e);
      return false;
    }
  }

  /**
   * Reactivate a DISABLED or COOLDOWN key in SQLite DB
   */
  public reactivateKey(provider: 'gemini' | 'veo' | 'openai' | 'fal', maskedOrFullKey: string): boolean {
    try {
      const rows = db.select().from(apiKeys).where(eq(apiKeys.provider, provider)).all();
      const match = rows.find(r => {
        const decrypted = decryptSecret(r.keyEncrypted);
        return decrypted === maskedOrFullKey || r.maskedKey === maskedOrFullKey;
      });

      if (match) {
        db.update(apiKeys)
          .set({
            status: 'ACTIVE',
            cooldownUntil: null,
            lastErrorReason: null,
            updatedAt: new Date().toISOString()
          })
          .where(eq(apiKeys.id, match.id))
          .run();
        console.log(`[KeyRotator] Reactivated ${provider} key in DB (${match.maskedKey})`);
        return true;
      }
      return false;
    } catch (e) {
      console.error(`[KeyRotator] reactivateKey failed for ${provider}:`, e);
      return false;
    }
  }

  /**
   * Clear all keys for a specific provider or all providers in SQLite DB
   */
  public clearAllKeys(provider?: 'gemini' | 'veo' | 'openai' | 'fal' | 'all'): void {
    try {
      if (!provider || provider === 'all') {
        db.delete(apiKeys).run();
        console.log('[KeyRotator] All API keys deleted from SQLite DB.');
      } else {
        db.delete(apiKeys).where(eq(apiKeys.provider, provider)).run();
        console.log(`[KeyRotator] All ${provider} keys deleted from SQLite DB.`);
      }
    } catch (e) {
      console.error(`[KeyRotator] clearAllKeys failed:`, e);
    }
  }

  /**
   * Get health metrics for all keys directly from SQLite DB (safe for UI)
   */
  public getHealthReport(): { gemini: KeyHealth[]; veo: KeyHealth[]; openai: KeyHealth[]; fal: KeyHealth[] } {
    try {
      const rows = db.select().from(apiKeys).all();

      const formatRow = (r: typeof apiKeys.$inferSelect): KeyHealth => ({
        key: r.maskedKey,
        maskedKey: r.maskedKey,
        provider: r.provider as any,
        status: (r.status as any) || 'ACTIVE',
        cooldownUntil: r.cooldownUntil || undefined,
        totalRequests: r.totalRequests || 0,
        totalErrors: r.totalErrors || 0,
        lastUsedAt: r.lastUsedAt || undefined,
        lastErrorReason: r.lastErrorReason || undefined
      });

      return {
        gemini: rows.filter(r => r.provider === 'gemini').map(formatRow),
        veo: rows.filter(r => r.provider === 'veo').map(formatRow),
        openai: rows.filter(r => r.provider === 'openai').map(formatRow),
        fal: rows.filter(r => r.provider === 'fal').map(formatRow)
      };
    } catch (e) {
      console.error('[KeyRotator] getHealthReport failed:', e);
      return { gemini: [], veo: [], openai: [], fal: [] };
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
        if (lastError) throw lastError;
        throw new Error("Token API habis atau tidak ada API Key Gemini yang aktif. Silakan isi GEMINI_API_KEY di Founder Control Center.");
      }

      const isOAuth = apiKey.startsWith('ya29.') || apiKey.startsWith('AQ.');
      let ai: GoogleGenAI;
      if (isOAuth) {
        const tempKey = process.env.GEMINI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        ai = new GoogleGenAI({ 
          apiKey: undefined, 
          httpOptions: { headers: { 'User-Agent': 'aistudio-build', 'Authorization': `Bearer ${apiKey}` } } 
        });
        if (tempKey) process.env.GEMINI_API_KEY = tempKey;
      } else {
        ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      }

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

        if (!isTransient || attempt >= maxAttempts) {
          throw err;
        }
      }
    }

    throw lastError || new Error("Gagal mengeksekusi request setelah rotasi API Key.");
  }
}

export const keyRotator = new ApiKeyRotatorService();
