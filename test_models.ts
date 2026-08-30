import { keyRotator } from './server/keyRotator.ts';

const base64Img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function run() {
  const key = await keyRotator.getNextFalKey();
  for (const endpoint of ['fal-ai/bytedance/seedance/v1/lite/image-to-video', 'fal-ai/veo3.1/lite/image-to-video']) {
     console.log("Testing", endpoint);
     try {
       const res = await fetch(`https://fal.run/${endpoint}`, {
         method: 'POST',
         headers: {
           'Authorization': `Key ${key}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           prompt: "A beautiful cinematic shot of a glowing forest",
           image_url: base64Img
         })
       });
       if (res.ok) {
          const data = await res.json();
          console.log(`Success ${endpoint}:`, JSON.stringify(data).substring(0, 100));
       } else {
          console.error(`Error ${endpoint}:`, res.status, await res.text());
       }
     } catch (e) {
       console.error("Exception:", e);
     }
  }
}
run();
