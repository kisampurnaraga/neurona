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
  baseFontSize: number;     // Reference font size for standard 1080p frame (~60-80px on 1080x1920)
  maxFontSize?: number;     // Hard upper ceiling to prevent subtitles from overflowing
  minFontSize?: number;     // Floor to maintain legibility on lower resolutions
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
    baseFontSize: 70,            // Yields 70px on 1080x1920 (target range 60-80px)
    maxFontSize: 80,             // Strict upper cap: maximum 80px
    minFontSize: 28,
    primaryColor: '&H0000FFFF',  // Vibrant TikTok Yellow (BGR: 00FFFF = RGB FFFF00)
    secondaryColor: '&H000000FF',
    outlineColor: '&H00000000',  // Deep pitch black stroke
    backColor: '&H00000000',     // 100% solid opaque black drop shadow (no transparency)
    bold: 0,                     // Anton is natively heavy/black weight
    borderStyle: 1,              // Outline with drop shadow
    outline: 3.5,                // Scaled: ~3.5px on 1080p
    shadow: 2.5,                 // Scaled: ~2.5px on 1080p
    marginVPercent: 0.12         // 12% from bottom
  },
  'Clean Minimal': {
    id: 'Clean Minimal',
    name: 'Clean Minimal',
    description: 'Sederhana dan elegan ala film bioskop / dokumenter, teks putih bersih dengan kotak latar semi-transparan.',
    fontName: 'Montserrat',      // Clean modern geometric aesthetic
    baseFontSize: 56,            // Yields 56px on 1080x1920
    maxFontSize: 64,             // Strict upper cap: 64px
    minFontSize: 24,
    primaryColor: '&H00FFFFFF',  // Pure crisp white
    secondaryColor: '&H000000FF',
    outlineColor: '&H00000000',
    backColor: '&H80141414',     // Semi-transparent dark background box (~50% alpha)
    bold: 0,                     // Clean regular weight
    borderStyle: 3,              // Background box mode (renders backdrop behind text)
    outline: 3.5,                // Scaled box padding
    shadow: 0,                   // No drop shadow needed with background box
    marginVPercent: 0.12
  },
  'Neon Glow': {
    id: 'Neon Glow',
    name: 'Neon Glow',
    description: 'Teks bercahaya neon futuristik ala Cyberpunk dengan multi-layer aura magenta-cyan dan inti berpendar.',
    fontName: 'Montserrat',      // Clean heavy weight for neon tubes
    baseFontSize: 64,            // Yields 64px on 1080x1920 (target range 60-80px)
    maxFontSize: 74,             // Strict upper cap: 74px
    minFontSize: 26,
    primaryColor: '&H00FFFFFF',  // Brilliant white-hot incandescent core
    secondaryColor: '&H000000FF',
    outlineColor: '&H00FF00FF',  // Electric Neon Magenta (BGR: FF00FF)
    backColor: '&H00FFFF00',     // Electric Neon Cyan (BGR: FFFF00)
    bold: 1,
    borderStyle: 1,
    outline: 2.0,                // Scaled stroke width
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
  
  // Calculate adaptive scale anchored to standard 1080p dimension
  const minDim = Math.min(targetW, targetH);
  const isLandscape = targetW > targetH;
  const isSquare = targetW === targetH;
  
  // Aspect ratio adjustment factor
  // In 9:16 portrait (e.g. 1080x1920): minDim is 1080 -> scale = 1.0 -> Bold Pop = 70px (within 60-80px target)
  // In 16:9 landscape (e.g. 1920x1080): minDim is 1080 -> aspect factor 0.85 -> Bold Pop = 60px
  // In 1:1 square (e.g. 1080x1080): minDim is 1080 -> aspect factor 0.90 -> Bold Pop = 63px
  const aspectFactor = isLandscape ? 0.85 : isSquare ? 0.90 : 1.0;
  const scale = (minDim / 1080) * aspectFactor;
  
  const rawFontSize = Math.round(config.baseFontSize * scale);
  const maxCap = config.maxFontSize || 80;
  const minFloor = config.minFontSize || 24;
  const fontSize = Math.min(maxCap, Math.max(minFloor, rawFontSize));

  const dimScale = minDim / 1080;
  const outline = Math.max(1, Math.round(config.outline * dimScale));
  const shadow = Math.max(0, Math.round(config.shadow * dimScale));
  const marginV = Math.floor(targetH * config.marginVPercent);
  // Safe horizontal margin (8% of width, minimum 28px) ensures long text wraps comfortably
  const marginH = Math.max(28, Math.round(targetW * 0.08));
  
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
    // Multi-layer neon sign simulation scaled to frame dimensions
    const minDim = Math.min(targetH, 1080);
    const scale = minDim / 1080;
    const b1 = Math.max(1, Math.round(5 * scale)).toFixed(1);
    const b2 = Math.max(1, Math.round(2.5 * scale)).toFixed(1);
    const b3 = Math.max(0.5, (1 * scale)).toFixed(1);
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
