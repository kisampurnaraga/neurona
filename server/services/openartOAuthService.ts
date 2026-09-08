import crypto from 'crypto';
import dns from 'dns';
import { db } from '../../src/db/index';
import { systemSettings, apiKeys } from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptSecret, decryptSecret } from '../utils/crypto';
import { DomainConfigService } from './domainConfigService';

// Prefer IPv4 resolution to prevent slow connection delays in container environments
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export interface OAuthSession {
  state: string;
  verifier: string;
  challenge: string;
  clientId: string;
  redirectUri: string;
  origin: string;
  createdAt: number;
  expiresAt: number;
}

export class OpenArtOAuthService {
  private static readonly REGISTRATION_ENDPOINT = 'https://openart.ai/suite/api/auth/oauth/register';
  private static readonly TOKEN_ENDPOINT = 'https://openart.ai/suite/api/auth/oauth/token';
  private static readonly REVOCATION_ENDPOINT = 'https://openart.ai/suite/api/auth/oauth/revoke';
  private static readonly AUTHORIZATION_ENDPOINT = 'https://openart.ai/suite/api/auth/oauth/authorize';

  private static base64URLEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  public static generatePKCE(): { verifier: string; challenge: string } {
    const verifier = this.base64URLEncode(crypto.randomBytes(32));
    const challenge = this.base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
  }

