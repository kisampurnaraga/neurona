import crypto from 'crypto';

interface OAuthSession {
  verifier: string;
  clientId: string;
  redirectUri: string;
  createdAt: number;
}

export class OpenArtOAuthService {
  private static registeredClients = new Map<string, string>(); // redirectUri -> clientId
  private static pendingSessions = new Map<string, OAuthSession>(); // state -> OAuthSession

  private static base64URLEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private static generatePKCE(): { verifier: string; challenge: string } {
    const verifier = this.base64URLEncode(crypto.randomBytes(32));
    const challenge = this.base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
  }

  /**
   * Register OAuth Client dynamically with OpenArt (RFC 7591)
   */
  public static async getOrRegisterClient(redirectUri: string): Promise<string> {
    if (this.registeredClients.has(redirectUri)) {
      return this.registeredClients.get(redirectUri)!;
    }

    try {
      const resp = await fetch('https://openart.ai/suite/api/auth/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'NEURONA AI Media Studio',
          redirect_uris: [
            redirectUri,
            'http://localhost:3000/api/fcc/openart/oauth/callback',
            'https://ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app/api/fcc/openart/oauth/callback',
            'https://ais-pre-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app/api/fcc/openart/oauth/callback'
          ]
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`OpenArt registration returned HTTP ${resp.status}: ${text}`);
      }

      const data = await resp.json();
      const clientId = data.client_id;
      if (!clientId) {
        throw new Error('OpenArt registration did not return a valid client_id');
      }

      this.registeredClients.set(redirectUri, clientId);
      return clientId;
    } catch (err: any) {
      console.warn('[OpenArt OAuth] Dynamic registration failed, using fallback client:', err?.message);
      // Fallback known registered client ID
      return 'mSAjtkka4h8tzvFDY4BV';
    }
  }

  /**
   * Initialize a new OAuth 2.0 PKCE Session
   */
  public static async createAuthorizationSession(origin: string): Promise<{
    authUrl: string;
    directAuthUrl: string;
    state: string;
    redirectUri: string;
    clientId: string;
  }> {
    this.cleanExpiredSessions();

    const cleanOrigin = origin.replace(/\/+$/, '');
    const redirectUri = `${cleanOrigin}/api/fcc/openart/oauth/callback`;
    const clientId = await this.getOrRegisterClient(redirectUri);

    const { verifier, challenge } = this.generatePKCE();
    const state = `openart_pkce_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    this.pendingSessions.set(state, {
      verifier,
      clientId,
      redirectUri,
      createdAt: Date.now()
    });

    const authorizeRelativePath = `/suite/api/auth/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=full_access&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;
    
    // Direct endpoint on suite
    const directAuthUrl = `https://openart.ai${authorizeRelativePath}`;
    
    // User-friendly signin redirect (prevents Next.js 404 on unauthenticated users)
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
   */
  public static async exchangeCodeForToken(code: string, state: string): Promise<{
    success: boolean;
    token?: string;
    refreshToken?: string;
    scope?: string;
    expiresIn?: number;
    error?: string;
    message?: string;
  }> {
    const session = this.pendingSessions.get(state);
    if (!session) {
      return {
        success: false,
        error: 'INVALID_STATE',
        message: 'Sesi otorisasi OAuth tidak ditemukan atau telah kadaluarsa. Silakan coba klik "Connect OpenArt" kembali.'
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

      console.log(`[OpenArt OAuth] Exchanging code for token (clientId: ${session.clientId}, redirectUri: ${session.redirectUri})...`);

      const resp = await fetch('https://openart.ai/suite/api/auth/oauth/token', {
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
          message: data.error_description || data.message || `Penukaran token gagal dengan HTTP ${resp.status}`
        };
      }

      const accessToken = data.access_token || data.token;
      if (!accessToken) {
        return {
          success: false,
          error: 'NO_ACCESS_TOKEN',
          message: 'Server OpenArt tidak mengembalikan access_token yang valid.'
        };
      }

      // Cleanup consumed session
      this.pendingSessions.delete(state);

      return {
        success: true,
        token: accessToken,
        refreshToken: data.refresh_token,
        scope: data.scope,
        expiresIn: data.expires_in
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
   * Housekeeping: Remove sessions older than 15 minutes
   */
  private static cleanExpiredSessions(): void {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000;
    for (const [state, sess] of this.pendingSessions.entries()) {
      if (now - sess.createdAt > maxAge) {
        this.pendingSessions.delete(state);
      }
    }
  }
}
