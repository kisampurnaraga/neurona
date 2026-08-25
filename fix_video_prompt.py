import sys

with open('server/imageService.ts', 'r') as f:
    content = f.read()

start_idx = content.find('public static buildI2VVideoPrompt(params: {')
end_idx = content.find('static async generateKeyframeImage(params: {')

if start_idx == -1 or end_idx == -1:
    print("Could not find buildI2VVideoPrompt boundaries")
    sys.exit(1)

new_func = """public static buildI2VVideoPrompt(params: {
    scene: Partial<Scene>;
    sceneIndex?: number;
    videoType: VideoType;
    characterProfile?: CharacterProfile;
    artStyle?: string;
    affiliateConfig?: any;
    animationConfig?: any;
    educationalConfig?: any;
  }): string {
    const { scene, sceneIndex = 0, videoType, characterProfile, artStyle, affiliateConfig, animationConfig, educationalConfig } = params;

    const rawI2V = (scene.promptImageToVideo || '').trim();
    const rawVisual = (scene.visualDirection || '').trim();
    const arTag = (videoType === 'AFFILIATE' || animationConfig?.aspectRatio === '9:16' || educationalConfig?.aspectRatio === '9:16') ? '--ar 9:16' : '--ar 16:9';

    if (rawI2V && (rawI2V.toLowerCase().startsWith('character identity locked:') || rawI2V.toLowerCase().startsWith('product identity locked:'))) {
        return `${rawI2V} ${arTag}`;
    }

    const charName = characterProfile?.name || 'Creator';
    const charOutfit = characterProfile?.outfit ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.outfit) : '';
    const charFace = characterProfile?.facialFeatures ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.facialFeatures) : '';
    const charHair = characterProfile?.hairStyle ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.hairStyle) : '';
    const charAnchor = characterProfile?.consistencyAnchorPrompt 
      ? `[${characterProfile.consistencyAnchorPrompt.replace(/[\[\]]/g, '')}]`
      : (charFace || charHair || charOutfit)
        ? `[Consistent Character: ${charName}, ${charFace ? `${charFace}, ` : ''}${charHair ? `${charHair}, ` : ''}${charOutfit ? `wearing ${charOutfit}` : ''}]`
        : '';
    const worldSetting = animationConfig?.worldSetting || educationalConfig?.worldSetting || '';
    const worldEn = worldSetting ? ImageGenerationService.translateAndSanitizeToEnglish(worldSetting) : '';

    let motionEn = '';
    if (rawI2V) {
      motionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawI2V);
    } else if (rawVisual) {
      motionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawVisual);
    }

    if (videoType === 'AFFILIATE') {
      const prodName = affiliateConfig?.productName || 'Product';
      const prodDesc = affiliateConfig?.productVisualAnalysis ? ImageGenerationService.translateAndSanitizeToEnglish(affiliateConfig.productVisualAnalysis) : 'authentic details';
      if (!motionEn) {
        motionEn = `The character is actively interacting with, showing, and holding the ${prodName}, cinematic product showcase, fluid physics, realistic lighting, 4k 60fps`;
      }
      const charBlock = charAnchor || `${charName} ${charOutfit ? `(${charOutfit})` : ''}`;
      return `Product Lock & Character Consistency: ${charBlock} is physically holding, demonstrating and interacting with ${prodName} (${prodDesc}). Action: ${motionEn} ${arTag}`;
    }

    if (!motionEn) {
      motionEn = `Smooth dynamic cinematic camera motion tracking ${charName} in ${worldEn || 'environment'}, fluid physics, realistic lighting, 4k 60fps`;
    }

    const charBlock = charAnchor || `${charName} ${charOutfit ? `(${charOutfit})` : ''}`;
    return `Character locked: ${charBlock}. Environment: ${worldEn || 'consistent setting'}. Motion: ${motionEn} ${arTag}`;
  }

  /**
   * """

content = content[:start_idx] + new_func + content[end_idx+7:]

with open('server/imageService.ts', 'w') as f:
    f.write(content)

print("buildI2VVideoPrompt updated successfully")
