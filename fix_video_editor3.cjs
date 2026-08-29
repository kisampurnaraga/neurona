const fs = require('fs');
let content = fs.readFileSync('server/VideoEditor.ts', 'utf8');

// Define aspect ratio
content = content.replace(
  "const SCENE_DURATION = 5;",
  "const SCENE_DURATION = 5;\n\n    const aspectRatio = project.aspectRatio || (project.videoType === 'EDUCATIONAL' ? '16:9' : '9:16');\n    const [targetW, targetH] = aspectRatio === '16:9' ? [1920, 1080] : aspectRatio === '1:1' ? [1080, 1080] : [1080, 1920];\n    // Safe scale filter with blurred background to avoid cropping important parts\n    const scaleFilter = `split[m][a];[a]scale=${targetW}:${targetH},boxblur=40:20[b];[m]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease[v2];[b][v2]overlay=(W-w)/2:(H-h)/2`;"
);

// We need to fix the filter_complex for hasTts and !hasTts
// From:
// -filter_complex "[0:v]undefined,setsar=1[v];[1:a]apad[a]"
// I will just replace the exact line.
content = content.replace(
  /await execAsync\(\`ffmpeg -y -i "scene_\$\{i\}\.mp4" -i "tts_\$\{i\}\.mp3" -filter_complex "\[0:v\](.*?)\[v\];\[1:a\]apad\[a\]" -map "\[v\]" -map "\[a\]" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "scene_mixed_\$\{i\}\.mp4"\`, \{ cwd: tempDir \}\);/g,
  'await execAsync(`ffmpeg -y -i "scene_${i}.mp4" -i "tts_${i}.mp3" -filter_complex "[0:v]${scaleFilter},setsar=1[v];[1:a]apad[a]" -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "scene_mixed_${i}.mp4"`, { cwd: tempDir });'
);

content = content.replace(
  /await execAsync\(\`ffmpeg -y -i "scene_\$\{i\}\.mp4" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "\[0:v\](.*?)\[v\]" -map "\[v\]" -map 1:a:0 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "scene_mixed_\$\{i\}\.mp4"\`, \{ cwd: tempDir \}\);/g,
  'await execAsync(`ffmpeg -y -i "scene_${i}.mp4" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "[0:v]${scaleFilter},setsar=1[v]" -map "[v]" -map 1:a:0 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "scene_mixed_${i}.mp4"`, { cwd: tempDir });'
);

// We also need to fix targetW and targetH in the getAssHeader call
content = content.replace(
  "let assContent = getAssHeader(subtitleStyle || 'Bold Pop');",
  "let assContent = getAssHeader(subtitleStyle || 'Bold Pop', targetW, targetH);"
);

// Make sure targetW and targetH exist for getAssHeader if it was replaced poorly earlier.
// Check if it already has targetW targetH in getAssHeader call
fs.writeFileSync('server/VideoEditor.ts', content);
