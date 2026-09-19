export const SUBTITLE_PLACEHOLDERS = [
  'teks hook di layar',
  'teks hook',
  'hook di layar',
  'text overlay here',
  'text overlay',
  'teks overlay',
  'teks subtitle baru',
  'subtitle here',
  'subtitle text',
  'insert text here',
  'insert text',
  'your text here',
  'text here',
  'placeholder',
  'contoh teks'
];

export function isPlaceholderSubtitle(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return true;
  const normalized = text.trim().toLowerCase();
  if (normalized.length === 0) return true;
  if (SUBTITLE_PLACEHOLDERS.some(p => 
    normalized === p || 
    normalized.startsWith('text overlay') || 
    normalized.startsWith('teks hook di layar') ||
    normalized.startsWith('teks hook') ||
    normalized.startsWith('hook di layar')
  )) {
    return true;
  }
  // Filter out generic scene index placeholders like "Adegan 1", "Scene 2", etc.
  if (/^(adegan|scene)\s+\d+$/i.test(normalized)) {
    return true;
  }
  return false;
}

/**
 * Detects whether a string is a visual direction, generation prompt, camera direction,
 * or shot description rather than actual spoken voiceover/narration text.
 */
export function isVisualInstructionOrPrompt(text: string, scene?: any): boolean {
  if (!text || typeof text !== 'string') return true;
  const clean = text.trim().toLowerCase();
  if (clean.length === 0) return true;

  // 1. Check direct equality against known visual prompt fields in the scene object
  if (scene && typeof scene === 'object') {
    const visualFields = [
      scene.visualDirection,
      scene.visual_direction,
      scene.promptTextToImage,
      scene.prompt_text_to_image,
      scene.promptImageToVideo,
      scene.prompt_image_to_video,
      scene.prompt,
      scene.visualPrompt,
      scene.visual_prompt,
      scene.generationPrompt,
      scene.generation_prompt,
      scene.shotDescription,
      scene.shot_description,
      scene.correctedVisualPrompt,
      scene.correctedVideoPrompt
    ];

    for (const vf of visualFields) {
      if (typeof vf === 'string' && vf.trim().length > 0) {
        if (clean === vf.trim().toLowerCase()) {
          return true;
        }
      }
    }
  }

  // 2. Common visual direction / prompt instruction prefixes
  const visualPrefixes = [
    'hook visual:',
    'hook visual',
    'visual direction:',
    'visual direction',
    'visual prompt:',
    'visual:',
    'prompt:',
    'camera:',
    'camera movement:',
    'cinematic shot:',
    'shot description:',
    'macro shot:',
    'close-up:',
    'extreme close-up:',
    'wide shot:',
    'drone shot:',
    't2i:',
    'i2v:',
    'consistent character render'
  ];

  if (visualPrefixes.some(prefix => clean.startsWith(prefix))) {
    return true;
  }

  return false;
}

/**
 * Resolves the genuine spoken narration/voiceover text for a scene.
 * 
 * Strict priority order:
 * 1. Subtitle override (scene.subtitle) - ONLY if not a placeholder and not a visual prompt
 * 2. Narration / Voiceover fields (scene.narration, scene.voiceOver, scene.voice_over, scene.voiceover_script, scene.voiceoverScript, scene.audioNarrationScript)
 * 3. Dialogue (scene.dialogue)
 * 
 * Never falls back to visualDirection, camera instructions, prompts, or shot descriptions.
 * Returns an empty string if no valid spoken narration text exists.
 */
export function resolveSceneSubtitle(scene: any, index: number = 0): string {
  if (!scene || typeof scene !== 'object') return '';

  // 1. Direct user subtitle override
  if (
    typeof scene.subtitle === 'string' &&
    scene.subtitle.trim().length > 0 &&
    !isPlaceholderSubtitle(scene.subtitle) &&
    !isVisualInstructionOrPrompt(scene.subtitle, scene)
  ) {
    return scene.subtitle.trim();
  }

  // 2. Voiceover / Narration text fields
  const narrationCandidates = [
    scene.narration,
    scene.voiceOver,
    scene.voice_over,
    scene.voiceover_script,
    scene.voiceoverScript,
    scene.audioNarrationScript
  ];

  for (const candidate of narrationCandidates) {
    if (
      typeof candidate === 'string' &&
      candidate.trim().length > 0 &&
      !isPlaceholderSubtitle(candidate) &&
      !isVisualInstructionOrPrompt(candidate, scene)
    ) {
      return candidate.trim();
    }
  }

  // 3. Scene dialogue
  if (
    typeof scene.dialogue === 'string' &&
    scene.dialogue.trim().length > 0 &&
    !isPlaceholderSubtitle(scene.dialogue) &&
    !isVisualInstructionOrPrompt(scene.dialogue, scene)
  ) {
    return scene.dialogue.trim();
  }

  // CRITICAL: If no valid spoken narration is found, return empty string.
  // NEVER return visualDirection, prompts, or placeholder scene labels!
  return '';
}

/**
 * Resolves the narration text for TTS voiceover synthesis.
 * Uses the exact same source as subtitles to ensure 100% audio-visual synchronization.
 */
export function resolveSceneVoiceover(scene: any, index: number = 0): string {
  if (!scene) return '';
  return resolveSceneSubtitle(scene, index);
}
