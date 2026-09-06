const Database = require('better-sqlite3');
const db = new Database('outputs/sqlite.db');
const row = db.prepare("SELECT data FROM projects ORDER BY created_at DESC LIMIT 1").get();
if(row) {
  const p = JSON.parse(row.data);
  p.storyboard.scenes.forEach((s, i) => {
    console.log(`Scene ${i}: videoStatus=${s.videoStatus}, videoUrl length=${s.videoUrl ? s.videoUrl.length : 0}, videoUrl start=${s.videoUrl ? s.videoUrl.substring(0, 50) : 'null'}`);
  });
}
db.close();
