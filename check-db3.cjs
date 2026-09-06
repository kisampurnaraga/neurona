const Database = require('better-sqlite3');
const db = new Database('outputs/sqlite.db');
const rows = db.prepare("SELECT data FROM projects ORDER BY created_at DESC LIMIT 5").all();
rows.forEach((row, idx) => {
  const p = JSON.parse(row.data);
  console.log(`\nProject ${idx} (${p.title}):`);
  p.storyboard?.scenes?.forEach((s, i) => {
    console.log(`  Scene ${i}: videoUrl start=${s.videoUrl ? s.videoUrl.substring(0, 50) : 'null'}`);
  });
});
db.close();
