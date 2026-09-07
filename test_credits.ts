import { db } from './src/db';
import { creditHolds, users } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { CreditService } from './server/creditService';
import { v4 as uuidv4 } from 'uuid';
import { getProviderPricing } from './server/creditService';

async function runTests() {
  console.log('--- RUNNING CREDIT SERVICE TESTS ---');
  
  // 1. Setup Test User
  const testUserId = 'test_user_' + Date.now();
  await db.insert(users).values({
    uid: testUserId,
    email: testUserId + '@example.com',
    credits: 100
  });
  console.log(`[+] Created test user ${testUserId} with 100 credits.`);
  
  // 2. Test Idempotency (Duplicate Request)
  const idempotencyKey = uuidv4();
  console.log(`[+] Testing idempotency with key: ${idempotencyKey}`);
  
  const hold1 = await CreditService.holdCredits(testUserId, 15, 'Test hold', idempotencyKey);
  console.log(`[+] Hold 1:`, hold1);
  
  const hold2 = await CreditService.holdCredits(testUserId, 15, 'Test hold', idempotencyKey);
  console.log(`[+] Hold 2:`, hold2);
  
  const userAfterHold = await db.select().from(users).where(eq(users.uid, testUserId)).get();
  console.log(`[+] Credits after hold (should be 85): ${userAfterHold?.credits}`);
  if (userAfterHold?.credits !== 85) throw new Error("Idempotency failed!");
  
  // 3. Test Commit
  await CreditService.commitHold(testUserId, 15, hold1.holdId);
  const holdRecord = await db.select().from(creditHolds).where(eq(creditHolds.id, hold1.holdId!)).get();
  console.log(`[+] Hold status after commit (should be COMMITTED): ${holdRecord?.status}`);
  if (holdRecord?.status !== 'COMMITTED') throw new Error("Commit failed!");
  
  // 4. Test Insufficient Balance
  console.log(`[+] Testing insufficient balance (trying to hold 100 credits)`);
  const holdFail = await CreditService.holdCredits(testUserId, 100, 'Too expensive');
  console.log(`[+] Hold 3 success (should be false): ${holdFail.success}`);
  if (holdFail.success) throw new Error("Insufficient balance test failed!");
  
  // 5. Test OpenArt Pricing Calculation
  console.log(`[+] Testing explicit provider routing & pricing`);
  const cost = CreditService.calculateImageCreditCost('sdxl', { provider: 'OpenArt', operation: 'text-to-image' });
  console.log(`[+] Cost for OpenArt Flux Pro: ${cost.credits} credits (USD ${cost.costUsd})`);
  const expectedPricing = getProviderPricing('OpenArt', 'sdxl', 'text-to-image');
  if (cost.costUsd !== expectedPricing?.costUsd) throw new Error(`Pricing calculation failed! Cost: ${cost.costUsd}, Expected: ${expectedPricing?.costUsd}`);

  // Cleanup
  await db.delete(creditHolds).where(eq(creditHolds.userId, testUserId));
  await db.delete(users).where(eq(users.uid, testUserId));
  console.log(`[+] Cleanup complete.`);
  console.log('--- ALL TESTS PASSED ---');
}

runTests().catch(console.error);
