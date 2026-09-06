const Database = require('better-sqlite3');
const db = new Database('outputs/sqlite.db');
const user = db.prepare("SELECT email, password_plain, password_hash FROM users WHERE email = 'ia.asep12@gmail.com'").get();
console.log(user);
db.close();
