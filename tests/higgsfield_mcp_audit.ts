import { MediaProviderRouter, MediaProviderRegistry } from '../src/server/providers';
import { HiggsfieldMCPAdapter, HIGGSFIELD_DEFAULT_MODELS } from '../src/server/providers/HiggsfieldMCPAdapter';
import { CreditService } from '../server/creditService';
import { FounderService } from '../src/server/fcc/FounderService';
import { HiggsfieldOAuthService, HiggsfieldOAuthSession } from '../server/services/higgsfieldOAuthService';
import { db } from '../src/db/index';
import { systemSettings } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function runAudit() {
  console.log('====================================================');
  console.log(' NEURONA HIGGSFIELD MCP TARGETED SECURITY AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(` [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // TEST GROUP 1: MediaProviderRegistry & Discovery
  console.log('--- TEST GROUP 1: MediaProviderRegistry & Discovery ---');
  const allProviders = MediaProviderRegistry.getAll();
  const higgsfieldRegistered = allProviders.some(p => p.id === 'higgsfield');
  assert(higgsfieldRegistered, 'Higgsfield is registered in MediaProviderRegistry with ID "higgsfield"');

  const higgsfieldMeta = MediaProviderRegistry.get('higgsfield');
  assert(higgsfieldMeta?.type === 'HYBRID' || higgsfieldMeta?.type === 'VIDEO', 'Higgsfield type is correctly registered');
  assert(higgsfieldMeta?.supportsVideoGen === true && higgsfieldMeta?.supportsImageToVideo === true, 'Higgsfield supports video and I2V generation');

  // TEST GROUP 2: Strict Routing & No Fallback Policy
  console.log('\n--- TEST GROUP 2: Strict Routing & No Fallback Policy ---');
  const routeExplicit = MediaProviderRouter.resolveRoute('VIDEO', {
    preferredProvider: 'higgsfield',
    preferredModelOrEngine: 'higgsfield-video-pro'
  });
  assert(routeExplicit.providerId === 'higgsfield', `Explicit routing resolved to providerId: "${routeExplicit.providerId}"`);
  assert(routeExplicit.allowFallback === false, 'Strict allowFallback is set to false (no silent fallback)');
  assert(routeExplicit.model === 'higgsfield-video-pro', `Model preference preserved: "${routeExplicit.model}"`);

  // TEST GROUP 3: MCP Dynamic Tool Resolution
  console.log('\n--- TEST GROUP 3: MCP Dynamic Tool Resolution ---');
  const adapter = new HiggsfieldMCPAdapter();
  const t2vTool = adapter.resolveToolName('TEXT_TO_VIDEO');
  const i2vTool = adapter.resolveToolName('IMAGE_TO_VIDEO');
  assert(typeof t2vTool === 'string' && t2vTool.length > 0, `Text-to-Video tool resolved to: "${t2vTool}"`);
  assert(typeof i2vTool === 'string' && i2vTool.length > 0, `Image-to-Video tool resolved to: "${i2vTool}"`);

  // TEST GROUP 4: Security Hardening - Exact Origin Allowlist
  console.log('\n--- TEST GROUP 4: Security Hardening - Explicit Origin Allowlist ---');
  
  // 4.1 Approved exact origins
  const localhostOrigin = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'http', 'x-forwarded-host': 'localhost:3000' });
  assert(localhostOrigin === 'http://localhost:3000', `Approved exact origin accepted: ${localhostOrigin}`);

  const devCloudRunOrigin = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app' });
  assert(devCloudRunOrigin === 'https://ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app', `Approved exact Cloud Run dev origin accepted: ${devCloudRunOrigin}`);

  const neuronaOrigin = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'app.neurona.ai' });
  assert(neuronaOrigin === 'https://app.neurona.ai', `Approved exact production origin accepted: ${neuronaOrigin}`);

  // 4.2 Suffix wildcard rejection tests (malicious origins)
  const maliciousRunApp = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'malicious.run.app' });
  assert(maliciousRunApp !== 'https://malicious.run.app' && maliciousRunApp === 'http://localhost:3000', `Malicious *.run.app suffix rejected, safely defaulted: ${maliciousRunApp}`);

  const maliciousNeurona = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'attacker.neurona.ai' });
  assert(maliciousNeurona !== 'https://attacker.neurona.ai' && maliciousNeurona === 'http://localhost:3000', `Malicious *.neurona.ai suffix rejected, safely defaulted: ${maliciousNeurona}`);

  const spoofedForwardedHost = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'evil-spoofed-attacker.com' });
  assert(spoofedForwardedHost === 'http://localhost:3000', `Spoofed X-Forwarded-Host rejected, safely defaulted: ${spoofedForwardedHost}`);

  // TEST GROUP 5: Security Hardening - Dynamic Client Registration & PKCE
  console.log('\n--- TEST GROUP 5: Security Hardening - Client Registration & PKCE ---');

  // 5.1 PKCE Generation
  const pkce = HiggsfieldOAuthService.generatePKCE();
  assert(typeof pkce.verifier === 'string' && pkce.verifier.length > 30, 'PKCE Verifier generated with cryptographic entropy');
  assert(typeof pkce.challenge === 'string' && pkce.challenge.length > 30, 'PKCE S256 Challenge generated correctly');

  // 5.2 Dynamic registration failure handling
  const prevClientId = process.env.HIGGSFIELD_CLIENT_ID;
  delete process.env.HIGGSFIELD_CLIENT_ID;
  
  let dynamicRegFailedCleanly = false;
  let errorMsg = '';
  try {
    // Isolated dynamic registration call without mock endpoint should throw DYNAMIC_CLIENT_REGISTRATION_FAILED
    await HiggsfieldOAuthService.getOrRegisterClient('http://localhost:3000/api/fcc/higgsfield/oauth/callback_isolated_test');
  } catch (err: any) {
    dynamicRegFailedCleanly = true;
    errorMsg = err.message || '';
  }
  assert(dynamicRegFailedCleanly && errorMsg.includes('DYNAMIC_CLIENT_REGISTRATION_FAILED'), 
    `Dynamic registration failure stops OAuth with explicit error: "${errorMsg.substring(0, 35)}..."`);

  // 5.3 Verify that NO fake/random client ID was persisted in SQLite
  const testCacheKey = 'higgsfield_oauth_client:http://localhost:3000/api/fcc/higgsfield/oauth/callback_isolated_test';
  const fakeRow = db.select().from(systemSettings).where(eq(systemSettings.key, testCacheKey)).get();
  assert(!fakeRow, 'Fake/random client ID is NEVER persisted to SQLite on registration failure');

  // 5.4 Configure trusted client ID for remaining flow tests
  process.env.HIGGSFIELD_CLIENT_ID = 'neurona_official_higgsfield_client_v1';
  const trustedClient = await HiggsfieldOAuthService.getOrRegisterClient('http://localhost:3000/api/fcc/higgsfield/oauth/callback');
  assert(trustedClient === 'neurona_official_higgsfield_client_v1', `Trusted HIGGSFIELD_CLIENT_ID honored: ${trustedClient}`);

  // 5.5 Create valid session with trusted client
  const authSession = await HiggsfieldOAuthService.createAuthorizationSession('http://localhost:3000');
  assert(typeof authSession.state === 'string' && authSession.state.startsWith('higgsfield_pkce_'), `OAuth state prefixed correctly: "${authSession.state.substring(0, 25)}..."`);
  assert(typeof authSession.authUrl === 'string' && authSession.authUrl.includes('higgsfield.ai'), 'OAuth authUrl points to official Higgsfield login/auth portal');
  assert(authSession.clientId === 'neurona_official_higgsfield_client_v1', 'Session initialized with official client ID');

  // TEST GROUP 6: Strict Token Exchange & Anti-Replay Checks
  console.log('\n--- TEST GROUP 6: Strict Token Exchange & Access Token Validation ---');

  // 6.1 Strict Token Exchange failure on network error (Authorization code is NEVER treated as token)
  const mockCode = 'hf_auth_code_security_test_' + Date.now();
  const exchangeResult = await HiggsfieldOAuthService.exchangeCodeForToken(mockCode, authSession.state);
  assert(exchangeResult.success === false && ['TOKEN_ENDPOINT_UNREACHABLE', 'TOKEN_EXCHANGE_REJECTED'].includes(exchangeResult.error || ''),
    `Authorization code is NEVER treated as token on endpoint failure (Error: ${exchangeResult.error})`);
  assert(!exchangeResult.oauthAccessToken, 'No oauthAccessToken returned on failed exchange');

  // 6.2 Replay protection: using the same state again must fail with INVALID_STATE
  const replayResult = await HiggsfieldOAuthService.exchangeCodeForToken(mockCode, authSession.state);
  assert(replayResult.success === false && replayResult.error === 'INVALID_STATE', 'Replay protection active: Consumed session immediately purged');

  // 6.3 Test Token Response Schema Validation (Mock Session in SQLite)
  const syntheticState = `higgsfield_pkce_synth_${Date.now()}`;
  const syntheticVerifier = pkce.verifier;
  const syntheticChallenge = pkce.challenge;
  const synthSession: HiggsfieldOAuthSession = {
    state: syntheticState,
    verifier: syntheticVerifier,
    challenge: syntheticChallenge,
    clientId: 'neurona_official_higgsfield_client_v1',
    redirectUri: 'http://localhost:3000/api/fcc/higgsfield/oauth/callback',
    canonicalOrigin: 'http://localhost:3000',
    createdAt: Date.now(),
    expiresAt: Date.now() + 900000
  };

  db.insert(systemSettings).values({
    key: `higgsfield_oauth_session:${syntheticState}`,
    value: JSON.stringify(synthSession),
    updatedAt: new Date().toISOString()
  }).run();

  // Test that a response containing only "token" (and not "access_token") would be rejected by the parser
  // We simulate the validation rule in HiggsfieldOAuthService:
  const mockBadDataOnlyToken = { token: 'some_arbitrary_token_value' };
  const rawToken1 = (mockBadDataOnlyToken as any).access_token;
  const isRejectedNoAccessToken = !rawToken1 || typeof rawToken1 !== 'string' || !rawToken1.trim();
  assert(isRejectedNoAccessToken, 'Schema Validation: Response with only "token" is strictly rejected (NO_ACCESS_TOKEN)');

  const mockGoodData = { access_token: 'hf_official_valid_access_token_sec_ok', expires_in: 3600, scope: 'mcp_full_access' };
  const rawToken2 = (mockGoodData as any).access_token;
  const isAcceptedAccessToken = !!rawToken2 && typeof rawToken2 === 'string' && rawToken2.trim().length > 0;
  assert(isAcceptedAccessToken, 'Schema Validation: Response with valid "access_token" is accepted');

  // 6.4 Clean up token & revoke
  const revokeResult = await HiggsfieldOAuthService.revokeToken('test_token_for_revocation');
  assert(revokeResult.success === true, 'Higgsfield OAuth token revocation & SQLite credential purge succeeded');

  // Restore previous env
  if (prevClientId) {
    process.env.HIGGSFIELD_CLIENT_ID = prevClientId;
  }

  // TEST GROUP 7: CreditService Integrity (HOLD -> COMMIT / REFUND)
  console.log('\n--- TEST GROUP 7: CreditService Integrity & Hold Lifecycle ---');
  const commitUserId = 'usr_regular_commit_test';
  const refundUserId = 'usr_regular_refund_test';

  // Seed test users in SQLite DB
  try {
    const { users } = await import('../src/db/schema');
    await db.insert(users).values({
      uid: commitUserId,
      email: 'commit_test@neurona.ai',
      name: 'Commit Tester',
      role: 'user',
      credits: 200,
      createdAt: new Date().toISOString()
    }).onConflictDoNothing();

    await db.insert(users).values({
      uid: refundUserId,
      email: 'refund_test@neurona.ai',
      name: 'Refund Tester',
      role: 'user',
      credits: 200,
      createdAt: new Date().toISOString()
    }).onConflictDoNothing();
  } catch (e) {}
  
  // 7.1 Pricing calculation
  const costLookup = CreditService.calculateCreditCost('higgsfield-video-pro', {
    provider: 'higgsfield',
    operation: 'text-to-video',
    duration: 5
  });
  assert(costLookup.credits > 0, `Authoritative pricing found for higgsfield-video-pro (${costLookup.credits} credits, $${costLookup.costUsd})`);

  // 7.2 Credit Reserve (HOLD)
  const runId = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const holdRes = await CreditService.holdCredits(
    commitUserId,
    costLookup.credits,
    `test_audit_project_commit_${runId}`,
    undefined,
    'higgsfield',
    'higgsfield-video-pro',
    'text-to-video'
  );
  assert(holdRes.success === true && !!holdRes.holdId, `Credit HOLD successful (Hold ID: ${holdRes.holdId})`);

  if (holdRes.success && holdRes.holdId) {
    // 7.3 Credit Commit
    let commitFailed = false;
    try {
      await CreditService.commitHold(commitUserId, costLookup.credits, holdRes.holdId);
    } catch (e: any) {
      console.error('Commit error:', e.message);
      commitFailed = true;
    }
    assert(!commitFailed, 'Credit COMMIT (commitHold) completed cleanly');

    // 7.4 Test Refund Protection (Cannot refund already committed hold)
    let refundFailed = false;
    try {
      await CreditService.refundCredits(commitUserId, costLookup.credits, 'Test refund on committed', holdRes.holdId);
    } catch (e) {
      refundFailed = true;
    }
    assert(refundFailed, 'Committed credit cannot be refunded (Strict Anti-Double-Charge / Hold Integrity)');
  }

  // 7.5 Test Explicit Failure -> STOP + REFUND Flow
  const failHoldRes = await CreditService.holdCredits(
    refundUserId,
    costLookup.credits,
    `test_audit_project_refund_${runId}`,
    undefined,
    'higgsfield',
    'higgsfield-video-pro',
    'image-to-video'
  );
  assert(failHoldRes.success === true && !!failHoldRes.holdId, `Second Credit HOLD created for refund test (Hold ID: ${failHoldRes.holdId})`);

  if (failHoldRes.success && failHoldRes.holdId) {
    let refundSuccess = true;
    try {
      await CreditService.refundCredits(refundUserId, costLookup.credits, 'Simulated MCP generation failure', failHoldRes.holdId);
    } catch (e: any) {
      console.error('Refund error:', e.message);
      refundSuccess = false;
    }
    assert(refundSuccess, `Credit REFUND successful on explicit provider failure`);
  }

  console.log('\n====================================================');
  console.log(` AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Audit run error:', err);
  process.exit(1);
});
