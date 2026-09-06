/**
 * Subtitle Styles Engine for FFmpeg ASS Subtitle Generation
 * 
 * Defines high-fidelity visual subtitle presets:
 * 1. Bold Pop: TikTok/CapCut high-impact yellow bold text with thick black outline & drop shadow.
 * 2. Clean Minimal: Cinematic white text with semi-transparent dark pill background box.
 * 3. Neon Glow: Cyberpunk multi-layer glowing neon sign with magenta-cyan aura and incandescent core.
 */

export interface SubtitlePresetConfig {
  id: string;
  name: string;
  description: string;
  fontName: string;
  baseFontSize: number;
  primaryColor: string;     // ASS BGR color: &HAABBGGRR (AA=00 is 100% opaque)
  secondaryColor: string;
  outlineColor: string;
  backColor: string;        // Used for Shadow or Box Background
  bold: number;             // 0 = regular, 1 = bold/black weight
  borderStyle: number;      // 1 = outline + drop shadow, 3 = opaque/semi-transparent background box
  outline: number;          // Thickness of stroke or box padding
  shadow: number;           // Distance of drop shadow (0 for box mode)
  marginVPercent: number;   // Percentage from bottom of frame
}

export const SUBTITLE_PRESETS: Record<string, SubtitlePresetConfig> = {
  'Bold Pop': {
    id: 'Bold Pop',
    name: 'Bold Pop',
    description: 'Teks tebal kuning khas TikTok/Shorts dengan outline hitam pekat dan drop shadow kontras tinggi.',
    fontName: 'Anton',           // Heavy display font specifically designed for punchy viral captions
    baseFontSize: 52,            // Scaled dynamically by targetH / 720 (yields ~138px on 1080x1920)
    primaryColor: '&H0000FFFF',  // Vibrant TikTok Yellow (BGR: 00FFFF = RGB FFFF00)
    secondaryColor: '&H000000FF',
    outlineColor: '&H00000000',  // Deep pitch black stroke
    backColor: '&H00000000',     // 100% solid opaque black drop shadow (no transparency)
    bold: 0,                     // Anton is natively heavy/black weight
    borderStyle: 1,              // Outline with drop shadow
    outline: 5.5,                // Scaled dynamically: ~15px on 1080x1920 (target ratio: 12-16px)
    shadow: 3.5,                 // Scaled dynamically: ~9px on 1080x1920 (target ratio: 8-12px)
    marginVPercent: 0.12         // 12% from bottom
  },
  'Clean Minimal': {
    id: 'Clean Minimal',
    name: 'Clean Minimal',
    description: 'Sederhana dan elegan ala film bioskop / dokumenter, teks putih bersih dengan kotak latar semi-transparan.',
    fontName: 'Montserrat',      // Clean modern geometric aesthetic
    baseFontSize: 36,            // ~96px on 1080x1920
    primaryColor: '&H00FFFFFF',  // Pure crisp white
    secondaryColor: '&H000000FF',
    outlineColor: '&H00000000',
    backColor: '&H80141414',     // Semi-transparent dark background box (~50% alpha)
    bold: 0,                     // Clean regular weight
    borderStyle: 3,              // Background box mode (renders backdrop behind text)
    outline: 4.5,                // Scaled box padding (~12px on 1080x1920)
    shadow: 0,                   // No drop shadow needed with background box
    marginVPercent: 0.12
  },
  'Neon Glow': {
    id: 'Neon Glow',
    name: 'Neon Glow',
    description: 'Teks bercahaya neon futuristik ala Cyberpunk dengan multi-layer aura magenta-cyan dan inti berpendar.',
    fontName: 'Montserrat',      // Clean heavy weight for neon tubes
    baseFontSize: 46,            // ~122px on 1080x1920
    primaryColor: '&H00FFFFFF',  // Brilliant white-hot incandescent core
    secondaryColor: '&H000000FF',
    outlineColor: '&H00FF00FF',  // Electric Neon Magenta (BGR: FF00FF)
    backColor: '&H00FFFF00',     // Electric Neon Cyan (BGR: FFFF00)
    bold: 1,
    borderStyle: 1,
    outline: 2.5,                // Scaled stroke width
    shadow: 0,                   // Multi-layer glow replaces flat shadow
    marginVPercent: 0.12
  }
};

