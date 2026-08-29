const fs = require('fs');

let content = fs.readFileSync('server/VideoEditor.ts', 'utf8');

// 1. Add formatAssTime
const formatAssTimeCode = `
function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return \`\${h}:\${String(m).padStart(2, '0')}:\${String(s).padStart(2, '0')}.\${String(cs).padStart(2, '0')}\`;
}

function getAssHeader(style: string) {
  let fontName = 'Arial';
  let primaryColor = '&H00FFFFFF';
  let outlineColor = '&H00000000';
  let shadowColor = '&H00000000';
  let outline = '3';
  let shadow = '0';
  let fontSize = '24';
  let bold = '-1'; 
  
  if (style === 'Bold Pop') {
    fontName = 'Arial Black';
    primaryColor = '&H0000FFFF'; 
    outlineColor = '&H00000000'; 
    outline = '4';
    shadow = '2';
    fontSize = '26';
  } else if (style === 'Clean Minimal') {
    fontName = 'Helvetica';
    primaryColor = '&H00FFFFFF'; 
    outlineColor = '&H00444444'; 
    outline = '1';
    shadow = '0';
    fontSize = '20';
    bold = '0'; 
  } else if (style === 'Neon Glow') {
    fontName = 'Courier New';
    primaryColor = '&H00FFFFFF'; 
    outlineColor = '&H00FF00FF'; 
    outline = '3';
    shadow = '5';
    shadowColor = '&H00FF00FF';
    fontSize = '24';
  }

  return \`[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,\${fontName},\${fontSize},\${primaryColor},&H000000FF,\${outlineColor},\${shadowColor},\${bold},0,0,0,100,100,0,0,1,\${outline},\${shadow},2,10,10,25,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
\`;
}
`;

content = content.replace(
  'function formatSrtTime(seconds: number): string {',
  formatAssTimeCode + '\nfunction formatSrtTime(seconds: number): string {'
);

// 2. Change signature
content = content.replace(
  'static async processProject(project: ProductionProject): Promise<any> {',
  'static async processProject(project: ProductionProject, subtitleStyle?: string): Promise<any> {'
);

// 3. Replace subtitle rendering loop
content = content.replace(
  `let srtContent = '';`,
  `let assContent = getAssHeader(subtitleStyle || 'Bold Pop');`
);

content = content.replace(
  `           const startTime = formatSrtTime(currentTime + 0.2);
           const endTime = formatSrtTime(currentTime + SCENE_DURATION - 0.2);
           srtContent += \`\${i + 1}\\n\${startTime} --> \${endTime}\\n\${res.text}\\n\\n\`;`,
  `           const assStart = formatAssTime(currentTime + 0.2);
           const assEnd = formatAssTime(currentTime + SCENE_DURATION - 0.2);
           assContent += \`Dialogue: 0,\${assStart},\${assEnd},Default,,0,0,0,,{\\\\fscx120\\\\fscy120\\\\t(0,200,\\\\fscx100\\\\fscy100)}\${res.text}\\n\`;`
);

// 4. Change file saving to .ass
content = content.replace(
  `const srtPath = path.join(tempDir, 'subs.srt');\n      fs.writeFileSync(srtPath, srtContent.replace(/\\\\n/g, '\\n'));`,
  `const assPath = path.join(tempDir, 'subs.ass');\n      fs.writeFileSync(assPath, assContent.replace(/\\\\n/g, '\\n'));`
);

// 5. Change ffmpeg command
content = content.replace(
  `const style = "FontName=Arial,FontSize=22,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2.5,Shadow=1.5,Alignment=2,MarginV=25";`,
  ``
);

// Now ffmpegCmd
content = content.replace(
  `const ffmpegCmd = \`ffmpeg -y -i concat.mp4 -i bgm.mp3 -filter_complex "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,subtitles=subs.srt:force_style='\${style}'[v];[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]" -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -shortest "\${finalVideoPath}"\`;`,
  `const ffmpegCmd = \`ffmpeg -y -i concat.mp4 -i bgm.mp3 -filter_complex "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,subtitles=subs.ass[v];[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]" -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -shortest "\${finalVideoPath}"\`;`
);

fs.writeFileSync('server/VideoEditor.ts', content);
console.log('VideoEditor.ts updated successfully');
