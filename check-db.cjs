const Database = require('better-sqlite3');
const db = new Database('outputs/sqlite.db');
const projects = db.prepare("SELECT data FROM projects ORDER BY created_at DESC LIMIT 1").get();
console.log(projects ? projects.data.substring(0, 1000) : 'no projects');
db.close();
