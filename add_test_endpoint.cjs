const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `
  app.post('/api/test-fal-model', async (req, res) => {
    try {
      const { endpoint } = req.body;
      const keyRotator = require('./server/keyRotator').keyRotator;
      const key = await keyRotator.getFalKey();
      if (!key) return res.status(500).json({ error: "No fal key" });

      const response = await fetch(\`https://fal.run/\${endpoint}\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Key \${key}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: "A beautiful cinematic shot of a glowing forest",
          image_url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a5d?q=80&w=1024&auto=format&fit=crop"
        })
      });
      
      if (!response.ok) {
         const text = await response.text();
         return res.status(response.status).json({ error: text });
      }
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
`;

content = content.replace("app.get('/api/projects', (req, res) => {", newEndpoint + "\n  app.get('/api/projects', (req, res) => {");
fs.writeFileSync('server.ts', content);
