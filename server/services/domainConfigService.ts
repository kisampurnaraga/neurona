import { db } from '../../src/db/index';
import { systemSettings } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface DomainConfig {
  environment: AppEnvironment;
  productionAppUrl: string;
  stagingAppUrl?: string;
  developmentAppUrl?: string;
  canonicalUrl: string;
  publicUrl: string;
  allowedOrigins: string[];
  trustedOAuthOrigins: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface DerivedOAuthUrls {
  oauthCallbackBaseUrl: string;
  openArtOAuthCallbackUrl: string;
  higgsfieldOAuthCallbackUrl: string;
  telegramWebhookUrl: string;
}

export interface DomainValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig?: DomainConfig;
  derivedUrls?: DerivedOAuthUrls;
}

export class DomainConfigService {
  private static readonly DB_KEY = 'domain_url_management_config';

  // Default baseline origins for out-of-the-box local and AI Studio container operation
  private static readonly DEFAULT_ORIGINS = [
    'http://localhost:3000',
    'https://app.neurona.ai',
    'https://neurona.ai',
    'https://ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app',
    'https://ais-pre-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app'
  ];

  /**
   * Normalizes a single origin / URL string:
   * - Trim whitespace
   * - Strip trailing slashes
   * - Enforce lowercase protocol and host
   */
  public static normalizeUrl(rawUrl: string): string {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';

    try {
      const parsed = new URL(trimmed);
      // Remove trailing slash if it's just origin or root path
      const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
      const port = parsed.port ? `:${parsed.port}` : '';
      return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${port}${pathname}`;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  }

  /**
   * Validate a single absolute origin / URL
   */
  public static validateOriginString(rawUrl: string, fieldName: string, allowHttpForLocalhost = true): { valid: boolean; error?: string; normalized?: string } {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return { valid: false, error: `${fieldName} tidak boleh kosong.` };
    }

    const trimmed = rawUrl.trim();

    // Reject dangerous URI schemes
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('file:') || lower.startsWith('vbscript:') || lower.startsWith('blob:')) {
      return { valid: false, error: `${fieldName} mengandung skema URL berbahaya.` };
    }

    // Reject wildcards in origin
    if (trimmed.includes('*')) {
      return { valid: false, error: `${fieldName} tidak boleh menggunakan wildcard (*). Wajib menggunakan exact origin.` };
    }

    // Try URL parsing
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { valid: false, error: `${fieldName} memiliki format URL yang tidak valid.` };
    }

    // Check protocol
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: `${fieldName} harus menggunakan protokol https:// (atau http:// untuk localhost).` };
    }

    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';

    if (parsed.protocol === 'http:' && !isLocalhost && !allowHttpForLocalhost) {
      return { valid: false, error: `${fieldName} wajib menggunakan protokol https:// untuk domain publik.` };
    }

    // Reject credentials in URL
    if (parsed.username || parsed.password) {
      return { valid: false, error: `${fieldName} tidak boleh menyertakan username atau password.` };
    }

    // Validate hostname characters
    if (!parsed.hostname || !/^[a-zA-Z0-9.-]+$/.test(parsed.hostname)) {
      return { valid: false, error: `${fieldName} memiliki hostname tidak valid.` };
    }

    const normalized = this.normalizeUrl(trimmed);
    return { valid: true, normalized };
  }

  /**
   * Comprehensive validation of DomainConfig
   */
  public static validateDomainConfig(config: Partial<DomainConfig>): DomainValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const env: AppEnvironment = config.environment === 'production' 
      ? 'production' 
      : config.environment === 'staging' 
        ? 'staging' 
        : 'development';

    // 1. Validate Production App URL
    const prodVal = this.validateOriginString(config.productionAppUrl || '', 'Production App URL', false);
    if (!prodVal.valid) {
      errors.push(prodVal.error!);
    }

    // 2. Validate Canonical URL
    const canonicalVal = this.validateOriginString(config.canonicalUrl || '', 'Canonical URL', true);
    if (!canonicalVal.valid) {
      errors.push(canonicalVal.error!);
    }

    // 3. Validate Public URL
    const publicVal = this.validateOriginString(config.publicUrl || '', 'Public URL', true);
    if (!publicVal.valid) {
      errors.push(publicVal.error!);
    }

