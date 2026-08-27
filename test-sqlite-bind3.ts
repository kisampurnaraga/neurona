import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.update(users).set({ statusAktif: true }).where(eq(users.uid, 'test1'));
    console.log("Update boolean true worked");
  } catch (err) {
    console.error("Update error:", err.message);
  }
}
run();
