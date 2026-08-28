const sqlite3 = require('better-sqlite3');
const db = sqlite3('./outputs/sqlite.db');
const rows = db.prepare("SELECT data FROM projects ORDER BY id DESC LIMIT 1").all();
console.log(rows[0]?.data.substring(0, 500));
