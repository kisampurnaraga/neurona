const sqlite3 = require('better-sqlite3');
const db = sqlite3('./outputs/sqlite.db');
const rows = db.prepare("SELECT data FROM projects ORDER BY id DESC LIMIT 5").all();
rows.forEach(r => {
  const p = JSON.parse(r.data);
  console.log('Project:', p.id, p.status);
  p.storyboard?.scenes?.forEach((s, idx) => {
    console.log(`  Scene ${idx+1}: Status=${s.videoStatus}, URL=${s.videoUrl}`);
  });
  console.log('  Logs (last 5):');
  if (p.logs) p.logs.slice(-5).forEach(l => console.log(`  [${l.timestamp}] ${l.level}: ${l.message}`));
});
