const fs = require('fs');

let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

content = content.replace(
  /if \(project\.affiliateConfig\?\.productImages\?\.\[0\]\) \{\s+scene\.metadata\.productImage = project\.affiliateConfig\.productImages\[0\];\s+\}/g,
  `if (project.affiliateConfig?.productImages?.[0]) {
          const sceneText = (scene.visualDirection || '') + ' ' + (scene.promptTextToImage || '') + ' ' + (scene.promptImageToVideo || '');
          const featuresProduct = /(produk|product|barang|item|kemasan|botol|cream|krim|sepatu|baju|menampilkan|dipegang|memegang|tas|kosmetik)/i.test(sceneText);
          if (featuresProduct) {
            scene.metadata.productImage = project.affiliateConfig.productImages[0];
          }
        }`
);

fs.writeFileSync('server/orchestrator.ts', content);
