import fs from 'fs';

async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=BOGUS_KEY`;
  const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instances: [{ prompt: "dog" }] })
  });
  console.log(res.status);
  console.log(await res.text());
}
run().catch(console.error);
