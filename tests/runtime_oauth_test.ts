import { DomainConfigService } from '../server/services/domainConfigService';
import { OpenArtOAuthService } from '../server/services/openartOAuthService';
import { HiggsfieldOAuthService } from '../server/services/higgsfieldOAuthService';
import dotenv from 'dotenv';
dotenv.config();

async function runAudit() {
  console.log('====================================================');
  console.log('RUNTIME OAUTH PROOF');
  console.log('====================================================');

  console.log(`Runtime environment = ${process.env.NODE_ENV || 'development'}`);
  console.log(`APP_ORIGIN = ${process.env.APP_ORIGIN}`);
  console.log(`CANONICAL_URL = ${process.env.CANONICAL_URL}`);
  console.log(`PUBLIC_URL = ${process.env.PUBLIC_URL}`);
  console.log(`PRODUCTION_APP_URL = ${process.env.PRODUCTION_APP_URL}`);
  console.log(`APP_URL = ${process.env.APP_URL}`);

  // Test A: localhost:3000 + development
  const originA = DomainConfigService.getCanonicalTrustedOrigin({ host: 'localhost:3000' });
  const urisA = DomainConfigService.deriveOAuthUrls(originA);
  console.log(`\n[Test A] Localhost:3000 request`);
  console.log(`Derived OpenArt: ${urisA.openArtOAuthCallbackUrl}`);

  // Test C: neurona-os.ai.studio
  const originC = DomainConfigService.getCanonicalTrustedOrigin({ host: 'neurona-os.ai.studio' });
  const urisC = DomainConfigService.deriveOAuthUrls(originC);
  console.log(`\n[Test C] AI Studio domain request`);
  console.log(`Derived OpenArt: ${urisC.openArtOAuthCallbackUrl}`);

  // Test D: unknown Host
  const originD = DomainConfigService.getCanonicalTrustedOrigin({ host: 'hacked-domain.com' });
  const urisD = DomainConfigService.deriveOAuthUrls(originD);
  console.log(`\n[Test D] Unknown host request`);
  console.log(`Derived OpenArt: ${urisD.openArtOAuthCallbackUrl}`);

  // Test E: missing Host
  const originE = DomainConfigService.getCanonicalTrustedOrigin({});
  const urisE = DomainConfigService.deriveOAuthUrls(originE);
  console.log(`\n[Test E] Missing host request`);
  console.log(`Derived OpenArt: ${urisE.openArtOAuthCallbackUrl}`);

  // Test F: Host = localhost but public deployment
  // We can simulate this by mocking process.env.APP_URL
  const oldAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://some-cloud-run-url.com';
  const originF = DomainConfigService.getCanonicalTrustedOrigin({ host: 'localhost:3000' });
  const urisF = DomainConfigService.deriveOAuthUrls(originF);
  console.log(`\n[Test F] Localhost request but in Cloud Run environment (APP_URL set)`);
  console.log(`Derived OpenArt: ${urisF.openArtOAuthCallbackUrl}`);
  
  // Revert for runtime tests
  if (oldAppUrl) process.env.APP_URL = oldAppUrl;
  else delete process.env.APP_URL;

  // Real runtime Init
  console.log('\n--- REAL RUNTIME INIT TEST ---');
  // Pass a dummy request simulating the proxy passing localhost
  const trustedOrigin = OpenArtOAuthService.getCanonicalTrustedOrigin({ host: 'localhost:3000' });
  const session = await OpenArtOAuthService.createAuthorizationSession(trustedOrigin);
  const hSession = await HiggsfieldOAuthService.createAuthorizationSession(trustedOrigin);
  
  console.log(`OpenArt redirectUri = ${session.redirectUri}`);
  console.log(`Higgsfield redirectUri = ${hSession.redirectUri}`);
  
  const activeConfig = DomainConfigService.getActiveConfig();
  console.log(`Canonical origin = ${activeConfig.canonicalUrl || activeConfig.productionAppUrl || 'https://app.neurona.ai'}`);

  // Mask sensitive parts
  let safeAuthUrl = session.authUrl.replace(/client_id=[^&]+/, 'client_id=REDACTED');
  safeAuthUrl = safeAuthUrl.replace(/state=[^&]+/, 'state=REDACTED');
  console.log(`\nFULL OpenArt Auth URL:\n${safeAuthUrl}`);
}

runAudit().catch(console.error);
