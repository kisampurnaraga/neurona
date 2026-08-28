const sqlite3 = require('better-sqlite3');
const db = sqlite3('./outputs/sqlite.db');
const rows = db.prepare("SELECT data FROM projects ORDER BY id DESC").all();
const projects = rows.map(r => JSON.parse(r.data));
projects.forEach(p => {
  if (p.logs.some(l => l.message.includes('queue.fal.run') || l.message.includes('video'))) {
    console.log('Project:', p.id, p.status, p.videoModel);
    p.logs.slice(-20).forEach(l => console.log(`[${l.timestamp}] ${l.level}: ${l.message}`));
  }
});
