import sys

with open('server/orchestrator.ts', 'r') as f:
    content = f.read()

old_code = """    const scene = project.storyboard.scenes[sceneIdx];
    scene.videoStatus = 'GENERATING';
    scene.status = 'GENERATING';"""

new_code = """    const scene = project.storyboard.scenes[sceneIdx];
    
    // Inject UGC Assets if missing
    if (project.videoType === 'AFFILIATE') {
      if (!scene.imageUrl && project.characterProfile?.referenceImageUrl) {
        scene.imageUrl = project.characterProfile.referenceImageUrl;
      }
      if (!scene.assetUrl && project.affiliateConfig?.productImages?.[0]) {
        scene.assetUrl = project.affiliateConfig.productImages[0];
      }
    }
    
    scene.videoStatus = 'GENERATING';
    scene.status = 'GENERATING';"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('server/orchestrator.ts', 'w') as f:
        f.write(content)
    print("Patched orchestrator.ts successfully.")
else:
    print("Could not find old_code in orchestrator.ts")

