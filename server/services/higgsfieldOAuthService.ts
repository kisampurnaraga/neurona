import crypto from 'crypto';
import dns from 'dns';
import { db } from '../../src/db/index';
import { systemSettings, apiKeys } from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptSecret, decryptSecret } from '../utils/crypto';

// Prefer IPv4 resolution to prevent slow connection delays in container environments
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export interface HiggsfieldOAuthSession {
  state: string;
  verifier: string;
  challenge: string;
  clientId: string;
  redirectUri: string;
  canonicalOrigin: string;
  createdAt: number;
  expiresAt: number;
}

export interface HiggsfieldTokenMeta {
  clientId: string;
  redirectUri: string;
  expiresAt: number;
  scope: string;
  encryptedRefreshToken: string | null;
  hasRefreshToken: boolean;
  updatedAt: string;
}

export class HiggsfieldOAuthService {
  private static readonly REGISTRATION_ENDPOINT = 'https://mcp.higgsfield.ai/oauth/register';
  private static readonly TOKEN_ENDPOINT = 'https://mcp.higgsfield.ai/oauth/token';
  private static readonly REVOCATION_ENDPOINT = 'https://mcp.higgsfield.ai/oauth/revoke';
  private static readonly AUTHORIZATION_ENDPOINT = 'https://higgsfield.ai/auth/oauth/authorize';

  private static base64URLEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Resolves a trusted, canonical application origin.
   * Strips arbitrary client-provided origins and enforces whitelist validation.
   */
  public static getCanonicalTrustedOrigin(headers?: Record<string, string | string[] | undefined>, fallbackHost?: string): string {
    // 1. Explicit server environment configuration takes highest priority
    if (process.env.APP_ORIGIN && process.env.APP_ORIGIN.trim()) {
      return process.env.APP_ORIGIN.trim().replace(/\/+$/, '');
    }
    if (process.env.CANONICAL_URL && process.env.CANONICAL_URL.trim()) {
      return process.env.CANONICAL_URL.trim().replace(/\/+$/, '');
    }
    if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim()) {
      return process.env.PUBLIC_URL.trim().replace(/\/+$/, '');
    }

    if (!headers && !fallbackHost) {
      return 'http://localhost:3000';
    }

    // 2. Read headers from trusted reverse proxy
    const forwardedProto = (headers?.['x-forwarded-proto'] as string) || '';
    const forwardedHost = (headers?.['x-forwarded-host'] as string) || '';
    const hostHeader = forwardedHost || fallbackHost || 'localhost:3000';

    const protocol = (forwardedProto === 'https' || forwardedProto === 'http')
      ? forwardedProto
      : (hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1') ? 'http' : 'https');

    // 3. Strict host whitelist validation to protect against Host header spoofing
    const hostWithoutPort = hostHeader.split(':')[0].toLowerCase();
    const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
    const isCloudRun = hostWithoutPort.endsWith('.run.app');
    const isAiStudio = hostWithoutPort.endsWith('.google.com') || hostWithoutPort.endsWith('.ai.studio');
    const isNeurona = hostWithoutPort.endsWith('.neurona.ai');

    if (isLocalhost || isCloudRun || isAiStudio || isNeurona) {
      return `${protocol}://${hostHeader}`.replace(/\/+$/, '');
    }

    // Safe default fallback
    return 'http://localhost:3000';
  }

  public static generatePKCE(): { verifier: string; challenge: string } {
    const verifier = this.base64URLEncode(crypto.randomBytes(32));
    const challenge = this.base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
  }

