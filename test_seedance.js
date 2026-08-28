const fetch = require('node-fetch');
async function run() {
  const falApiKey = process.env.FAL_KEY;
  if(!falApiKey) return console.log('no key');
  const res = await fetch(`https://fal.run/bytedance/seedance-2.5/reference-to-video`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: "A cinematic shot @Image1", image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1200px-React-icon.svg.png" })
  });
  console.log(res.status, await res.text());
}
run();
