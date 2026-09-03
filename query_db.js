import Database from 'better-sqlite3';
const db = new Database('outputs/sqlite.db');
const rows = db.prepare('SELECT id, status, final_video_url FROM projects').all();
console.log(JSON.stringify(rows, null, 2));
