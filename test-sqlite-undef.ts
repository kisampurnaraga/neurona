import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';

async function run() {
  try {
    const insertObj = {
      uid: 'test2',
      email: 'test2@example.com',
      name: undefined,
    };
    await db.insert(users).values(insertObj);
    console.log("Insert undefined worked");
  } catch (err) {
    console.error("Insert error:", err.message);
  }
}
run();
