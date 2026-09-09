import fs from 'fs';

const path = 'server/services/domainConfigService.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Insert getRuntimePublicCanonical
const helper = `
  /**
   * Resolves the runtime public canonical URL dynamically.
   * Priority: DB Config -> ENV Config -> Cloud Run Service URL -> Hardcoded fallback
   */
  private static getRuntimePublicCanonical(config?: Partial<DomainConfig>): string {
    return (
      (config?.canonicalUrl) ||
      (config?.productionAppUrl) ||
      process.env.CANONICAL_URL ||
      process.env.APP_ORIGIN ||
      process.env.PRODUCTION_APP_URL ||
      process.env.PUBLIC_URL ||
      process.env.APP_URL ||
      'https://app.neurona.ai'
    );
  }
`;

code = code.replace(
  `private static readonly DEFAULT_ORIGINS = [`,
  helper + `\n  private static readonly DEFAULT_ORIGINS = [`
);

// 2. Patch deriveOAuthUrls
code = code.replace(
  `cleanOrigin = config.canonicalUrl || config.productionAppUrl || 'https://app.neurona.ai';`,
  `cleanOrigin = this.getRuntimePublicCanonical(config);`
);

// 3. Patch getActiveConfig (default variables)
code = code.replace(
  `const defaultProdUrl = process.env.APP_ORIGIN || process.env.PRODUCTION_APP_URL || 'https://app.neurona.ai';`,
  `const defaultProdUrl = this.getRuntimePublicCanonical();`
);
code = code.replace(
  `const defaultCanonical = process.env.CANONICAL_URL || process.env.APP_ORIGIN || defaultProdUrl;`,
  `const defaultCanonical = defaultProdUrl;`
);

// 4. Patch getCanonicalTrustedOrigin
code = code.replace(
  `const publicCanonical = config.canonicalUrl || config.productionAppUrl || 'https://app.neurona.ai';`,
  `const publicCanonical = this.getRuntimePublicCanonical(config);`
);

// Also need to make sure process.env.APP_URL is added to approvedOrigins
// in getCanonicalTrustedOrigin so that requests directly to CloudRun URL don't get rejected.
// Actually getCanonicalTrustedOrigin adds config.canonicalUrl, config.productionAppUrl, config.developmentAppUrl.
// We can modify it to also add process.env.APP_URL.

const approvedOriginPatch = `
    // Add configured canonical & production URLs
    if (config.canonicalUrl) approvedOrigins.add(this.normalizeUrl(config.canonicalUrl));
    if (config.productionAppUrl) approvedOrigins.add(this.normalizeUrl(config.productionAppUrl));
    if (config.developmentAppUrl) {
      approvedOrigins.add(this.normalizeUrl(config.developmentAppUrl));
    }
    if (process.env.APP_URL) {
      approvedOrigins.add(this.normalizeUrl(process.env.APP_URL));
    }
`;
code = code.replace(
  `    // Add configured canonical & production URLs
    if (config.canonicalUrl) approvedOrigins.add(this.normalizeUrl(config.canonicalUrl));
    if (config.productionAppUrl) approvedOrigins.add(this.normalizeUrl(config.productionAppUrl));
    if (config.developmentAppUrl) {
      approvedOrigins.add(this.normalizeUrl(config.developmentAppUrl));
    }`,
  approvedOriginPatch
);

fs.writeFileSync(path, code);
