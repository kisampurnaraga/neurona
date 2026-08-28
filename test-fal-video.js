const falKey = process.env.FAL_KEY;
if (!falKey) {
  console.log("No FAL_KEY");
  process.exit(1);
}
const fetch = require('node-fetch'); // we can just use global fetch in Node 22

async function run() {
  const res = await fetch('https://fal.run/bytedance/seedance-2.5/reference-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: "A beautiful sunset over the ocean",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1200px-React-icon.svg.png"
    })
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}
run();
