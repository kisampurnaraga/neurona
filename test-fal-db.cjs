const sqlite3 = require('better-sqlite3');
const db = sqlite3('./sqlite.db');

const row = db.prepare("SELECT value FROM settings WHERE key = 'FAL_AI_KEYS'").get();
if (!row) {
  console.log("No settings");
} else {
  console.log(row);
}
