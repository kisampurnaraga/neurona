import { db } from './src/db/index';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { userDatabase } from './server/middleware/auth';
import bcrypt from 'bcryptjs';

async function run() {
  let u = await userDatabase.getUserByEmail('ia.asep12@gmail.com');
  console.log('User before:', u?.passwordHash);

  // simulate change password
  await userDatabase.setUser(u.uid, {
    ...u,
    password: 'newPassword123',
    tokenVersion: (u.tokenVersion || 0) + 1
  });

  let u2 = await userDatabase.getUserByEmail('ia.asep12@gmail.com');
  console.log('User after:', u2?.passwordHash);
  
  const ok = await userDatabase.verifyPassword(u2, 'newPassword123');
  console.log('Verify new:', ok);
}
run();
