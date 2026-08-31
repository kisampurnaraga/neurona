const Database = require('better-sqlite3');
const path = require('path');

try {
  const db = new Database(path.join(__dirname, 'outputs', 'sqlite.db'));
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables:", tables);
  
  const projects = db.prepare("SELECT * FROM projects").all();
  console.log("Projects count:", projects.length);
  for (const p of projects) {
    console.log("ID:", p.id, "Title:", p.title, "Status:", p.status);
    if (p.data) {
      try {
        const d = JSON.parse(p.data);
        console.log("Data title:", d.title);
        d.storyboard?.scenes?.forEach((s, idx) => {
          console.log(`  Scene ${idx + 1}: imageStatus=${s.imageStatus}, status=${s.status}, imageUrl=${s.imageUrl?.substring(0, 100)}`);
        });
      } catch (err) {
        console.log("Data parse err:", err.message);
      }
    }
  }
} catch (e) {
  console.error("Error reading sqlite:", e);
}
