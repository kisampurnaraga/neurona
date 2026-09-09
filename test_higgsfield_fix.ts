import { HiggsfieldMCPAdapter } from './src/server/providers/HiggsfieldMCPAdapter';

async function test() {
  const adapter = new HiggsfieldMCPAdapter();
  
  console.log('--- Testing InitializeMCP ---');
  const init = await adapter.initializeMCP();
  console.log('Initialize success:', init.success);
  console.log('--- Testing Resolver TEXT_TO_VIDEO ---');
  try {
    const t2vTool = adapter.resolveToolName('TEXT_TO_VIDEO');
    console.log('T2V Tool found:', t2vTool);
  } catch (e) {
    console.error('T2V Resolver Error:', e);
  }
  
  console.log('--- Testing Resolver TEXT_TO_IMAGE ---');
  try {
    const t2iTool = adapter.resolveToolName('TEXT_TO_IMAGE');
    console.log('T2I Tool found:', t2iTool);
  } catch (e) {
    console.error('T2I Resolver Error:', e);
  }
}

test().catch(console.error);