export function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Generates the ASS file header and style definitions
 */
export function getAssHeader(styleName: string = 'Bold Pop', targetW: number = 720, targetH: number = 1280): string {
  const config = SUBTITLE_PRESETS[styleName] || SUBTITLE_PRESETS['Bold Pop'];
  
  const scale = targetH / 720;
  const fontSize = Math.floor(config.baseFontSize * scale);
  const outline = Math.max(0, Math.round(config.outline * scale));
  const shadow = Math.max(0, Math.round(config.shadow * scale));
  const marginV = Math.floor(targetH * config.marginVPercent);
  const marginH = Math.max(20, Math.round(30 * scale));
  
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${targetW}
PlayResY: ${targetH}
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${config.fontName},${fontSize},${config.primaryColor},${config.secondaryColor},${config.outlineColor},${config.backColor},${config.bold},0,0,0,100,100,0,0,${config.borderStyle},${outline},${shadow},2,${marginH},${marginH},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

/**
 * Generates ASS Dialogue events formatted with effects tailored for each style:
 * - Bold Pop: Pop-in scale bounce animation with thick stroke & shadow
 * - Clean Minimal: Smooth gentle fade on a dark translucent box
 * - Neon Glow: Synchronized 3-layer radiant glow (outer aura, mid chromatic dispersion, white core)
 */
export function getAssDialogueEvents(
  text: string, 
  styleName: string = 'Bold Pop', 
  startSec: number = 0.2, 
  endSec: number = 4.8,
  targetH: number = 1280
): string {
  const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
  if (!cleanText) return '';

  const start = formatAssTime(startSec);
  const end = formatAssTime(endSec);
  const normalizedStyle = SUBTITLE_PRESETS[styleName] ? styleName : 'Bold Pop';

  if (normalizedStyle === 'Neon Glow') {
    // True multi-layer neon sign simulation using 3 overlapping layers with gaussian blur scaled to targetH
    const scale = targetH / 720;
    const b1 = (12 * scale).toFixed(1);
    const b2 = (5 * scale).toFixed(1);
    const b3 = (1.5 * scale).toFixed(1);
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,{\\blur${b1}\\bord${b1}\\1c&H00FF00FF&\\3c&H00FF00FF&\\fad(80,80)}${cleanText}
Dialogue: 1,${start},${end},Default,,0,0,0,,{\\blur${b2}\\bord${b2}\\1c&H00FFFF00&\\3c&H00FFFF00&\\fad(80,80)}${cleanText}
Dialogue: 2,${start},${end},Default,,0,0,0,,{\\blur${b3}\\bord${b3}\\1c&H00FFFFFF&\\3c&H00FF00FF&\\fad(80,80)}${cleanText}
`;
  }

  if (normalizedStyle === 'Clean Minimal') {
    // Cinematic subtle fade in & out with background box
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,{\\fad(120,120)}${cleanText}
`;
  }

  // Bold Pop default: punchy bounce/pop-in scale animation
  return `Dialogue: 0,${start},${end},Default,,0,0,0,,{\\b1\\fscx115\\fscy115\\t(0,140,\\fscx100\\fscy100)}${cleanText}
`;
}

/**
 * Builds a complete standalone .ass subtitle script
 */
export function buildAssSubtitleContent(
  text: string, 
  styleName: string = 'Bold Pop', 
  durationSeconds: number = 5, 
  targetW: number = 720, 
  targetH: number = 1280
): string {
  const header = getAssHeader(styleName, targetW, targetH);
  const startSec = 0.15;
  const endSec = Math.max(0.5, durationSeconds - 0.15);
  const dialogue = getAssDialogueEvents(text, styleName, startSec, endSec, targetH);
  return header + dialogue;
}
