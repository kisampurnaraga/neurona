const id = '66728444-3f16-4c9f-a8aa-2d1be4cd5219'; // from DB dump
// Need a valid scene ID. Let's find one.
const sqlite3 = require('better-sqlite3');
const db = sqlite3('./outputs/sqlite.db');
const rows = db.prepare("SELECT data FROM projects WHERE id = ?").all(id);
if (rows.length > 0) {
  const p = JSON.parse(rows[0].data);
  const sceneId = p.storyboard.scenes[0].id;
  console.log('Testing sceneId:', sceneId);
  fetch(`http://localhost:3000/api/projects/${id}/generate-scene-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sceneId })
  }).then(r => r.json()).then(console.log).catch(console.error);
}
