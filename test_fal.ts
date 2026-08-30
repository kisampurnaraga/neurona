import fetch from 'node-fetch';
const url = 'https://queue.fal.run/fal-ai/flux/schnell';
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Key ${process.env.FAL_API_KEY || process.env.FAL_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ prompt: "A cat" })
});
console.log(res.status);
