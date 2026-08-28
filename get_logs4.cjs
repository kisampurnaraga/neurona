const sqlite3 = require('better-sqlite3');
const db = sqlite3('./outputs/sqlite.db');
const rows = db.prepare("SELECT data FROM projects ORDER BY id DESC LIMIT 1").all();
const p = JSON.parse(rows[0].data);
console.log('Project Status:', p.status);
p.storyboard.scenes.forEach((s, idx) => {
  console.log(`Scene ${idx+1}: Status=${s.videoStatus}, URL=${s.videoUrl}, Progress=${s.videoProgress}`);
});
console.log('Logs:');
p.logs.slice(-20).forEach(l => console.log(`[${l.timestamp}] ${l.level}: ${l.message}`));
