import { MediaProviderRouter, MediaProviderRegistry } from '../src/server/providers';
import { HiggsfieldMCPAdapter, HIGGSFIELD_DEFAULT_MODELS } from '../src/server/providers/HiggsfieldMCPAdapter';
import { CreditService } from '../server/creditService';
import { FounderService } from '../src/server/fcc/FounderService';
import { HiggsfieldOAuthService } from '../server/services/higgsfieldOAuthService';

async function runAudit() {
  console.log('====================================================');
  console.log(' NEURONA HIGGSFIELD MCP SECURITY & OAUTH AUDIT');
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

  // TEST 1: Provider Registry Verification
  console.log('--- TEST GROUP 1: MediaProviderRegistry & Discovery ---');
  const allProviders = MediaProviderRegistry.getAll();
  const higgsfieldRegistered = allProviders.some(p => p.id === 'higgsfield');
  assert(higgsfieldRegistered, 'Higgsfield is registered in MediaProviderRegistry with ID "higgsfield"');

  const higgsfieldMeta = MediaProviderRegistry.get('higgsfield');
  assert(higgsfieldMeta?.type === 'HYBRID' || higgsfieldMeta?.type === 'VIDEO', 'Higgsfield type is correctly registered');
  assert(higgsfieldMeta?.supportsVideoGen === true && higgsfieldMeta?.supportsImageToVideo === true, 'Higgsfield supports video and I2V generation');

  // TEST 2: Strict Routing & No Fallback (allowFallback = false)
  console.log('\n--- TEST GROUP 2: Strict Routing & No Fallback Policy ---');
  const routeExplicit = MediaProviderRouter.resolveRoute('VIDEO', {
    preferredProvider: 'higgsfield',
    preferredModelOrEngine: 'higgsfield-video-pro'
  });
  assert(routeExplicit.providerId === 'higgsfield', `Explicit routing resolved to providerId: "${routeExplicit.providerId}"`);
  assert(routeExplicit.allowFallback === false, 'Strict allowFallback is set to false (no silent fallback)');
  assert(routeExplicit.model === 'higgsfield-video-pro', `Model preference preserved: "${routeExplicit.model}"`);

  // TEST 3: Dynamic Tool Name Resolution & Validation
  console.log('\n--- TEST GROUP 3: MCP Dynamic Tool Resolution ---');
  const adapter = new HiggsfieldMCPAdapter();
  
  // Tool resolution should map t2v and i2v safely
  const t2vTool = adapter.resolveToolName('TEXT_TO_VIDEO');
  const i2vTool = adapter.resolveToolName('IMAGE_TO_VIDEO');
  assert(typeof t2vTool === 'string' && t2vTool.length > 0, `Text-to-Video tool resolved to: "${t2vTool}"`);
  assert(typeof i2vTool === 'string' && i2vTool.length > 0, `Image-to-Video tool resolved to: "${i2vTool}"`);

  // TEST 4: Security Hardening - Canonical Trusted Origin Resolution
  console.log('\n--- TEST GROUP 4: Security Hardening - Trusted Origin Resolution ---');
  const localhostOrigin = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'http', 'x-forwarded-host': 'localhost:3000' });
  assert(localhostOrigin === 'http://localhost:3000', `Localhost origin resolved correctly: ${localhostOrigin}`);

  const cloudRunOrigin = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'ais-dev-app.asia-southeast1.run.app' });
  assert(cloudRunOrigin === 'https://ais-dev-app.asia-southeast1.run.app', `Cloud Run origin resolved securely: ${cloudRunOrigin}`);

  const spoofedOrigin = HiggsfieldOAuthService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'malicious-attacker.com' });
  assert(spoofedOrigin === 'http://localhost:3000', `Host-header spoofing rejected, safely defaulted: ${spoofedOrigin}`);

  // TEST 5: Security Hardening - PKCE Generation & Session Integrity
  console.log('\n--- TEST GROUP 5: Official Higgsfield OAuth PKCE Flow ---');
  
  // 5.1 PKCE Generation
  const pkce = HiggsfieldOAuthService.generatePKCE();
  assert(typeof pkce.verifier === 'string' && pkce.verifier.length > 30, 'PKCE Verifier generated with cryptographic entropy');
  assert(typeof pkce.challenge === 'string' && pkce.challenge.length > 30, 'PKCE S256 Challenge generated correctly');

  // 5.2 Authorization Session Creation
  const authSession = await HiggsfieldOAuthService.createAuthorizationSession('http://localhost:3000');
  assert(typeof authSession.state === 'string' && authSession.state.startsWith('higgsfield_pkce_'), `OAuth state is prefixed: "${authSession.state.substring(0, 25)}..."`);
  assert(typeof authSession.authUrl === 'string' && authSession.authUrl.includes('higgsfield.ai'), 'OAuth authUrl points to official Higgsfield login/auth portal');
  assert(typeof authSession.clientId === 'string' && authSession.clientId.length > 0, `OAuth client ID established: "${authSession.clientId.substring(0, 15)}..."`);

  // 5.3 Strict Token Exchange & Replay Protection Test
  const mockCode = 'hf_mock_oauth_auth_code_' + Date.now();
  
  // When external token endpoint is unreachable in isolated test runner, exchangeCodeForToken must strictly return error (NO fallback to code)
  const exchangeResult = await HiggsfieldOAuthService.exchangeCodeForToken(mockCode, authSession.state);
  assert(exchangeResult.success === false && ['TOKEN_ENDPOINT_UNREACHABLE', 'TOKEN_EXCHANGE_REJECTED'].includes(exchangeResult.error || ''), 
    `Strict Token Exchange: Code is NEVER treated as token on endpoint failure (Error: ${exchangeResult.error})`);

  // 5.4 Replay protection: using the same state again must fail
  const replayResult = await HiggsfieldOAuthService.exchangeCodeForToken(mockCode, authSession.state);
  assert(replayResult.success === false && replayResult.error === 'INVALID_STATE', 'Replay protection active: Consumed state is deleted from session store');

  // 5.5 Disconnect & Revocation
  const revokeResult = await HiggsfieldOAuthService.revokeToken('test_token_for_revocation');
  assert(revokeResult.success === true, 'Higgsfield OAuth token revocation & SQLite credential purge succeeded');

  // TEST 6: CreditService Integrity (HOLD -> COMMIT / REFUND)
  console.log('\n--- TEST GROUP 6: CreditService Integrity & Hold Lifecycle ---');
  const commitUserId = 'usr_regular_commit_test';
  const refundUserId = 'usr_regular_refund_test';

  // Seed test users in SQLite DB
  try {
    const { users } = await import('../src/db/schema');
    const { db } = await import('../src/db/index');
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
  
  // 6.1 Pricing calculation
  const costLookup = CreditService.calculateCreditCost('higgsfield-video-pro', {
    provider: 'higgsfield',
    operation: 'text-to-video',
    duration: 5
  });
  assert(costLookup.credits > 0, `Authoritative pricing found for higgsfield-video-pro (${costLookup.credits} credits, $${costLookup.costUsd})`);

  // 6.2 Credit Reserve (HOLD)
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
    // 6.3 Credit Commit
    let commitFailed = false;
    try {
      await CreditService.commitHold(commitUserId, costLookup.credits, holdRes.holdId);
    } catch (e: any) {
      console.error('Commit error:', e.message);
      commitFailed = true;
    }
    assert(!commitFailed, 'Credit COMMIT (commitHold) completed cleanly');

    // 6.4 Test Refund Protection (Cannot refund already committed hold)
    let refundFailed = false;
    try {
      await CreditService.refundCredits(commitUserId, costLookup.credits, 'Test refund on committed', holdRes.holdId);
    } catch (e) {
      refundFailed = true;
    }
    assert(refundFailed, 'Committed credit cannot be refunded (Strict Anti-Double-Charge / Hold Integrity)');
  }

  // 6.5 Test Explicit Failure -> STOP + REFUND Flow
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
