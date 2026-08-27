require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function run() {
  try {
    const res = await pool.query("INSERT INTO users (uid, email, name, role) VALUES ('default', 'default@example.com', 'Default User', 'user') ON CONFLICT DO NOTHING");
    console.log('User created or exists:', res);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    pool.end();
  }
}
run();
