import sys

with open('src/server/providers/RunwayAdapter.ts', 'r') as f:
    content = f.read()

import_statement = "import { FounderService } from \"../fcc/FounderService\";\n"
if "FounderService" not in content:
    content = content.replace("import { VideoGenerationProvider, getSampleVideoForScene } from \"./VideoProvider\";", "import { VideoGenerationProvider, getSampleVideoForScene } from \"./VideoProvider\";\n" + import_statement)

old_logic = """        let endpoint = 'https://api.dev.runwayml.com/v1/image_to_video';
        let bodyData: any = {
          promptText: prompt,
          model: 'gen4_turbo', // runway gen4
          duration: 5,
          ratio: isVertical ? '768:1280' : '1280:768'
        };

        const isUGC = context.includes('AFFILIATE') || scene.visualDirection?.includes('UGC') || scene.promptImageToVideo?.includes('UGC');
        
        if (isUGC && scene.imageUrl && scene.assetUrl && scene.imageUrl !== scene.assetUrl) {
           console.log('[Runway Adapter] Using Product UGC Recipe endpoint for Affiliate video!');
           endpoint = 'https://api.dev.runwayml.com/v1/recipes/product_ugc';"""

new_logic = """        const baseUrl = FounderService.getRunwayEndpoint().replace(/\/$/, '');
        let endpoint = `${baseUrl}/image_to_video`;
        let bodyData: any = {
          promptText: prompt,
          model: 'gen4_turbo', // runway gen4
          duration: 5,
          ratio: isVertical ? '768:1280' : '1280:768'
        };

        const isUGC = context.includes('AFFILIATE') || scene.visualDirection?.includes('UGC') || scene.promptImageToVideo?.includes('UGC');
        
        if (isUGC && scene.imageUrl && scene.assetUrl && scene.imageUrl !== scene.assetUrl) {
           console.log('[Runway Adapter] Using Product UGC Recipe endpoint for Affiliate video!');
           endpoint = `${baseUrl}/recipes/product_ugc`;"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('src/server/providers/RunwayAdapter.ts', 'w') as f:
        f.write(content)
    print("RunwayAdapter.ts updated to use FounderService")
else:
    print("old_logic not found in RunwayAdapter.ts")

