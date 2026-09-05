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
  return SUBTITLE_PLACEHOLDERS.some(p => 
    normalized === p || 
    normalized.startsWith('text overlay') || 
    normalized.startsWith('teks hook di layar') ||
    normalized.startsWith('teks hook')
  );
}

export function resolveSceneSubtitle(scene: any, index: number = 0): string {
  if (!scene) return `Adegan ${index + 1}`;

  // 1. Direct user subtitle (e.g. from Track 3 Subtitles)
  if (typeof scene.subtitle === 'string' && scene.subtitle.trim().length > 0 && !isPlaceholderSubtitle(scene.subtitle)) {
    return scene.subtitle.trim();
  }

  // 2. Direct text overlay
  if (typeof scene.textOverlay === 'string' && scene.textOverlay.trim().length > 0 && !isPlaceholderSubtitle(scene.textOverlay)) {
    return scene.textOverlay.trim();
  }

  if (typeof scene.text_overlay === 'string' && scene.text_overlay.trim().length > 0 && !isPlaceholderSubtitle(scene.text_overlay)) {
    return scene.text_overlay.trim();
  }

  // 3. Voiceover script / narration text
  if (typeof scene.voiceOver === 'string' && scene.voiceOver.trim().length > 0 && !isPlaceholderSubtitle(scene.voiceOver)) {
    return scene.voiceOver.trim();
  }

  if (typeof scene.voiceover_script === 'string' && scene.voiceover_script.trim().length > 0 && !isPlaceholderSubtitle(scene.voiceover_script)) {
    return scene.voiceover_script.trim();
  }

  // 4. Scene dialogue
  if (typeof scene.dialogue === 'string' && scene.dialogue.trim().length > 0 && !isPlaceholderSubtitle(scene.dialogue)) {
    return scene.dialogue.trim();
  }

  // 5. Visual direction summary
  if (typeof scene.visualDirection === 'string' && scene.visualDirection.trim().length > 0 && !isPlaceholderSubtitle(scene.visualDirection)) {
    return scene.visualDirection.trim();
  }

  return `Adegan ${index + 1}`;
}

export function resolveSceneVoiceover(scene: any, index: number = 0): string {
  if (!scene) return '';
  if (typeof scene.voiceOver === 'string' && scene.voiceOver.trim().length > 0 && !isPlaceholderSubtitle(scene.voiceOver)) {
    return scene.voiceOver.trim();
  }
  if (typeof scene.voiceover_script === 'string' && scene.voiceover_script.trim().length > 0 && !isPlaceholderSubtitle(scene.voiceover_script)) {
    return scene.voiceover_script.trim();
  }
  if (typeof scene.dialogue === 'string' && scene.dialogue.trim().length > 0 && !isPlaceholderSubtitle(scene.dialogue)) {
    return scene.dialogue.trim();
  }
  return '';
}
