import { db } from './src/db/index';
import { auditLogs } from './src/db/schema';
import { desc } from 'drizzle-orm';

async function run() {
  const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10);
  console.log(logs);
}
run();