  /**
   * Register OAuth Client dynamically with OpenArt (RFC 7591)
   * Stored in SQLite systemSettings for persistence across Cloud Run instances.
   * NO hardcoded fallback client IDs.
   */
  public static async getOrRegisterClient(redirectUri: string): Promise<string> {
    // 1. Explicit environment override if provided
    if (process.env.OPENART_CLIENT_ID && process.env.OPENART_CLIENT_ID.trim()) {
      return process.env.OPENART_CLIENT_ID.trim();
    }

    const cacheKey = `openart_oauth_client:${redirectUri}`;

    // 2. Check SQLite persistence
    try {
      const existing = db.select().from(systemSettings).where(eq(systemSettings.key, cacheKey)).get();
      if (existing && existing.value) {
        return existing.value.trim();
      }
    } catch (e) {
      console.warn('[OpenArt OAuth] SQLite client lookup notice:', (e as any)?.message);
    }

    // 3. Dynamic Registration via OpenArt RFC 7591 endpoint
    console.log(`[OpenArt OAuth] Dynamically registering client for redirectUri: ${redirectUri}...`);

    const trustedUris = DomainConfigService.getAllTrustedRedirectUris('openart');
    const knownRedirectUris = [
      redirectUri,
      ...trustedUris,
      'http://localhost:3000/api/fcc/openart/oauth/callback',
      'https://ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app/api/fcc/openart/oauth/callback',
      'https://ais-pre-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app/api/fcc/openart/oauth/callback'
    ];
    const uniqueRedirectUris = Array.from(new Set(knownRedirectUris));

    let resp: Response;
    try {
      resp = await fetch(this.REGISTRATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NEURONA-Media-Pipeline/2.5'
        },
        body: JSON.stringify({
          client_name: 'NEURONA AI Media Studio',
          redirect_uris: uniqueRedirectUris
        }),
        signal: AbortSignal.timeout(10000)
      });
    } catch (netErr: any) {
      throw new Error(`Koneksi ke OpenArt Dynamic Registration gagal: ${netErr?.message || String(netErr)}`);
    }

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => '');
      throw new Error(`OpenArt Dynamic Client Registration ditolak (HTTP ${resp.status}): ${errorText || 'Unknown error'}`);
    }

    const data: any = await resp.json().catch(() => ({}));
    const clientId = data.client_id;
    if (!clientId || typeof clientId !== 'string') {
      throw new Error('OpenArt registration tidak mengembalikan client_id yang valid');
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
      console.log(`[OpenArt OAuth] Persisted registered client_id in SQLite: ${clientId.substring(0, 6)}...`);
    } catch (saveErr) {
      console.warn('[OpenArt OAuth] Could not save client_id to SQLite:', saveErr);
    }

    return clientId;
  }

  public static getCanonicalTrustedOrigin(headers?: Record<string, string | string[] | undefined>, fallbackHost?: string): string {
    return DomainConfigService.getCanonicalTrustedOrigin(headers);
  }

  /**
   * Initialize a new OAuth 2.0 PKCE Session
   * Persisted in SQLite so any Cloud Run instance can handle the callback.
   */
  public static async createAuthorizationSession(origin: string): Promise<{
    authUrl: string;
    directAuthUrl: string;
    state: string;
    redirectUri: string;
    clientId: string;
  }> {
    // Housekeeping: clean expired sessions in SQLite
    this.cleanExpiredSessions();

    const cleanOrigin = origin.replace(/\/+$/, '');
    const redirectUri = DomainConfigService.deriveOAuthUrls(cleanOrigin).openArtOAuthCallbackUrl;
    const clientId = await this.getOrRegisterClient(redirectUri);

    const { verifier, challenge } = this.generatePKCE();
    const state = `openart_pkce_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes TTL

    const sessionData: OAuthSession = {
      state,
      verifier,
      challenge,
      clientId,
      redirectUri,
      origin: cleanOrigin,
      createdAt: now,
      expiresAt
    };

    // Persist session to SQLite
    try {
      const sessionKey = `openart_oauth_session:${state}`;
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
      console.error('[OpenArt OAuth] Failed to save session to SQLite:', err?.message);
      throw new Error('Gagal menyimpan sesi otorisasi OAuth.');
    }

    const authorizeRelativePath = `/suite/api/auth/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=full_access&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;

    const directAuthUrl = `https://openart.ai${authorizeRelativePath}`;
    const authUrl = `https://openart.ai/signin?callbackUrl=${encodeURIComponent(authorizeRelativePath)}`;

    return {
      authUrl,
      directAuthUrl,
      state,
      redirectUri,
      clientId
    };
  }

  /**
   * Exchange authorization code for access token via OpenArt OAuth Token Endpoint
   * Enforces strict state, PKCE verifier, expiration, and replay protection.
   */
  public static async exchangeCodeForToken(code: string, state: string): Promise<{
    success: boolean;
    token?: string;
    refreshToken?: string;
    scope?: string;
    expiresIn?: number;
    origin?: string;
    error?: string;
    message?: string;
  }> {
    if (!state || typeof state !== 'string' || !state.startsWith('openart_pkce_')) {
      return {
        success: false,
        error: 'INVALID_STATE',
        message: 'State parameter tidak valid atau tidak sesuai format.'
      };
    }

    const sessionKey = `openart_oauth_session:${state}`;
    let session: OAuthSession | null = null;

    try {
      const row = db.select().from(systemSettings).where(eq(systemSettings.key, sessionKey)).get();
      if (row && row.value) {
        session = JSON.parse(row.value) as OAuthSession;
      }
    } catch (err: any) {
      console.error('[OpenArt OAuth] Error reading session from SQLite:', err?.message);
    }

    if (!session) {
      return {
        success: false,
        error: 'INVALID_STATE',
        message: 'Sesi otorisasi OAuth tidak ditemukan atau telah digunakan sebelumnya. Silakan klik "Connect OpenArt" kembali.'
      };
    }

    // Immediately consume & delete session from SQLite to prevent replay attacks
    try {
      db.delete(systemSettings).where(eq(systemSettings.key, sessionKey)).run();
    } catch (delErr) {
      console.warn('[OpenArt OAuth] Could not delete consumed session:', delErr);
    }

    // Verify expiry
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

    try {
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: session.clientId,
        code: code.trim(),
        redirect_uri: session.redirectUri,
        code_verifier: session.verifier
      });

      console.log(`[OpenArt OAuth] Exchanging code for token with OpenArt Token Endpoint...`);

      const resp = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NEURONA-Media-Pipeline/2.5'
        },
        body: tokenParams.toString(),
        signal: AbortSignal.timeout(15000)
      });

      const responseText = await resp.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      if (!resp.ok) {
        console.error('[OpenArt OAuth] Token exchange error:', resp.status, data);
        return {
          success: false,
          error: data.error || 'TOKEN_EXCHANGE_FAILED',
          message: data.error_description || data.message || `Penukaran token ditolak oleh OpenArt (HTTP ${resp.status})`
        };
      }

      const accessToken = data.access_token || data.token;
      if (!accessToken || typeof accessToken !== 'string') {
        return {
          success: false,
          error: 'NO_ACCESS_TOKEN',
          message: 'Server OpenArt tidak mengembalikan access_token yang valid.'
        };
      }

      // Persist token metadata and encrypted refresh token to SQLite
      try {
        const tokenMetaKey = 'openart_oauth_token_meta';
        const now = Date.now();
        const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 86400;
        const expiresAt = now + expiresInSec * 1000;

        const metaObj = {
          clientId: session.clientId,
          redirectUri: session.redirectUri,
          expiresAt,
          scope: data.scope || 'full_access',
          encryptedRefreshToken: data.refresh_token ? encryptSecret(data.refresh_token) : null,
          hasRefreshToken: !!data.refresh_token,
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
        console.warn('[OpenArt OAuth] Failed to save token metadata in SQLite:', metaErr?.message);
      }

      return {
        success: true,
        token: accessToken,
        refreshToken: data.refresh_token,
        scope: data.scope,
        expiresIn: data.expires_in,
        origin: session.origin
      };
    } catch (err: any) {
      console.error('[OpenArt OAuth] Network error during token exchange:', err);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: `Gagal menghubungi OpenArt Token Endpoint: ${err?.message || String(err)}`
      };
    }
  }

  /**
   * Automatically refresh access token using stored refresh token (RFC 6749)
   */
  public static async refreshAccessToken(): Promise<{
    success: boolean;
    token?: string;
    expiresIn?: number;
    error?: string;
  }> {
    try {
      const tokenMetaRow = db.select().from(systemSettings).where(eq(systemSettings.key, 'openart_oauth_token_meta')).get();
      if (!tokenMetaRow || !tokenMetaRow.value) {
        return { success: false, error: 'NO_TOKEN_METADATA' };
      }

      const meta = JSON.parse(tokenMetaRow.value);
      if (!meta.encryptedRefreshToken) {
        return { success: false, error: 'NO_REFRESH_TOKEN' };
      }

      const rawRefreshToken = decryptSecret(meta.encryptedRefreshToken);
      if (!rawRefreshToken) {
        return { success: false, error: 'INVALID_REFRESH_TOKEN' };
      }

      const clientId = meta.clientId || (await this.getOrRegisterClient(meta.redirectUri || 'http://localhost:3000/api/fcc/openart/oauth/callback'));

      console.log('[OpenArt OAuth] Refreshing expired access token using refresh_token...');

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: rawRefreshToken,
        client_id: clientId
      });

      const resp = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NEURONA-Media-Pipeline/2.5'
        },
        body: params.toString(),
        signal: AbortSignal.timeout(12000)
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.warn(`[OpenArt OAuth] Token refresh failed with HTTP ${resp.status}: ${text}`);
        return { success: false, error: `HTTP_${resp.status}` };
      }

      const data: any = await resp.json();
      const newAccessToken = data.access_token || data.token;
      if (!newAccessToken) {
        return { success: false, error: 'NO_ACCESS_TOKEN' };
      }

      const now = Date.now();
      const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 86400;
      meta.expiresAt = now + expiresInSec * 1000;
      meta.updatedAt = new Date(now).toISOString();
      if (data.refresh_token) {
        meta.encryptedRefreshToken = encryptSecret(data.refresh_token);
      }

      db.update(systemSettings)
        .set({ value: JSON.stringify(meta), updatedAt: meta.updatedAt })
        .where(eq(systemSettings.key, 'openart_oauth_token_meta'))
        .run();

      // Update in api_keys table
      const encryptedAccess = encryptSecret(newAccessToken);
      const masked = `${newAccessToken.substring(0, 7)}••••••••${newAccessToken.slice(-4)}`;
      const existingKeyRow = db.select().from(apiKeys).where(eq(apiKeys.provider, 'openart')).get();
      if (existingKeyRow) {
        db.update(apiKeys)
          .set({ keyEncrypted: encryptedAccess, maskedKey: masked, status: 'ACTIVE', updatedAt: meta.updatedAt })
          .where(eq(apiKeys.id, existingKeyRow.id))
          .run();
      }

      console.log('[OpenArt OAuth] Successfully refreshed access token!');
      return { success: true, token: newAccessToken, expiresIn: expiresInSec };
    } catch (err: any) {
      console.error('[OpenArt OAuth] Error refreshing token:', err?.message);
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Revoke OpenArt token (RFC 7009) and clear local credentials
   */
  public static async revokeToken(tokenToRevoke?: string): Promise<{ success: boolean }> {
    try {
      let targetToken = tokenToRevoke;
      let clientId = '';

      const tokenMetaRow = db.select().from(systemSettings).where(eq(systemSettings.key, 'openart_oauth_token_meta')).get();
      if (tokenMetaRow && tokenMetaRow.value) {
        try {
          const meta = JSON.parse(tokenMetaRow.value);
          clientId = meta.clientId || '';
        } catch {}
      }

      if (!targetToken) {
        const keyRow = db.select().from(apiKeys).where(eq(apiKeys.provider, 'openart')).get();
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
            signal: AbortSignal.timeout(8000)
          });
          console.log('[OpenArt OAuth] Remote token revocation signal sent.');
        } catch (revokeErr) {
          console.warn('[OpenArt OAuth] Revocation request error (safe to ignore):', revokeErr);
        }
      }

      // Cleanup local database
      db.delete(apiKeys).where(eq(apiKeys.provider, 'openart')).run();
      db.delete(systemSettings).where(eq(systemSettings.key, 'openart_oauth_token_meta')).run();
      console.log('[OpenArt OAuth] Cleared local token records from SQLite.');

      return { success: true };
    } catch (err: any) {
      console.warn('[OpenArt OAuth] Cleanup error during revocation:', err?.message);
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
        if (row.key.startsWith('openart_oauth_session:')) {
          try {
            const sess = JSON.parse(row.value) as OAuthSession;
            if (now > sess.expiresAt) {
              db.delete(systemSettings).where(eq(systemSettings.key, row.key)).run();
            }
          } catch {
            db.delete(systemSettings).where(eq(systemSettings.key, row.key)).run();
          }
        }
      }
    } catch (e) {
      console.warn('[OpenArt OAuth] cleanExpiredSessions error:', e);
    }
  }
}
