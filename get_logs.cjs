const sqlite3 = require('better-sqlite3');
const db = sqlite3('./outputs/sqlite.db');
const rows = db.prepare("SELECT data FROM projects ORDER BY id DESC LIMIT 2").all();
rows.forEach(r => {
  const p = JSON.parse(r.data);
  if (p.logs && p.logs.length > 0) {
    console.log(`\n--- Logs for Project: ${p.title} ---`);
    p.logs.slice(-15).forEach(l => console.log(`[${l.timestamp}] ${l.level}: ${l.message}`));
  }
});
