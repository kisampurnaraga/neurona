import { db } from './src/db/index';
import { users } from './src/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function run() {
  const target = await db.select().from(users).where(eq(users.email, 'ia.asep12@gmail.com'));
  if (target.length === 0) {
    console.log('Founder not found in DB!');
  } else {
    const founder = target[0];
    console.log('Founder:', { uid: founder.uid, email: founder.email, hasHash: !!founder.passwordHash, hasPlain: !!founder.passwordPlain });
    // Test if the password is still the default one? Wait, I don't know the default one. 
    // Is there a hardcoded default?
  }
}
run();
