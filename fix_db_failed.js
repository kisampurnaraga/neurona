import Database from 'better-sqlite3';
const db = new Database('outputs/sqlite.db');

const rows = db.prepare("SELECT id, data FROM projects WHERE status = 'COMPLETED' AND final_video_url IS NULL").all();
for (const row of rows) {
  let data = JSON.parse(row.data);
  data.status = 'FAILED';
  data.error = 'Proses terputus karena server restart';
  if (!data.agentStatus) data.agentStatus = {};
  data.agentStatus['Stitcher'] = 'FAILED';
  
  db.prepare("UPDATE projects SET status = 'FAILED', data = ? WHERE id = ?").run(JSON.stringify(data), row.id);
  console.log('Fixed project ID:', row.id);
}
console.log('Database fix complete.');
