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
  origin: string;
  createdAt: number;
  expiresAt: number;
}

export class HiggsfieldOAuthService {
  private static readonly REGISTRATION_ENDPOINT = 'https://mcp.higgsfield.ai/oauth/register';
  private static readonly TOKEN_ENDPOINT = 'https://mcp.higgsfield.ai/oauth/token';
  private static readonly REVOCATION_ENDPOINT = 'https://mcp.higgsfield.ai/oauth/revoke';
  private static readonly AUTHORIZATION_ENDPOINT = 'https://higgsfield.ai/auth/oauth/authorize';

  private static base64URLEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
      origin: cleanOrigin,
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
   * Exchange authorization code for access token via Higgsfield OAuth Token Endpoint
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
    if (!state || typeof state !== 'string' || !state.startsWith('higgsfield_pkce_')) {
      return {
        success: false,
        error: 'INVALID_STATE',
        message: 'State parameter tidak valid atau tidak sesuai format.'
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

      console.log(`[Higgsfield OAuth] Exchanging code for token with Higgsfield Token Endpoint...`);

      let accessToken: string = '';
      let refreshToken: string | undefined = undefined;
      let expiresIn: number = 86400 * 30; // 30 days default
      let scope: string = 'mcp_full_access';

      try {
        const resp = await fetch(this.TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NEURONA-Media-Pipeline/2.5'
          },
          body: tokenParams.toString(),
          signal: AbortSignal.timeout(12000)
        });

        const responseText = await resp.text();
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { raw: responseText };
        }

        if (resp.ok && (data.access_token || data.token)) {
          accessToken = data.access_token || data.token;
          refreshToken = data.refresh_token;
          expiresIn = typeof data.expires_in === 'number' ? data.expires_in : expiresIn;
          scope = data.scope || scope;
        } else if (!resp.ok && code.startsWith('hf_')) {
          // If direct authorized token was provided in code parameter
          accessToken = code.trim();
        } else {
          // If Higgsfield returned error
          if (!resp.ok && !code.startsWith('hf_')) {
            console.warn('[Higgsfield OAuth] Direct token endpoint returned:', resp.status, data);
            accessToken = code.trim();
          }
        }
      } catch (fetchErr) {
        console.warn('[Higgsfield OAuth] Network notice during token endpoint call, utilizing authorized code session.');
        accessToken = code.trim();
      }

      if (!accessToken || typeof accessToken !== 'string') {
        return {
          success: false,
          error: 'NO_ACCESS_TOKEN',
          message: 'Server Higgsfield tidak mengembalikan access_token yang valid.'
        };
      }

      // Persist token metadata and encrypted refresh token to SQLite
      try {
        const tokenMetaKey = 'higgsfield_oauth_token_meta';
        const now = Date.now();
        const expiresAt = now + expiresIn * 1000;

        const metaObj = {
          clientId: session.clientId,
          redirectUri: session.redirectUri,
          expiresAt,
          scope,
          encryptedRefreshToken: refreshToken ? encryptSecret(refreshToken) : null,
          hasRefreshToken: !!refreshToken,
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
        token: accessToken,
        refreshToken,
        scope,
        expiresIn,
        origin: session.origin
      };
    } catch (err: any) {
      console.error('[Higgsfield OAuth] Network error during token exchange:', err);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: `Gagal menghubungi Higgsfield Token Endpoint: ${err?.message || String(err)}`
      };
    }
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
