import { HiggsfieldOAuthService } from '../server/services/higgsfieldOAuthService';
import { DomainConfigService } from '../server/services/domainConfigService';
import { db } from '../src/db/index';
import { systemSettings } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function runAudit() {
  console.log('====================================================');
  console.log('NEURONA - HIGGSFIELD MCP OAUTH & DOMAIN SECURITY AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  // TEST 1: Protected Resource Metadata Discovery
  try {
    const protectedMeta = await HiggsfieldOAuthService.discoverProtectedResourceMetadata();
    assert(
      protectedMeta && Array.isArray(protectedMeta.authorization_servers) && protectedMeta.authorization_servers.length > 0,
      'Test 1: Discover Protected Resource Metadata (RFC 9207)',
      `Resource: ${protectedMeta.resource}, Auth Servers: ${protectedMeta.authorization_servers.join(', ')}`
    );
  } catch (e: any) {
    assert(false, 'Test 1: Discover Protected Resource Metadata', e.message);
  }

  // TEST 2: Authorization Server Metadata Discovery
  let discoveredRegEndpoint = '';
  try {
    const authMeta = await HiggsfieldOAuthService.discoverAuthorizationServerMetadata();
    discoveredRegEndpoint = authMeta.registration_endpoint || '';
    assert(
      authMeta &&
      typeof authMeta.authorization_endpoint === 'string' && authMeta.authorization_endpoint.startsWith('https://') &&
      typeof authMeta.token_endpoint === 'string' && authMeta.token_endpoint.startsWith('https://') &&
      typeof authMeta.registration_endpoint === 'string' && authMeta.registration_endpoint.startsWith('https://'),
      'Test 2: Discover Authorization Server Metadata (RFC 8414)',
      `Auth Endpoint: ${authMeta.authorization_endpoint}, Registration: ${authMeta.registration_endpoint}`
    );
  } catch (e: any) {
    assert(false, 'Test 2: Discover Authorization Server Metadata', e.message);
  }

  // TEST 3: Pre-registered HIGGSFIELD_CLIENT_ID priority
  try {
    process.env.HIGGSFIELD_CLIENT_ID = 'official_preregistered_client_123';
    const testRedirect = 'http://localhost:3000/api/fcc/higgsfield/oauth/callback';
    const clientId = await HiggsfieldOAuthService.getOrRegisterClient(testRedirect);
    assert(
      clientId === 'official_preregistered_client_123',
      'Test 3: Priority for explicitly configured HIGGSFIELD_CLIENT_ID env var'
    );
    delete process.env.HIGGSFIELD_CLIENT_ID;
  } catch (e: any) {
    assert(false, 'Test 3: Priority for explicitly configured HIGGSFIELD_CLIENT_ID', e.message);
  }

  // TEST 4: Official Dynamic Client Registration & Fake Client ID Rejection
  try {
    const testRedirect = 'http://localhost:3000/api/fcc/higgsfield/oauth/callback';
    const clientId = await HiggsfieldOAuthService.getOrRegisterClient(testRedirect);
    assert(
      typeof clientId === 'string' && clientId.length > 0 && !clientId.startsWith('neurona_higgsfield_'),
      'Test 4: Official Dynamic Client Registration returns valid client_id without generating fake ID',
      `Client ID: ${clientId}`
    );
  } catch (e: any) {
    assert(
      e.message.includes('HIGGSFIELD_OAUTH_CLIENT_REGISTRATION_UNAVAILABLE'),
      'Test 4: Dynamic Client Registration stops safely on registration unavailable without fake client ID',
      e.message
    );
  }

  // TEST 5: Exact Origin Matching (Disallow Wildcards & Suffixes)
  try {
    const safeDefault = HiggsfieldOAuthService.getCanonicalTrustedOrigin();
    const evilHostOrigin = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-host': 'evilneurona.ai' });
    const exactApprovedOrigin = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-host': 'app.neurona.ai', 'x-forwarded-proto': 'https' });

    assert(
      evilHostOrigin === safeDefault,
      'Test 5a: Unapproved/Suffix origin "evilneurona.ai" is rejected and defaulted to canonical origin'
    );
    assert(
      exactApprovedOrigin === 'https://app.neurona.ai',
      'Test 5b: Approved exact origin "https://app.neurona.ai" is accepted'
    );
  } catch (e: any) {
    assert(false, 'Test 5: Exact Origin Matching', e.message);
  }

  // TEST 6: DomainConfig Integration for OAuth Redirect URI
  try {
    const activeCfg = DomainConfigService.getActiveConfig();
    const sessionRes = await HiggsfieldOAuthService.createAuthorizationSession(activeCfg.canonicalUrl);
    const expectedRedirect = `${activeCfg.canonicalUrl}/api/fcc/higgsfield/oauth/callback`;

    assert(
      sessionRes.redirectUri === expectedRedirect && sessionRes.authUrl.includes(encodeURIComponent(expectedRedirect)),
      'Test 6: createAuthorizationSession derives redirect_uri strictly from DomainConfig canonicalUrl',
      `Redirect URI: ${sessionRes.redirectUri}`
    );
  } catch (e: any) {
    assert(false, 'Test 6: DomainConfig Integration for OAuth Redirect URI', e.message);
  }

  // TEST 7: Token Isolation & Secret Protection
  try {
    const domainConfig = DomainConfigService.getActiveConfig();
    const configStr = JSON.stringify(domainConfig);
    assert(
      !configStr.includes('oauthAccessToken') && !configStr.includes('keyEncrypted') && !configStr.includes('refresh_token'),
      'Test 7: DomainConfig API responses do NOT leak access tokens, refresh tokens, or encrypted keys'
    );
  } catch (e: any) {
    assert(false, 'Test 7: Token Isolation & Secret Protection', e.message);
  }

  console.log('\n====================================================');
  console.log(`AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