    // 4. Validate Staging App URL if provided
    let normalizedStaging = '';
    if (config.stagingAppUrl && config.stagingAppUrl.trim()) {
      const stagingVal = this.validateOriginString(config.stagingAppUrl, 'Staging App URL', false);
      if (!stagingVal.valid) {
        errors.push(stagingVal.error!);
      } else {
        normalizedStaging = stagingVal.normalized!;
      }
    }

    // 5. Validate Development App URL if provided
    let normalizedDev = '';
    if (config.developmentAppUrl && config.developmentAppUrl.trim()) {
      const devVal = this.validateOriginString(config.developmentAppUrl, 'Development App URL', true);
      if (!devVal.valid) {
        errors.push(devVal.error!);
      } else {
        normalizedDev = devVal.normalized!;
      }
    }

    // 6. Validate Allowed Origins list
    const rawAllowed = Array.isArray(config.allowedOrigins) 
      ? config.allowedOrigins 
      : typeof (config as any).allowedOrigins === 'string'
        ? (config as any).allowedOrigins.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean)
        : [];

    const normalizedAllowed: string[] = [];
    for (const origin of rawAllowed) {
      if (!origin || !origin.trim()) continue;
      const v = this.validateOriginString(origin, `Allowed Origin "${origin}"`, true);
      if (!v.valid) {
        errors.push(v.error!);
      } else if (v.normalized && !normalizedAllowed.includes(v.normalized)) {
        normalizedAllowed.push(v.normalized);
      }
    }

    // 7. Validate Trusted OAuth Origins list
    const rawOAuth = Array.isArray(config.trustedOAuthOrigins)
      ? config.trustedOAuthOrigins
      : typeof (config as any).trustedOAuthOrigins === 'string'
        ? (config as any).trustedOAuthOrigins.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean)
        : [];

    const normalizedOAuth: string[] = [];
    for (const origin of rawOAuth) {
      if (!origin || !origin.trim()) continue;
      const v = this.validateOriginString(origin, `Trusted OAuth Origin "${origin}"`, true);
      if (!v.valid) {
        errors.push(v.error!);
      } else if (v.normalized && !normalizedOAuth.includes(v.normalized)) {
        normalizedOAuth.push(v.normalized);
      }
    }

    // Always ensure productionAppUrl and canonicalUrl are in allowed & oauth origins if valid
    if (prodVal.normalized && !normalizedAllowed.includes(prodVal.normalized)) {
      normalizedAllowed.unshift(prodVal.normalized);
    }
    if (prodVal.normalized && !normalizedOAuth.includes(prodVal.normalized)) {
      normalizedOAuth.unshift(prodVal.normalized);
    }
    if (canonicalVal.normalized && !normalizedAllowed.includes(canonicalVal.normalized)) {
      normalizedAllowed.push(canonicalVal.normalized);
    }
    if (canonicalVal.normalized && !normalizedOAuth.includes(canonicalVal.normalized)) {
      normalizedOAuth.push(canonicalVal.normalized);
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings
      };
    }

    const normalizedConfig: DomainConfig = {
      environment: env,
      productionAppUrl: prodVal.normalized!,
      stagingAppUrl: normalizedStaging || undefined,
      developmentAppUrl: normalizedDev || 'http://localhost:3000',
      canonicalUrl: canonicalVal.normalized!,
      publicUrl: publicVal.normalized!,
      allowedOrigins: normalizedAllowed,
      trustedOAuthOrigins: normalizedOAuth,
      updatedAt: new Date().toISOString(),
      updatedBy: config.updatedBy || 'Founder'
    };

    const derivedUrls = this.deriveOAuthUrls(normalizedConfig.canonicalUrl || normalizedConfig.productionAppUrl);

    // Warning check: if productionAppUrl changed, remind founder to update external OAuth consoles
    if (normalizedConfig.productionAppUrl !== 'https://app.neurona.ai') {
      warnings.push(`Pemberitahuan OAuth: Pastikan Redirect URI "${derivedUrls.higgsfieldOAuthCallbackUrl}" dan "${derivedUrls.openArtOAuthCallbackUrl}" telah didaftarkan pada Developer Dashboard Higgsfield & OpenArt.`);
    }

    return {
      valid: true,
      errors: [],
      warnings,
      normalizedConfig,
      derivedUrls
    };
  }

  /**
   * Calculates derived OAuth and Webhook URLs from a base origin
   */
  public static deriveOAuthUrls(baseOrigin: string): DerivedOAuthUrls {
    const cleanOrigin = this.normalizeUrl(baseOrigin) || 'http://localhost:3000';
    return {
      oauthCallbackBaseUrl: `${cleanOrigin}/api/fcc`,
      openArtOAuthCallbackUrl: `${cleanOrigin}/api/fcc/openart/oauth/callback`,
      higgsfieldOAuthCallbackUrl: `${cleanOrigin}/api/fcc/higgsfield/oauth/callback`,
      telegramWebhookUrl: `${cleanOrigin}/api/v1/founder/payment/telegram-webhook`
    };
  }

  /**
   * Load active Domain Configuration with strict Precedence Hierarchy:
   * 1. Explicit production environment configuration (process.env overrides)
   * 2. Founder-managed platform configuration (SQLite systemSettings)
   * 3. Safe application defaults
   */
  public static getActiveConfig(): DomainConfig {
    let savedConfig: Partial<DomainConfig> | null = null;

    try {
      const row = db.select().from(systemSettings).where(eq(systemSettings.key, this.DB_KEY)).get();
      if (row && row.value) {
        savedConfig = JSON.parse(row.value);
      }
    } catch (e) {
      console.warn('[DomainConfigService] Notice loading settings from SQLite:', (e as any)?.message);
    }

    // Default Baseline
    const defaultEnv: AppEnvironment = (process.env.APP_ENV as AppEnvironment) || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
    const defaultProdUrl = process.env.APP_ORIGIN || process.env.PRODUCTION_APP_URL || 'https://app.neurona.ai';
    const defaultCanonical = process.env.CANONICAL_URL || process.env.APP_ORIGIN || defaultProdUrl;
    const defaultPublic = process.env.PUBLIC_URL || defaultCanonical;

    // Build allowlist combining defaults + env + saved
    const originsSet = new Set<string>(this.DEFAULT_ORIGINS);

    if (savedConfig?.allowedOrigins && Array.isArray(savedConfig.allowedOrigins)) {
      savedConfig.allowedOrigins.forEach(o => o && originsSet.add(this.normalizeUrl(o)));
    }

    // Explicit ENV overrides take precedence
    if (process.env.APP_ORIGIN) originsSet.add(this.normalizeUrl(process.env.APP_ORIGIN));
    if (process.env.CANONICAL_URL) originsSet.add(this.normalizeUrl(process.env.CANONICAL_URL));
    if (process.env.PUBLIC_URL) originsSet.add(this.normalizeUrl(process.env.PUBLIC_URL));
    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(',').forEach(o => o && originsSet.add(this.normalizeUrl(o)));
    }
    if (process.env.HIGGSFIELD_ALLOWED_ORIGINS) {
      process.env.HIGGSFIELD_ALLOWED_ORIGINS.split(',').forEach(o => o && originsSet.add(this.normalizeUrl(o)));
    }

    const trustedOAuthSet = new Set<string>(originsSet);
    if (savedConfig?.trustedOAuthOrigins && Array.isArray(savedConfig.trustedOAuthOrigins)) {
      savedConfig.trustedOAuthOrigins.forEach(o => o && trustedOAuthSet.add(this.normalizeUrl(o)));
    }

    const activeProdUrl = this.normalizeUrl(process.env.APP_ORIGIN || savedConfig?.productionAppUrl || defaultProdUrl);
    const activeCanonical = this.normalizeUrl(process.env.CANONICAL_URL || savedConfig?.canonicalUrl || activeProdUrl);
    const activePublic = this.normalizeUrl(process.env.PUBLIC_URL || savedConfig?.publicUrl || activeCanonical);

    return {
      environment: savedConfig?.environment || defaultEnv,
      productionAppUrl: activeProdUrl,
      stagingAppUrl: savedConfig?.stagingAppUrl ? this.normalizeUrl(savedConfig.stagingAppUrl) : 'https://staging.neurona.ai',
      developmentAppUrl: savedConfig?.developmentAppUrl ? this.normalizeUrl(savedConfig.developmentAppUrl) : 'http://localhost:3000',
      canonicalUrl: activeCanonical,
      publicUrl: activePublic,
      allowedOrigins: Array.from(originsSet).filter(Boolean),
      trustedOAuthOrigins: Array.from(trustedOAuthSet).filter(Boolean),
      updatedAt: savedConfig?.updatedAt || new Date().toISOString(),
      updatedBy: savedConfig?.updatedBy || 'System'
    };
  }

  /**
   * Atomic update of Domain Configuration in SQLite
   * Validates before save, protects against invalid configurations and never partial-saves on failure.
   */
  public static async saveConfig(rawConfig: Partial<DomainConfig>, actor: string = 'Founder'): Promise<DomainValidationResult> {
    const validation = this.validateDomainConfig({ ...rawConfig, updatedBy: actor });
    if (!validation.valid || !validation.normalizedConfig) {
      return validation;
    }

    const configToSave = validation.normalizedConfig;
    const now = new Date().toISOString();

    try {
      db.insert(systemSettings)
        .values({
          key: this.DB_KEY,
          value: JSON.stringify(configToSave),
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: JSON.stringify(configToSave),
            updatedAt: now
          }
        })
        .run();

      console.log(`[DomainConfigService] ✅ Domain & URL configuration successfully updated by ${actor}: Canonical=${configToSave.canonicalUrl}`);
      return validation;
    } catch (e: any) {
      console.error('[DomainConfigService] ❌ Failed to save domain configuration to SQLite:', e);
      return {
        valid: false,
        errors: [`Gagal menyimpan konfigurasi ke database: ${e.message || String(e)}`],
        warnings: []
      };
    }
  }

  /**
   * Resolves the canonical trusted origin from request headers against the explicit allowlist.
   * STRICT SECURITY:
   * - Never trusts arbitrary Host or X-Forwarded-Host
   * - Never trusts arbitrary ?origin= query params
   * - Exact matching against explicit allowlist (no wildcard suffix)
   * - Defaults safely to configured canonical URL
   */
  public static getCanonicalTrustedOrigin(reqHeaders?: Record<string, string | string[] | undefined>): string {
    const config = this.getActiveConfig();
    const approvedOrigins = new Set<string>(config.allowedOrigins.map(o => this.normalizeUrl(o)));

    // Add configured canonical & production URLs
    if (config.canonicalUrl) approvedOrigins.add(this.normalizeUrl(config.canonicalUrl));
    if (config.productionAppUrl) approvedOrigins.add(this.normalizeUrl(config.productionAppUrl));
    if (config.developmentAppUrl) approvedOrigins.add(this.normalizeUrl(config.developmentAppUrl));

    if (!reqHeaders) {
      return config.canonicalUrl || 'http://localhost:3000';
    }

    const rawProto = reqHeaders['x-forwarded-proto'];
    const proto = (Array.isArray(rawProto) ? rawProto[0] : rawProto) || 'https';
    const cleanProto = proto.split(',')[0].trim();

    const rawHost = reqHeaders['x-forwarded-host'] || reqHeaders['host'];
    const hostHeader = (Array.isArray(rawHost) ? rawHost[0] : rawHost) || '';
    const cleanHost = hostHeader.split(',')[0].trim();

    if (cleanHost) {
      const candidateOrigin = this.normalizeUrl(`${cleanProto}://${cleanHost}`);
      if (approvedOrigins.has(candidateOrigin)) {
        return candidateOrigin;
      }
      console.warn(`[DomainConfigService] Origin "${candidateOrigin}" is not in explicit approved allowlist. Defaulting to canonical origin.`);
    }

    return config.canonicalUrl || 'http://localhost:3000';
  }

  /**
   * Returns all trusted redirect URIs for OAuth registration
   */
  public static getAllTrustedRedirectUris(provider: 'higgsfield' | 'openart'): string[] {
    const config = this.getActiveConfig();
    const endpoint = provider === 'higgsfield' ? '/api/fcc/higgsfield/oauth/callback' : '/api/fcc/openart/oauth/callback';
    
    const uris = new Set<string>();
    config.trustedOAuthOrigins.forEach(origin => {
      const clean = this.normalizeUrl(origin);
      if (clean) uris.add(`${clean}${endpoint}`);
    });

    return Array.from(uris);
  }
}
