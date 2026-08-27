import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';

async function run() {
  try {
    const insertObj = {
      uid: 'test1',
      email: 'test@example.com',
      statusAktif: true,
      createdAt: new Date().toISOString()
    };
    await db.insert(users).values(insertObj).onConflictDoUpdate({
      target: users.uid,
      set: insertObj
    });
    console.log("Upsert worked");
  } catch (err) {
    console.error("Upsert error:", err.message);
  }
}
run();
