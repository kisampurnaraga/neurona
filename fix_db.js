import Database from 'better-sqlite3';
const db = new Database('outputs/sqlite.db');
db.prepare("UPDATE projects SET status = 'COMPLETED' WHERE status = 'PROCESSING' AND final_video_url IS NULL").run();
console.log('Fixed stuck projects in DB');
