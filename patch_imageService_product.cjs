const fs = require('fs');
let content = fs.readFileSync('server/imageService.ts', 'utf8');

content = content.replace(
  /let rawProd = masterProductImageUrl \n        \|\| \(scene\.metadata && scene\.metadata\.productImage\) \n        \|\| \(scene\.assetUrl && !scene\.assetUrl\.includes\('pollinations'\) \? scene\.assetUrl : undefined\);\n\n      \/\/ Fallback check if the scene actually needs the product but metadata was missed\n      if \(!rawProd && \(affiliateConfig\?\.productImages\?\.\[0\] \|\| affiliateConfig\?\.productImage\)\) \{\n        const sceneText = \(scene\.visualDirection \|\| ''\) \+ ' ' \+ \(scene\.promptTextToImage \|\| ''\);\n        if \(\/\(produk\|product\|barang\|item\|kemasan\|botol\|cream\|krim\|sepatu\|baju\|menampilkan\|dipegang\|memegang\|tas\|kosmetik\)\/i\.test\(sceneText\)\) \{\n          rawProd = affiliateConfig\.productImages\?\.\[0\] \|\| affiliateConfig\.productImage;\n        \}\n      \}/g,
  `let rawProd = masterProductImageUrl 
        || (scene.metadata && scene.metadata.productImage) 
        || (scene.assetUrl && !scene.assetUrl.includes('pollinations') ? scene.assetUrl : undefined);

      // Explicit flag check from LLM
      if (!rawProd && scene.featuresProduct && (affiliateConfig?.productImages?.[0] || affiliateConfig?.productImage)) {
        rawProd = affiliateConfig.productImages?.[0] || affiliateConfig.productImage;
      }`
);

fs.writeFileSync('server/imageService.ts', content);
