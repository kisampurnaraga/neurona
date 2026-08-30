import fs from 'fs';

async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateContent?key=BOGUS_KEY`;
  const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "dog" }] }] })
  });
  console.log(res.status);
  console.log(await res.text());
}
run().catch(console.error);
