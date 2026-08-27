import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';

async function run() {
  try {
    await db.insert(users).values({
      uid: 'test1',
      email: 'test@example.com',
      statusAktif: true
    });
    console.log("Insert boolean true worked");
  } catch (err) {
    console.error("Insert error:", err.message);
  }
}
run();
