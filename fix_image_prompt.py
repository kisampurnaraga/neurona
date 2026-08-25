import sys

with open('server/imageService.ts', 'r') as f:
    content = f.read()

# Let's replace the whole buildT2IImagePrompt function
import re

start_idx = content.find('public static buildT2IImagePrompt(params: {')
end_idx = content.find('public static buildI2VVideoPrompt(params: {')

if start_idx == -1 or end_idx == -1:
    print("Could not find buildT2IImagePrompt boundaries")
    sys.exit(1)

old_func = content[start_idx:end_idx]

new_func = """public static buildT2IImagePrompt(params: {
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

    const rawT2I = (scene.promptTextToImage || '').trim();
    const rawVisual = (scene.visualDirection || '').trim();

    // 5. Style & Lighting Modifiers (Full 8 Art Styles Support)
    let styleSuffix = '';
    if (videoType === 'ANIMATION') {
      switch (artStyle) {
        case '3D_PIXAR':
          styleSuffix = '3D Pixar Disney CGI animation style, subsurface scattering, octane 3D render, expressive character, volumetric lighting';
          break;
        case '3D_UNREAL_HYPER':
          styleSuffix = 'Unreal Engine 5.4 cinematic render, hyper-realistic 3D CGI, Lumen global illumination, Nanite textures, raytracing';
          break;
        case 'ANIME_SHINKAI':
          styleSuffix = 'Anime Makoto Shinkai aesthetic, Studio Ghibli inspired, vibrant colors, cinematic anime lighting, crisp line art';
          break;
        case 'ANIME_CYBERPUNK':
          styleSuffix = 'Cyberpunk mecha anime style, high-tech neon lighting, glowing circuitry, energetic action anime lines';
          break;
        case '2D_CLASSIC_CARTOON':
          styleSuffix = 'Classic 2D hand-drawn cartoon animation, clean bold line-art, vibrant saturated flat colors, retro animation style';
          break;
        case 'CLAYMATION':
          styleSuffix = 'Aardman claymation stop-motion animation, tactile plasticine clay texture, studio lighting';
          break;
        case 'COMIC_BOOK':
          styleSuffix = 'Dynamic comic book illustration, western comic / shonen manga crosshatch ink lines, halftone dot patterns';
          break;
        case 'PIXEL_ART':
          styleSuffix = '16-bit retro pixel art aesthetic, detailed pixel sprites, nostalgic arcade color palette';
          break;
        default:
          styleSuffix = artStyle?.includes('ANIME') 
            ? 'Anime aesthetic style, vibrant anime colors, hand-drawn keyframe' 
            : '3D stylized CGI animation, expressive character, cinematic lighting';
      }
    } else if (videoType === 'EDUCATIONAL') {
      const eduStyle = educationalConfig?.visualStyle || artStyle;
      switch (eduStyle) {
        case 'MOTION_GRAPHICS_2D':
          styleSuffix = '2D motion graphics explainer, flat vector illustration, sleek isometric accents, modern clean layout';
          break;
        case 'WHITEBOARD_ANIMATION':
          styleSuffix = 'Whiteboard animation sketch, clean marker line illustration on crisp white backdrop, high contrast';
          break;
        case 'ISOMETRIC_3D':
          styleSuffix = 'Isometric 3D infographic model, soft ambient occlusion, clean educational diagram';
          break;
        case 'SCIENCE_BLUEPRINT':
          styleSuffix = 'Technical blueprint schematic, cyan glowing vector wireframes, annotated callout diagrams';
          break;
        case 'DOCUMENTARY_INFOGRAPHIC':
          styleSuffix = 'Cinematic documentary infographic, National Geographic aesthetic, high resolution data visualizer';
          break;
        default:
          styleSuffix = 'Clean educational explainer graphic, high-contrast infographic illustration';
      }
    } else if (videoType === 'AFFILIATE') {
      styleSuffix = 'High quality commercial product photography, UGC influencer lifestyle aesthetic, crisp focus, studio lighting';
    } else {
      styleSuffix = 'Cinematic 8k movie still, anamorphic lens flare, master shot, photorealistic';
    }

    const seed = (characterProfile?.styleSeed || 8849201) + (sceneIndex * 317);
    const endModifiers = `${styleSuffix}, cinematic composition, crisp focus, 8k resolution --seed ${seed}`;

    // If the LLM already generated a strictly locked prompt, DO NOT DESTROY IT. USE IT directly.
    if (rawT2I && (rawT2I.toLowerCase().startsWith('character identity locked:') || rawT2I.toLowerCase().startsWith('product identity locked:'))) {
        return `${rawT2I}. ${endModifiers}`;
    }

    // Otherwise, try to fallback and reconstruct (for older projects or broken LLM outputs)
    let sceneActionEn = '';
    if (rawT2I) {
      sceneActionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawT2I);
    } else if (rawVisual) {
      sceneActionEn = ImageGenerationService.translateAndSanitizeToEnglish(rawVisual);
    }

    const productName = affiliateConfig?.productName || '';
    const productVision = affiliateConfig?.productVisualAnalysis || '';
    const cleanProductVision = productVision 
      ? ImageGenerationService.translateAndSanitizeToEnglish(productVision.replace(/^Exact Physical Product Features from Uploaded Photo:\s*/i, '').trim())
      : '';

    let charSubjectEn = '';
    const charName = characterProfile?.name ? characterProfile.name.replace(/Karakter Utama/gi, 'Protagonist') : '';
    const charOutfit = characterProfile?.outfit ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.outfit) : '';
    const charHair = characterProfile?.hairStyle ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.hairStyle) : '';
    const charFace = characterProfile?.facialFeatures ? ImageGenerationService.translateAndSanitizeToEnglish(characterProfile.facialFeatures) : '';

    if (charName || charOutfit || charHair) {
      const parts = [
        charName,
        charOutfit ? `wearing ${charOutfit}` : '',
        charHair,
        charFace
      ].filter(Boolean);
      charSubjectEn = parts.join(', ');
    }

    const rawWorld = animationConfig?.worldSetting || educationalConfig?.worldSetting || '';
    const worldEn = rawWorld ? ImageGenerationService.translateAndSanitizeToEnglish(rawWorld) : '';

    let promptParts: string[] = [];

    if (videoType === 'AFFILIATE') {
      const prodName = productName || 'Commercial Product';
      const prodDesc = cleanProductVision || 'crisp packaging, premium materials, and authentic details';
      
      if (sceneActionEn) {
        promptParts.push(`Keyframe Scene Action: ${sceneActionEn}`);
      }
      promptParts.push(`Featured Product: ${prodName} (${prodDesc}) prominently showcased in sharp focus`);

      if (charSubjectEn) {
        promptParts.push(`Character Interaction: ${charSubjectEn} actively presenting and interacting with the product`);
      }
    } else {
      let coreSubjectAction = '';
      if (sceneActionEn && charSubjectEn) {
        coreSubjectAction = `Dynamic keyframe showing ${sceneActionEn}, featuring ${charSubjectEn}`;
      } else if (sceneActionEn) {
        coreSubjectAction = `Dynamic keyframe showing ${sceneActionEn}`;
      } else if (charSubjectEn) {
        coreSubjectAction = `Dynamic keyframe of ${charSubjectEn}`;
      } else {
        coreSubjectAction = 'Cinematic keyframe composition';
      }
      promptParts.push(coreSubjectAction);

      if (worldEn) {
        promptParts.push(`in ${worldEn}`);
      }
    }

    promptParts.push(endModifiers);
    return promptParts.join(', ');
  }

  """

content = content[:start_idx] + new_func + content[end_idx:]

with open('server/imageService.ts', 'w') as f:
    f.write(content)

print("buildT2IImagePrompt updated successfully")
