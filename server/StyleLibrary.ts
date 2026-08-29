export interface VisualStyle {
  id: string;
  name: string;
  magic_words: string;
  negative_prompt?: string;
}

export const CinematicStyleLibrary: Record<string, VisualStyle> = {
  cinematic_film: {
    id: 'cinematic_film',
    name: 'Cinematic Realism',
    magic_words: 'Shot on 35mm lens, anamorphic, cinematic lighting, photorealistic, Arri Alexa, highly detailed, dramatic color grading, shallow depth of field, 8k resolution.',
    negative_prompt: 'cartoon, 3d, animated, low resolution, blurry, distorted'
  },
  pixar_3d: {
    id: 'pixar_3d',
    name: '3D Pixar/Disney',
    magic_words: '3D CGI animation, Disney Pixar style, soft global illumination, Octane Render, Unreal Engine 5, ray tracing, expressive features, vibrant colors, masterpiece.',
    negative_prompt: 'photorealistic, realistic, 2d, flat, live action, poorly rendered'
  },
  anime_ghibli: {
    id: 'anime_ghibli',
    name: 'Studio Ghibli Anime',
    magic_words: 'Studio Ghibli style, Makoto Shinkai anime style, 2D hand-drawn animation, cel shading, lush environment, beautiful sky, highly detailed illustration, 4k.',
    negative_prompt: '3d, cgi, photorealistic, ugly, deformed'
  },
  minimalist_vector: {
    id: 'minimalist_vector',
    name: 'Minimalist / Educational Motion Graphics',
    magic_words: 'Clean flat vector art, motion graphics style, 2D minimalist, smooth easing, high contrast, solid background, corporate explainer video style, UI aesthetics.',
    negative_prompt: 'cluttered, photorealistic, 3d, textured, messy'
  },
  cyberpunk_neon: {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Sci-Fi',
    magic_words: 'Cyberpunk aesthetic, neon lighting, synthwave, dystopian city, volumetric fog, glowing reflections, highly detailed, futuristic, Unreal Engine 5 render.',
    negative_prompt: 'daylight, natural, rustic, historical, low contrast'
  }
};

// Backwards compatibility alias
