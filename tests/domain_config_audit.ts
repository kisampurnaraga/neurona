import { DomainConfigService, DomainConfig } from '../server/services/domainConfigService';
import { FounderService } from '../src/server/fcc/FounderService';
import { db } from '../src/db/index';
import { systemSettings } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function runDomainAudit() {
  console.log('====================================================');
  console.log(' NEURONA DOMAIN & URL MANAGEMENT AUDIT');
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

  // TEST GROUP 1: URL & Origin Validation Rules
  console.log('--- TEST GROUP 1: URL & Origin Validation Rules ---');
  
  // 1.1 Valid HTTPS domain
  const valHttps = DomainConfigService.validateOriginString('https://app.domainbaru.com', 'Test URL');
  assert(valHttps.valid === true && valHttps.normalized === 'https://app.domainbaru.com', 'Valid HTTPS domain accepted and normalized');

  // 1.2 Valid Localhost URL
  const valLocal = DomainConfigService.validateOriginString('http://localhost:3000', 'Dev URL');
  assert(valLocal.valid === true && valLocal.normalized === 'http://localhost:3000', 'Localhost HTTP URL accepted');

  // 1.3 Invalid protocol rejection (ftp://)
  const valFtp = DomainConfigService.validateOriginString('ftp://domain.com', 'FTP URL');
  assert(valFtp.valid === false, 'Non-HTTP/HTTPS protocol (ftp://) rejected');

  // 1.4 Malformed URL rejection
  const valMalformed = DomainConfigService.validateOriginString('https://not a valid url', 'Malformed URL');
  assert(valMalformed.valid === false, 'Malformed URL string rejected');

  // 1.5 JavaScript URI scheme injection rejection
  const valJs = DomainConfigService.validateOriginString('javascript:alert(1)', 'XSS URL');
  assert(valJs.valid === false, 'Dangerous javascript: scheme rejected');

  // 1.6 Data URI scheme injection rejection
  const valData = DomainConfigService.validateOriginString('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', 'Data URL');
  assert(valData.valid === false, 'Dangerous data: scheme rejected');

  // 1.7 Wildcard origin rejection
  const valWildcard = DomainConfigService.validateOriginString('https://*.domain.com', 'Wildcard URL');
  assert(valWildcard.valid === false, 'Wildcard origin (*.domain.com) strictly rejected');


  // TEST GROUP 2: Exact Origin Security & Subdomain Protection
  console.log('\n--- TEST GROUP 2: Exact Origin Security & Subdomain Protection ---');

  // Seed domain config with explicit allowed origin 'https://domain.com'
  const mockConfig: Partial<DomainConfig> = {
    environment: 'production',
    productionAppUrl: 'https://domain.com',
    canonicalUrl: 'https://domain.com',
    publicUrl: 'https://domain.com',
    allowedOrigins: ['https://domain.com', 'http://localhost:3000'],
    trustedOAuthOrigins: ['https://domain.com']
  };

  const saveRes = await DomainConfigService.saveConfig(mockConfig, 'AuditRunner');
  assert(saveRes.valid === true, 'Mock domain configuration saved for security testing');

  // 2.1 Authorized exact origin
  const authExact = DomainConfigService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'domain.com' });
  assert(authExact === 'https://domain.com', `Configured exact origin authorized: ${authExact}`);

  // 2.2 Suffix attack domain (domain.com.evil.com) MUST NOT be authorized
  const authSuffixEvil = DomainConfigService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'domain.com.evil.com' });
  assert(authSuffixEvil !== 'https://domain.com.evil.com' && authSuffixEvil === 'https://domain.com', `Suffix attack (domain.com.evil.com) rejected, safely defaulted: ${authSuffixEvil}`);

  // 2.3 Subdomain attack (evil.domain.com) MUST NOT be authorized unless explicitly in allowlist
  const authSubdomainEvil = DomainConfigService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'evil.domain.com' });
  assert(authSubdomainEvil !== 'https://evil.domain.com' && authSubdomainEvil === 'https://domain.com', `Unconfigured subdomain attack (evil.domain.com) rejected, safely defaulted: ${authSubdomainEvil}`);


  // TEST GROUP 3: Host & Query Protection in OAuth
  console.log('\n--- TEST GROUP 3: Host, Header & Query Protection in OAuth ---');

  // 3.1 Arbitrary X-Forwarded-Host header rejection
  const spoofedHost = DomainConfigService.getCanonicalTrustedOrigin({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'attacker-controlled.com' });
  assert(spoofedHost === 'https://domain.com', `Spoofed X-Forwarded-Host header rejected, defaulted to canonical: ${spoofedHost}`);

  // 3.2 Derived URLs calculation from canonical origin
  const derived = DomainConfigService.deriveOAuthUrls('https://app.newdomain.com');
  assert(derived.openArtOAuthCallbackUrl === 'https://app.newdomain.com/api/fcc/openart/oauth/callback', `OpenArt callback derived correctly: ${derived.openArtOAuthCallbackUrl}`);
  assert(derived.higgsfieldOAuthCallbackUrl === 'https://app.newdomain.com/api/fcc/higgsfield/oauth/callback', `Higgsfield callback derived correctly: ${derived.higgsfieldOAuthCallbackUrl}`);
  assert(derived.telegramWebhookUrl === 'https://app.newdomain.com/api/v1/founder/payment/telegram-webhook', `Telegram webhook derived correctly: ${derived.telegramWebhookUrl}`);


  // TEST GROUP 4: Domain Change & Atomic Rollback
  console.log('\n--- TEST GROUP 4: Domain Change Workflow & Atomic Rollback ---');

  // 4.1 Successful domain update
  const newValidConfig: Partial<DomainConfig> = {
    environment: 'production',
    productionAppUrl: 'https://app.domainbaru.com',
    canonicalUrl: 'https://app.domainbaru.com',
    publicUrl: 'https://app.domainbaru.com',
    allowedOrigins: ['https://app.domainbaru.com', 'http://localhost:3000'],
    trustedOAuthOrigins: ['https://app.domainbaru.com']
  };

  const updateRes = await FounderService.saveDomainConfig(newValidConfig, 'FounderAdmin');
  assert(updateRes.valid === true, 'Domain change from old to new domain succeeded');
  assert(updateRes.derivedUrls?.higgsfieldOAuthCallbackUrl === 'https://app.domainbaru.com/api/fcc/higgsfield/oauth/callback', 'Derived callback URLs updated atomically');

  // 4.2 Invalid domain attempt -> MUST ROLL BACK / LEAVE PREVIOUS UNTOUCHED
  const invalidConfigAttempt: Partial<DomainConfig> = {
    environment: 'production',
    productionAppUrl: 'javascript:alert("hacked")',
    canonicalUrl: 'https://app.domainbaru.com',
    publicUrl: 'https://app.domainbaru.com'
  };

  const rollbackAttempt = await FounderService.saveDomainConfig(invalidConfigAttempt, 'Attacker');
  assert(rollbackAttempt.valid === false, 'Invalid domain save attempt failed validation');

  const activeAfterRollback = FounderService.getDomainConfig();
  assert(activeAfterRollback.productionAppUrl === 'https://app.domainbaru.com', 'Rollback protection active: Previous valid configuration remained completely untouched');


  // TEST GROUP 5: Security & Audit Logging (No Credentials Exposed)
  console.log('\n--- TEST GROUP 5: Security & Audit Logging ---');

  const logs = (FounderService as any).auditLogs || [];
  const domainLogs = logs.filter((l: any) => l.action === 'UPDATE_DOMAIN_CONFIG');
  assert(domainLogs.length > 0, `Domain change recorded in Founder Audit Log (${domainLogs.length} entries found)`);

  const lastLog = domainLogs[domainLogs.length - 1];
  const logString = JSON.stringify(lastLog);
  assert(!logString.includes('oauthAccessToken') && !logString.includes('clientSecret') && !logString.includes('apiKey'), 'Audit log contains NO sensitive OAuth tokens, client secrets, or API keys');

  console.log('\n====================================================');
  console.log(` AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDomainAudit().catch(err => {
  console.error('Domain audit run error:', err);
  process.exit(1);
});
