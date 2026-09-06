import { db } from './src/db/index';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
async function run() {
  const f = await db.select().from(users).where(eq(users.uid, 'founder_root_001')).limit(1);
  if (f.length > 0) {
    const user = f[0];
    console.log(`Current DB hash: ${user.passwordHash}`);
  }
}
run();
