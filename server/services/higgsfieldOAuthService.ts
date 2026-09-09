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

export interface HiggsfieldProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported?: string[];
  bearer_methods_supported?: string[];
}

export interface HiggsfieldAuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  revocation_endpoint?: string;
  response_types_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  code_challenge_methods_supported?: string[];
  scopes_supported?: string[];
}

export class HiggsfieldOAuthService {
  public static readonly OFFICIAL_MCP_ENDPOINT = 'https://mcp.higgsfield.ai/mcp';
  public static readonly DEFAULT_PROTECTED_RESOURCE_METADATA_URL = 'https://mcp.higgsfield.ai/.well-known/oauth-protected-resource';
  public static readonly DEFAULT_AUTH_SERVER_METADATA_URL = 'https://mcp.higgsfield.ai/.well-known/oauth-authorization-server';

  // In-memory discovery cache with TTL
  private static metadataCache: {
    protectedResource?: HiggsfieldProtectedResourceMetadata;
    authServer?: HiggsfieldAuthorizationServerMetadata;
    fetchedAt: number;
  } | null = null;

  public static clearMetadataCache(): void {
    this.metadataCache = null;
  }

  // Base list of explicitly approved NEURONA canonical origins
  private static readonly BASE_APPROVED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app',
    'https://ais-pre-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app',
    'https://app.neurona.ai',
    'https://neurona.ai'
  ];

  private static base64URLEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Discover Protected Resource Metadata (RFC 9207 / MCP OAuth).
   * STRICT FAIL-CLOSED: If protected resource discovery fails or returns invalid metadata,
   * throws HIGGSFIELD_OAUTH_DISCOVERY_FAILED. NO HARDCODED FALLBACKS.
   */
  public static async discoverProtectedResourceMetadata(mcpEndpoint: string = this.OFFICIAL_MCP_ENDPOINT): Promise<HiggsfieldProtectedResourceMetadata> {
    const discoveryUrl = mcpEndpoint.endsWith('/mcp')
      ? `${mcpEndpoint.replace(/\/mcp$/, '')}/.well-known/oauth-protected-resource`
      : `${mcpEndpoint.replace(/\/+$/, '')}/.well-known/oauth-protected-resource`;

    try {
      const resp = await fetch(discoveryUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'NEURONA-MCP-Client/2.5' },
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) {
        const meta: HiggsfieldProtectedResourceMetadata = await resp.json();
        if (meta && Array.isArray(meta.authorization_servers) && meta.authorization_servers.length > 0) {
          const validServers = meta.authorization_servers.filter(s => typeof s === 'string' && (s.startsWith('https://') || s.startsWith('http://localhost') || s.startsWith('http://127.0.0.1')));
          if (validServers.length > 0) {
            console.log(`[Higgsfield OAuth Discovery] Protected Resource Metadata discovered. Auth Servers: ${validServers.join(', ')}`);
            return {
              ...meta,
              authorization_servers: validServers
            };
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Higgsfield OAuth Discovery] Protected Resource discovery request failed (${err?.message}). Inspecting WWW-Authenticate header...`);
    }

    // Attempt WWW-Authenticate header inspection from MCP 401 response
    try {
      const probeRes = await fetch(mcpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 'probe_01', method: 'initialize' }),
        signal: AbortSignal.timeout(4000)
      });
      const wwwAuth = probeRes.headers.get('www-authenticate') || '';
      if (wwwAuth.includes('resource_metadata=')) {
        const match = wwwAuth.match(/resource_metadata=["']([^"']+)["']/);
        if (match && match[1]) {
          const resMetaUrl = match[1];
          const resMetaResp = await fetch(resMetaUrl, { signal: AbortSignal.timeout(4000) });
          if (resMetaResp.ok) {
            const meta = await resMetaResp.json();
            if (meta && Array.isArray(meta.authorization_servers) && meta.authorization_servers.length > 0) {
              const validServers = meta.authorization_servers.filter(s => typeof s === 'string' && (s.startsWith('https://') || s.startsWith('http://localhost') || s.startsWith('http://127.0.0.1')));
              if (validServers.length > 0) {
                return {
                  ...meta,
                  authorization_servers: validServers
                };
              }
            }
          }
        }
      }
    } catch {}

    // FAIL-CLOSED: No fallback
    throw new Error('HIGGSFIELD_OAUTH_DISCOVERY_FAILED: Protected resource metadata unreachable or invalid. OAuth discovery stopped.');
  }

  /**
   * Discover Authorization Server Metadata (RFC 8414).
   * STRICT FAIL-CLOSED: If metadata cannot be retrieved or endpoints are invalid,
   * throws HIGGSFIELD_OAUTH_DISCOVERY_FAILED. NO HARDCODED FALLBACKS.
   */
  public static async discoverAuthorizationServerMetadata(authServerUrl?: string): Promise<HiggsfieldAuthorizationServerMetadata> {
    const now = Date.now();
    if (this.metadataCache && this.metadataCache.authServer && (now - this.metadataCache.fetchedAt < 3600000)) {
      return this.metadataCache.authServer;
    }

    let targetServer = authServerUrl;
    if (!targetServer) {
      const protectedMeta = await this.discoverProtectedResourceMetadata();
      targetServer = protectedMeta.authorization_servers[0];
    }

    if (!targetServer || typeof targetServer !== 'string') {
      throw new Error('HIGGSFIELD_OAUTH_DISCOVERY_FAILED: No authorization server URL provided in protected resource metadata.');
    }

    const cleanServer = targetServer.replace(/\/+$/, '');
    const metaUrl = `${cleanServer}/.well-known/oauth-authorization-server`;

    try {
      const resp = await fetch(metaUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'NEURONA-MCP-Client/2.5' },
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) {
        const meta: HiggsfieldAuthorizationServerMetadata = await resp.json();
        const isUrlValid = (u?: string) => typeof u === 'string' && (u.startsWith('https://') || u.startsWith('http://localhost') || u.startsWith('http://127.0.0.1'));

        if (meta && isUrlValid(meta.authorization_endpoint) && isUrlValid(meta.token_endpoint)) {
          console.log(`[Higgsfield OAuth Discovery] Discovered Authorization Server Metadata from ${metaUrl}: authorization_endpoint=${meta.authorization_endpoint}, registration_endpoint=${meta.registration_endpoint || 'none'}`);
          this.metadataCache = {
            authServer: meta,
            fetchedAt: now
          };
          return meta;
        }
      }
    } catch (err: any) {
      console.warn(`[Higgsfield OAuth Discovery] Authorization Server Metadata discovery error at ${metaUrl}:`, err?.message);
    }

    // FAIL-CLOSED: No fallback
    throw new Error(`HIGGSFIELD_OAUTH_DISCOVERY_FAILED: Authorization server metadata unreachable or invalid at ${metaUrl}. OAuth discovery stopped.`);
  }

  /**
   * Retrieves the comprehensive list of explicitly approved trusted origins.
   * Disallows suffix wildcards to prevent subdomain/domain takeover or spoofing.
   */
  public static getExplicitApprovedOrigins(): string[] {
    const origins = new Set<string>();

    for (const base of this.BASE_APPROVED_ORIGINS) {
      origins.add(base.trim().replace(/\/+$/, ''));
    }

    if (process.env.HIGGSFIELD_ALLOWED_ORIGINS) {
      const split = process.env.HIGGSFIELD_ALLOWED_ORIGINS.split(',');
      for (const item of split) {
        if (item && item.trim()) {
          origins.add(item.trim().replace(/\/+$/, ''));
        }
      }
    }

    if (process.env.APP_ORIGIN && process.env.APP_ORIGIN.trim()) {
      origins.add(process.env.APP_ORIGIN.trim().replace(/\/+$/, ''));
    }
    if (process.env.CANONICAL_URL && process.env.CANONICAL_URL.trim()) {
      origins.add(process.env.CANONICAL_URL.trim().replace(/\/+$/, ''));
    }
    if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim()) {
      origins.add(process.env.PUBLIC_URL.trim().replace(/\/+$/, ''));
    }

    try {
      const activeCfg = DomainConfigService.getActiveConfig();
      if (activeCfg.allowedOrigins) {
        activeCfg.allowedOrigins.forEach(o => o && origins.add(o.trim().replace(/\/+$/, '')));
      }
      if (activeCfg.trustedOAuthOrigins) {
        activeCfg.trustedOAuthOrigins.forEach(o => o && origins.add(o.trim().replace(/\/+$/, '')));
      }
    } catch {}

    return Array.from(origins);
  }

  /**
   * Resolves a trusted, canonical application origin using DomainConfigService.
   * Ensures parity with OpenArt, rejecting arbitrary unapproved headers and avoiding
   * incorrect localhost fallbacks in production.
   */
  public static getCanonicalTrustedOrigin(headers?: Record<string, string | string[] | undefined>, fallbackHost?: string): string {
    return DomainConfigService.getCanonicalTrustedOrigin(headers);
  }

  public static generatePKCE(): { verifier: string; challenge: string } {
    const verifier = this.base64URLEncode(crypto.randomBytes(32));
    const challenge = this.base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
  }

  /**
   * Register OAuth Client dynamically with Higgsfield (RFC 7591)
   * Discovers official registration_endpoint via Authorization Server Metadata (RFC 8414).
   * Stored in SQLite systemSettings for persistence.
   * STRICT SECURITY: Never generates or persists fake/random client IDs.
   */
  public static async getOrRegisterClient(redirectUri: string): Promise<string> {
    // 1. Explicit environment override if provided
    if (process.env.HIGGSFIELD_CLIENT_ID && process.env.HIGGSFIELD_CLIENT_ID.trim()) {
      return process.env.HIGGSFIELD_CLIENT_ID.trim();
    }

    const cacheKey = `higgsfield_oauth_client:${redirectUri}`;

    // 2. Check SQLite persistence for official registered client ID
    try {
      const existing = db.select().from(systemSettings).where(eq(systemSettings.key, cacheKey)).get();
      if (existing && existing.value) {
        const val = existing.value.trim();
        // Discard any legacy fake client IDs
        if (val && !val.startsWith('neurona_higgsfield_')) {
          return val;
        } else if (val.startsWith('neurona_higgsfield_')) {
          // Purge legacy fake client ID from SQLite
          db.delete(systemSettings).where(eq(systemSettings.key, cacheKey)).run();
        }
      }
    } catch (e) {
      console.warn('[Higgsfield OAuth] SQLite client lookup notice:', (e as any)?.message);
    }

    // 3. Discover Registration Endpoint via Authorization Server Metadata (RFC 8414)
    const authMeta = await this.discoverAuthorizationServerMetadata();
    const registrationEndpoint = authMeta.registration_endpoint;

    if (!registrationEndpoint || typeof registrationEndpoint !== 'string' || !(registrationEndpoint.startsWith('https://') || registrationEndpoint.startsWith('http://localhost') || registrationEndpoint.startsWith('http://127.0.0.1'))) {
      throw new Error('HIGGSFIELD_OAUTH_CLIENT_REGISTRATION_UNAVAILABLE: registration_endpoint tidak ditemukan dalam metadata OAuth resmi Higgsfield.');
    }

    console.log(`[Higgsfield OAuth] Performing official RFC 7591 client registration via discovered endpoint: ${registrationEndpoint} (redirectUri: ${redirectUri})...`);

    const knownRedirectUris = [
      redirectUri,
      ...DomainConfigService.getAllTrustedRedirectUris('higgsfield'),
      'http://localhost:3000/api/fcc/higgsfield/oauth/callback',
      'https://ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app/api/fcc/higgsfield/oauth/callback',
      'https://ais-pre-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app/api/fcc/higgsfield/oauth/callback'
    ];
    const uniqueRedirectUris = Array.from(new Set(knownRedirectUris));

    let officialClientId = '';

    try {
      const resp = await fetch(registrationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NEURONA-Media-Pipeline/2.5'
        },
        body: JSON.stringify({
          client_name: 'NEURONA AI Video Pipeline',
          redirect_uris: uniqueRedirectUris,
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
          scope: 'openid email offline_access'
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (resp.ok) {
        const data: any = await resp.json().catch(() => ({}));
        if (data.client_id && typeof data.client_id === 'string' && data.client_id.trim()) {
          officialClientId = data.client_id.trim();
        }
      } else {
        const errTxt = await resp.text().catch(() => '');
        console.warn(`[Higgsfield OAuth] Dynamic registration endpoint ${registrationEndpoint} returned HTTP ${resp.status}: ${errTxt}`);
      }
    } catch (netErr: any) {
      console.error(`[Higgsfield OAuth] Dynamic registration request to ${registrationEndpoint} failed:`, netErr?.message);
    }

    // 4. STRICT: If dynamic registration fails or does not return a client_id, STOP OAuth safely.
    // NEVER generate random fake fallback client ID or save fake ID to SQLite.
    if (!officialClientId) {
      throw new Error(`HIGGSFIELD_OAUTH_CLIENT_REGISTRATION_UNAVAILABLE: Server Higgsfield (${registrationEndpoint}) tidak mengembalikan official client_id dan HIGGSFIELD_CLIENT_ID belum dikonfigurasi.`);
    }

    // 5. Persist official registered client ID in SQLite
    try {
      const now = new Date().toISOString();
      db.insert(systemSettings)
        .values({ key: cacheKey, value: officialClientId, updatedAt: now })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value: officialClientId, updatedAt: now }
        })
        .run();
      console.log(`[Higgsfield OAuth] Persisted official registered client_id in SQLite: ${officialClientId.substring(0, 10)}...`);
    } catch (saveErr) {
      console.warn('[Higgsfield OAuth] Could not save official client_id to SQLite:', saveErr);
    }

    return officialClientId;
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
    const redirectUri = DomainConfigService.deriveOAuthUrls(cleanOrigin).higgsfieldOAuthCallbackUrl;
    const clientId = await this.getOrRegisterClient(redirectUri);

    const authMeta = await this.discoverAuthorizationServerMetadata();
    const authEndpoint = authMeta.authorization_endpoint;
    // STRICT SECURITY: Must match the exact scopes registered with RFC 7591 dynamic client registration
    // and requested by the Higgsfield MCP protected resource ('openid email offline_access').
    // NEVER use raw authMeta.scopes_supported which contains Clerk user/org scopes disallowed for this client.
    const scope = 'openid email offline_access';

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

    const queryParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });

    const directAuthUrl = `${authEndpoint}?${queryParams.toString()}`;
    const authUrl = directAuthUrl;

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
   * 1. ONLY accepts non-empty string in "access_token" (NO "token" fallback).
   * 2. Authorization code is NEVER treated as access token.
   * 3. If token endpoint fails or doesn't return access_token, returns success: false with NO_ACCESS_TOKEN and saves nothing.
   * 4. PKCE verifier and state expiration are strictly validated.
   * 5. Session is immediately consumed to prevent replay attacks.
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

    let authMeta: HiggsfieldAuthorizationServerMetadata;
    try {
      authMeta = await this.discoverAuthorizationServerMetadata();
    } catch (discErr: any) {
      return {
        success: false,
        error: 'DISCOVERY_FAILED',
        message: discErr?.message || 'Gagal menemukan endpoint OAuth Higgsfield.'
      };
    }
    const tokenEndpoint = authMeta.token_endpoint;

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: session.clientId,
      code: code.trim(),
      redirect_uri: session.redirectUri,
      code_verifier: session.verifier
    });

    console.log(`[Higgsfield OAuth] Performing strict token exchange with Higgsfield Token Endpoint (${tokenEndpoint})...`);

    let responseText = '';
    let responseStatus = 0;
    let data: any = {};

    try {
      const resp = await fetch(tokenEndpoint, {
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

    // STRICT CHECK 1: MUST explicitly contain non-empty string in "access_token" ONLY.
    // Support for "data.token" is completely removed.
    const rawToken = data.access_token;
    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      console.error('[Higgsfield OAuth] Response missing valid "access_token" field:', data);
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
          const authMeta = await this.discoverAuthorizationServerMetadata();
          const revocationEndpoint = authMeta.revocation_endpoint;

          if (revocationEndpoint) {
            const params = new URLSearchParams({ token: targetToken });
            if (clientId) params.append('client_id', clientId);

            await fetch(revocationEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'NEURONA-Media-Pipeline/2.5'
              },
              body: params.toString(),
              signal: AbortSignal.timeout(6000)
            });
            console.log(`[Higgsfield OAuth] Remote token revocation signal sent to ${revocationEndpoint}.`);
          }
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

  /**
   * Invalidate stale client registrations and stale unconsumed sessions specifically for Higgsfield.
   * STRICT SAFETY: ONLY purges keys prefixed with 'higgsfield_oauth_client:' or 'higgsfield_oauth_session:'.
   * Does NOT touch OpenArt, API keys, or any other global database settings.
   */
  public static invalidateStaleState(): void {
    try {
      const allRows = db.select().from(systemSettings).all();
      for (const row of allRows) {
        if (row.key.startsWith('higgsfield_oauth_client:') || row.key.startsWith('higgsfield_oauth_session:')) {
          db.delete(systemSettings).where(eq(systemSettings.key, row.key)).run();
        }
      }
      console.log('[Higgsfield OAuth] Invalidation of stale Higgsfield client registrations & sessions complete.');
    } catch (e) {
      console.warn('[Higgsfield OAuth] Invalidate stale state notice:', e);
    }
  }
}
