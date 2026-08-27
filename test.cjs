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
    const res = await pool.query("INSERT INTO projects (id, user_id, title, status, video_type, final_video_url, data) VALUES ('test_id', 'default', 'test', 'PENDING', 'AFFILIATE', null, '{}') ON CONFLICT (id) DO UPDATE SET title = 'test'");
    console.log(res);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    pool.end();
  }
}
run();
