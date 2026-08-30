async function run() {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Halo" }] }]
    })
  });
  console.log(res.status, await res.text());
}
run();
