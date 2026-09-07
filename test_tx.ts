import { db } from './src/db';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
db.transaction((tx) => {
  const user = tx.select().from(users).get();
  console.log(user);
});
