const fs = require('fs');
try {
  const content = fs.readFileSync('projects.json', 'utf8');
  const data = JSON.parse(content);
  console.log("Total projects in projects.json:", Array.isArray(data) ? data.length : Object.keys(data).length);
  const projectsList = Array.isArray(data) ? data : Object.values(data);
  projectsList.forEach((p, pIdx) => {
    console.log(`\n--- Project #${pIdx + 1}: ID=${p.id}, Title="${p.title}", Status=${p.status} ---`);
    if (p.storyboard && p.storyboard.scenes) {
      console.log(`Scenes count: ${p.storyboard.scenes.length}`);
      p.storyboard.scenes.forEach((s, sIdx) => {
        console.log(` Scene ${sIdx + 1} (id: ${s.id}):`);
        console.log(`   imageStatus: ${s.imageStatus}, status: ${s.status}`);
        console.log(`   imageUrl: ${s.imageUrl ? (s.imageUrl.startsWith('data:') ? 'BASE64 (len=' + s.imageUrl.length + ', prefix=' + s.imageUrl.substring(0, 30) + '...)' : s.imageUrl) : 'NONE'}`);
        console.log(`   videoUrl: ${s.videoUrl ? (s.videoUrl.startsWith('data:') ? 'BASE64 (len=' + s.videoUrl.length + ')' : s.videoUrl) : 'NONE'}`);
      });
    }
  });
} catch (e) {
  console.error("Error reading projects.json:", e);
}
