const fs = require('fs');

let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

// For generateKeyframe Image phase
content = content.replace(
  "        if (project.affiliateConfig?.productImages?.[0]) {\n          scene.metadata.productImage = project.affiliateConfig.productImages[0];\n        }",
  "        if (project.affiliateConfig?.productImages?.[0]) {\n          // Only lock product image if the scene actually mentions it\n          const sceneText = (scene.visualDirection || '') + ' ' + (scene.promptTextToImage || '');\n          const featuresProduct = /(produk|product|barang|item|kemasan|botol|cream|krim|sepatu|baju|menampilkan|dipegang|memegang|tas|kosmetik)/i.test(sceneText);\n          if (featuresProduct) {\n            scene.metadata.productImage = project.affiliateConfig.productImages[0];\n          }\n        }"
);

// For Video rendering phase
content = content.replace(
  "                  if (project.affiliateConfig?.productImages?.[0]) {\n                    scene.metadata.productImage = project.affiliateConfig.productImages[0];\n                  }",
  "                  if (project.affiliateConfig?.productImages?.[0]) {\n                    const sceneText = (scene.visualDirection || '') + ' ' + (scene.promptImageToVideo || '');\n                    const featuresProduct = /(produk|product|barang|item|kemasan|botol|cream|krim|sepatu|baju|menampilkan|dipegang|memegang|tas|kosmetik)/i.test(sceneText);\n                    if (featuresProduct) {\n                      scene.metadata.productImage = project.affiliateConfig.productImages[0];\n                    }\n                  }"
);

// Wait, the first one might not have replaced correctly because of whitespace differences. Let's do it differently.
