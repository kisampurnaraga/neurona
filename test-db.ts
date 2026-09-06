import { db } from './src/db/index';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
async function run() {
  const all = await db.select().from(users);
  console.log(all);
}
run();
