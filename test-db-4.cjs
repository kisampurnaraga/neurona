const { Pool } = require('pg');
const pool = new Pool({
  host: '/app/cloudsql/correctorv1:asia-southeast1:ai-studio-5be7e72c',
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'postgres'
});

async function run() {
  try {
    const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log("Tables:", res.rows);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    pool.end();
  }
}
run();
