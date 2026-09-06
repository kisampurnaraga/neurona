import { ConversationalIntentRouter } from './src/server/core/IntentRouter';

async function test(prompt: string) {
  const res = await ConversationalIntentRouter.route(prompt, null, true); // hasAssets = true
  console.log(`Prompt: "${prompt}"`);
  console.log(`  -> Intent: ${res.intent}`);
  console.log(`  -> Action: ${res.action || 'NONE'}`);
}

async function run() {
  await test('Hello Neurona');
  await test('Halo Neurona!');
  await test('Hi!!');
}
run();
