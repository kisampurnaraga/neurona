const fs = require('fs');
let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

content = content.replace(
  "promptImageToVideo: lockedI2VPrompt,",
  "promptImageToVideo: lockedI2VPrompt,\n            featuresProduct: s.featuresProduct || s.features_product || false,"
);

// We should also replace the regex check when adding metadata in Phase 2
content = content.replace(
  /if \(project\.affiliateConfig\?\.productImages\?\.\[0\]\) \{\s+const sceneText = [^}]+?if \(featuresProduct\) \{\s+scene\.metadata\.productImage = project\.affiliateConfig\.productImages\[0\];\s+\}\s+\}/g,
  `if (project.affiliateConfig?.productImages?.[0] && scene.featuresProduct) {
          scene.metadata.productImage = project.affiliateConfig.productImages[0];
        }`
);

fs.writeFileSync('server/orchestrator.ts', content);
