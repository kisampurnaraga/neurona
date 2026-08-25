import sys

with open('src/server/providers/RunwayAdapter.ts', 'r') as f:
    content = f.read()

old_body = """        let endpoint = 'https://api.dev.runwayml.com/v1/image_to_video';
        let bodyData: any = {
          promptText: prompt,
          model: 'gen3a_turbo', // runway gen3 alpha
          duration: 5,
          ratio: isVertical ? '768:1280' : '1280:768'
        };

        const isUGC = context.includes('AFFILIATE') || scene.visualDirection?.includes('UGC') || scene.promptImageToVideo?.includes('UGC');
        
        if (isUGC && scene.imageUrl && scene.assetUrl && scene.imageUrl !== scene.assetUrl) {
           console.log('[Runway Adapter] Using Product UGC Recipe endpoint for Affiliate video!');
           endpoint = 'https://api.dev.runwayml.com/v1/recipes/product_ugc';
           bodyData = {
              character_image: scene.imageUrl, // Face/Creator
              product_image: scene.assetUrl,   // Product
              product_info: prompt,            // Instructions
              seed: Math.floor(Math.random() * 1000000)
           };
        } else if (scene.imageUrl || scene.assetUrl) {
          bodyData.promptImage = scene.imageUrl || scene.assetUrl;
        }"""

new_body = """        let endpoint = 'https://api.dev.runwayml.com/v1/image_to_video';
        let bodyData: any = {
          promptText: prompt,
          model: 'gen4_turbo', // runway gen4
          duration: 5,
          ratio: isVertical ? '768:1280' : '1280:768'
        };

        const isUGC = context.includes('AFFILIATE') || scene.visualDirection?.includes('UGC') || scene.promptImageToVideo?.includes('UGC');
        
        if (isUGC && scene.imageUrl && scene.assetUrl && scene.imageUrl !== scene.assetUrl) {
           console.log('[Runway Adapter] Using Product UGC Recipe endpoint for Affiliate video!');
           endpoint = 'https://api.dev.runwayml.com/v1/recipes/product_ugc';
           bodyData = {
              character_image: scene.imageUrl, // Face/Creator
              product_image: scene.assetUrl,   // Product
              product_info: prompt,            // Instructions
              seed: Math.floor(Math.random() * 1000000)
           };
        } else {
           const img = scene.imageUrl || scene.assetUrl;
           if (typeof img === 'string' && img.length > 0) {
              bodyData.promptImage = img;
           } else if (Array.isArray(img)) {
              bodyData.promptImage = img;
           }
        }"""

if old_body in content:
    content = content.replace(old_body, new_body)
    with open('src/server/providers/RunwayAdapter.ts', 'w') as f:
        f.write(content)
    print("Fixed RunwayAdapter.ts")
else:
    print("Could not find old_body in RunwayAdapter.ts")

