import sys

with open('server.ts', 'r') as f:
    content = f.read()

llm_api = """
  app.post('/api/fcc/llm-engine', (req, res) => {
     if (req.headers['x-role'] !== 'founder') return res.status(403).json({error: 'Forbidden. Founder access required.'});
     try {
       const { engine } = req.body;
       const result = FounderService.setLlmEngine(engine);
       res.json(result);
     } catch (e: any) {
       res.status(400).json({ error: e.message });
     }
  });
"""

if "/api/fcc/llm-engine" not in content:
    content = content.replace("app.post('/api/fcc/image-engine', (req, res) => {", llm_api + "\n  app.post('/api/fcc/image-engine', (req, res) => {")
    with open('server.ts', 'w') as f:
        f.write(content)
    print("server.ts updated with LLM Engine endpoint.")

