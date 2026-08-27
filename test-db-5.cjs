const { db } = require('./dist/server.cjs');
async function run() {
  try {
    const res = await db.select().from(require('./dist/server.cjs').users).limit(1);
    console.log(res);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
run();
