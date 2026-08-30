const fs = require('fs');
require('dotenv').config();
const apiKey = process.env.FAL_API_KEY || process.env.FAL_KEY;

if (!apiKey) {
  console.log("No FAL API Key found");
  process.exit(1);
}

async function testModel(endpoint) {
  console.log(`\nTesting endpoint: ${endpoint}`);
  try {
    const res = await fetch(`https://fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: "A beautiful cinematic shot of a glowing forest",
        image_url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a5d?q=80&w=1024&auto=format&fit=crop"
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Success! Response:`, JSON.stringify(data).substring(0, 300));
    } else {
      const text = await res.text();
      console.log(`❌ Failed. HTTP ${res.status}: ${text.substring(0, 200)}`);
    }
  } catch (e) {
    console.error(`Error connecting to ${endpoint}:`, e.message);
  }
}

async function run() {
  await testModel('fal-ai/bytedance/seedance/v1/lite/image-to-video');
  await testModel('fal-ai/veo3.1/lite/image-to-video');
  // fallback guesses
  await testModel('fal-ai/veo/image-to-video');
  await testModel('fal-ai/seedance/image-to-video');
}
run();
