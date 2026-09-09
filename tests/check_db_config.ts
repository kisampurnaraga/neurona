import { db } from '../src/db/index';
import { systemSettings } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = db.select().from(systemSettings).where(eq(systemSettings.key, 'domain_url_management_config')).get();
  console.log(existing ? JSON.parse(existing.value) : 'No config in DB');
}
run();
