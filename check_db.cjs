const sqlite3 = require('better-sqlite3');
const db = sqlite3('./outputs/sqlite.db');
const rows = db.prepare("SELECT data FROM projects ORDER BY id DESC LIMIT 1").all();
const p = JSON.parse(rows[0].data);
console.log('Project:', p.id);
p.storyboard.scenes.forEach(s => console.log('Scene:', s.id, 'Status:', s.videoStatus));
