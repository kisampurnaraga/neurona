const fs = require('fs');
const content = fs.readFileSync('projects.json', 'utf8');
console.log("projects.json size:", content.length);

// Let's sanitize unescaped newlines or control chars
function sanitizeJson(str) {
  return str.replace(/[\x00-\x1F\x7F-\x9F]/g, (c) => {
    if (c === '\n') return '\\n';
    if (c === '\r') return '\\r';
    if (c === '\t') return '\\t';
    return '';
  });
}

try {
  const parsed = JSON.parse(sanitizeJson(content));
  console.log("Parsed keys:", Object.keys(parsed));
  for (let k in parsed) {
    const p = parsed[k];
    console.log(`\n=== Project: ${k} - "${p.title}" ===`);
    console.log("Status:", p.status);
    console.log("VideoModel:", p.videoModel);
    console.log("Scenes count:", p.storyboard?.scenes?.length);
    p.storyboard?.scenes?.forEach((s, idx) => {
      console.log(`\n--- Scene #${idx + 1} (id: ${s.id}) ---`);
      console.log(`  imageStatus: ${s.imageStatus}`);
      console.log(`  status: ${s.status}`);
      console.log(`  imageUrl: ${s.imageUrl?.substring(0, 100)}`);
      if (s.imageUrl) {
        console.log(`  Full imageUrl: ${s.imageUrl}`);
      }
      if (s.image) {
        console.log(`  Full image: ${s.image.substring(0, 100)}`);
      }
      if (s.imageBase64) {
        console.log(`  Full imageBase64: ${s.imageBase64.substring(0, 100)}`);
      }
    });
  }
} catch (e) {
  console.error("Sanitized parse error:", e);
}
