const { Database } = require('sqlite3');
const db = new Database('./sqlite.db');

db.get("SELECT falAiKeys FROM app_settings LIMIT 1", async (err, row) => {
  if (err || !row) {
    console.log("No settings");
    return;
  }
  const settings = JSON.parse(row.falAiKeys || '[]');
  const key = settings[0];
  if (!key) {
    console.log("No fal key");
    return;
  }
  const res = await fetch('https://fal.run/bytedance/seedance-2.5/reference-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${key.key}`,
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
});
