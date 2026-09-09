import { db } from '../src/db/index';
import { systemSettings } from '../src/db/schema';
import { like } from 'drizzle-orm';

async function run() {
  const records = db.select().from(systemSettings).where(like(systemSettings.key, 'openart_oauth_client%')).all();
  console.log('OpenArt clients in DB:', records);
}
run();
