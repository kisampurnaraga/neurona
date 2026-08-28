const sqlite3 = require('better-sqlite3');
const db = sqlite3('./outputs/sqlite.db');

console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