  /**
   * Register OAuth Client dynamically with Higgsfield (RFC 7591)
   * Stored in SQLite systemSettings for persistence across Cloud Run instances.
   */
  public static async getOrRegisterClient(redirectUri: string): Promise<string> {
    // 1. Explicit environment override if provided
    if (process.env.HIGGSFIELD_CLIENT_ID && process.env.HIGGSFIELD_CLIENT_ID.trim()) {
      return process.env.HIGGSFIELD_CLIENT_ID.trim();
    }

    const cacheKey = `higgsfield_oauth_client:${redirectUri}`;

    // 2. Check SQLite persistence
    try {
      const existing = db.select().from(systemSettings).where(eq(systemSettings.key, cacheKey)).get();
      if (existing && existing.value) {
        return existing.value.trim();
      }
    } catch (e) {
      console.warn('[Higgsfield OAuth] SQLite client lookup notice:', (e as any)?.message);
    }

    // 3. Dynamic Registration via Higgsfield RFC 7591 endpoint or generate registered client id
    console.log(`[Higgsfield OAuth] Resolving client for redirectUri: ${redirectUri}...`);

    const knownRedirectUris = [
      redirectUri,
      'http://localhost:3000/api/fcc/higgsfield/oauth/callback',
      'https://ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app/api/fcc/higgsfield/oauth/callback',
      'https://ais-pre-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app/api/fcc/higgsfield/oauth/callback'
    ];
    const uniqueRedirectUris = Array.from(new Set(knownRedirectUris));

    let clientId = `neurona_higgsfield_${crypto.randomBytes(12).toString('hex')}`;

    try {
      const resp = await fetch(this.REGISTRATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NEURONA-Media-Pipeline/2.5'
        },
        body: JSON.stringify({
          client_name: 'NEURONA AI Video Pipeline',
          redirect_uris: uniqueRedirectUris
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (resp.ok) {
        const data: any = await resp.json().catch(() => ({}));
        if (data.client_id && typeof data.client_id === 'string') {
          clientId = data.client_id;
        }
      }
    } catch (netErr: any) {
      console.log('[Higgsfield OAuth] Dynamic registration fallback to client id descriptor.');
    }

    // 4. Persist registered client ID in SQLite
    try {
      const now = new Date().toISOString();
      db.insert(systemSettings)
        .values({ key: cacheKey, value: clientId, updatedAt: now })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value: clientId, updatedAt: now }
        })
        .run();
      console.log(`[Higgsfield OAuth] Persisted registered client_id in SQLite: ${clientId.substring(0, 10)}...`);
    } catch (saveErr) {
      console.warn('[Higgsfield OAuth] Could not save client_id to SQLite:', saveErr);
    }

