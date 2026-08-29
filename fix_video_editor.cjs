const fs = require('fs');

let content = fs.readFileSync('server/VideoEditor.ts', 'utf8');

// Update getAssHeader to accept targetW and targetH
content = content.replace(
  "function getAssHeader(style: string) {",
  "function getAssHeader(style: string, targetW: number, targetH: number) {"
);

// We need to scale font size based on target height. 720p font was 26.
// If 1920 height, we should scale it by 1920/720 = 2.66.
// Let's just adjust the returned string to use targetW and targetH.
content = content.replace(
  "PlayResX: 1280\nPlayResY: 720\n",
  "PlayResX: ${targetW}\nPlayResY: ${targetH}\n"
);

// Scale up the fontSize based on targetH. Default was for 720.
content = content.replace(
  "let fontSize = '24';",
  "let baseFontSize = 24;"
);
content = content.replace(
  "fontSize = '26';",
  "baseFontSize = 48;" // Make Bold Pop bigger
);
content = content.replace(
  "fontSize = '20';",
  "baseFontSize = 36;"
);
content = content.replace(
  "fontSize = '24';",
  "baseFontSize = 42;"
);

// Re-write the getAssHeader logic a bit to insert scaled sizes.
content = content.replace(
  "return `[Script Info]",
  "let fontSize = Math.floor(baseFontSize * (targetH / 720)).toString();\n  let marginV = Math.floor(targetH * 0.15);\n  return `[Script Info]"
);

// MarginV is hardcoded in the Style line: Alignment, MarginL, MarginR, MarginV
// Original line:
// Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},${shadowColor},${bold},0,0,0,100,100,0,0,1,${outline},${shadow},2,10,10,50,1
content = content.replace(
  "2,10,10,50,1",
  "2,20,20,${marginV},1"
);


// In processProject, we need to determine targetW and targetH based on project.aspectRatio
content = content.replace(
  "const SCENE_DURATION = 4;",
  "const SCENE_DURATION = 4;\n\n    const aspectRatio = project.aspectRatio || (project.videoType === 'EDUCATION' ? '16:9' : '9:16');\n    const [targetW, targetH] = aspectRatio === '16:9' ? [1920, 1080] : aspectRatio === '1:1' ? [1080, 1080] : [1080, 1920];\n    const scaleFilter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH}`;"
);

// Now apply scaleFilter in Phase 1c:
content = content.replace(
  "await execAsync(`ffmpeg -y -i \"scene_${i}.mp4\" -i \"tts_${i}.mp3\" -filter_complex \"[1:a]apad[a]\" -map 0:v:0 -map \"[a]\" -c:v copy -c:a aac -shortest \"scene_mixed_${i}.mp4\"`, { cwd: tempDir });",
  "await execAsync(`ffmpeg -y -i \"scene_${i}.mp4\" -i \"tts_${i}.mp3\" -filter_complex \"[0:v]${scaleFilter},setsar=1[v];[1:a]apad[a]\" -map \"[v]\" -map \"[a]\" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \"scene_mixed_${i}.mp4\"`, { cwd: tempDir });"
);

content = content.replace(
  "await execAsync(`ffmpeg -y -i \"scene_${i}.mp4\" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest \"scene_mixed_${i}.mp4\"`, { cwd: tempDir });",
  "await execAsync(`ffmpeg -y -i \"scene_${i}.mp4\" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex \"[0:v]${scaleFilter},setsar=1[v]\" -map \"[v]\" -map 1:a:0 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \"scene_mixed_${i}.mp4\"`, { cwd: tempDir });"
);

// Update phase 2 getAssHeader call
content = content.replace(
  "let assContent = getAssHeader(subtitleStyle || 'Bold Pop');",
  "let assContent = getAssHeader(subtitleStyle || 'Bold Pop', targetW, targetH);"
);

// Phase 3: the scale filter is no longer needed since it's already done!
content = content.replace(
  "const ffmpegCmd = `ffmpeg -y -i concat.mp4 -i bgm.mp3 -filter_complex \"[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,subtitles=subs.ass[v];[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]\" -map \"[v]\" -map \"[a]\" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -shortest \"${finalVideoPath}\"`;",
  "const ffmpegCmd = `ffmpeg -y -i concat.mp4 -i bgm.mp3 -filter_complex \"[0:v]subtitles=subs.ass[v];[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]\" -map \"[v]\" -map \"[a]\" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -shortest \"${finalVideoPath}\"`;"
);


fs.writeFileSync('server/VideoEditor.ts', content);
