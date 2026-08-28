const sqlite3 = require('better-sqlite3');
const db = sqlite3('./outputs/sqlite.db');
const rows = db.prepare("SELECT data FROM projects").all();
rows.forEach(r => {
  const p = JSON.parse(r.data);
  if (p.logs && p.logs.length > 0) {
    p.logs.forEach(l => {
      if (l.message.includes('fal') || l.message.includes('seedance') || l.message.includes('400') || l.message.includes('422')) {
        console.log(l.timestamp, l.message);
      }
    });
  }
});
