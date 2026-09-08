import { db } from '../src/db/index';
import { systemSettings } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { DomainConfigService } from '../server/services/domainConfigService';
import { OpenArtOAuthService } from '../server/services/openartOAuthService';
import { HiggsfieldOAuthService } from '../server/services/higgsfieldOAuthService';

async function runAudit() {
  console.log('--- 1. Environment Variables ---');
  console.log('APP_ORIGIN:', process.env.APP_ORIGIN);
  console.log('CANONICAL_URL:', process.env.CANONICAL_URL);
  console.log('PUBLIC_URL:', process.env.PUBLIC_URL);
  console.log('PRODUCTION_APP_URL:', process.env.PRODUCTION_APP_URL);
  console.log('APP_ENV:', process.env.APP_ENV);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  console.log('\n--- 2. SQLite Database Configuration ---');
  try {
    const row = db.select().from(systemSettings).where(eq(systemSettings.key, 'domain_url_management_config')).get();
    console.log('Stored DomainConfig:', row ? row.value : 'NULL');
  } catch (e: any) {
    console.error('Failed to read SQLite:', e.message);
  }

  console.log('\n--- 3. DomainConfigService Active Config ---');
  const activeConfig = DomainConfigService.getActiveConfig();
  console.log(JSON.stringify(activeConfig, null, 2));

  console.log('\n--- 4. Derived OAuth URLs ---');
  console.log('Derived OAuth URLs from Canonical:', DomainConfigService.deriveOAuthUrls(activeConfig.canonicalUrl));

  console.log('\n--- 5. OAuth Service Session Generation (OpenArt) ---');
  try {
    // Attempting to generate a session as if the user requested it from neurona-os.ai.studio
    const openartSession = await OpenArtOAuthService.createAuthorizationSession('https://neurona-os.ai.studio');
    console.log('OpenArt redirectUri:', openartSession.redirectUri);
    console.log('OpenArt authUrl (excerpt):', openartSession.authUrl.substring(0, 150) + '...');
  } catch (e: any) {
    console.log('OpenArt error:', e.message);
  }

  console.log('\n--- 6. OAuth Service Session Generation (Higgsfield) ---');
  try {
    const higgsfieldSession = await HiggsfieldOAuthService.createAuthorizationSession('https://neurona-os.ai.studio');
    console.log('Higgsfield redirectUri:', higgsfieldSession.redirectUri);
    console.log('Higgsfield authUrl (excerpt):', higgsfieldSession.authUrl.substring(0, 150) + '...');
  } catch (e: any) {
    console.log('Higgsfield error:', e.message);
  }
}

runAudit();
