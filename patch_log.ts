import fs from 'fs';

const path = 'server/services/domainConfigService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `cleanOrigin = this.getRuntimePublicCanonical(config);`,
  `cleanOrigin = this.getRuntimePublicCanonical(config);\n      console.log("[deriveOAuthUrls] Overriding cleanOrigin to:", cleanOrigin, "because isCloudRun:", isCloudRun);`
);

fs.writeFileSync(path, code);