    return clientId;
  }

  /**
   * Initialize a new OAuth 2.0 PKCE Session with canonical origin validation
   */
  public static async createAuthorizationSession(trustedOrigin: string): Promise<{
    authUrl: string;
    directAuthUrl: string;
    state: string;
    redirectUri: string;
    clientId: string;
  }> {
    // Housekeeping: clean expired sessions in SQLite
    this.cleanExpiredSessions();

    const cleanOrigin = trustedOrigin.replace(/\/+$/, '');
    const redirectUri = `${cleanOrigin}/api/fcc/higgsfield/oauth/callback`;
    const clientId = await this.getOrRegisterClient(redirectUri);

    const { verifier, challenge } = this.generatePKCE();
    const state = `higgsfield_pkce_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes TTL

    const sessionData: HiggsfieldOAuthSession = {
      state,
      verifier,
      challenge,
      clientId,
      redirectUri,
      canonicalOrigin: cleanOrigin,
      createdAt: now,
      expiresAt
    };

    // Persist session to SQLite
    try {
      const sessionKey = `higgsfield_oauth_session:${state}`;
      db.insert(systemSettings)
        .values({
          key: sessionKey,
          value: JSON.stringify(sessionData),
          updatedAt: new Date(now).toISOString()
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: JSON.stringify(sessionData),
            updatedAt: new Date(now).toISOString()
          }
        })
        .run();
    } catch (err: any) {
      console.error('[Higgsfield OAuth] Failed to save session to SQLite:', err?.message);
      throw new Error('Gagal menyimpan sesi otorisasi OAuth Higgsfield.');
    }

    const authorizeRelativePath = `/auth/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=mcp_full_access&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;

    const directAuthUrl = `https://higgsfield.ai${authorizeRelativePath}`;
    const authUrl = `https://higgsfield.ai/login?callbackUrl=${encodeURIComponent(authorizeRelativePath)}`;

    return {
      authUrl,
      directAuthUrl,
      state,
      redirectUri,
      clientId
    };
  }

  /**
   * Exchange authorization code for access token via Higgsfield OAuth Token Endpoint.
   * STRICT SECURITY:
   * 1. Authorization code is NEVER treated as access token.
   * 2. If token endpoint fails or doesn't return access_token, OAuth FAILS.
   * 3. PKCE verifier and state expiration are strictly validated.
   * 4. Session is immediately consumed to prevent replay attacks.
   */
  public static async exchangeCodeForToken(code: string, state: string): Promise<{
    success: boolean;
    oauthAccessToken?: string;
    oauthRefreshToken?: string;
    scope?: string;
    expiresIn?: number;
    canonicalOrigin?: string;
    error?: string;
    message?: string;
  }> {
    if (!state || typeof state !== 'string' || !state.startsWith('higgsfield_pkce_')) {
      return {
        success: false,
        error: 'INVALID_STATE',
        message: 'State parameter tidak valid atau tidak sesuai format.'
      };
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return {
        success: false,
        error: 'INVALID_CODE',
        message: 'Authorization code kosong atau tidak valid.'
      };
    }

    const sessionKey = `higgsfield_oauth_session:${state}`;
    let session: HiggsfieldOAuthSession | null = null;

    try {
      const row = db.select().from(systemSettings).where(eq(systemSettings.key, sessionKey)).get();
      if (row && row.value) {
        session = JSON.parse(row.value) as HiggsfieldOAuthSession;
      }
    } catch (err: any) {
      console.error('[Higgsfield OAuth] Error reading session from SQLite:', err?.message);
    }

    if (!session) {
      return {
        success: false,
        error: 'INVALID_STATE',
        message: 'Sesi otorisasi OAuth tidak ditemukan atau telah digunakan sebelumnya. Silakan klik "Connect Higgsfield" kembali.'
      };
    }

    // Immediately consume & delete session from SQLite to prevent replay attacks
    try {
      db.delete(systemSettings).where(eq(systemSettings.key, sessionKey)).run();
    } catch (delErr) {
      console.warn('[Higgsfield OAuth] Could not delete consumed session:', delErr);
    }

    // Verify expiry (15 minutes TTL)
    if (Date.now() > session.expiresAt) {
      return {
        success: false,
        error: 'EXPIRED_SESSION',
        message: 'Sesi otorisasi OAuth telah kedaluwarsa (lebih dari 15 menit). Silakan coba lagi.'
      };
    }

    // Strictly verify that verifier produces the recorded challenge
    const computedChallenge = this.base64URLEncode(crypto.createHash('sha256').update(session.verifier).digest());
    if (computedChallenge !== session.challenge) {
      return {
        success: false,
        error: 'PKCE_VERIFICATION_FAILED',
        message: 'Validasi integritas PKCE verifier gagal.'
      };
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: session.clientId,
      code: code.trim(),
      redirect_uri: session.redirectUri,
      code_verifier: session.verifier
    });

    console.log(`[Higgsfield OAuth] Performing strict token exchange with Higgsfield Token Endpoint (${this.TOKEN_ENDPOINT})...`);

    let responseText = '';
    let responseStatus = 0;
    let data: any = {};

    try {
      const resp = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NEURONA-Media-Pipeline/2.5',
          'Accept': 'application/json'
        },
        body: tokenParams.toString(),
        signal: AbortSignal.timeout(12000)
      });

      responseStatus = resp.status;
      responseText = await resp.text();

      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      if (!resp.ok) {
        const errorDesc = data.error_description || data.error || data.message || `HTTP status ${responseStatus}`;
        console.error(`[Higgsfield OAuth] Token endpoint rejected exchange: ${errorDesc}`);
        return {
          success: false,
          error: 'TOKEN_EXCHANGE_REJECTED',
          message: `Pertukaran authorization code ditolak oleh server OAuth Higgsfield: ${errorDesc}`
        };
      }
    } catch (fetchErr: any) {
      console.error('[Higgsfield OAuth] Network error connecting to token endpoint:', fetchErr?.message);
      return {
        success: false,
        error: 'TOKEN_ENDPOINT_UNREACHABLE',
        message: `Gagal menghubungi Higgsfield Token Endpoint: ${fetchErr?.message || String(fetchErr)}`
      };
    }

    // STRICT CHECK: The response MUST explicitly contain an access_token or token
    const rawToken = data.access_token || data.token;
    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      console.error('[Higgsfield OAuth] Response missing access_token:', data);
      return {
        success: false,
        error: 'NO_ACCESS_TOKEN',
        message: 'Server Higgsfield tidak mengembalikan access_token yang valid.'
      };
    }

    const oauthAccessToken = rawToken.trim();
    const oauthRefreshToken: string | undefined = typeof data.refresh_token === 'string' ? data.refresh_token.trim() : undefined;
    const expiresIn: number = typeof data.expires_in === 'number' ? data.expires_in : 86400 * 30; // default 30 days
    const scope: string = typeof data.scope === 'string' ? data.scope : 'mcp_full_access';

    // Persist token metadata and encrypted refresh token to SQLite
    try {
      const tokenMetaKey = 'higgsfield_oauth_token_meta';
      const now = Date.now();
      const expiresAt = now + expiresIn * 1000;

      const metaObj: HiggsfieldTokenMeta = {
        clientId: session.clientId,
        redirectUri: session.redirectUri,
        expiresAt,
        scope,
        encryptedRefreshToken: oauthRefreshToken ? encryptSecret(oauthRefreshToken) : null,
        hasRefreshToken: !!oauthRefreshToken,
        updatedAt: new Date(now).toISOString()
      };

      db.insert(systemSettings)
        .values({
          key: tokenMetaKey,
          value: JSON.stringify(metaObj),
          updatedAt: new Date(now).toISOString()
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: JSON.stringify(metaObj),
            updatedAt: new Date(now).toISOString()
          }
        })
        .run();
    } catch (metaErr: any) {
      console.warn('[Higgsfield OAuth] Failed to save token metadata in SQLite:', metaErr?.message);
    }

    return {
      success: true,
      oauthAccessToken,
      oauthRefreshToken,
      scope,
      expiresIn,
      canonicalOrigin: session.canonicalOrigin
    };
  }

  /**
   * Revoke Higgsfield token (RFC 7009) and clear local credentials
   */
  public static async revokeToken(tokenToRevoke?: string): Promise<{ success: boolean }> {
    try {
      let targetToken = tokenToRevoke;
      let clientId = '';

      const tokenMetaRow = db.select().from(systemSettings).where(eq(systemSettings.key, 'higgsfield_oauth_token_meta')).get();
      if (tokenMetaRow && tokenMetaRow.value) {
        try {
          const meta = JSON.parse(tokenMetaRow.value);
          clientId = meta.clientId || '';
        } catch {}
      }

      if (!targetToken) {
        const keyRow = db.select().from(apiKeys).where(eq(apiKeys.provider, 'higgsfield')).get();
        if (keyRow && keyRow.keyEncrypted) {
          targetToken = decryptSecret(keyRow.keyEncrypted);
        }
      }

      if (targetToken) {
        try {
          const params = new URLSearchParams({ token: targetToken });
          if (clientId) params.append('client_id', clientId);

          await fetch(this.REVOCATION_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'NEURONA-Media-Pipeline/2.5'
            },
            body: params.toString(),
            signal: AbortSignal.timeout(6000)
          });
          console.log('[Higgsfield OAuth] Remote token revocation signal sent.');
        } catch (revokeErr) {
          console.warn('[Higgsfield OAuth] Revocation request error (safe to ignore):', revokeErr);
        }
      }

      // Cleanup local database
      db.delete(apiKeys).where(eq(apiKeys.provider, 'higgsfield')).run();
      db.delete(systemSettings).where(eq(systemSettings.key, 'higgsfield_oauth_token_meta')).run();
      console.log('[Higgsfield OAuth] Cleared local token records from SQLite.');

      return { success: true };
    } catch (err: any) {
      console.warn('[Higgsfield OAuth] Cleanup error during revocation:', err?.message);
      return { success: true };
    }
  }

  /**
   * Housekeeping: Remove sessions older than 15 minutes from SQLite
   */
  public static cleanExpiredSessions(): void {
    try {
      const now = Date.now();
      const allRows = db.select().from(systemSettings).all();
      for (const row of allRows) {
        if (row.key.startsWith('higgsfield_oauth_session:')) {
          try {
            const sess = JSON.parse(row.value) as HiggsfieldOAuthSession;
            if (now > sess.expiresAt) {
              db.delete(systemSettings).where(eq(systemSettings.key, row.key)).run();
            }
          } catch {
            db.delete(systemSettings).where(eq(systemSettings.key, row.key)).run();
          }
        }
      }
    } catch (e) {
      console.warn('[Higgsfield OAuth] cleanExpiredSessions error:', e);
    }
  }
}
