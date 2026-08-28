const fetch = require('node-fetch');
async function test() {
  try {
    const res = await fetch('https://fal.run/bytedance/seedance-2.5/reference-to-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' // no auth, we just want to see validation errors
      },
      body: JSON.stringify({ prompt: "hello @Image1", reference_images: ["url"] })
    });
    console.log("Response:", await res.text());
  } catch (e) {
    console.log(e);
  }
}
test();
